import React, { useState, useEffect } from 'react';
import { 
  Music, Calendar, ShieldCheck, Users, 
  Layers, ChevronDown, Check, CheckCircle2, ArrowRight, X, Menu, BookOpen, Sparkles,
  HardDrive, Lock
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useMasterPricing } from '../context/MasterPricingContext';
import { formatCurrency } from '../domain/pricingEngine';
import { RegistrationAccessModal } from './RegistrationAccessModal';
import { LegalTextModal } from './LegalTextModal';
import { isRegistrationUnlocked } from '../utils/cryptoAuth';
import { CampusGroovelabBrand, CampusGroovelabText, CampusGroovelabLogo } from './CampusGroovelabBrand';

interface Startseite2Props {
  onLogin: () => void;
  onRegister: (email?: string) => void;
  onShowPrivacy?: () => void;
  onShowAgb?: () => void;
  onShowImpressum?: () => void;
}

export function Startseite2({ onLogin, onRegister }: Startseite2Props) {
  const masterPricing = useMasterPricing();
  const isChf = masterPricing.currency === 'CHF';
  const fmt = (amt: number) => isChf ? formatCurrency(amt, 'CHF') : formatCurrency(amt, 'EUR');

  const [activeTab, setActiveTab] = useState<number>(0);
  const [email, setEmail] = useState<string>('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const [hoveredMenu, setHoveredMenu] = useState<string | null>(null);
  const [activeDocument, setActiveDocument] = useState<'none' | 'terms' | 'privacy' | 'impressum' | 'cancellation'>('none');
  const [showAccessModal, setShowAccessModal] = useState<boolean>(false);
  const [pendingEmail, setPendingEmail] = useState<string | undefined>(undefined);
  const [calcCampus, setCalcCampus] = useState<boolean>(true);
  const [calcGroovelab, setCalcGroovelab] = useState<boolean>(true);
  const [calcStudents, setCalcStudents] = useState<number>(80);
  const [calcTeachers, setCalcTeachers] = useState<number>(8);

  const triggerProtectedRegistration = (targetEmail?: string) => {
    setPendingEmail(targetEmail);
    setShowAccessModal(true);
  };

  const pricing = {
    campus: isChf ? masterPricing.ratesCHF.priceCampus : masterPricing.priceCampus,
    groovelab: isChf ? masterPricing.ratesCHF.priceGroovelab : masterPricing.priceGroovelab,
    kombi: isChf ? masterPricing.ratesCHF.priceKombi : masterPricing.priceKombi,
    teacher: isChf ? masterPricing.ratesCHF.priceTeacher : masterPricing.priceTeacher,
    student: isChf ? masterPricing.ratesCHF.priceStudent : masterPricing.priceStudent,
    passiveStudent: isChf ? masterPricing.ratesCHF.pricePassiveStudent : (masterPricing.pricePassiveStudent ?? 0.09),
    storageAddon: isChf ? masterPricing.ratesCHF.priceStorageAddon : (masterPricing.priceStorageAddon ?? 1.99),
    freeMonthsPerYear: masterPricing.freeMonthsPerYear,
    billingMonthsPerYear: masterPricing.billingMonthsPerYear,
    kombiSavings: isChf ? masterPricing.ratesCHF.kombiSavings : masterPricing.kombiSavings,
    kombiSavingsPercent: masterPricing.kombiSavingsPercent
  };

  const [calcBillingModel, setCalcBillingModel] = useState<'parent' | 'school'>('parent');
  const [showPrivacyAudits, setShowPrivacyAudits] = useState<boolean>(false);
  const [showFullTomCatalog, setShowFullTomCatalog] = useState<boolean>(false);

  // Interactive Target-Group FAQ State
  const [activeFaqTab, setActiveFaqTab] = useState<'parents' | 'directors' | 'teachers'>('parents');
  const [expandedFaqIndex, setExpandedFaqIndex] = useState<number | null>(0);

  const faqItems = {
    parents: [
      {
        q: 'Sind die Unterrichtszeiten und der Schulweg meines Kindes vor Fremden geschützt?',
        a: 'Ja, lückenlos. Wir speichern weder Wohnadressen noch Telefonnummern oder Schulwege deines Kindes. Auf jedem neuen Handy oder Computer muss einmalig die persönliche Sicherheits-PIN eingegeben werden. Ohne diese PIN hat niemand Zugriff auf die Daten. Zudem werden Nachnamen in Übersichten zum Schutz der Privatsphäre automatisch abgekürzt (z. B. „Max M.“).'
      },
      {
        q: 'Welche persönlichen Daten meines Kindes werden auf den Servern gespeichert?',
        a: 'Ausschließlich die für den Musikunterricht minimal erforderlichen Daten (Privacy by Default nach Art. 5 & 25 DSGVO): 1. Was gespeichert wird: Vorname und Nachname (für die interne Musikschulverwaltung), das Musikinstrument (z. B. „Gitarre“), Hausaufgaben, Übe-Zeiten, Auszeichnungen im Hausaufgabenheft sowie der Geburtstagstag (nur Tag 1–31, ohne Geburtsmonat/-jahr) als lokaler 2FA-Sicherheits-PIN. 2. Automatischer Sichtschutz (Schulterblick-Schutz): Im laufenden Unterricht, auf Lehrer-Dashboards und auf Bildschirmen wird der Nachname stets automatisch auf die Initiale maskiert (z. B. „Max M.“). 3. Was wir NIEMALS abfragen oder speichern: Keine E-Mail-Adresse, keine Handynummer, keine Wohnadresse, kein Geburtsjahr und keine Bank- oder Zahlungsdaten von Schülern. Alle Daten liegen sicher in ISO 27001-zertifizierten deutschen Rechenzentren und werden niemals für Werbung, Tracking oder Datenhandel genutzt.'
      },
      {
        q: 'Was passiert, wenn mein Kind seinen QR-Ausweis verliert?',
        a: 'Keine Sorge: Die Musikschule oder Lehrkraft kann das Zugangs-Token mit einem Klick neu generieren. Der alte gedruckte Ausweis wird dabei sofort und unwiderruflich ungültig. Wenn jemand den alten Ausweis findet, führt der QR-Code einfach ins Leere.'
      },
      {
        q: 'Fallen für Eltern oder Schüler versteckte Kosten oder Abo-Fallen an?',
        a: `Nein, niemals. Übernimmt deine Musikschule die Kosten (Sammelzahler), ist die Nutzung für dich zu 100 % kostenfrei. Falls Eltern für das Campus-Modul direkt zahlen, wird der Zugang als transparenter Jahres-Einmalbeitrag von ${fmt(pricing.student * 12)} für das gesamte Schuljahr abgerechnet (entspricht umgerechnet nur ${fmt(pricing.student)} im Monat). Es gibt kein laufendes Monats-Abo, keine automatische Verlängerungsfalle und keine Kündigungsfristen: Nach Ablauf des Schuljahres endet der Zugang automatisch, sofern er nicht aktiv für das neue Schuljahr bestätigt wird. (Hinweis: GrooveLab-Bandzugänge werden für Schüler immer vollständig von der Musikschule übernommen).`
      },
      {
        q: 'Gibt es eine Regelung für Familien mit wenig Einkommen oder mehreren Kindern?',
        a: `Ja! Bei der Campus-Aktivierung gilt unser autom. Geschwister-Vorteil: Für Familien mit mehreren Kindern sind alle weiteren Kinder ab dem 3. Kind 100 % KOSTENLOS für die Eltern (${isChf ? 'CHF 0.00' : '0,00 €'}/Monat). Die Musikschule stützt hierbei lediglich die minimale Basis-Bereitstellung von ${fmt(pricing.passiveStudent)}/Monat. Zusätzlich schaltet unser Solidaritätsversprechen für je 20 aktive Schüler 1 kostenfreie Freischaltung für Härtefälle frei.`
      }
    ],
    directors: [
      {
        q: 'Ist Campus-Groovelab rechtssicher und DSGVO-konform?',
        a: `Ja, lückenlos nach deutschen, österreichischen und Schweizer Datenschutzgesetzen (${isChf ? 'Art. 9 nDSG & DSGVO' : 'DSGVO & BDSG'}): 1. Keine Datenübertragung in die USA: Schriftarten werden direkt von Ihrem Gerät geladen (kein Risiko durch Google Fonts). 2. Server in Deutschland: Alle Daten liegen sicher in ISO 27001 zertifizierten Rechenzentren in Deutschland (kein US CLOUD Act). 3. Keine Werbung & kein Tracking: Wir nutzen keine Analyse-Tools oder Werbe-Cookies. 4. Fertiger Vertrag: Den rechtlich vorgeschriebenen Auftragsverarbeitungsvertrag (AVV nach Art. 28 DSGVO / nDSG) inklusive fertigem 20-Punkte TOM-Katalog laden Sie mit 1 Klick direkt im System herunter.`
      },
      {
        q: 'Wie schnell gelingt die Einrichtung für unsere Musikschule?',
        a: 'In unter 5 Minuten ohne IT-Kenntnisse. Sie müssen keine Software installieren oder Server konfigurieren. Sie erhalten Ihren Zugangs-Link und können Lehrkräfte, Räume und Schüler direkt anlegen oder per CSV/Excel-Datei mit 1 Klick importieren.'
      },
      {
        q: 'Welche Kosten entstehen für die Schulverwaltung und das Sekretariat?',
        a: `Verwaltungs- und Sekretariats-Accounts (Rollen Admin & Sekretariat) sind dauerhaft zu 100 % inklusive (${isChf ? 'CHF 0.00' : '0,00 €'}) und verursachen keinerlei Bereitstellungs- oder Nutzerpauschalen.`
      },
      {
        q: 'Wie flexibel sind die Preise und was ist der Kombi-Vorteil?',
        a: `Volle Modularität: Das Campus-Modul (${fmt(pricing.campus)}/Monat Schul-Flatrate) oder das GrooveLab-Modul (${fmt(pricing.groovelab)}/Monat Schul-Flatrate). Bei gemeinsamer Buchung beider Module sparen Sie dauerhaft jeden Monat ${fmt(pricing.kombiSavings)} (Kombi-Vorteil: ${fmt(pricing.kombi)}/Monat). Die Abrechnung der Server-Hosting-Pauschale erfolgt bequem in monatlichen Raten. Die Bereitstellung ist fest an das Schuljahr gekoppelt (Kündigungsfrist: 1 Monat zum 31. August). Bei Schüler- und Lehrerprofilen genießen Sie maximale Flexibilität: Es werden ausschließlich tatsächlich aktive Profile berechnet, inaktive Datensätze verbleiben zu 100 % kostenfrei.`
      },
      {
        q: 'Gilt das Preisversprechen auch für neue Funktionen und neue Schuljahre?',
        a: `Ja, zu 100%! Der vereinbarte Grundtarif Ihrer Musikschule (Server-Flatrate von ${fmt(pricing.kombi)}/Monat beim Kombi-Vorteil) sowie bestehende aktive Lehrer- und Schülerprofile bleiben dauerhaft vor Preiserhöhungen geschützt – selbst wenn wir die Plattform um neue Funktionen erweitern. Wenn im neuen Schuljahr neue Schüler hinzukommen, wird für deren Aktivierung transparent der jeweils aktuell gültige Schüler-Tarif abgerechnet.`
      },
      {
        q: 'Sind unsere Daten vor anderen Musikschulen oder Fremden geschützt?',
        a: 'Ja, durch PostgreSQL FORCE Row-Level Security (RLS) direkt im Datenbankkern. Jede Datenbankabfrage wird kernel-seitig an die eindeutige Schul-ID gekoppelt. Mandantenübergreifende Datenzugriffe sind auf Kernel-Ebene technisch unmöglich.'
      },
      {
        q: 'Wie hilft das System bei Ausfällen & Abwesenheiten von Lehrkräften?',
        a: 'Meldet sich eine Lehrkraft ab, sagt das System die betroffenen Stunden automatisch ab und benachrichtigt betroffene Schüler und Eltern sofort per Push auf ihrem Handy. Aufwendige Telefonketten im Sekretariat entfallen vollständig.'
      }
    ],
    teachers: [
      {
        q: 'Muss ich für Schul-Nachrichten meine private Handynummer herausgeben?',
        a: 'Nein, niemals. Die integrierte Kommunikation zwischen dir und deinen Schülern funktioniert komplett ohne private Telefonnummern oder WhatsApp und bietet dir zwei saubere Wege: 1. 1:1-Direktnachrichten für den unkomplizierten Austausch mit deinen Schülern (bzw. Eltern). 2. Termingekoppelte Stunden-Nachrichten (Shoutbox), die direkt an eine konkrete Unterrichtsstunde im Stundenplan gebunden sind und 48 Stunden nach dem Termin automatisch einfrieren (Auto-Freeze). So bleibt deine Privatsphäre und dein Feierabend geschützt, während die Dienstaufsicht der Musikschule lückenlos gewahrt bleibt.'
      },
      {
        q: 'Entsteht für mich zusätzlicher Papierkram oder Schreibarbeit im Unterricht?',
        a: 'Nein, im Gegenteil: Das digitale Hausaufgabenheft bietet fertige Bausteine, Schnellvorlagen und direkte Play-Along-Audioaufnahmen. Eine Unterrichtsstunde ist in unter 30 Sekunden dokumentiert – so bleibt mehr Zeit für den Musikunterricht.'
      },
      {
        q: 'Können Kolleginnen oder die Schulleitung meine Schüler und Notizen einsehen?',
        a: 'Nein. Jede Lehrkraft sieht im Unterrichtsalltag ausschließlich die eigenen Schüler, Stundenpläne und Meisterwerk-Einträge. Andere Lehrkräfte haben keinerlei Zugriff auf deine Dokumentation. Schulleitung und Sekretariat verwalten rein die übergeordneten organisatorischen Rahmendaten (wie Raumbelegungen, Gesamtschul-Stundenplan und Terminabsagen), haben jedoch keinen Einblick in deine vertraulichen pädagogischen Vorbereitungen oder internen Lehrkraft-Notizen.'
      },
      {
        q: 'Wie funktioniert die Abmeldung bei Verhinderung oder Ausfall?',
        a: 'Du trägst im Lehrer-Dashboard einfach den Ausfallzeitraum ein. Das System markiert deine Stunden automatisch als Ausfall, informiert das Sekretariat und schickt den Schülern eine Benachrichtigung. Sobald du wieder verfügbar bist, reaktivierst du deinen Stundenplan mit 1 Klick.'
      },
      {
        q: 'Wie hilft die App beim Üben zu Hause?',
        a: 'Durch innovative pädagogische Werkzeuge wie den Fokus-Timer, XP-Streaks, die Audio-Loopstation und die persönliche Audio-Biografie werden Schüler motiviert, regelmäßig und mit Freude zu Hause zu üben – ganz ohne Druck.'
      }
    ]
  };

  const getPaidMonthsUntilAugust = () => {
    const now = new Date();
    const currentMonth = now.getMonth();
    let startBillingMonth = currentMonth + 1;
    let startBillingYear = now.getFullYear();
    if (startBillingMonth > 11) {
      startBillingMonth = 0;
      startBillingYear += 1;
    }
    let targetYear = startBillingYear;
    if (startBillingMonth >= 8) {
      targetYear += 1;
    }
    const targetDate = new Date(targetYear, 7, 1);
    const startDate = new Date(startBillingYear, startBillingMonth, 1);
    const diffMonths = (targetDate.getFullYear() - startDate.getFullYear()) * 12 + (targetDate.getMonth() - startDate.getMonth()) + 1;
    return Math.max(1, diffMonths);
  };

  const handleCTASubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      triggerProtectedRegistration(email.trim().toLowerCase());
    } else {
      triggerProtectedRegistration();
    }
  };

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
    setMobileMenuOpen(false);
  };

  const usps = [
    {
      title: 'Der Stundenplan, der mitdenkt.',
      slogan: 'Dein Tag in perfektem Fluss.',
      description: 'Ein interaktives Kalenderraster, das sich nahtlos an deinen Alltag anpasst. Unterrichtsstunden, Raumbelegungen und Events synchronisieren sich vollautomatisch auf den Geräten aller Lehrer und Schüler. Keine gedruckten Zettel, keine Missverständnisse mehr.',
      images: ['/screenshots/media__1782677535200.png']
    },
    {
      title: 'Smart Room Engine.',
      slogan: 'Jedem Instrument sein Raum.',
      description: 'Raumkonflikte gehören der Vergangenheit an. Unsere intelligente Engine teilt Unterrichtsstunden automatisch Räumen mit den passenden akustischen Eigenschaften zu und warnt dich in Echtzeit, falls ein ungedämmter Raum belegt wird. Weil Stille auch ihren Platz braucht.',
      images: ['/screenshots/media__1782677645630.png']
    },
    {
      title: 'Deine Meisterwerke.',
      slogan: 'Das digitale Sticker-Album deiner Erfolge.',
      description: 'Gelernte Songs und Lektionen werden in einem interaktiven Logbuch dokumentiert. Für jede gemeisterte Challenge erhalten Schüler liebevoll gestaltete digitale Sticker – eine bleibende Trophäensammlung, die stolz macht und spielerisch motiviert.',
      images: [
        '/screenshots/media__1782677784641.png',
        '/screenshots/media__1782677784662.png'
      ]
    },
    {
      title: 'Direktnachrichten & Termin-Shoutbox.',
      slogan: 'Zertifiziert DSGVO- & schulrechtskonform.',
      description: 'Kein WhatsApp-Zwang, keine Preisgabe privater Handynummern. Neben 1:1-Direktnachrichten zwischen Lehrkraft und Schüler sind terminbezogene Stunden-Nachrichten exklusiv an den jeweiligen Unterrichtstermin gekoppelt und frieren 48 Stunden nach der Stunde automatisch ein (Auto-Freeze). Schützt die Privatsphäre der Lehrkräfte, wahrt den Kinderschutz und erfüllt die Dienstaufsichtspflicht der Musikschule.',
      images: ['/screenshots/media__1782677535200.png']
    }
  ];

  return (
    <div style={{
      fontFamily: 'Inter, sans-serif',
      backgroundColor: '#ffffff', // Pure White Background as requested
      color: '#000000',
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      overflowX: 'hidden'
    }}>
      
      {/* 🏛️ 1. Header & Navigation (Sticky) */}
      <header style={{
        position: 'sticky',
        top: 0,
        zIndex: 1000,
        backgroundColor: '#ffffff',
        borderBottom: '1px solid #e8e8ed',
        boxShadow: '0 2px 10px rgba(0, 0, 0, 0.02)',
        height: 'auto',
        padding: '16px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'between'
      }}>
        <div style={{
          maxWidth: '1280px',
          width: '100%',
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'relative'
        }}>
          {/* Logo */}
          <div 
            onClick={() => scrollToSection('hero')} 
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              cursor: 'pointer',
              fontWeight: 900,
              fontSize: '1.25rem',
              letterSpacing: '-0.03em',
              color: '#000000'
            }}
          >
            <CampusGroovelabLogo size={24} fontSize="1.25rem" />
          </div>

          {/* Desktop Navigation */}
          <nav style={{
            display: 'flex',
            alignItems: 'center',
            gap: '24px'
          }} className="desktop-only-flex">
            {/* Dropdown Funktionen */}
            <div 
              onMouseEnter={() => setHoveredMenu('funktionen')}
              onMouseLeave={() => setHoveredMenu(null)}
              style={{ position: 'relative', padding: '8px 0' }}
            >
              <button 
                type="button"
                onClick={() => setHoveredMenu(hoveredMenu === 'funktionen' ? null : 'funktionen')}
                style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '14px',
                color: '#232326',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }} className="nav-button">
                Funktionen <ChevronDown size={14} style={{ color: '#7d7d82' }} />
              </button>
              {hoveredMenu === 'funktionen' && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  backgroundColor: '#ffffff',
                  border: '1px solid #e8e8ed',
                  borderRadius: '12px',
                  boxShadow: '0 10px 25px rgba(0,0,0,0.05)',
                  padding: '16px',
                  width: '280px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                  zIndex: 1001
                }}>
                  <div style={{ cursor: 'pointer' }} onClick={() => scrollToSection('usps')}>
                    <div style={{ fontWeight: 600, fontSize: '14px', color: '#000000' }}>Stundenplan-Designer</div>
                    <div style={{ fontSize: '12px', color: '#7d7d82' }}>Die interaktive Kalenderzentrale.</div>
                  </div>
                  <div style={{ cursor: 'pointer' }} onClick={() => scrollToSection('usps')}>
                    <div style={{ fontWeight: 600, fontSize: '14px', color: '#000000' }}>Smart Room Engine</div>
                    <div style={{ fontSize: '12px', color: '#7d7d82' }}>Konfliktfreie, akustische Raumplanung.</div>
                  </div>
                  <div style={{ cursor: 'pointer' }} onClick={() => scrollToSection('usps')}>
                    <div style={{ fontWeight: 600, fontSize: '14px', color: '#000000' }}>Lernfortschritt &amp; Gamification</div>
                    <div style={{ fontSize: '12px', color: '#7d7d82' }}>Digitales Ringbuch mit Übe-Streaks.</div>
                  </div>
                </div>
              )}
            </div>

            {/* Dropdown Zielgruppen */}
            <div 
              onMouseEnter={() => setHoveredMenu('zielgruppen')}
              onMouseLeave={() => setHoveredMenu(null)}
              style={{ position: 'relative', padding: '8px 0' }}
            >
              <button 
                type="button"
                onClick={() => setHoveredMenu(hoveredMenu === 'zielgruppen' ? null : 'zielgruppen')}
                style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '14px',
                color: '#232326',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}>
                Zielgruppen <ChevronDown size={14} style={{ color: '#7d7d82' }} />
              </button>
              {hoveredMenu === 'zielgruppen' && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  backgroundColor: '#ffffff',
                  border: '1px solid #e8e8ed',
                  borderRadius: '12px',
                  boxShadow: '0 10px 25px rgba(0,0,0,0.05)',
                  padding: '16px',
                  width: '280px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                  zIndex: 1001
                }}>
                  <div style={{ cursor: 'pointer' }} onClick={() => scrollToSection('target-audiences')}>
                    <div style={{ fontWeight: 600, fontSize: '14px', color: '#ea4335' }}>Für Schulleiter &amp; Admins</div>
                    <div style={{ fontSize: '12px', color: '#7d7d82' }}>Konfliktfreie Raumverwaltung &amp; Stundenpläne.</div>
                  </div>
                  <div style={{ cursor: 'pointer' }} onClick={() => scrollToSection('target-audiences')}>
                    <div style={{ fontWeight: 600, fontSize: '14px', color: '#34a853' }}>Für Musiklehrer</div>
                    <div style={{ fontSize: '12px', color: '#7d7d82' }}>Direktes Feedback &amp; einfaches Zuweisen.</div>
                  </div>
                  <div style={{ cursor: 'pointer' }} onClick={() => scrollToSection('target-audiences')}>
                    <div style={{ fontWeight: 600, fontSize: '14px', color: '#34a853' }}>Für Schüler &amp; Eltern</div>
                    <div style={{ fontSize: '12px', color: '#7d7d82' }}>Übersichtliche Hausaufgaben &amp; Motivation.</div>
                  </div>
                </div>
              )}
            </div>

            {/* Preise */}
            <button 
              onClick={() => scrollToSection('pricing')}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '14px',
                color: '#232326'
              }}
            >
              Preise
            </button>

            {/* Datenschutz */}
            <button 
              onClick={() => setShowPrivacyAudits(true)}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontWeight: 650,
                fontSize: '14px',
                color: '#34a853',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              🛡️ Datenschutz
            </button>
          </nav>

          {/* CTA & Login (Desktop) */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '16px'
          }} className="desktop-only-flex">
            <button 
              onClick={onLogin}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '14px',
                color: '#232326',
                padding: '8px 16px'
              }}
            >
              Anmelden
            </button>
            <button 
              onClick={() => triggerProtectedRegistration()}
              style={{
                backgroundColor: '#34a853',
                color: '#ffffff',
                border: 'none',
                borderRadius: '100px',
                fontWeight: 600,
                fontSize: '14px',
                padding: '10px 20px',
                cursor: 'pointer',
                boxShadow: '0 4px 10px rgba(52, 168, 83, 0.15)',
                transition: 'all 0.2s'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.backgroundColor = '#34a853';
                e.currentTarget.style.transform = 'translateY(-1px)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = '#34a853';
                e.currentTarget.style.transform = 'none';
              }}
            >
              Jetzt unverbindlich testen
            </button>
          </div>

          {/* Mobile Menu Button */}
          <div className="mobile-only" style={{ display: 'none' }}>
            <button 
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: '#000000',
                padding: '4px'
              }}
            >
              {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            width: '100%',
            backgroundColor: '#ffffff',
            borderBottom: '1px solid #e8e8ed',
            boxShadow: '0 10px 20px rgba(0,0,0,0.05)',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
            zIndex: 999
          }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ fontWeight: 700, fontSize: '12px', color: '#7d7d82', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Funktionen</div>
              <div onClick={() => scrollToSection('usps')} style={{ fontWeight: 600, fontSize: '16px', color: '#232326', paddingLeft: '8px' }}>Stundenplan-Designer</div>
              <div onClick={() => scrollToSection('usps')} style={{ fontWeight: 600, fontSize: '16px', color: '#232326', paddingLeft: '8px' }}>Smart Room Engine</div>
              <div onClick={() => scrollToSection('usps')} style={{ fontWeight: 600, fontSize: '16px', color: '#232326', paddingLeft: '8px' }}>Digitales Hausaufgabenheft</div>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ fontWeight: 700, fontSize: '12px', color: '#7d7d82', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Zielgruppen</div>
              <div onClick={() => scrollToSection('target-audiences')} style={{ fontWeight: 600, fontSize: '16px', color: '#ea4335', paddingLeft: '8px' }}>Für Schulleiter &amp; Admins</div>
              <div onClick={() => scrollToSection('target-audiences')} style={{ fontWeight: 600, fontSize: '16px', color: '#34a853', paddingLeft: '8px' }}>Für Musiklehrer</div>
              <div onClick={() => scrollToSection('target-audiences')} style={{ fontWeight: 600, fontSize: '16px', color: '#34a853', paddingLeft: '8px' }}>Für Schüler &amp; Eltern</div>
            </div>

            <div onClick={() => { scrollToSection('pricing'); setMobileMenuOpen(false); }} style={{ fontWeight: 600, fontSize: '16px', color: '#232326', cursor: 'pointer' }}>Preise</div>
            
            <div onClick={() => { setShowPrivacyAudits(true); setMobileMenuOpen(false); }} style={{ fontWeight: 650, fontSize: '16px', color: '#34a853', cursor: 'pointer' }}>🛡️ Datenschutz &amp; Sicherheit</div>
            
            <hr style={{ border: 'none', borderTop: '1px solid #e8e8ed' }} />

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <button 
                onClick={onLogin}
                style={{
                  width: '100%',
                  padding: '12px',
                  backgroundColor: 'transparent',
                  border: '1px solid #e8e8ed',
                  borderRadius: '100px',
                  fontWeight: 600,
                  fontSize: '16px',
                  color: '#232326',
                  cursor: 'pointer'
                }}
              >
                Anmelden
              </button>
              <button 
                onClick={() => triggerProtectedRegistration()}
                style={{
                  width: '100%',
                  padding: '12px',
                  backgroundColor: '#34a853',
                  border: 'none',
                  borderRadius: '100px',
                  fontWeight: 600,
                  fontSize: '16px',
                  color: '#ffffff',
                  cursor: 'pointer'
                }}
              >
                Jetzt unverbindlich testen
              </button>
            </div>
          </div>
        )}
      </header>

      {/* 🚀 2. Hero-Sektion (Apple Copy Rewrite) */}
      <section id="hero" style={{
        maxWidth: '1280px',
        width: '100%',
        margin: '0 auto',
        padding: '80px 24px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
        height: 'auto'
      }}>
        {/* Eyebrow Kicker Badge */}
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          padding: '6px 16px',
          borderRadius: '100px',
          backgroundColor: '#e6f4ea',
          color: '#137333',
          fontSize: '13px',
          fontWeight: 700,
          letterSpacing: '0.02em',
          marginBottom: '20px',
          border: '1px solid #ceead6'
        }}>
          <span>☁️</span> Das All-in-One Cloud-System für moderne Musikschulen
        </div>

        <h1 style={{
          fontFamily: 'Urbanist, sans-serif',
          fontSize: 'clamp(2.5rem, 5vw, 4rem)',
          fontWeight: 900,
          lineHeight: 1.1,
          letterSpacing: '-0.04em',
          color: '#000000',
          maxWidth: '900px',
          marginBottom: '24px'
        }}>
          Deine Musikschule.<br />
          <span style={{ color: '#34a853' }}>In perfekter Harmonie.</span>
        </h1>
        
        <p style={{
          fontSize: 'clamp(1rem, 2vw, 1.22rem)',
          color: '#334155',
          maxWidth: '780px',
          lineHeight: 1.6,
          marginBottom: '36px',
          fontWeight: 500
        }}>
          Die Plattform für das, was wirklich zählt: Musik. <CampusGroovelabText fontWeight={800} /> ist der smarte Praxis-Begleiter für deinen gesamten Musikschulalltag: Intelligente Raum- &amp; Stundenplanung, digitales Aufgabenheft und motivierender Übebegleiter in einem – für reibungslose Abläufe im Team, damit der Fokus auf dem Musizieren liegt.
        </p>

        {/* Form and CTA */}
        <form onSubmit={handleCTASubmit} style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '12px',
          justifyContent: 'center',
          width: '100%',
          maxWidth: '540px',
          marginBottom: '16px'
        }}>
          <input 
            type="email" 
            placeholder="Dienstliche E-Mail-Adresse eingeben..."
            aria-label="Deine E-Mail-Adresse"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            onFocus={(e) => {
              e.currentTarget.style.borderColor = '#34a853';
              e.currentTarget.style.boxShadow = '0 0 0 3px rgba(52, 168, 83, 0.2), inset 0 1px 2px rgba(0,0,0,0.02)';
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = '#e8e8ed';
              e.currentTarget.style.boxShadow = 'inset 0 1px 2px rgba(0,0,0,0.02)';
            }}
            style={{
              flex: '1 1 280px',
              padding: '16px 24px',
              borderRadius: '100px',
              border: '1px solid #e8e8ed',
              fontSize: '16px',
              backgroundColor: '#ffffff',
              outline: 'none',
              boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.02)',
              transition: 'all 0.2s'
            }}
          />
          <button 
            type="submit"
            style={{
              flex: '0 0 auto',
              backgroundColor: '#34a853',
              color: '#ffffff',
              border: 'none',
              borderRadius: '100px',
              fontWeight: 700,
              fontSize: '16px',
              padding: '16px 32px',
              cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(52, 168, 83, 0.2)',
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.backgroundColor = '#2e944b';
              e.currentTarget.style.transform = 'translateY(-1px)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.backgroundColor = '#34a853';
              e.currentTarget.style.transform = 'none';
            }}
          >
            Jetzt unverbindlich testen <ArrowRight size={18} />
          </button>
        </form>

        <p style={{
          fontSize: '11.5px',
          color: '#64748b',
          marginTop: '-4px',
          marginBottom: '22px',
          textAlign: 'center',
          lineHeight: 1.4,
          maxWidth: '540px'
        }}>
          Mit Klick auf „Jetzt unverbindlich testen“ stimmen Sie den <a href="#" onClick={(e) => { e.preventDefault(); setActiveDocument('terms'); }} style={{ color: '#34a853', textDecoration: 'underline', fontWeight: 700 }}>Nutzungsbedingungen</a> zu und bestätigen, die <a href="#" onClick={(e) => { e.preventDefault(); setActiveDocument('privacy'); }} style={{ color: '#34a853', textDecoration: 'underline', fontWeight: 700 }}>Datenschutzerklärung</a> zur Kenntnis genommen zu haben.
        </p>

        {/* 3 Tier-1 Enterprise Trust Chips */}
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '16px',
          marginBottom: '56px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#475569', fontWeight: 600 }}>
            <CheckCircle2 size={15} color="#34a853" />
            <span>30 Tage unverbindliche Testphase</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#475569', fontWeight: 600 }}>
            <CheckCircle2 size={15} color="#34a853" />
            <span>Keine Kreditkarte &amp; keine Einrichtungsgebühr</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#475569', fontWeight: 600 }}>
            <ShieldCheck size={15} color="#34a853" />
            <span>DSGVO- &amp; nDSG-konforme Server</span>
          </div>
        </div>

        {/* Visual: Browser Mockup of Schedule Board */}
        <div style={{
          width: '100%',
          maxWidth: '1000px',
          borderRadius: '20px',
          overflow: 'hidden',
          boxShadow: '0 25px 60px rgba(0, 0, 0, 0.1)',
          border: '1px solid #e8e8ed',
          backgroundColor: '#ffffff',
          position: 'relative'
        }}>
          {/* Browser Window Header Mockup */}
          <div style={{
            height: '40px',
            backgroundColor: '#f3f3f6',
            borderBottom: '1px solid #e8e8ed',
            display: 'flex',
            alignItems: 'center',
            padding: '0 16px',
            gap: '8px'
          }}>
            <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#ff5f56' }}></div>
            <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#ffbd2e' }}></div>
            <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#27c93f' }}></div>
            <div style={{
              marginLeft: '24px',
              backgroundColor: '#ffffff',
              borderRadius: '6px',
              fontSize: '11px',
              color: '#7d7d82',
              padding: '2px 32px',
              border: '1px solid #e8e8ed',
              fontWeight: 500
            }}>
              campus-groovelab.de/stundenplan
            </div>
          </div>
          <img 
            src="/screenshots/media__1782677535200.png" 
            alt="Campus-Groovelab Schedule Board" 
            style={{
              width: '100%',
              height: 'auto',
              display: 'block'
            }}
          />
        </div>
      </section>

      {/* 🧩 3. Die drei Zielgruppen-Säulen */}
      <section id="target-audiences" style={{
        backgroundColor: '#ffffff',
        borderTop: '1px solid #e8e8ed',
        borderBottom: '1px solid #e8e8ed',
        height: 'auto',
        padding: '100px 24px'
      }}>
        <div style={{
          maxWidth: '1280px',
          width: '100%',
          margin: '0 auto'
        }}>
          <div style={{ textAlign: 'center', marginBottom: '64px' }}>
            <span style={{
              fontSize: '13px',
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              color: '#34a853',
              backgroundColor: '#e6f4ea',
              padding: '6px 12px',
              borderRadius: '100px',
              display: 'inline-block',
              marginBottom: '16px'
            }}>
              Zielgruppen
            </span>
            <h2 style={{
              fontFamily: 'Urbanist, sans-serif',
              fontSize: 'clamp(2rem, 4vw, 3rem)',
              fontWeight: 900,
              letterSpacing: '-0.03em',
              color: '#000000'
            }}>
              Ein System. Drei perfekt abgestimmte Welten.
            </h2>
          </div>
          {/* Grid Layout (Strictly 64px gap for sections as requested, and auto-fit columns) */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '64px'
          }}>
            
            {/* Administration & Sekretariat */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              backgroundColor: '#ffffff',
              borderRadius: '24px',
              border: '1px solid #e8e8ed',
              padding: '32px',
              boxShadow: '0 4px 20px rgba(0,0,0,0.01)',
              position: 'relative',
              height: 'auto'
            }}>
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '16px',
                backgroundColor: '#fce8e6',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '24px'
              }}>
                <Layers size={24} style={{ color: '#ea4335' }} />
              </div>
              <h3 style={{
                fontFamily: 'Urbanist, sans-serif',
                fontSize: '20px',
                fontWeight: 800,
                color: '#000000',
                marginBottom: '8px'
              }}>
                Sekretariat &amp; Verwaltung
              </h3>
              
              <div style={{ marginBottom: '24px' }}>
                <h4 style={{ fontSize: '13px', fontWeight: 800, color: '#ea4335', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '8px' }}>
                  Direkte Entlastung &amp; Schnelle Prozesse
                </h4>
                <p style={{ fontSize: '14.5px', color: '#232326', lineHeight: 1.55, fontWeight: 550 }}>
                  Schluss mit zeitraubender Kommunikation über drei Ecken. <CampusGroovelabText fontWeight={700} /> bündelt Raumplanung, Ausfall- &amp; Abwesenheits-Management und Schüler-Onboarding in einer zentralen Schaltzentrale. Die Verwaltung behält die volle Kontrolle, spart bis zu 80 % Routine-Aufwand und eliminiert mühsame Telefonketten.
                </p>
              </div>

              <div style={{ marginTop: 'auto', borderTop: '1px solid #e8e8ed', paddingTop: '24px' }}>
                <h5 style={{ fontSize: '12px', fontWeight: 700, color: '#7d7d82', textTransform: 'uppercase', marginBottom: '16px' }}>Highlights:</h5>
                <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '12px', padding: 0, margin: 0 }}>
                  <li style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '14px', color: '#232326' }}>
                    <Check size={16} style={{ color: '#ea4335', marginTop: '2px', flexShrink: 0 }} />
                    <span><strong>1-Klick-Ausfallabwicklung:</strong> Betroffene Schüler und Lehrkräfte sofort per Push erreichen – Telefonketten entfallen komplett.</span>
                  </li>
                  <li style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '14px', color: '#232326' }}>
                    <Check size={16} style={{ color: '#ea4335', marginTop: '2px', flexShrink: 0 }} />
                    <span><strong>Intelligenter Raumplaner:</strong> Konfliktfreie Raumbelegung mit integriertem Genehmigungs-Workflow.</span>
                  </li>
                  <li style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '14px', color: '#232326' }}>
                    <Check size={16} style={{ color: '#ea4335', marginTop: '2px', flexShrink: 0 }} />
                    <span><strong>Zero-Mail &amp; DSGVO-Minimalismus:</strong> Keine Kinder-E-Mails oder Bankdaten – maximaler Haftungsschutz für die Schulleitung.</span>
                  </li>
                  <li style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '14px', color: '#232326' }}>
                    <Check size={16} style={{ color: '#ea4335', marginTop: '2px', flexShrink: 0 }} />
                    <span><strong>Blitz-Schul-Onboarding:</strong> Stammdaten-Import, QR-Aktivierung und sofortige Betriebsbereitschaft in wenigen Minuten.</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Lehrkräfte */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              backgroundColor: '#ffffff',
              borderRadius: '24px',
              border: '1px solid #e8e8ed',
              padding: '32px',
              boxShadow: '0 4px 20px rgba(0,0,0,0.01)',
              position: 'relative',
              height: 'auto'
            }}>
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '16px',
                backgroundColor: '#e6f4ea',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '24px'
              }}>
                <Users size={24} style={{ color: '#34a853' }} />
              </div>
              <h3 style={{
                fontFamily: 'Urbanist, sans-serif',
                fontSize: '20px',
                fontWeight: 800,
                color: '#000000',
                marginBottom: '8px'
              }}>
                Lehrkräfte
              </h3>

              <div style={{ marginBottom: '24px' }}>
                <h4 style={{ fontSize: '13px', fontWeight: 800, color: '#34a853', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '8px' }}>
                  Einfache Organisation &amp; Dokumentation
                </h4>
                <p style={{ fontSize: '14.5px', color: '#232326', lineHeight: 1.55, fontWeight: 550 }}>
                  Maximale pädagogische Freiheit bei minimalem Organisationsaufwand. Erstelle deinen Stundenplan per Drag &amp; Drop, halte Hausaufgaben und Audio-Aufnahmen direkt im Unterricht fest und schütze deinen Feierabend durch datenschutzkonforme Kommunikationskanäle.
                </p>
              </div>

              <div style={{ marginTop: 'auto', borderTop: '1px solid #e8e8ed', paddingTop: '24px' }}>
                <h5 style={{ fontSize: '12px', fontWeight: 700, color: '#7d7d82', textTransform: 'uppercase', marginBottom: '16px' }}>Highlights:</h5>
                <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '12px', padding: 0, margin: 0 }}>
                  <li style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '14px', color: '#232326' }}>
                    <Check size={16} style={{ color: '#34a853', marginTop: '2px', flexShrink: 0 }} />
                    <span><strong>Intelligenter Stundenplan-Designer:</strong> Flexible Wochenplanung: Eigene Schüler sekundenschnell per Drag &amp; Drop oder per Auto-Zuteilung in freie Zeitslots einteilen.</span>
                  </li>
                  <li style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '14px', color: '#232326' }}>
                    <Check size={16} style={{ color: '#34a853', marginTop: '2px', flexShrink: 0 }} />
                    <span><strong>1:1-Schülerchats &amp; Feierabendschutz:</strong> Direkte, DSGVO-konforme Kommunikation ohne WhatsApp oder private Handynummer – mit 48h-Auto-Freeze bei stundenbezogenen Nachrichten.</span>
                  </li>
                  <li style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '14px', color: '#232326' }}>
                    <Check size={16} style={{ color: '#34a853', marginTop: '2px', flexShrink: 0 }} />
                    <span><strong>Digitales Hausaufgabenheft &amp; Meisterwerke:</strong> Hausaufgaben, pädagogische Notizen und Play-Along-Aufnahmen in unter 30 Sekunden direkt im Unterricht dokumentieren.</span>
                  </li>
                  <li style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '14px', color: '#232326' }}>
                    <Check size={16} style={{ color: '#34a853', marginTop: '2px', flexShrink: 0 }} />
                    <span><strong>Automatischer Handy-Kalendersync (iCal):</strong> Eigene Unterrichtsstunden, Ausfälle und Terminänderungen automatisch im Smartphone-Kalender (z. B. Apple Kalender, Google oder Outlook).</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Schüler & Eltern */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              backgroundColor: '#ffffff',
              borderRadius: '24px',
              border: '1px solid #e8e8ed',
              padding: '32px',
              boxShadow: '0 4px 20px rgba(0,0,0,0.01)',
              position: 'relative',
              height: 'auto'
            }}>
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '16px',
                backgroundColor: '#e6f4ea',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '24px'
              }}>
                <Sparkles size={24} style={{ color: '#34a853' }} />
              </div>
              <h3 style={{
                fontFamily: 'Urbanist, sans-serif',
                fontSize: '20px',
                fontWeight: 800,
                color: '#000000',
                marginBottom: '8px'
              }}>
                Schüler &amp; Eltern
              </h3>

              <div style={{ marginBottom: '24px' }}>
                <h4 style={{ fontSize: '13px', fontWeight: 800, color: '#34a853', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '8px' }}>
                  Der perfekte Übebegleiter
                </h4>
                <p style={{ fontSize: '14.5px', color: '#232326', lineHeight: 1.55, fontWeight: 550 }}>
                  Der moderne Begleiter für motivierte Schüler und entspannte Eltern. Spielerische Routinen, XP-Punkte und innovative Übe-Werkzeuge verwandeln das tägliche Üben von einer lästigen Pflicht in eine begeisternde Gewohnheit.
                </p>
              </div>

              <div style={{ marginTop: 'auto', borderTop: '1px solid #e8e8ed', paddingTop: '24px' }}>
                <h5 style={{ fontSize: '12px', fontWeight: 700, color: '#7d7d82', textTransform: 'uppercase', marginBottom: '16px' }}>Highlights:</h5>
                <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '12px', padding: 0, margin: 0 }}>
                  <li style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '14px', color: '#232326' }}>
                    <Check size={16} style={{ color: '#34a853', marginTop: '2px', flexShrink: 0 }} />
                    <span><strong>Gamification &amp; Übe-Streaks:</strong> XP-Belohnungen, Abzeichen und Fortschritts-Tracker, die Kinder dauerhaft motivieren.</span>
                  </li>
                  <li style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '14px', color: '#232326' }}>
                    <Check size={16} style={{ color: '#34a853', marginTop: '2px', flexShrink: 0 }} />
                    <span><strong>Digitales Aufgabenheft &amp; Audio-Vault:</strong> Hausaufgaben, Lehrkraft-Notizen und Play-Along-Aufnahmen jederzeit griffbereit auf dem iPad/Smartphone.</span>
                  </li>
                  <li style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '14px', color: '#232326' }}>
                    <Check size={16} style={{ color: '#34a853', marginTop: '2px', flexShrink: 0 }} />
                    <span><strong>Loopstation &amp; Übe-Timer:</strong> Interaktive Audio-Tools für kreatives, fokussiertes und selbstständiges Üben zu Hause.</span>
                  </li>
                  <li style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '14px', color: '#232326' }}>
                    <Check size={16} style={{ color: '#34a853', marginTop: '2px', flexShrink: 0 }} />
                    <span><strong>Volle Transparenz für Eltern:</strong> Keine verpassten Termine dank automatischem iCal-Sync und Push-Nachrichten bei Raum- oder Zeitänderungen.</span>
                  </li>
                </ul>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ⚡ 4. Die USPs im Detail (Interaktive Feature-Tabs) */}
      <section id="usps" style={{
        maxWidth: '1280px',
        width: '100%',
        margin: '0 auto',
        padding: '100px 24px',
        height: 'auto'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '64px' }}>
          <span style={{
            fontSize: '13px',
            fontWeight: 800,
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            color: '#34a853',
            backgroundColor: '#e6f4ea',
            padding: '6px 12px',
            borderRadius: '100px',
            display: 'inline-block',
            marginBottom: '16px'
          }}>
            Features
          </span>
          <h2 style={{
            fontFamily: 'Urbanist, sans-serif',
            fontSize: 'clamp(2rem, 4vw, 3rem)',
            fontWeight: 900,
            letterSpacing: '-0.03em',
            color: '#000000',
            marginBottom: '16px'
          }}>
            Warum Musikschulen <span style={{ color: '#34a853' }}>Campus</span>-<span style={{ color: '#eab308' }}>Groovelab</span> lieben
          </h2>
          <p style={{ fontSize: '16px', color: '#7d7d82', maxWidth: '600px', margin: '0 auto' }}>
            Erlebe die einzigartigen Funktionen, die unsere Plattform zum Standard für moderne Musikschulen machen.
          </p>
        </div>

        {/* Tabs Layout */}
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '48px',
          alignItems: 'start'
        }}>
          {/* Left: Tab Selectors (Flex Column on Desktop) */}
          <div style={{
            flex: '1 1 300px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}>
            {usps.map((usp, idx) => (
              <button
                key={idx}
                onClick={() => setActiveTab(idx)}
                style={{
                  textAlign: 'left',
                  padding: '24px',
                  borderRadius: '16px',
                  border: activeTab === idx ? '1px solid #e8e8ed' : '1px solid transparent',
                  backgroundColor: activeTab === idx ? '#ffffff' : 'transparent',
                  boxShadow: activeTab === idx ? '0 10px 30px rgba(0,0,0,0.03)' : 'none',
                  cursor: 'pointer',
                  width: '100%',
                  transition: 'all 0.2s',
                  outline: 'none'
                }}
              >
                <div style={{
                  fontSize: '18px',
                  fontWeight: 800,
                  color: '#000000',
                  marginBottom: '8px'
                }}>
                  {usp.title}
                </div>
                <div style={{
                  fontSize: '14px',
                  color: '#7d7d82',
                  lineHeight: 1.4
                }}>
                  {usp.slogan}
                </div>
              </button>
            ))}
          </div>

          {/* Right: Tab Detail Panel */}
          <div style={{
            flex: '1.5 1 450px',
            backgroundColor: '#ffffff',
            borderRadius: '24px',
            border: '1px solid #e8e8ed',
            padding: '40px',
            boxShadow: '0 15px 45px rgba(0,0,0,0.02)',
            display: 'flex',
            flexDirection: 'column',
            gap: '24px',
            height: 'auto'
          }}>
            <div>
              <h3 style={{
                fontFamily: 'Urbanist, sans-serif',
                fontSize: '24px',
                fontWeight: 900,
                color: '#000000',
                marginBottom: '8px'
              }}>
                {usps[activeTab].title}
              </h3>
              <p style={{
                fontSize: '15px',
                fontWeight: 700,
                color: '#34a853',
                marginBottom: '16px'
              }}>
                {usps[activeTab].slogan}
              </p>
              <p style={{
                fontSize: '15px',
                color: '#232326',
                lineHeight: 1.6
              }}>
                {usps[activeTab].description}
              </p>
            </div>

            {/* Images display */}
            <div style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '16px',
              justifyContent: 'center',
              backgroundColor: '#f3f3f6',
              borderRadius: '16px',
              padding: '24px',
              border: '1px solid #e8e8ed'
            }}>
              {usps[activeTab].images.map((img, imgIdx) => (
                <div key={imgIdx} style={{
                  flex: '1 1 200px',
                  maxWidth: usps[activeTab].images.length > 1 ? '320px' : '100%',
                  borderRadius: '12px',
                  overflow: 'hidden',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.06)',
                  border: '1px solid #e8e8ed'
                }}>
                  <img 
                    src={img} 
                    alt={usps[activeTab].title} 
                    style={{
                      width: '100%',
                      height: 'auto',
                      display: 'block'
                    }}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 🔒 5. DSGVO-Sicherheit ("Security by Design") */}
      <section style={{
        backgroundColor: '#09090b',
        color: '#ffffff',
        height: 'auto',
        padding: '100px 24px',
        borderTop: '1px solid #1f1f23'
      }}>
        <div style={{
          maxWidth: '1280px',
          width: '100%',
          margin: '0 auto',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '64px',
          alignItems: 'center'
        }}>
          {/* Left Column (Text) */}
          <div style={{ flex: '1 1 400px' }}>
            <span style={{
              fontSize: '13px',
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              color: '#eab308',
              backgroundColor: 'rgba(234, 179, 8, 0.1)',
              padding: '6px 12px',
              borderRadius: '100px',
              display: 'inline-block',
              marginBottom: '16px'
            }}>
              Datenschutz &amp; DSGVO
            </span>
            
            <h2 style={{
              fontFamily: 'Urbanist, sans-serif',
              fontSize: 'clamp(2rem, 4vw, 3rem)',
              fontWeight: 900,
              letterSpacing: '-0.03em',
              lineHeight: 1.1,
              marginBottom: '24px'
            }}>
              Datenschutz &amp; DSGVO. In sicheren Händen.
            </h2>
            
            <p style={{
              fontSize: '16px',
              color: '#a1a1aa',
              lineHeight: 1.6,
              marginBottom: '32px'
            }}>
              Wir überlassen Datenschutz nicht dem Zufall. Weil <span style={{ fontWeight: 800 }}><span style={{ color: '#22c55e' }}>Campus</span>-<span style={{ color: '#eab308' }}>Groovelab</span></span> als fokussierte pädagogische Praxis-Plattform konzipiert ist, verarbeiten wir nur das absolute Minimum an Daten – keine Kinder-Mails, keine Bankverbindungen, keine Wohnadressen. Dieser minimale Daten-Fußabdruck ermöglicht uns innovative Interaktionsfeatures, die klassische, überladene Administrationssoftwares aus Datenschutzgründen gar nicht erst umsetzen dürfen.
            </p>

            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '20px',
              textAlign: 'left',
              marginBottom: '32px'
            }}>
              <div>
                <h4 style={{ fontSize: '15px', fontWeight: 800, color: '#ffffff', marginBottom: '4px' }}>🛡️ Hermetische Datenisolation (PostgreSQL RLS)</h4>
                <p style={{ fontSize: '13.5px', color: '#a1a1aa', lineHeight: 1.5 }}>
                  Schüler- und Lehrerdaten sind durch Row-Level Security direkt im Datenbankkern isoliert. Datenabfragen werden auf Kernel-Ebene validiert – Datenlecks durch Anwendungsfehler sind technisch ausgeschlossen.
                </p>
              </div>
              <div>
                <h4 style={{ fontSize: '15px', fontWeight: 800, color: '#ffffff', marginBottom: '4px' }}>🎫 Zero-Mail &amp; Kryptografische Ausweise</h4>
                <p style={{ fontSize: '13.5px', color: '#a1a1aa', lineHeight: 1.5 }}>
                  Der Schülerausweis enthält keine Klartext-Personendaten. Der QR-Code codiert ein zufälliges kryptografisches Token (UUIDv4) – für Fremde absolut unlesbar (DSGVO-konforme Pseudonymisierung ohne Passwörter für Kinder).
                </p>
              </div>
              <div>
                <h4 style={{ fontSize: '15px', fontWeight: 800, color: '#ffffff', marginBottom: '4px' }}>🔐 1-Klick-Sperrung &amp; Session-Revocation</h4>
                <p style={{ fontSize: '13.5px', color: '#a1a1aa', lineHeight: 1.5 }}>
                  Geht ein Ausweis verloren, sperrst und regenerierst du das Token im Admin-Bereich mit nur 1 Klick – ohne Passwörter oder Schülerprofile ändern zu müssen.
                </p>
              </div>
              <div>
                <h4 style={{ fontSize: '15px', fontWeight: 800, color: '#ffffff', marginBottom: '4px' }}>🔒 Modul-Kapselung auf Schul-Geräten</h4>
                <p style={{ fontSize: '13.5px', color: '#a1a1aa', lineHeight: 1.5 }}>
                  Auf gemeinsam genutzten Schul-iPads sperrt die App den Campus-Bereich automatisch ab. Der Wechsel dorthin erfordert eine kurze Bestätigung der Lehrkraft.
                </p>
              </div>
              <div>
                <h4 style={{ fontSize: '15px', fontWeight: 800, color: '#ffffff', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <HardDrive size={17} style={{ color: '#eab308' }} />
                  <span>Audio-Tresor &amp; Physische Sofort-Löschung</span>
                </h4>
                <p style={{ fontSize: '13.5px', color: '#a1a1aa', lineHeight: 1.5 }}>
                  Schüler-Aufnahmen und Übetracks werden auf ISO 27001 zertifizierten deutschen Servern AES-256 verschlüsselt gespeichert. Bei Löschung greift die physische Sofort-Vernichtung (Recht auf Vergessenwerden nach Art. 17 DSGVO).
                </p>
              </div>
            </div>

            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  backgroundColor: 'rgba(234, 179, 8, 0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <ShieldCheck size={18} style={{ color: '#eab308' }} />
                </div>
                <span style={{ fontSize: '15px', fontWeight: 600 }}>100% deutsches Hosting in ISO 27001 Rechenzentren</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  backgroundColor: 'rgba(234, 179, 8, 0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <ShieldCheck size={18} style={{ color: '#eab308' }} />
                </div>
                <span style={{ fontSize: '15px', fontWeight: 600 }}>Token-Isolation &amp; JWE-Verschlüsselung via BFF-Gateway</span>
              </div>

              <div 
                onClick={() => setShowPrivacyAudits(true)}
                style={{
                  marginTop: '16px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '12px 20px',
                  borderRadius: '16px',
                  background: 'linear-gradient(135deg, rgba(52, 168, 83, 0.15) 0%, rgba(52, 168, 83, 0.25) 100%)',
                  border: '1px solid rgba(52, 168, 83, 0.3)',
                  color: '#e6f4ea',
                  cursor: 'pointer',
                  fontWeight: 750,
                  fontSize: '13.5px',
                  transition: 'all 0.2s',
                  width: 'fit-content'
                }}
                className="hover-scale"
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><ShieldCheck size={16} color="#ffffff" /> 20 von 20 Sicherheits-Stufen erfüllt</span>
                <span style={{ 
                  background: '#34a853', 
                  color: 'white', 
                  fontSize: '11px', 
                  fontWeight: 800, 
                  padding: '3px 8px', 
                  borderRadius: '8px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em'
                }}>Details ansehen</span>
              </div>
            </div>
          </div>

          {/* Right Column (Visual representation) */}
          <div style={{
            flex: '1 1 400px',
            display: 'flex',
            justifyContent: 'center'
          }}>
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              width: '100%',
              maxWidth: '480px'
            }}>
              <div style={{
                alignSelf: 'flex-start',
                backgroundColor: 'rgba(234, 179, 8, 0.1)',
                border: '1px solid rgba(234, 179, 8, 0.3)',
                borderRadius: '100px',
                padding: '6px 14px',
                fontSize: '11px',
                fontWeight: 800,
                color: '#f59e0b',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                marginBottom: '-4px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 4px 12px rgba(234, 179, 8, 0.05)'
              }}>
                <span>🌟 HÖCHSTE SICHERHEITS-STUFE: POSTGRESQL RLS</span>
              </div>
              <div style={{
                backgroundColor: '#18181b',
                border: '1px solid #27272a',
                borderRadius: '24px',
                padding: '32px',
                width: '100%',
                boxShadow: '0 20px 40px rgba(0,0,0,0.5)'
              }}>
                <div style={{
                  fontFamily: 'Courier New, monospace',
                  fontSize: '13px',
                  color: '#34a853',
                  lineHeight: 1.5
                }}>
                  <div style={{ color: '#71717a' }}>-- PostgreSQL Row-Level Security (RLS)</div>
                  <div style={{ color: '#eab308' }}>CREATE POLICY</div> <span style={{ color: '#ffffff' }}>school_isolation_policy</span>
                  <div>  <span style={{ color: '#eab308' }}>ON</span> <span style={{ color: '#ffffff' }}>public.users</span></div>
                  <div>  <span style={{ color: '#eab308' }}>FOR ALL</span></div>
                  <div>  <span style={{ color: '#eab308' }}>USING</span> (</div>
                  <div style={{ color: '#ffffff' }}>    school_id = auth.jwt() -&gt;&gt; 'school_id'</div>
                  <div>  );</div>
                  <br />
                  <div style={{ color: '#71717a' }}>-- Status: Hermetische Trennung aktiv</div>
                  <div style={{ color: '#38bdf8' }}>STATUS: SECURE_DATA_PROTECTION_ACTIVE</div>
                </div>
              </div>
              <p style={{
                fontSize: '13.5px',
                color: '#7d7d82',
                lineHeight: 1.45,
                margin: 0,
                textAlign: 'left',
                fontWeight: 500,
                paddingLeft: '8px'
              }}>
                <strong>Sicherheit, die im Datenbankkern lebt:</strong> Diese reale Sicherheits-Policy garantiert, dass alle Datenabfragen direkt auf Kernel-Ebene mandantenisoliert werden. Unberechtigte mandantenübergreifende Zugriffe sind durch das Zero-Trust-Prinzip technisch ausgeschlossen.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 💶 6. Transparente Preise */}
      <section id="pricing" style={{
        backgroundColor: '#ffffff',
        borderTop: '1px solid #e8e8ed',
        borderBottom: '1px solid #e8e8ed',
        height: 'auto',
        padding: '100px 24px'
      }}>
        <div style={{
          maxWidth: '1280px',
          width: '100%',
          margin: '0 auto',
          textAlign: 'center'
        }}>
          <span style={{
            fontSize: '13px',
            fontWeight: 800,
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            color: '#34a853',
            backgroundColor: '#e6f4ea',
            padding: '6px 12px',
            borderRadius: '100px',
            display: 'inline-block',
            marginBottom: '16px'
          }}>
            Preise
          </span>
          
          <h2 style={{
            fontFamily: 'Urbanist, sans-serif',
            fontSize: 'clamp(2rem, 4vw, 3rem)',
            fontWeight: 900,
            letterSpacing: '-0.03em',
            marginBottom: '24px',
            color: '#000000'
          }}>
            Fokus auf die Musik. Nicht auf teure Lizenzverträge.
          </h2>

          <p style={{
            fontSize: '16px',
            color: '#7d7d82',
            maxWidth: '650px',
            margin: '0 auto 64px auto',
            lineHeight: 1.6
          }}>
            Faire, planbare Cloud-Flatrates für deine Musikschule. Keine teuren Software-Lizenzen, keine Einrichtungsgebühren und DSGVO-konformes Hosting in Deutschland.
          </p>

          {/* Professional Senior Sales Pricing Model */}
          <div style={{
            maxWidth: '1100px',
            margin: '0 auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '48px'
          }}>
            
            {/* Prominent Core Value Banner: Transparent Cloud Hosting */}
            <div style={{
              background: 'linear-gradient(135deg, #e6f4ea 0%, #f4fbf7 100%)',
              border: '1.5px solid rgba(52, 168, 83, 0.25)',
              borderRadius: '32px',
              padding: '40px 32px',
              textAlign: 'center',
              boxShadow: '0 12px 30px rgba(52, 168, 83, 0.04)'
            }}>
              <span style={{
                background: '#34a853',
                color: '#ffffff',
                fontSize: '11px',
                fontWeight: 900,
                padding: '6px 16px',
                borderRadius: '100px',
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                display: 'inline-block',
                marginBottom: '16px'
              }}>
                Unsere Philosophie
              </span>
              <h3 style={{
                fontFamily: 'Urbanist, sans-serif',
                fontSize: '32px',
                fontWeight: 900,
                color: '#0e381e',
                margin: '0 0 12px 0',
                letterSpacing: '-0.02em'
              }}>
                Transparentes Cloud-Hosting statt teurer Software-Lizenzen
              </h3>
              <p style={{
                fontSize: '16px',
                color: '#2d4d38',
                maxWidth: '750px',
                margin: '0 auto',
                lineHeight: 1.6,
                fontWeight: 550
              }}>
                Keine Einrichtungsgebühr, keine Lizenzkaufgebühren und keine Knebelverträge. Die Software-Bereitstellung sowie Verwaltungs- und Sekretariats-Nutzer sind dauerhaft inklusive ({isChf ? 'CHF 0.00' : '0,00 €'}). Du zahlst ausschließlich die transparente Server-Flatrate (ab {fmt(Math.min(pricing.campus, pricing.groovelab))} / Mo.), den minimalen Basisbeitrag ({fmt(pricing.passiveStudent)} / Mo. je Schüler-Datensatz) und aktive Modul-Nutzung bei tatsächlicher Aktivierung.
              </p>

              {/* 🇨🇭 / 🇪🇺 Interactive Country & Currency Switcher (Tier-1 SaaS Enterprise Standard) */}
              <div style={{ marginTop: '28px', display: 'flex', justifyContent: 'center' }}>
                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  background: '#f1f5f9',
                  padding: '5px',
                  borderRadius: '100px',
                  border: '1.5px solid #e2e8f0',
                  boxShadow: '0 2px 10px rgba(0,0,0,0.04)',
                  gap: '4px'
                }}>
                  <button
                    type="button"
                    onClick={() => masterPricing.setCurrency('EUR')}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '8px 20px',
                      borderRadius: '100px',
                      border: 'none',
                      background: !isChf ? '#ffffff' : 'transparent',
                      color: !isChf ? '#0f172a' : '#64748b',
                      fontWeight: !isChf ? 800 : 600,
                      fontSize: '13.5px',
                      cursor: 'pointer',
                      boxShadow: !isChf ? '0 2px 8px rgba(0,0,0,0.08)' : 'none',
                      transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
                    }}
                  >
                    <span style={{ fontSize: '15px' }}>🇩🇪 🇦🇹</span>
                    <span>Deutschland &amp; Österreich (€ EUR)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => masterPricing.setCurrency('CHF')}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '8px 20px',
                      borderRadius: '100px',
                      border: 'none',
                      background: isChf ? '#ffffff' : 'transparent',
                      color: isChf ? '#0f172a' : '#64748b',
                      fontWeight: isChf ? 800 : 600,
                      fontSize: '13.5px',
                      cursor: 'pointer',
                      boxShadow: isChf ? '0 2px 8px rgba(0,0,0,0.08)' : 'none',
                      transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
                    }}
                  >
                    <span style={{ fontSize: '15px' }}>🇨🇭</span>
                    <span>Schweiz (CHF)</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Grid for Hosting Modules & Bundles */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
                <h4 style={{
                  fontFamily: 'Urbanist, sans-serif',
                  fontSize: '22px',
                  fontWeight: 800,
                  color: '#0f172a',
                  margin: 0,
                  textAlign: 'left'
                }}>
                  1. Dedicated Server-Hosting &amp; Infrastruktur
                </h4>
                <span style={{
                  fontSize: '12.5px',
                  color: '#64748b',
                  fontWeight: 600,
                  background: '#f8fafc',
                  padding: '4px 12px',
                  borderRadius: '20px',
                  border: '1px solid #e2e8f0'
                }}>
                  {isChf ? '🇨🇭 Währung: Schweizer Franken (CHF)' : '🇪🇺 Währung: Euro (EUR)'}
                </span>
              </div>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
                gap: '24px'
              }}>
                
                {/* Campus Module Card */}
                <div style={{
                  background: '#ffffff',
                  border: '1.5px solid #e2e8f0',
                  borderRadius: '24px',
                  padding: '32px 24px',
                  textAlign: 'left',
                  display: 'flex',
                  flexDirection: 'column',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.02)',
                  transition: 'all 0.2s'
                }}>
                  <span style={{ fontWeight: 800, fontSize: '12px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Basis-Hosting</span>
                  <h5 style={{ margin: '4px 0 16px 0', fontSize: '20px', fontWeight: 800, color: '#0f172a' }}>Campus-Modul</h5>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginBottom: '20px' }}>
                    <span style={{ fontSize: '36px', fontWeight: 900, color: '#0f172a' }}>{fmt(pricing.campus)}</span>
                    <span style={{ fontSize: '14px', color: '#64748b', fontWeight: 600 }}>/ Monat</span>
                  </div>
                  <p style={{ fontSize: '14px', color: '#475569', lineHeight: 1.5, margin: '0 0 24px 0', flexGrow: 1 }}>
                    Bereitstellung der zentralen Datenbank, des intelligenten Stundenplandesigners, der Raum-Engine sowie des Meisterwerk-Protokolls, Übe-Timers (inkl. Übungs-Streaks &amp; XP), der Audio-Loopstation und des 48h Auto-Freeze Chats.
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', fontSize: '13px', color: '#334155' }}>
                      <Check size={16} style={{ color: '#34a853' }} /> <span>Meisterwerk-Protokoll &amp; Hausaufgabenheft</span>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', fontSize: '13px', color: '#34a853' }}>
                      <Check size={16} style={{ color: '#34a853' }} /> <span>Übe-Timer, Streaks &amp; Audio-Loopstation</span>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', fontSize: '13px', color: '#334155' }}>
                      <Check size={16} style={{ color: '#34a853' }} /> <span>Stundenplan-Designer, Raum-Engine &amp; Chat</span>
                    </div>
                  </div>
                </div>

                {/* GrooveLab Module Card */}
                <div style={{
                  background: '#ffffff',
                  border: '1.5px solid #e2e8f0',
                  borderRadius: '24px',
                  padding: '32px 24px',
                  textAlign: 'left',
                  display: 'flex',
                  flexDirection: 'column',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.02)',
                  transition: 'all 0.2s'
                }}>
                  <span style={{ fontWeight: 800, fontSize: '12px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Praxis-Plattform</span>
                  <h5 style={{ margin: '4px 0 16px 0', fontSize: '20px', fontWeight: 800, color: '#0f172a' }}>GrooveLab-Modul</h5>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginBottom: '20px' }}>
                    <span style={{ fontSize: '36px', fontWeight: 900, color: '#0f172a' }}>{fmt(pricing.groovelab)}</span>
                    <span style={{ fontSize: '14px', color: '#64748b', fontWeight: 600 }}>/ Monat</span>
                  </div>
                  <p style={{ fontSize: '14px', color: '#475569', lineHeight: 1.5, margin: '0 0 24px 0', flexGrow: 1 }}>
                    Bereitstellung des Bandbereichs mit Band-Kommunikation, Repertoire-Planer, Songverwaltung (inkl. Song-Mastering), Live Lab, Skill-Radar und Schüler- &amp; Band-Avataren.
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', fontSize: '13px', color: '#334155' }}>
                      <Check size={16} style={{ color: '#34a853' }} /> <span>Bandgründung, Live Lab &amp; Repertoire</span>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', fontSize: '13px', color: '#34a853' }}>
                      <Check size={16} style={{ color: '#34a853' }} /> <span>Musiker- &amp; Band-Avatare + Skill-Radar</span>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', fontSize: '13px', color: '#34a853' }}>
                      <Check size={16} style={{ color: '#34a853' }} /> <span>Band-Chat, Songverwaltung &amp; Song-XP</span>
                    </div>
                  </div>
                </div>

                {/* Kombi-Vorteil Bundle Card */}
                <div style={{
                  background: 'linear-gradient(135deg, #ffffff 0%, #f4fbf7 100%)',
                  border: '2.5px solid #34a853',
                  borderRadius: '24px',
                  padding: '32px 24px',
                  textAlign: 'left',
                  display: 'flex',
                  flexDirection: 'column',
                  boxShadow: '0 10px 30px rgba(52, 168, 83, 0.06)',
                  position: 'relative',
                  overflow: 'hidden'
                }}>
                  <div style={{
                    position: 'absolute',
                    top: '16px',
                    right: '-32px',
                    background: '#34a853',
                    color: '#ffffff',
                    fontSize: '10px',
                    fontWeight: 900,
                    padding: '4px 32px',
                    transform: 'rotate(45deg)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em'
                  }}>
                    Empfohlen
                  </div>
                  <span style={{ fontWeight: 800, fontSize: '12px', color: '#34a853', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Kombi-Vorteil</span>
                  <h5 style={{ margin: '4px 0 16px 0', fontSize: '20px', fontWeight: 900, color: '#0f172a' }}>Komplettpaket</h5>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginBottom: '20px' }}>
                    <span style={{ fontSize: '36px', fontWeight: 900, color: '#34a853' }}>{fmt(pricing.kombi)}</span>
                    <span style={{ fontSize: '14px', color: '#64748b', fontWeight: 600 }}>/ Monat</span>
                  </div>
                  <p style={{ fontSize: '14px', color: '#475569', lineHeight: 1.5, margin: '0 0 24px 0', flexGrow: 1 }}>
                    Voller Zugriff auf beide Module auf einem dedizierten Server. Perfekt für moderne Musikschulen, die Organisation und Übe-Spaß vereinen möchten.
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', background: 'rgba(52, 168, 83, 0.05)', padding: '12px', borderRadius: '12px', marginBottom: '4px' }}>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', fontSize: '13px', color: '#34a853', fontWeight: 700 }}>
                      <span>💡 Du sparst dauerhaft {fmt(pricing.kombiSavings)} / Monat gegenüber den Einzelmodulen!</span>
                    </div>
                  </div>
                </div>

              </div>

              {/* 🛡️ Das Campus-Groovelab Preisversprechen Banner */}
              <div style={{
                marginTop: '32px',
                padding: '24px 28px',
                borderRadius: '20px',
                background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
                border: '1.5px solid #86efac',
                boxShadow: '0 4px 16px rgba(34, 197, 94, 0.08)',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '16px',
                textAlign: 'left'
              }}>
                <div style={{
                  background: '#16a34a',
                  color: '#ffffff',
                  width: '42px',
                  height: '42px',
                  borderRadius: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 900,
                  fontSize: '20px',
                  flexShrink: 0,
                  boxShadow: '0 2px 8px rgba(22, 165, 74, 0.3)'
                }}>
                  <ShieldCheck size={22} color="#ffffff" />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ fontSize: '16px', fontWeight: 900, color: '#14532d', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    Das <span style={{ color: '#34a853' }}>Campus</span>-<span style={{ color: '#eab308' }}>Groovelab</span> Preisversprechen: 100 % Bestandsschutz &amp; Garantie
                  </div>
                  <div style={{ fontSize: '13.5px', color: '#166534', lineHeight: 1.5, fontWeight: 500 }}>
                    <strong>Sichere dir den Tarif von heute – inklusive aller Innovationen von morgen!</strong> Der gebuchte Grundtarif deiner Musikschule (Server-Flatrate) sowie bestehende Lehrkräfte- und Schüler-Profile sind dauerhaft vor Preiserhöhungen geschützt. Auch bei neuen KI-Funktionen, Raumplanern oder Modul-Updates steigt dein Sockelpreis um keinen Cent. Für neu angemeldete Schüler im neuen Schuljahr gilt transparent der jeweils aktuell gültige Schüler-Tarif.
                  </div>
                </div>
              </div>
            </div>

            {/* Split Details Section: Service Fees & Flex billing options */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
              gap: '40px',
              textAlign: 'left',
              borderTop: '1px solid #e2e8f0',
              paddingTop: '40px'
            }}>
              
              {/* Left Column: User Profile Fees */}
              <div>
                <h4 style={{ fontFamily: 'Urbanist, sans-serif', fontSize: '22px', fontWeight: 800, color: '#0f172a', marginBottom: '16px' }}>
                  2. Nutzer-Bereitstellungen &amp; Profile
                </h4>
                <p style={{ fontSize: '14px', color: '#64748b', lineHeight: 1.5, marginBottom: '24px' }}>
                  Um die anfallenden Cloud-Ressourcen fair und nutzungsbasiert zu skalieren, berechnen wir extrem geringe Bereitstellungsgebühren pro Account:
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                    <div style={{ fontWeight: 800, fontSize: '15px', color: '#0f172a', marginBottom: '4px' }}>Lehrkräfte &amp; Verwaltung</div>
                    <div style={{ fontSize: '13px', color: '#475569', lineHeight: 1.4 }}>
                      <strong>{fmt(pricing.teacher)} / Monat</strong> je aktives Lehrer-Profil. Verwaltungs- und Sekretariats-Accounts (Rollen admin &amp; secretary) sind dauerhaft vollständig inklusive ({isChf ? 'CHF 0.00' : '0,00 €'}).
                    </div>
                  </div>

                  <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                    <div style={{ fontWeight: 800, fontSize: '15px', color: '#0f172a', marginBottom: '4px' }}>Basis-Bereitstellung (Schüler-Datensätze)</div>
                    <div style={{ fontSize: '13px', color: '#475569', lineHeight: 1.4 }}>
                      <strong>{fmt(pricing.passiveStudent)} / Monat</strong> je Schüler-Profil. Beinhaltet das {isChf ? 'DSGVO- & nDSG-Datensatz-Hosting' : 'DSGVO-Datensatz-Hosting'}, QR-Landingpages, Stundenplan-, Termin- und Raumänderungs-Sync sowie das digitale Aufgabenheft.
                    </div>
                  </div>

                  <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                    <div style={{ fontWeight: 800, fontSize: '15px', color: '#0f172a', marginBottom: '4px' }}>Interaktive Modul-Bereitstellung (Campus / GrooveLab)</div>
                    <div style={{ fontSize: '13px', color: '#475569', lineHeight: 1.4 }}>
                      <strong>{fmt(pricing.student)} / Monat</strong> je aktive Schüler-Nutzung bei bewusster Aktivierung. Bei der Eltern-Direktabrechnung kann diese Gebühr (wahlweise inkl. Basisbeitrag) komplett von den Eltern übernommen werden (Schule zahlt {isChf ? 'CHF 0.00' : '0,00 €'}).
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Billing Options (Senior Sales Pitch) */}
              <div>
                <h4 style={{ fontFamily: 'Urbanist, sans-serif', fontSize: '22px', fontWeight: 800, color: '#0f172a', marginBottom: '16px' }}>
                  3. Flexible Abrechnungsmodelle
                </h4>
                <p style={{ fontSize: '14px', color: '#64748b', lineHeight: 1.5, marginBottom: '24px' }}>
                  Wir bieten dir zwei strategische Modelle zur Kostenverteilung, um das Budget deiner Musikschule optimal zu entlasten. <strong>Wichtig:</strong> Es werden generell nur Schüler abgerechnet, die ihren Zugang über die Plattform bewusst aktivieren.
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ background: 'rgba(52, 168, 83, 0.04)', padding: '16px', borderRadius: '16px', border: '1px solid rgba(52, 168, 83, 0.15)' }}>
                    <div style={{ fontWeight: 800, fontSize: '15px', color: '#34a853', marginBottom: '4px' }}>A: Eltern-Direktabrechnung (Zahlungsüberwachung)</div>
                    <div style={{ fontSize: '13px', color: '#2d4d38', lineHeight: 1.4, marginBottom: '8px' }}>
                      Entlaste dein Schulbudget auf <strong>{isChf ? 'CHF 0.00' : '0,00 €'} Schülergebühren</strong> für das Campus-Modul. Die Eltern übernehmen den Kleinstbeitrag direkt über die Plattform als einmalige Jahreszahlung (zur Vermeidung von Bank- und Buchungsgebühren).
                    </div>
                    <div style={{ fontSize: '12px', color: '#475569', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <span>• <strong>Vollständig:</strong> Eltern zahlen den Jahresbeitrag von {fmt(pricing.student * 12)} / Jahr (umgerechnet {fmt(pricing.student)}/Mo.). Die Schule zahlt {isChf ? 'CHF 0.00' : '0,00 €'} Schülergebühr.</span>
                      <span>• <strong>Teilweise:</strong> Eltern zahlen den Jahresbeitrag von {fmt(Math.max(0, pricing.student - pricing.passiveStudent) * 12)} / Jahr (umgerechnet {fmt(Math.max(0, pricing.student - pricing.passiveStudent))}/Mo.), die Schule stützt die Basis-Bereitstellung mit {fmt(pricing.passiveStudent)}/Mo.</span>
                      <span style={{ fontSize: '11px', color: '#64748b', fontStyle: 'italic', marginTop: '2px' }}>(Hinweis: GrooveLab-Bandaktivierungen werden für Schüler immer vollständig von der Musikschule als Sammelzahler getragen).</span>
                    </div>

                    {/* Solidaritätsversprechen Highlight Box */}
                    <div style={{ marginTop: '12px', background: '#ffffff', padding: '12px 14px', borderRadius: '12px', border: '1px solid #bbf7d0', boxShadow: '0 2px 8px rgba(52, 168, 83, 0.05)' }}>
                      <div style={{ fontSize: '13px', fontWeight: 800, color: '#15803d', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                        <span>💚 Geschwister-Vorteil &amp; 20:1 Solidaritätsversprechen</span>
                      </div>
                      <div style={{ fontSize: '12px', color: '#334155', lineHeight: 1.45 }}>
                        Kein Kind soll aus finanziellen Gründen vom Musiklernen ausgeschlossen werden:
                        <br />• <strong>Geschwister-Vorteil:</strong> Ab dem 3. Kind ist die Campus-Aktivierung für Eltern <strong>100 % KOSTENLOS ({isChf ? 'CHF 0.00' : '0,00 €'})</strong>!
                        <br />• <strong>Solidaritäts-Prinzip:</strong> Für je 20 aktivierte Schüler-Profile schaltet das System automatisch 1 weitere kostenfreie Freischaltung für Härtefälle frei.
                      </div>
                    </div>
                  </div>

                  <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                    <div style={{ fontWeight: 800, fontSize: '15px', color: '#0f172a', marginBottom: '4px' }}>B: Musikschule übernimmt (Sammelzahler)</div>
                    <div style={{ fontSize: '13px', color: '#475569', lineHeight: 1.4, marginBottom: '8px' }}>
                      Die Musikschule zahlt gesammelt für alle Schüler. Hier profitierst du von exzellenten Skalierungsrabatten:
                    </div>
                    <div style={{ fontSize: '12px', color: '#475569', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <span>• <strong>Monatliche Abrechnung:</strong> Abrechnung nach exakter Live-Schüleranzahl ({fmt(pricing.student)} / Modul-Aktivierung / Mo.). Automatischer Kosten-Stopp: Profile ohne Login für mehr als 2 Monate werden automatisch inaktiviert – Kosten fallen somit nur bei tatsächlicher Nutzung an.</span>
                      <span>• <strong>Jahresbeitrag (10 % Rabatt):</strong> Die Aktivierung eines Schülerprofils löst den ermäßigten Jahresbeitrag aus. Unterjährige Neuanmeldungen lassen sich jederzeit flexibel hinzufügen – der Beitrag wird minutengenau auf die verbleibende Restlaufzeit berechnet.</span>
                      <span>• <strong>Komplett-Aktivierung zum Schuljahresstart (September) (20 % Rabatt):</strong> Einmalige, gesammelte Aktivierung aller Schüler im September für das gesamte Schuljahr mit maximalem Rabattvorteil.</span>
                    </div>
                  </div>
                </div>
              </div>

            </div>

            {/* Enterprise Warning & CTA */}
            <div style={{
              background: '#f8fafc',
              border: '1px solid #cbd5e1',
              borderRadius: '24px',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              textAlign: 'center'
            }}>
              <button 
                onClick={() => triggerProtectedRegistration()}
                style={{
                  alignSelf: 'center',
                  padding: '16px 40px',
                  backgroundColor: '#34a853',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '100px',
                  fontWeight: 800,
                  fontSize: '16px',
                  cursor: 'pointer',
                  boxShadow: '0 4px 14px rgba(52, 168, 83, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  transition: 'all 0.2s'
                }}
                onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
                onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
              >
                Jetzt unverbindlich als Musikschule testen <ArrowRight size={18} />
              </button>
            </div>

          </div>
        </div>
      </section>

      {/* ── FAQ SECTION (Häufig gestellte Fragen für Eltern, Schulleiter & Lehrer) ── */}
      <section id="faq" style={{
        padding: '96px 24px',
        background: 'linear-gradient(180deg, #f8fafc 0%, #ffffff 100%)',
        borderTop: '1px solid #e2e8f0',
        position: 'relative'
      }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: '48px' }}>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 16px',
              borderRadius: '9999px',
              background: '#e6f4ea',
              color: '#34a853',
              fontSize: '0.82rem',
              fontWeight: 800,
              marginBottom: '16px'
            }}>
              <ShieldCheck size={16} /> FAQ &amp; Transparenz
            </div>
            <h2 style={{
              fontFamily: '"Helvetica Neue Light", "Helvetica Neue", -apple-system, sans-serif',
              fontSize: 'clamp(2rem, 4vw, 2.75rem)',
              fontWeight: 900,
              color: '#0f172a',
              letterSpacing: '-0.03em',
              margin: '0 0 16px 0'
            }}>
              Häufig gestellte Fragen &amp; Antworten
            </h2>
            <p style={{
              fontSize: '1.05rem',
              color: '#64748b',
              maxWidth: '640px',
              margin: '0 auto',
              lineHeight: 1.6
            }}>
              Wähle deine Rolle aus, um maßgeschneiderte Antworten zu Datenschutz, Sicherheit, Kosten und Bedienung zu erhalten.
            </p>
          </div>

          {/* Target Group Selector Tabs */}
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            gap: '12px',
            marginBottom: '40px',
            flexWrap: 'wrap'
          }}>
            <button
              type="button"
              onClick={() => { setActiveFaqTab('parents'); setExpandedFaqIndex(0); }}
              style={{
                padding: '14px 28px',
                borderRadius: '9999px',
                border: activeFaqTab === 'parents' ? '2px solid #34a853' : '1px solid #cbd5e1',
                background: activeFaqTab === 'parents' ? '#34a853' : '#ffffff',
                color: activeFaqTab === 'parents' ? '#ffffff' : '#475569',
                fontSize: '0.95rem',
                fontWeight: 800,
                cursor: 'pointer',
                transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: activeFaqTab === 'parents' ? '0 4px 14px rgba(52, 168, 83, 0.25)' : '0 2px 6px rgba(0,0,0,0.03)'
              }}
            >
              <span>👨‍👩‍👧</span> Für Eltern &amp; Schüler
            </button>

            <button
              type="button"
              onClick={() => { setActiveFaqTab('directors'); setExpandedFaqIndex(0); }}
              style={{
                padding: '14px 28px',
                borderRadius: '9999px',
                border: activeFaqTab === 'directors' ? '2px solid #ea4335' : '1px solid #cbd5e1',
                background: activeFaqTab === 'directors' ? '#ea4335' : '#ffffff',
                color: activeFaqTab === 'directors' ? '#ffffff' : '#475569',
                fontSize: '0.95rem',
                fontWeight: 800,
                cursor: 'pointer',
                transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: activeFaqTab === 'directors' ? '0 4px 14px rgba(234, 67, 53, 0.25)' : '0 2px 6px rgba(0,0,0,0.03)'
              }}
            >
              <span>🏛️</span> Für Schulleitung &amp; Admin
            </button>

            <button
              type="button"
              onClick={() => { setActiveFaqTab('teachers'); setExpandedFaqIndex(0); }}
              style={{
                padding: '14px 28px',
                borderRadius: '9999px',
                border: activeFaqTab === 'teachers' ? '2px solid #eab308' : '1px solid #cbd5e1',
                background: activeFaqTab === 'teachers' ? '#eab308' : '#ffffff',
                color: activeFaqTab === 'teachers' ? '#ffffff' : '#475569',
                fontSize: '0.95rem',
                fontWeight: 800,
                cursor: 'pointer',
                transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: activeFaqTab === 'teachers' ? '0 4px 14px rgba(234, 179, 8, 0.25)' : '0 2px 6px rgba(0,0,0,0.03)'
              }}
            >
              <span>🧑‍🏫</span> Für Lehrkräfte &amp; Pädagogen
            </button>
          </div>

          {/* FAQ Accordion List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {faqItems[activeFaqTab].map((item, idx) => {
              const isOpen = expandedFaqIndex === idx;
              return (
                <div
                  key={idx}
                  style={{
                    background: '#ffffff',
                    borderRadius: '20px',
                    border: isOpen ? '1.5px solid #cbd5e1' : '1px solid #e2e8f0',
                    boxShadow: isOpen ? '0 10px 25px -5px rgba(0, 0, 0, 0.05)' : '0 2px 8px rgba(0,0,0,0.02)',
                    overflow: 'hidden',
                    transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setExpandedFaqIndex(isOpen ? null : idx)}
                    style={{
                      width: '100%',
                      padding: '24px',
                      background: 'transparent',
                      border: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '16px',
                      cursor: 'pointer',
                      textAlign: 'left',
                      outline: 'none'
                    }}
                  >
                    <span style={{
                      fontSize: '1.08rem',
                      fontWeight: 800,
                      color: '#0f172a',
                      lineHeight: 1.4
                    }}>
                      {item.q}
                    </span>
                    <div style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      background: isOpen ? '#f1f5f9' : '#f8fafc',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#64748b',
                      flexShrink: 0,
                      transition: 'transform 0.2s ease',
                      transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)'
                    }}>
                      <ChevronDown size={18} />
                    </div>
                  </button>

                  {isOpen && (
                    <div style={{
                      padding: '0 24px 24px 24px',
                      color: '#475569',
                      fontSize: '0.95rem',
                      lineHeight: 1.6,
                      borderTop: '1px solid #f1f5f9',
                      paddingTop: '16px'
                    }}>
                      {item.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{
        backgroundColor: '#ffffff',
        borderTop: '1px solid #e8e8ed',
        height: 'auto',
        padding: '48px 24px',
        marginTop: 'auto'
      }}>
        <div style={{
          maxWidth: '1280px',
          width: '100%',
          margin: '0 auto',
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '24px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 800, fontSize: '16px' }}>
            <CampusGroovelabLogo size={20} fontSize="16px" />
          </div>

          <div style={{ fontSize: '14px', color: '#7d7d82' }}>
            &copy; {new Date().getFullYear()} <CampusGroovelabText fontWeight={700} />. Alle Rechte vorbehalten.
          </div>

          <div style={{
            display: 'flex',
            gap: '24px',
            fontSize: '14px',
            color: '#7d7d82'
          }}>
            <span style={{ cursor: 'pointer' }} onClick={() => scrollToSection('hero')}>Top</span>
            <span style={{ cursor: 'pointer' }} onClick={() => scrollToSection('target-audiences')}>Zielgruppen</span>
            <span style={{ cursor: 'pointer' }} onClick={() => scrollToSection('usps')}>Features</span>
            <span style={{ cursor: 'pointer' }} onClick={() => scrollToSection('pricing')}>Preise</span>
            <span style={{ cursor: 'pointer', fontWeight: 700 }} onClick={() => setActiveDocument('terms')}>AGB</span>
            <span style={{ cursor: 'pointer', fontWeight: 700 }} onClick={() => setActiveDocument('privacy')}>Datenschutz</span>
            <span style={{ cursor: 'pointer', fontWeight: 700 }} onClick={() => setActiveDocument('impressum' as any)}>Impressum</span>
          </div>
        </div>
      </footer>
 
      {/* Unified 100% Compliant Legal Text Modal */}
      <LegalTextModal
        isOpen={activeDocument !== 'none'}
        onClose={() => setActiveDocument('none')}
        initialTab={activeDocument === 'privacy' ? 'privacy' : activeDocument === 'terms' ? 'terms' : activeDocument === 'cancellation' ? 'cancellation' : 'impressum'}
      />

      {/* 🛡️ Datenschutz & Sicherheitsstufen Modal */}
      {showPrivacyAudits && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.7)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000,
          padding: '24px'
        }}
        onClick={() => setShowPrivacyAudits(false)}
        >
          <div style={{
            background: '#ffffff',
            borderRadius: '32px',
            width: '100%',
            maxWidth: '750px',
            maxHeight: '85vh',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.3)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            border: '1px solid rgba(0,0,0,0.06)'
          }}
          onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{
              padding: '28px 32px',
              borderBottom: '1px solid #f1f5f9',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: 'linear-gradient(135deg, #e6f4ea 0%, #ffffff 100%)'
            }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 900, color: '#34a853', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  🛡️ Das <CampusGroovelabText campusColor="#34a853" groovelabColor="#eab308" fontWeight={900} /> Sicherheitsversprechen
                </h3>
                <span style={{ fontSize: '0.72rem', color: '#34a853', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  5-Säulen Vertrauens- & Freigabekonzept (Enterprise & Kommunal-Standard)
                </span>
              </div>
              <button 
                onClick={() => setShowPrivacyAudits(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#7d7d82' }}
              >
                <X size={24} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{
              padding: '32px',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '20px',
              backgroundColor: '#fafbfc'
            }}>
              <p style={{ margin: 0, fontSize: '0.85rem', color: '#475569', fontWeight: 600, lineHeight: 1.5 }}>
                Als deutscher App-Betreiber hat der Schutz minderjähriger Schülerdaten für uns oberste Priorität. Unsere Plattform wurde streng nach dem Prinzip <strong>Privacy by Design & Default</strong> entwickelt und vereint Schulleitung, Eltern und städtische Datenschutzbeauftragte (DSB) in einem unumstößlichen Sicherheitsmodell:
              </p>

              {/* Top Banner: Datensparsamkeit */}
              <div style={{
                background: '#e6f4ea',
                border: '1.5px solid #a7f3d0',
                borderRadius: '20px',
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                textAlign: 'left'
              }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 900, color: '#047857', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  💡 Datensparsamkeit als aktive Härtung (Warum weniger Daten mehr Sicherheit bedeuten)
                </span>
                <p style={{ margin: 0, fontSize: '0.78rem', color: '#1e293b', lineHeight: 1.5, opacity: 0.9 }}>
                  Da <CampusGroovelabText fontWeight={800} /> als fokussierte pädagogische Praxis-Plattform agiert, verzichten wir bewusst auf die Erfassung vollständiger Stammdaten (keine Wohnadressen, keine E-Mail-Adressen von Minderjährigen, keine Bankverbindungen). Dieser extrem minimale Daten-Fußabdruck schützt Musikschulen wirksam vor Haftungsrisiken, beschleunigt die behördliche Freigabe und garantiert: <strong>Daten, die gar nicht existieren, können niemals gestohlen werden.</strong>
                </p>
              </div>

              {/* Die 5 Säulen */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {[
                  {
                    icon: '🛡️',
                    pill: 'SÄULE 1',
                    pillBg: '#e6f4ea',
                    pillColor: '#047857',
                    title: 'Absolute Datensparsamkeit für Minderjährige (Zero-Kid-PII)',
                    desc: 'Keine E-Mail-Adressen von Schülern, keine Wohnadressen, keine Bankverbindungen. Vollständige Geburtsdaten werden im System technisch ausgeschlossen. Die Erstanmeldung erfolgt über kryptografische Einmal-Aktivierungstoken (Zero-Knowledge), die nach der Ersteinrichtung sofort und unwiderruflich verfallen.'
                  },
                  {
                    icon: '📋',
                    pill: 'SÄULE 2',
                    pillBg: '#eff6ff',
                    pillColor: '#1d4ed8',
                    title: 'Kommunale Compliance & DSB-Blitz-Freigabe (Für städtische DSBs)',
                    desc: 'Sofort digital unterzeichnungsfertiger AVV nach Art. 28 DSGVO mit fertigem 20-Punkte TOM-Katalog. Durch die strikte Datenminimierung ergibt die Schwellwertanalyse (Art. 35 DSGVO) ein minimales Risiko – eine zeitaufwendige DSFA ist im Regelfall nicht erforderlich. Inklusive transparenter Unterauftragsverarbeiter-Kette und automatisierter Löschkonzepte (Art. 17 DSGVO).'
                  },
                  {
                    icon: '🇩🇪',
                    pill: 'SÄULE 3',
                    pillBg: '#fef3c7',
                    pillColor: '#b45309',
                    title: '100% Server-Standort Deutschland & Zero US-Cloud-Act',
                    desc: 'Infrastruktur und Datenbanken befinden sich zu 100% in deutschen Rechenzentren (Hetzner, ISO 27001 zertifiziert). Keinerlei US-Cloud-Subunternehmer (kein CLOUD-Act-Risiko, keine Drittstaaten-Unsicherheit). Kernel-erzwungene Mandantentrennung (PostgreSQL FORCE RLS) und BFF Token-Isolation.'
                  },
                  {
                    icon: '⚖️',
                    pill: 'SÄULE 4',
                    pillBg: '#f3e8ff',
                    pillColor: '#6b21a8',
                    title: 'Schulrecht-Kompatibilität & Dienstaufsichts-Schutz',
                    desc: 'Keine privaten Handynummern für Schul-Chats nötig. Flexible Chat-Modi unterstützen wahlweise dauerhafte Schüler-Lehrer-Direktchats, Band- & lehrermoderierte Ensemble-Chats oder termingekoppelte Unterrichts-Chats mit 48h-Auto-Freeze (wahrt Dienstaufsicht & schützt den Lehrer-Feierabend). Audio-Engine stoppt beim Beenden sofort alle Stream-Zugriffe auf Betriebssystemebene.'
                  },
                  {
                    icon: '👁️',
                    pill: 'SÄULE 5',
                    pillBg: '#fff1f2',
                    pillColor: '#be123c',
                    title: 'Klassenzimmer-Sicherheit & Zero-Knowledge Biometrie',
                    desc: 'DSGVO-konforme Nachnamensmaskierung (z. B. „Max M.“) als Privacy-Default schützt vor Mitlesen im Unterricht. Zero-Trust Session-Leasing & 1-Click Remote-Logout für gemeinsam genutzte Schul-iPads. Biometrische Passkeys (FaceID/TouchID/FIDO2) und QR-Kamera-Feeds verbleiben zu 100% lokal auf dem Endgerät.'
                  }
                ].map((saeule, idx) => (
                  <div key={idx} style={{
                    background: '#ffffff',
                    border: '1.5px solid #e2e8f0',
                    borderRadius: '20px',
                    padding: '20px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                    boxShadow: '0 4px 16px rgba(15, 23, 42, 0.03)'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontSize: '1.4rem' }}>{saeule.icon}</span>
                        <span style={{
                          background: saeule.pillBg,
                          color: saeule.pillColor,
                          padding: '3px 10px',
                          borderRadius: '8px',
                          fontSize: '0.68rem',
                          fontWeight: 900,
                          letterSpacing: '0.05em'
                        }}>
                          {saeule.pill}
                        </span>
                      </div>
                    </div>
                    <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: '#0f172a', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                      {saeule.title}
                    </h4>
                    <p style={{ margin: 0, fontSize: '0.8rem', color: '#475569', fontWeight: 500, lineHeight: 1.5 }}>
                      {saeule.desc}
                    </p>
                  </div>
                ))}
              </div>

              {/* Accordion Toggle for 22-Point TOM Catalog (For IT Auditors) */}
              <div style={{ marginTop: '8px', borderTop: '1px solid #e2e8f0', paddingTop: '16px' }}>
                <button
                  onClick={() => setShowFullTomCatalog(!showFullTomCatalog)}
                  style={{
                    width: '100%',
                    background: showFullTomCatalog ? '#f1f5f9' : '#ffffff',
                    border: '1.5px solid #cbd5e1',
                    borderRadius: '14px',
                    padding: '14px 18px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    color: '#334155',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    transition: 'all 0.2s ease'
                  }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    📄 Vollständiger technischer TOM-Katalog (Art. 32 DSGVO) für IT-Sicherheitsprüfer {showFullTomCatalog ? 'einklappen' : 'ausklappen'}
                  </span>
                  <span style={{ transform: showFullTomCatalog ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s ease' }}>
                    ▼
                  </span>
                </button>

                {showFullTomCatalog && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginTop: '16px' }}>
                    {[
                      {
                        sectionTitle: 'I. Art. 32 Abs. 1 lit. a DSGVO – Pseudonymisierung & Verschlüsselung',
                        sectionBadge: 'Kryptografie & Maskierung',
                        items: [
                          { title: '1. Verschlüsselung in Transit & At-Rest', desc: 'TLS 1.3 Transport-Verschlüsselung mit HSTS Preload. Datenbank- & Storage-Verschlüsselung im Ruhezustand nach AES-256.' },
                          { title: '2. Backend-for-Frontend (BFF) Token-Isolation', desc: 'Alle Client-Anfragen laufen über ein geschütztes BFF-Gateway mit AES-256-GCM JWE-Cookies. Es befinden sich 0% Tokens im Browser-Speicher.' },
                          { title: '3. Strikte Datenminimierung (Privacy by Design)', desc: 'Es werden keine sensiblen Profildaten wie Schüler-E-Mails, Bank-/SEPA-Daten oder Passwörter Minderjähriger im System verarbeitet.' },
                          { title: '4. DSGVO-konforme Nachnamensmaskierung', desc: 'Standardmäßige Kürzung von Schülernamen auf „Max M.“ (Privacy by Default) gegen Schulterblick und unbefugtes Mitlesen im Unterricht.' },
                          { title: '5. Zero-Knowledge Authentifizierung & PBKDF2', desc: 'Authentifizierungs-Geheimnisse und PINs werden serverseitig mittels PBKDF2/SHA-512 (100.000 Runden) gehasht. FIDO2 Passkeys mit Klon-Schutz.' }
                        ]
                      },
                      {
                        sectionTitle: 'II. Art. 32 Abs. 1 lit. b DSGVO – Vertraulichkeit & System-Integrität',
                        sectionBadge: 'Zugangskontrolle & Audit',
                        items: [
                          { title: '6. Kernel-erzwungene PostgreSQL FORCE Row-Level Security (RLS)', desc: 'Datenbankseitig erzwungene Mandantentrennung auf allen relationalen Tabellen mit transaktional isoliertem Mandantenkontext (is_local = true).' },
                          { title: '7. Anti-CSRF Origin Guard & SRI SHA-384', desc: 'Fail-Closed Sec-Fetch-Site Filtering, Host-Header-Schutz und kryptografische Subresource Integrity für alle Frontend-Dateien.' },
                          { title: '8. Brute-Force & Credential-Stuffing Schutz', desc: 'Progressive Sitzungssperren und automatisiertes Throttling nach fehlerhaften Authentifizierungsversuchen.' },
                          { title: '9. Hardware-Mikrofonschutz & Zero-Tracking', desc: 'Sofortige Freigabe des Mikrofonzugriffs auf Betriebssystemebene beim Beenden von Modulen (§ 201 StGB). 0% Fremd-Tracker, 100% lokale Schriften.' },
                          { title: '10. Zero-Trust Session-Leasing & Remote-Logout', desc: 'Sitzungen auf gemeinsam genutzten Schulgeräten können von der Schulleitung mit 1 Klick remote beendet werden; kein Token-Verbleib im Browser.' }
                        ]
                      },
                      {
                        sectionTitle: 'III. Art. 32 Abs. 1 lit. c DSGVO – Verfügbarkeit & Belastbarkeit',
                        sectionBadge: 'Infrastruktur & Resilienz',
                        items: [
                          { title: '11. Server-Standort 100% in Deutschland', desc: 'Betrieb in ISO 27001 zertifizierten deutschen Rechenzentren (Hetzner, Deutschland) – ohne US-Cloud-Subunternehmer (No CLOUD Act).' },
                          { title: '12. Stündliche Zero-Knowledge-Backups', desc: 'Automatisierte, verschlüsselte Datenbank-Snapshots mit RTO < 15 Min und RPO < 1 Std. in geografisch getrennten deutschen Rechenzentren.' },
                          { title: '13. Lokaler IndexedDB Audio-Tresor', desc: 'Pufferung von Übetracks im lokalen Tresor (groovelab_audio_vault) für 0ms Latenz und Offline-Playback in Proberäumen ohne Internet.' },
                          { title: '14. Netzwerkeigenes Rate-Limiting & API-Throttling', desc: 'Automatisierte Bot-Angriffe, Credential-Stuffing und DoS-Versuche werden an den Außengrenzen vor der Datenbank abgefangen.' },
                          { title: '15. High-Speed Asset Pre-Compression', desc: 'Vollständige Vorabkompression aller Assets in Brotli (q=11) und Gzip (lvl=9) für Sub-100ms Ladezeiten und minimale Serverlast.' }
                        ]
                      },
                      {
                        sectionTitle: 'IV. Art. 32 Abs. 1 lit. d DSGVO – Überprüfung & Evaluierung',
                        sectionBadge: 'Auditierung & Nachweis',
                        items: [
                          { title: '16. Continuous Supply-Chain Security & CI/CD Gates', desc: 'Automatischer Pre-Commit Secret-Scanner, automatische Vitest-Mandantentrennungstests und CVE-Schwachstellen-Scans vor jedem Deployment.' },
                          { title: '17. Revisionssicheres WORM Audit-Ledger', desc: 'Manipulationssichere SHA-256 Merkle-Chain zur unveränderbaren Protokollierung aller administrativen Aktionen und Belege (GoBD).' },
                          { title: '18. DIN 66398 Löschkonzept & Storage-Janitor', desc: 'Strukturierte 5-Klassen-Löschfristen, physische Vernichtung gelöschter Audios und 60-Tage-Sparmodus zum Budgetschutz der Musikschule.' },
                          { title: '19. Periodische Penetrationstests & RFC 9116 security.txt', desc: 'Regelmäßige externe IT-Sicherheitsaudits und vertrauliche Meldeschnittstelle für Responsible Disclosure.' },
                          { title: '20. Revisionssicheres DSGVO-Einwilligungsmanagement', desc: 'Zeitgestempelte, rechtssichere Protokollierung aller Eltern-Einwilligungen nach Art. 7 & Art. 8 DSGVO.' }
                        ]
                      }
                    ].map((group, gIdx) => (
                      <div key={gIdx} style={{
                        background: '#ffffff',
                        border: '1.5px solid #cbd5e1',
                        borderRadius: '16px',
                        padding: '18px 20px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '12px'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                          <h4 style={{ margin: 0, fontSize: '0.88rem', fontWeight: 800, color: '#0f172a' }}>
                            {group.sectionTitle}
                          </h4>
                          <span style={{
                            background: '#f1f5f9',
                            color: '#475569',
                            padding: '2px 8px',
                            borderRadius: '6px',
                            fontSize: '0.68rem',
                            fontWeight: 700
                          }}>
                            {group.sectionBadge}
                          </span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          {group.items.map((tom, itemIdx) => (
                            <div key={itemIdx} style={{
                              background: '#f8fafc',
                              border: '1px solid #e2e8f0',
                              borderRadius: '10px',
                              padding: '10px 14px',
                              display: 'flex',
                              alignItems: 'flex-start',
                              gap: '10px'
                            }}>
                              <span style={{ color: '#34a853', fontWeight: 900, fontSize: '0.82rem', marginTop: '1px' }}>✓</span>
                              <div>
                                <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#1e293b' }}>{tom.title}</div>
                                <div style={{ fontSize: '0.73rem', color: '#64748b', fontWeight: 500, lineHeight: 1.4 }}>{tom.desc}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div style={{
              padding: '20px 32px',
              borderTop: '1px solid #f1f5f9',
              background: '#f8fafc',
              display: 'flex',
              justifyContent: 'flex-end'
            }}>
              <button
                onClick={() => setShowPrivacyAudits(false)}
                style={{
                  background: '#34a853',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '100px',
                  fontWeight: 650,
                  fontSize: '0.85rem',
                  padding: '10px 24px',
                  cursor: 'pointer',
                  boxShadow: '0 2px 6px rgba(52, 168, 83, 0.15)',
                  outline: 'none'
                }}
              >
                Verstanden &amp; Schließen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Protected Registration Access Modal */}
      <RegistrationAccessModal
        isOpen={showAccessModal}
        onClose={() => setShowAccessModal(false)}
        onSuccess={(em) => {
          setShowAccessModal(false);
          onRegister(em);
        }}
        initialEmail={pendingEmail}
      />

      {/* Global CSS Inject to handle responsive menus and simple styles */}
      <style>{`
        @media (max-width: 768px) {
          .desktop-only-flex {
            display: none !important;
          }
          .mobile-only {
            display: block !important;
          }
        }
      `}</style>

    </div>
  );
}

export const LandingPage = Startseite2;
