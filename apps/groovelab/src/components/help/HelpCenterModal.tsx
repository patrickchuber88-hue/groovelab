import React, { useState, useMemo } from 'react';
import { 
  X, Search, BookOpen, Sparkles, CheckCircle2, ChevronRight, 
  Layers, Lightbulb, HelpCircle, Calendar, Shield, Users, 
  Music, Tablet, Clock, Award, ExternalLink, Copy, Check,
  School, Zap, ChevronDown, ChevronUp, Printer, FileText,
  Sliders, MessageSquare, Flame, Smartphone, Lock, Download
} from 'lucide-react';
import { LEGAL_MASTER_WORDING } from '../../constants/legalMasterWording';
import { generateParentQuickstartPDF, generateTeacherQuickstartPDF, generateConsentPDF } from '../../utils/pdfGenerator';

export type HelpUserRole = 'admin' | 'secretary' | 'teacher' | 'student';
export type HelpPlatform = 'campus' | 'groovelab' | 'admin' | 'admin_desk' | string;

interface HelpCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
  userRole?: HelpUserRole;
  activePlatform?: HelpPlatform;
  schoolName?: string;
  onOpenFeedbackHub?: () => void;
  initialTopicId?: string;
}

interface GuideItem {
  id: string;
  title: string;
  category: 'quickstart' | 'features' | 'faq' | 'compliance';
  roles: HelpUserRole[];
  badge?: string;
  summary: string;
  steps?: { title: string; desc: string }[];
  details?: React.ReactNode;
  tags: string[];
}

export const HelpCenterModal: React.FC<HelpCenterModalProps> = ({
  isOpen,
  onClose,
  userRole = 'admin',
  activePlatform = 'campus',
  schoolName = 'Meine Musikschule',
  onOpenFeedbackHub,
  initialTopicId
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'quickstart' | 'features' | 'faq' | 'compliance'>('quickstart');
  const [selectedGuideId, setSelectedGuideId] = useState<string | null>(initialTopicId || null);
  const [copiedText, setCopiedText] = useState<string | null>(null);

  // Sync initial topic when modal opens
  React.useEffect(() => {
    if (initialTopicId) {
      setSelectedGuideId(initialTopicId);
      const matched = GUIDES_DATABASE.find(g => g.id === initialTopicId);
      if (matched) {
        setActiveTab(matched.category);
      }
    }
  }, [initialTopicId, isOpen]);

  // Accent color by platform/role
  const themeColor = activePlatform === 'groovelab'
    ? '#ca8a04' // Gold/Yellow
    : (userRole === 'admin' || userRole === 'secretary' || activePlatform === 'admin' || activePlatform === 'admin_desk')
      ? '#ea4335' // Red
      : '#34a853'; // Campus Green

  const themeLightBg = activePlatform === 'groovelab'
    ? '#fefce8'
    : (userRole === 'admin' || userRole === 'secretary')
      ? '#fef2f2'
      : '#f0fdf4';

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(label);
    setTimeout(() => setCopiedText(null), 2500);
  };

  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState<string | null>(null);

  const handleDownloadParentPdf = async () => {
    setIsGeneratingPdf(true);
    try {
      await generateParentQuickstartPDF({
        schoolName,
        activePlatform: activePlatform === 'groovelab' ? 'groovelab' : activePlatform === 'campus' ? 'campus' : 'both',
        contactEmail: ''
      });
      setDownloadSuccess('parent');
      setTimeout(() => setDownloadSuccess(null), 3000);
    } catch (e) {
      console.error(e);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleDownloadTeacherPdf = async () => {
    setIsGeneratingPdf(true);
    try {
      await generateTeacherQuickstartPDF(schoolName);
      setDownloadSuccess('teacher');
      setTimeout(() => setDownloadSuccess(null), 3000);
    } catch (e) {
      console.error(e);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleDownloadConsentPdf = async () => {
    setIsGeneratingPdf(true);
    try {
      await generateConsentPDF(
        schoolName,
        activePlatform === 'groovelab' ? 'groovelab' : activePlatform === 'campus' ? 'campus' : 'both'
      );
      setDownloadSuccess('consent');
      setTimeout(() => setDownloadSuccess(null), 3000);
    } catch (e) {
      console.error(e);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // Comprehensive Guide Database
  const GUIDES_DATABASE: GuideItem[] = useMemo(() => [
    // ----------------- QUICKSTART GUIDES -----------------
    {
      id: 'qs-admin-school-setup',
      title: 'Musikschule schlüsselfertig einrichten (In 4 Schritten)',
      category: 'quickstart',
      roles: ['admin'],
      badge: 'Schulleitung',
      summary: 'Die offizielle 10-Minuten-Anleitung für Schulleitung und Gesamtorganisation.',
      tags: ['start', 'schule', 'registrierung', 'räume', 'lehrer', 'schüler', 'pin', 'admin'],
      steps: [
        {
          title: '1. Schulleitungs-Identität & Stammdaten sichern',
          desc: 'Unter "Einstellungen" die Schuladresse prüfen. Schulleitungs-Ausweis herunterladen und optional Touch ID / Face ID als 1-Klick-Passkey aktivieren.'
        },
        {
          title: '2. Räume & Kiosk-Tablets anlegen',
          desc: 'Im Reiter "Räume" alle Unterrichtsräume erfassen. Für Proberaum-Tablets einfach campus-groovelab.de öffnen und den angezeigten Raum-Kopplungstoken eingeben.'
        },
        {
          title: '3. Kollegium & Lehrkräfte erfassen',
          desc: 'Im Reiter "Team" Lehrkräfte mit vollem Namen und Unterrichtsfächern anlegen. Den QR-Code-Ausweis mit 6-stelliger PIN ausdrucken oder per AirDrop/Direktlink übergeben.'
        },
        {
          title: '4. Schüler erfassen & Stundenplan füllen',
          desc: 'Im Reiter "Schüler" Schüler anlegen (werden datenschutzkonform als "Vorname + N." anonymisiert). Im Stundenplaner Stunden per Drag & Drop planen und Schüler-Ausweise ausgeben.'
        }
      ]
    },
    {
      id: 'qs-secretary-workflow',
      title: 'Sekretariat-Schnellstart: Schülerverwaltung & Tagesbetrieb',
      category: 'quickstart',
      roles: ['secretary', 'admin'],
      badge: 'Sekretariat',
      summary: 'Schüleraufnahme, Raumbelegungen, Kiosk-Displays & Eltern-Infoblätter.',
      tags: ['sekretariat', 'verwaltung', 'schüler', 'räume', 'stundenplan', 'kiosk', 'eltern'],
      steps: [
        {
          title: '1. Schüler neu anlegen & Smart Import',
          desc: 'Schüler einzeln erfassen oder per smarter CSV/Excel-Tabelle mit automatischer Namensmaskierung für DSGVO-Konformität importieren.'
        },
        {
          title: '2. 1-Seiter Eltern-Infoblatt ausgeben',
          desc: 'Über den Button "Eltern-Infoblatt (PDF)" den druckfertigen DIN A4 1-Seiter mit Schullogo und QR-Code als PDF herunterladen oder direkt drucken.'
        },
        {
          title: '3. Raum-Engine & Kiosk-Tablets',
          desc: 'Räume zuweisen und Belegungspläne prüfen. Tablets an Proberäumen aktualisieren sich automatisch bei Raumwechseln.'
        },
        {
          title: '4. Rechnungsprüfung & Tarife',
          desc: 'Im Bereich Verwaltung die monatliche Hosting- und Bereitstellungsaufstellung prüfen (0,00 € Software-Lizenz; reine Cloud-Infrastruktur).'
        }
      ]
    },
    {
      id: 'qs-teacher-first-lesson',
      title: 'Lehrkraft-Schnellstart: Dein erster Unterrichtstag',
      category: 'quickstart',
      roles: ['teacher', 'admin'],
      badge: 'Lehrkraft',
      summary: 'So nutzt du das Briefing-Board, das Schüler-Protokoll und das Play-Along Studio.',
      tags: ['lehrer', 'unterricht', 'hausaufgabe', 'notizen', 'audio', 'aufnahme', 'playalong'],
      steps: [
        {
          title: '1. Zero-Mail Login',
          desc: 'Scanne deinen persönlichen Lehrkraft-Ausweis mit deinem Smartphone oder Tablet – du bist sofort ohne E-Mail und Passwort im System.'
        },
        {
          title: '2. Tages-Briefing & Stundenplan',
          desc: 'Dein Briefing-Board zeigt dir automatisch die heutigen Schüler, Raumwechsel und eventuelle Terminänderungen.'
        },
        {
          title: '3. Schüler-Protokoll & Hausaufgaben',
          desc: 'Klicke auf den Schüler, wähle das Lehrbuch und die Seitenzahl aus (z.B. "S. 24") und trage die Übe-Ziele für die Woche ein.'
        },
        {
          title: '4. Play-Along Studio (Audio-Aufnahme)',
          desc: 'Nimm im Play-Along Studio ein kurzes Hörbeispiel auf (bis zu 7 Minuten mit Audio-Tresor). Es erscheint beim Schüler immer auf der linken Seite.'
        }
      ]
    },
    {
      id: 'qs-student-onboarding',
      title: 'Schüler- & Eltern-Guide: Dein digitaler Campus-Pass',
      category: 'quickstart',
      roles: ['student', 'teacher', 'admin'],
      badge: 'Eltern & Schüler',
      summary: 'Hausaufgabenheft, Fokus-Timer, Streaks und die interaktive Loopstation.',
      tags: ['schüler', 'eltern', 'hausaufgabe', 'timer', 'loopstation', 'avatar'],
      steps: [
        {
          title: '1. Campus-Pass scannen',
          desc: 'Einfach die Kamera auf den QR-Code deines Campus-Passes halten oder die 6-stellige PIN eingeben. Die App läuft ohne Registrierung direkt im Browser.'
        },
        {
          title: '2. Aufgabenheft synchron abrufen',
          desc: 'Im Reiter "Aufgaben" siehst du alle Hausaufgaben, Notizen und Audio-Beispiele deiner Lehrkraft.'
        },
        {
          title: '3. Fokus-Timer & XP-Streaks',
          desc: 'Starte den Übe-Timer bei jeder Übe-Session, sammle Erfahrungspunkte (XP) und baue deine Übe-Serie aus.'
        },
        {
          title: '4. Loopstation & Eigene Aufnahmen',
          desc: 'Spiele mit der 4-Takte-Pause sample-genau zur Aufnahme deiner Lehrkraft. Deine eigenen Mitschnitte landen sicher in deinem Übe-Studio.'
        }
      ]
    },

    // ----------------- FEATURE DEEP DIVES -----------------
    {
      id: 'feat-quick-audio',
      title: '1-Click Audio-Hausaufgaben & 7-Minuten Audio-Tresor',
      category: 'features',
      roles: ['teacher', 'admin'],
      badge: 'Studio',
      summary: 'Lehrkraft-Aufnahmen, Multi-Takes, Begleitungen & bis zu 7 Minuten Aufnahmedauer.',
      tags: ['audio', 'aufnahme', 'tresor', 'playalong', 'hausaufgabe', 'multi take'],
      details: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '0.86rem', color: '#334155', lineHeight: 1.6 }}>
          <p>
            Mit dem 1-Click Audio-Aufnahmewerkzeug im Tagesplan können Lehrkräfte ihren Schülern direkt im Unterricht Hörbeispiele, Begleitstimmen oder Metronom-Zähler mitgeben:
          </p>
          <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '14px', border: '1px solid #e2e8f0' }}>
            <h5 style={{ margin: '0 0 6px 0', color: '#0f172a', fontWeight: 800 }}>🎙️ Highlights für Lehrkräfte:</h5>
            <ul style={{ margin: 0, paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <li><strong>Multi-Take Recording:</strong> Beliebig viele Takes nacheinander aufnehmen (z. B. <em>Take 1: Melodie</em>, <em>Take 2: Begleitung</em>).</li>
              <li><strong>Audio-Tresor (7 Minuten):</strong> Bei aktivem Speicher-Addon bis zu 7:00 Minuten pro Take für ganze Stücke und Sonaten.</li>
              <li><strong>Automatische Zuordnung:</strong> Lehrkraft-Aufnahmen erscheinen beim Schüler immer auf der linken Seite des Aufgabenhefts.</li>
            </ul>
          </div>
        </div>
      )
    },
    {
      id: 'feat-parent-info-sheet',
      title: 'Personalisierbarer Elternbrief (PDF & Druck)',
      category: 'features',
      roles: ['admin', 'secretary', 'teacher', 'student'],
      badge: 'Elternbrief',
      summary: 'Druckfertiger 1-Seiter mit Schullogo, QR-Code & 100% DSGVO-Datenschutzgarantie.',
      tags: ['eltern', 'elternbrief', 'infoblatt', 'pdf', 'druck', 'schullogo', 'qr', 'onboarding'],
      details: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '0.86rem', color: '#334155', lineHeight: 1.6 }}>
          <p>
            Der offizielle 1-seitige Elternbrief der Musikschule fasst alle wichtigen Informationen zur App-Nutzung, zum Datenschutz und zur Aktivierung kompakt zusammen:
          </p>
          <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '14px', border: '1px solid #e2e8f0' }}>
            <h5 style={{ margin: '0 0 6px 0', color: '#0f172a', fontWeight: 800 }}>📄 Enthaltene Inhalte:</h5>
            <ul style={{ margin: 0, paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <li><strong>Schul-Branding:</strong> Automatisches Einbinden des individuellen Musikschullogos und Schulnamens.</li>
              <li><strong>Scharfer 300 DPI QR-Code:</strong> Führt Eltern direkt auf die schulspezifische Aktivierungsseite.</li>
              <li><strong>Datenschutz-Garantie:</strong> Erklärung der Zero-Mail-Architektur (keine Passwörter, keine Werbe-Cookies).</li>
            </ul>
          </div>
          <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
            <button
              onClick={handleDownloadParentPdf}
              disabled={isGeneratingPdf}
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '11px 16px',
                borderRadius: '12px',
                background: themeColor,
                color: '#ffffff',
                border: 'none',
                fontWeight: 800,
                fontSize: '0.84rem',
                cursor: isGeneratingPdf ? 'wait' : 'pointer',
                boxShadow: `0 4px 12px ${themeColor}30`,
                transition: 'all 0.15s ease'
              }}
            >
              {downloadSuccess === 'parent' ? (
                <>
                  <Check size={16} /> Elternbrief heruntergeladen!
                </>
              ) : (
                <>
                  <Download size={16} /> Elternbrief (PDF) herunterladen
                </>
              )}
            </button>
          </div>
        </div>
      )
    },
    {
      id: 'feat-schedule-board',
      title: 'Intelligenter Stundenplan-Designer & Raum-Engine',
      category: 'features',
      roles: ['admin', 'secretary', 'teacher'],
      badge: 'Core Feature',
      summary: 'Kollisionsfreie Planung, Matrix- & Kalenderansicht und Echtzeit-Synchronisation.',
      tags: ['stundenplan', 'raum', 'kollision', 'matrix', 'kalender', 'verschieben'],
      details: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '0.86rem', color: '#334155', lineHeight: 1.6 }}>
          <p>
            Der Stundenplan-Designer synchronisiert alle Raum-, Lehrkraft- und Schülerbelegungen in Echtzeit.
          </p>
          <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '14px', border: '1px solid #e2e8f0' }}>
            <h5 style={{ margin: '0 0 6px 0', color: '#0f172a', fontWeight: 800 }}>⚡ Intelligente Features:</h5>
            <ul style={{ margin: 0, paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <li><strong>Matrix-Ansicht:</strong> Alle Lehrkräfte und Räume parallel im Blick.</li>
              <li><strong>Kollisionserkennung:</strong> Verhindert Doppelbelegungen von Räumen und Lehrern sofort beim Drag & Drop.</li>
              <li><strong>Dynamisches Terminänderungen-Widget:</strong> Änderungen werden automatisch auf dem Briefing-Dashboard der Lehrkraft und in der Schüler-App angezeigt – wenn keine Änderungen anstehen, bleibt das Dashboard vollkommen aufgeräumt.</li>
            </ul>
          </div>
        </div>
      )
    },
    {
      id: 'feat-homework-blueprint',
      title: 'Schüler-Protokoll & Hausaufgabenheft-Blaupause',
      category: 'features',
      roles: ['admin', 'teacher'],
      badge: 'Pädagogik',
      summary: 'Die verbindliche Master-Blaupause: Reinweiße Hero-Card & matte Werkzeugbank.',
      tags: ['hausaufgaben', 'protokoll', 'meisterwerk', 'buch', 'seite', 'audio'],
      details: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '0.86rem', color: '#334155', lineHeight: 1.6 }}>
          <p>
            Das Hausaufgabenheft folgt der ergonomischen Master-Blaupause für maximale Übersicht und Lesbarkeit:
          </p>
          <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '14px', border: '1px solid #e2e8f0' }}>
            <h5 style={{ margin: '0 0 6px 0', color: '#0f172a', fontWeight: 800 }}>🎨 Design & Zuordnungsregeln:</h5>
            <ul style={{ margin: 0, paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <li><strong>Hero-Card:</strong> Reinweiße Schwebekarte mit 3D-Diffusionsschatten und offener Magazin-Typografie.</li>
              <li><strong>Matte Werkzeugbank:</strong> Eingabefelder für Lehrkräfte (Play-Along, Bemerkungen, Interne Notiz) liegen dezent unterhalb der Vorschau.</li>
              <li><strong>Strikte Audio-Zuordnung:</strong> Aufnahmen der Lehrkraft erscheinen beim Schüler immer <em>links</em> („Von deiner Lehrkraft“), eigene Schüleraufnahmen <em>rechts</em> („Dein Übe-Studio“).</li>
            </ul>
          </div>
        </div>
      )
    },
    {
      id: 'feat-loopstation',
      title: 'Audio-Loopstation & Fokus-Timer',
      category: 'features',
      roles: ['teacher', 'student', 'admin'],
      badge: 'Praxis-Tool',
      summary: 'Präzises Mehrspur-Looping mit 4-Takte-Pause gegen Swallowed Attacks.',
      tags: ['loopstation', 'audio', 'üben', 'metronom', 'pause', 'timer', 'streak'],
      details: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '0.86rem', color: '#334155', lineHeight: 1.6 }}>
          <p>
            Die Loopstation ermöglicht Schülern und Lehrkräften das synchrone Einspielen von Begleit- und Solospuren.
          </p>
          <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '14px', border: '1px solid #e2e8f0' }}>
            <h5 style={{ margin: '0 0 6px 0', color: '#0f172a', fontWeight: 800 }}>🎛️ Highlights:</h5>
            <ul style={{ margin: 0, paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <li><strong>Zwingende 4-Takte-Pause:</strong> Garantiert 100% sample-genaue Synchronität und verhindert das Abschneiden der ersten Note (Swallowed Attack).</li>
              <li><strong>Audio-Tresor Sync:</strong> Gelöschte Aufnahmen werden vollständig aus dem Speicher entfernt; aktive Spuren bleiben datenschutzsicher isoliert.</li>
              <li><strong>XP & Streaks:</strong> Jede Übe-Session belohnt Schüler mit Erfahrungspunkten und motivierenden Übe-Serien.</li>
            </ul>
          </div>
        </div>
      )
    },
    {
      id: 'feat-student-homework-flow',
      title: 'Aufgabenheft, Play-Alongs & Notizen',
      category: 'features',
      roles: ['student', 'teacher', 'admin'],
      badge: 'Hausaufgaben',
      summary: 'So rufst du deine Hausaufgaben, Notizen und Hörbeispiele deiner Lehrkraft ab.',
      tags: ['hausaufgaben', 'aufgaben', 'schüler', 'eltern', 'notizen', 'play along', 'audio'],
      details: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '0.86rem', color: '#334155', lineHeight: 1.6 }}>
          <p>
            Im Aufgabenheft findest du alles, was du für deine wöchentlichen Übe-Sessions brauchst:
          </p>
          <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '14px', border: '1px solid #e2e8f0' }}>
            <h5 style={{ margin: '0 0 6px 0', color: '#0f172a', fontWeight: 800 }}>📖 Schnelle Orientierung:</h5>
            <ul style={{ margin: 0, paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <li><strong>Seitenzahlen & Lehrbuch:</strong> Grüne Markierungen (z. B. <em>S. 24</em>) zeigen dir genau, welche Stücke geübt werden.</li>
              <li><strong>Aufnahmen deiner Lehrkraft:</strong> Findest du immer auf der <strong>linken Seite</strong> („Von deiner Lehrkraft“).</li>
              <li><strong>Deine eigenen Aufnahmen:</strong> Landen sicher auf der <strong>rechten Seite</strong> in deinem persönlichen Übe-Studio.</li>
            </ul>
          </div>
        </div>
      )
    },
    {
      id: 'feat-student-streaks-xp',
      title: 'XP-Punkte, Level-Aufstieg & Übe-Serien',
      category: 'features',
      roles: ['student', 'teacher', 'admin'],
      badge: 'Motivation',
      summary: 'Wie du deine Flamme anfeuerst, Schutzschilde nutzt und Belohnungen freischaltest.',
      tags: ['streak', 'xp', 'level', 'avatar', 'flamme', 'schutzschild', 'ferien'],
      details: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '0.86rem', color: '#334155', lineHeight: 1.6 }}>
          <p>
            Regelmäßiges Üben zahlt sich aus! Für jede Übe-Session mit dem Fokus-Timer erhältst du XP:
          </p>
          <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '14px', border: '1px solid #e2e8f0' }}>
            <h5 style={{ margin: '0 0 6px 0', color: '#0f172a', fontWeight: 800 }}>🔥 Übe-Streak & Schutzschilde:</h5>
            <ul style={{ margin: 0, paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <li><strong>Täglicher Streak:</strong> Übe täglich mit dem Timer, um deine Serie aufzubauen.</li>
              <li><strong>3 wöchentliche Schutzschilde:</strong> Verhindern das Erlöschen deiner Flamme, wenn du einmal keine Zeit hast.</li>
              <li><strong>Ferien-Booster (2× XP):</strong> In den Ferien friert dein Streak automatisch ein – wer freiwillig übt, sammelt doppelte XP!</li>
            </ul>
          </div>
        </div>
      )
    },
    {
      id: 'feat-student-recordings-studio',
      title: 'Dein eigenes Übe-Studio: Audio-Aufnahmen & Play-Alongs',
      category: 'features',
      roles: ['student', 'teacher', 'admin'],
      badge: 'Übe-Studio',
      summary: 'So nimmst du deine Übe-Erfolge auf und spielst zur Begleitung deiner Lehrkraft.',
      tags: ['studio', 'aufnahme', 'playalong', 'loopstation', 'mikrofon', 'audio'],
      details: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '0.86rem', color: '#334155', lineHeight: 1.6 }}>
          <p>
            Im Übe-Studio kannst du deine eigenen Fortschritte festhalten und anhören:
          </p>
          <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '14px', border: '1px solid #e2e8f0' }}>
            <h5 style={{ margin: '0 0 6px 0', color: '#0f172a', fontWeight: 800 }}>🎧 Studio-Funktionen:</h5>
            <ul style={{ margin: 0, paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <li><strong>Eigene Aufnahmen:</strong> Drücke auf Aufnahme, spiele dein Stück ein und speichere es in deiner Liste.</li>
              <li><strong>Begleit-Playalong:</strong> Spiele die Lehrkraft-Aufnahme (links) ab und nimm deine eigene Stimme (rechts) synchron dazu auf.</li>
              <li><strong>Audio-Sicherheit:</strong> Deine Aufnahmen sind privat und nur für dich und deine Lehrkraft sichtbar.</li>
            </ul>
          </div>
        </div>
      )
    },
    {
      id: 'feat-groovelab-bands',
      title: 'GrooveLab-Modul: Bands, Songs & Skill-Radar',
      category: 'features',
      roles: ['admin', 'teacher', 'student'],
      badge: 'Band-Modul',
      summary: 'Bandgründung, Repertoire-Planer, Musiker-Avatare und synchrones Live Lab.',
      tags: ['groovelab', 'band', 'song', 'skill', 'radar', 'repertoire', 'live lab'],
      details: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '0.86rem', color: '#334155', lineHeight: 1.6 }}>
          <p>
            Das gelbe GrooveLab-Modul verwandelt die Musikschule in ein modernes Band- und Ensemble-Ökosystem:
          </p>
          <div style={{ background: '#fefce8', padding: '14px', borderRadius: '14px', border: '1px solid #fef08a' }}>
            <h5 style={{ margin: '0 0 6px 0', color: '#854d0e', fontWeight: 800 }}>🎸 GrooveLab Funktionen:</h5>
            <ul style={{ margin: 0, paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <li><strong>Musiker- & Band-Avatare:</strong> Schüler und Lehrer wählen ihren passenden Musiker-Avatar.</li>
              <li><strong>Songs meistern:</strong> Zentrale Songbibliothek mit Chords, Song-Abläufen und Fortschritts-Tracking.</li>
              <li><strong>Skill-Radar:</strong> Visualisiert instrumentale Kompetenzen in einem dynamischen Netzdiagramm.</li>
              <li><strong>Live Lab:</strong> Synchrones Proben-Dashboard auf Tablets im Band-Raum.</li>
            </ul>
          </div>
        </div>
      )
    },
    {
      id: 'faq-family-multi-profile',
      title: 'Familien-Schnellwechsel: Mehrere Geschwister auf einem gemeinsamen Tablet',
      category: 'faq',
      roles: ['student', 'teacher', 'admin'],
      badge: 'Familie',
      summary: 'Schneller 1-Klick Profilwechsel für mehrere Kinder ohne ständige PIN-Eingabe.',
      tags: ['geschwister', 'familie', 'tablet', 'profil', 'wechsel', 'kinder', 'eltern'],
      details: (
        <div style={{ fontSize: '0.86rem', color: '#334155', lineHeight: 1.6 }}>
          <p>
            Wenn mehrere Geschwisterkinder dieselbe Musikschule besuchen und sich ein Familien-Tablet teilen, 
            funktioniert der Profilwechsel über den integrierten <strong>Familien-Schnellwechsel</strong>:
          </p>
          <ul style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <li>Einmal gekoppelte Geschwisterprofile können direkt über das Profil-Icon am oberen Bildschirmrand per Fingertipp gewechselt werden.</li>
            <li>Kein lästiges Neu-Einloggen oder wiederholte Passworteingabe – jedes Kind gelangt direkt in sein eigenes Aufgabenheft.</li>
          </ul>
        </div>
      )
    },

    // ----------------- FAQ & SCHNELLE ANTWORTEN -----------------
    {
      id: 'faq-zero-mail',
      title: 'Wie funktioniert der Login ohne E-Mail-Adressen (Zero-Mail)?',
      category: 'faq',
      roles: ['admin', 'secretary', 'teacher', 'student'],
      badge: 'Datenschutz',
      summary: 'Maximale Kindersicherheit nach DSGVO & COPPA durch QR-Passkeys und PINs.',
      tags: ['login', 'zero mail', 'passwort', 'qr', 'ausweis', 'pin'],
      details: (
        <div style={{ fontSize: '0.86rem', color: '#334155', lineHeight: 1.6 }}>
          <p>
            Campus-Groovelab speichert <strong>keine E-Mail-Adressen oder Passwörter von Schülern</strong>. 
            Jeder Schüler erhält einen persönlichen QR-Code-Ausweis (Campus-Pass) mit einer eindeutigen 6-stelligen Notfall-PIN. 
            Ein einfacher Kamerascan oder PIN-Eingabe genügt, um das geschützte Profil sofort zu laden.
          </p>
        </div>
      )
    },
    {
      id: 'faq-name-anonymization',
      title: 'Warum werden Schülernamen im Lehrer-Dashboard abgekürzt?',
      category: 'faq',
      roles: ['admin', 'teacher'],
      badge: 'DSGVO',
      summary: 'Klarname-Minimierung ("Max M.") schützt Minderjährige platformweit.',
      tags: ['datenschutz', 'name', 'anonym', 'lehrer', 'dsgvo'],
      details: (
        <div style={{ fontSize: '0.86rem', color: '#334155', lineHeight: 1.6 }}>
          <p>
            Gemäß DSGVO Art. 8 und dem Datenminimierungs-Grundsatz werden Schülernamen im Lehrer- und Verwaltungsbereich 
            automatisch als <em>„Vorname + Anfangsbuchstabe Nachname“</em> (z. B. <strong>Max M.</strong>) dargestellt. 
            Lehrkräfte hingegen werden für Schüler und Eltern immer mit ihrem <strong>vollständigen Vor- und Nachnamen</strong> angezeigt, 
            um maximale Transparenz und Vertrauen zu gewährleisten.
          </p>
        </div>
      )
    },
    {
      id: 'faq-pwa-install',
      title: 'Wie installiere ich Campus-Groovelab als App auf iPad / iPhone / Android?',
      category: 'faq',
      roles: ['admin', 'teacher', 'student'],
      badge: 'PWA',
      summary: '1-Klick-Installation direkt vom Home-Bildschirm ohne App-Store-Zwang.',
      tags: ['app', 'installieren', 'ipad', 'iphone', 'android', 'pwa', 'homescreen'],
      details: (
        <div style={{ fontSize: '0.86rem', color: '#334155', lineHeight: 1.6 }}>
          <p>
            Campus-Groovelab ist eine moderne Progressive Web App (PWA):
          </p>
          <ul style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <li><strong>iOS (iPhone/iPad):</strong> In Safari unten auf das <em>Teilen-Symbol</em> tippen und <em>„Zum Home-Bildschirm“</em> wählen.</li>
            <li><strong>Android:</strong> Im Chrome-Menü (3 Punkte) auf <em>„App installieren“</em> oder <em>„Zum Startbildschirm hinzufügen“</em> tippen.</li>
          </ul>
        </div>
      )
    },
    {
      id: 'faq-kiosk-coupling',
      title: 'Wie richte ich ein Wand-Tablet / Kiosk-Display im Proberaum ein?',
      category: 'faq',
      roles: ['admin'],
      badge: 'Hardware',
      summary: 'Kopplung per geheimem Raum-Token für vollautomatische Raumpläne.',
      tags: ['kiosk', 'tablet', 'raum', 'display', 'koppeln', 'token'],
      details: (
        <div style={{ fontSize: '0.86rem', color: '#334155', lineHeight: 1.6 }}>
          <p>
            1. Öffnen Sie auf dem Raum-Tablet im Vollbildbrowser <code>campus-groovelab.de</code>.<br />
            2. Wählen Sie <em>„Gerät / Raum koppeln“</em>.<br />
            3. Wählen Sie den gewünschten Raum aus dem Admin-Plan oder scannen Sie den Raum-Token. 
            Das Tablet sperrt sich automatisch im Kiosk-Modus und aktualisiert den Raumplan ohne manuelles Neuladen.
          </p>
        </div>
      )
    },

    // ----------------- COMPLIANCE & BILLING -----------------
    {
      id: 'comp-pricing-structure',
      title: 'Das transparente Enterprise-Preisschema (0,00 € Software)',
      category: 'compliance',
      roles: ['admin', 'secretary'],
      badge: 'Rechtssicher',
      summary: 'Kanonische Rechnungsaufstellung, keine Lizenzkaufgebühren, reine Cloud-Miete.',
      tags: ['preise', 'abrechnung', 'gebühren', 'hosting', 'sammelzahler', 'direktabrechnung'],
      details: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.86rem', color: '#334155', lineHeight: 1.6 }}>
          <p>
            Für Campus-Groovelab fallen <strong>keine Software-Lizenzkaufgebühren</strong> an. Abgerechnet wird ausschließlich die gemietete Cloud- und Bereitstellungs-Infrastruktur:
          </p>
          <div style={{ background: '#f8fafc', borderRadius: '12px', padding: '12px', border: '1px solid #e2e8f0', fontFamily: 'monospace', fontSize: '0.8rem' }}>
            <div>1. Campus-Groovelab Software-Bereitstellung: 0,00 € (Inklusive)</div>
            <div>2. Cloud- & Datenbank-Hosting Campus: 14,90 € / Mo.</div>
            <div>3. Cloud- & Datenbank-Hosting GrooveLab: 9,90 € / Mo.</div>
            <div>4. Kombi-Vorteilsrabatt (Infrastruktur-Bündel): -4,90 € / Mo. (19,90 €)</div>
            <div>5. Service- & Administrationspauschale: 0,49 € / Lehrkraft (Admins 0,00 €)</div>
            <div>6. Basis-Bereitstellung: 0,09 € / Schüler</div>
            <div>7. Cloud- & Modul-Bereitstellung Campus: 0,49 € / aktiver Schüler</div>
            <div>8. Cloud- & Modul-Bereitstellung GrooveLab: 0,49 € / Schüler (100% Schule)</div>
          </div>
        </div>
      )
    },
    {
      id: 'comp-avv-dpo',
      title: 'DSGVO Auftragsverarbeitung (AVV nach Art. 28)',
      category: 'compliance',
      roles: ['admin', 'secretary'],
      badge: 'DSGVO Art. 28',
      summary: 'Rechtssichere AVV-Vereinbarung mit 1-Klick-Zertifikat im DPO-Portal.',
      tags: ['avv', 'dsgvo', 'datenschutz', 'vertrag', 'dpo', 'auftragsverarbeitung'],
      details: (
        <div style={{ fontSize: '0.86rem', color: '#334155', lineHeight: 1.6 }}>
          <p>
            Ihre Vereinbarung zur Auftragsverarbeitung (AVV) nach Art. 28 DSGVO ist direkt in der Plattform integriert. 
            Im DPO-Portal können Sie das rechtsgültige Dokument jederzeit einsehen, mit Ihren Schuldaten verknüpfen und als revisionssicheres PDF für Ihre Schulunterlagen exportieren.
          </p>
        </div>
      )
    },
    {
      id: 'comp-teacher-gdpr',
      title: 'DSGVO & Kindersicherheit im Musikunterricht (Art. 8)',
      category: 'compliance',
      roles: ['teacher', 'admin'],
      badge: 'DSGVO Art. 8',
      summary: 'Schülernamen-Anonymisierung, Zero-Mail & revisionssichere Audio-Isolation.',
      tags: ['datenschutz', 'dsgvo', 'anonym', 'audio', 'tresor', 'kindersicherheit', 'lehrer'],
      details: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.86rem', color: '#334155', lineHeight: 1.6 }}>
          <p>
            Campus-Groovelab schützt minderjährige Musikschüler nach den strengsten europäischen Datenschutz-Richtlinien:
          </p>
          <div style={{ background: '#f8fafc', borderRadius: '14px', padding: '14px', border: '1px solid #e2e8f0' }}>
            <h5 style={{ margin: '0 0 6px 0', color: '#0f172a', fontWeight: 800 }}>🛡️ Schutzmaßnahmen für Lehrkräfte:</h5>
            <ul style={{ margin: 0, paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <li><strong>Namens-Anonymisierung:</strong> Schülernamen werden automatisch als <em>„Vorname + N.“</em> dargestellt.</li>
              <li><strong>Zero-Mail Schutz:</strong> Keine Erfassung von Schüler-E-Mail-Adressen oder Passwörtern erforderlich.</li>
              <li><strong>Revisionssicherer Audio-Tresor:</strong> Gelöschte Übe-Takes werden physisch und vollständig aus dem Cloud-Speicher entfernt.</li>
              <li><strong>Hardware-Sicherheit:</strong> Audio- und Mikrofon-Zugriffe stoppen beim Verlassen der Ansicht sofort.</li>
            </ul>
          </div>
        </div>
      )
    },
    {
      id: 'comp-student-data-safety',
      title: 'Deine Privatsphäre & Kindersicherheit bei Campus-Groovelab',
      category: 'compliance',
      roles: ['student', 'teacher', 'admin'],
      badge: 'Privatsphäre',
      summary: '100% werbefrei, keine Tracker, keine Passwörter & deutsches Hosting.',
      tags: ['datenschutz', 'privatsphäre', 'kindersicherheit', 'pin', 'sicher', 'werbefrei'],
      details: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.86rem', color: '#334155', lineHeight: 1.6 }}>
          <p>
            Wir nehmen deinen Schutz und deine Privatsphäre sehr ernst:
          </p>
          <div style={{ background: '#f0fdf4', borderRadius: '14px', padding: '14px', border: '1px solid #bbf7d0' }}>
            <h5 style={{ margin: '0 0 6px 0', color: '#15803d', fontWeight: 800 }}>🌟 Dein Sicherheits-Versprechen:</h5>
            <ul style={{ margin: 0, paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <li><strong>100% Werbefrei:</strong> Keine Werbe-Banner, keine Tracking-Cookies und kein Datenverkauf.</li>
              <li><strong>Geschützte Profil-PIN:</strong> Deine Übe-Zeiten und Notizen sind durch deine 4-stellige PIN vor neugierigen Blicken geschützt.</li>
              <li><strong>Sichere Server in Deutschland:</strong> Alle Daten werden nach strengen europäischen Datenschutz-Gesetzen (DSGVO) verarbeitet.</li>
            </ul>
          </div>
        </div>
      )
    }
  ], []);

  // Filtered guides based on role, category, and search query
  const filteredGuides = useMemo(() => {
    return GUIDES_DATABASE.filter(guide => {
      // Role filter
      if (!guide.roles.includes(userRole)) return false;

      // Category filter (if no search query)
      if (!searchQuery && guide.category !== activeTab) return false;

      // Search filter
      if (searchQuery) {
        const q = searchQuery.toLowerCase().trim();
        const matchesTitle = guide.title.toLowerCase().includes(q);
        const matchesSummary = guide.summary.toLowerCase().includes(q);
        const matchesTags = guide.tags.some(t => t.toLowerCase().includes(q));
        return matchesTitle || matchesSummary || matchesTags;
      }

      return true;
    });
  }, [GUIDES_DATABASE, userRole, activeTab, searchQuery]);

  // Selected guide object
  const activeGuide = useMemo(() => {
    if (!selectedGuideId) return null;
    return GUIDES_DATABASE.find(g => g.id === selectedGuideId) || null;
  }, [GUIDES_DATABASE, selectedGuideId]);

  if (!isOpen) return null;

  return (
    <div 
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        background: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        display: 'flex',
        justifyContent: 'flex-end',
        animation: 'fadeIn 0.2s ease-out'
      }}
      onClick={onClose}
    >
      <div 
        style={{
          width: '100%',
          maxWidth: '680px',
          height: '100%',
          background: '#ffffff',
          boxShadow: '-10px 0 40px rgba(0, 0, 0, 0.25)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          animation: 'slideLeft 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div style={{
          padding: '18px 24px',
          borderBottom: '1px solid #f1f5f9',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: '#ffffff',
          position: 'sticky',
          top: 0,
          zIndex: 10
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: '14px',
              background: themeLightBg,
              color: themeColor,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: `1px solid ${themeColor}30`,
              boxShadow: `0 4px 12px ${themeColor}15`
            }}>
              <BookOpen size={22} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.02em' }}>
                  Leitfäden & Akademie
                </h3>
                <span style={{
                  fontSize: '0.7rem',
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  padding: '2px 8px',
                  borderRadius: '100px',
                  background: themeLightBg,
                  color: themeColor,
                  letterSpacing: '0.04em'
                }}>
                  {userRole === 'admin' ? 'Schulleitung' : userRole === 'teacher' ? 'Lehrkraft' : userRole === 'secretary' ? 'Sekretariat' : 'Schüler'}
                </span>
              </div>
              <p style={{ margin: '2px 0 0 0', fontSize: '0.78rem', color: '#64748b', fontWeight: 600 }}>
                {schoolName} • Offizielles Enterprise-Handbuch
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '12px',
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              color: '#64748b',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#f1f5f9';
              e.currentTarget.style.color = '#0f172a';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#f8fafc';
              e.currentTarget.style.color = '#64748b';
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Search Input */}
        <div style={{ padding: '14px 24px', background: '#fafafa', borderBottom: '1px solid #f1f5f9' }}>
          <div style={{ position: 'relative' }}>
            <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Thema, Stichwort oder Frage suchen (z. B. Kiosk, Hausaufgaben, PIN, Rechnungen)..."
              style={{
                width: '100%',
                padding: '11px 16px 11px 40px',
                borderRadius: '14px',
                border: '1px solid #e2e8f0',
                background: '#ffffff',
                fontSize: '0.85rem',
                fontWeight: 600,
                color: '#0f172a',
                outline: 'none',
                boxSizing: 'border-box',
                transition: 'border-color 0.2s ease, box-shadow 0.2s ease'
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = themeColor;
                e.currentTarget.style.boxShadow = `0 0 0 3px ${themeColor}20`;
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = '#e2e8f0';
                e.currentTarget.style.boxShadow = 'none';
              }}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  padding: '4px'
                }}
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Tabs Bar (Visible when not searching) */}
        {!searchQuery && (
          <div style={{
            display: 'flex',
            borderBottom: '1px solid #f1f5f9',
            padding: '0 24px',
            background: '#ffffff',
            gap: '8px',
            overflowX: 'auto'
          }}>
            {[
              { id: 'quickstart', label: '🚀 Erste Schritte', count: GUIDES_DATABASE.filter(g => g.category === 'quickstart' && g.roles.includes(userRole)).length },
              { id: 'features', label: '📚 Feature-Guides', count: GUIDES_DATABASE.filter(g => g.category === 'features' && g.roles.includes(userRole)).length },
              { id: 'faq', label: '❓ FAQ & Tipps', count: GUIDES_DATABASE.filter(g => g.category === 'faq' && g.roles.includes(userRole)).length },
              ...(userRole === 'admin' || userRole === 'secretary' ? [
                { id: 'compliance', label: '🛡️ DSGVO & Preise', count: GUIDES_DATABASE.filter(g => g.category === 'compliance' && g.roles.includes(userRole)).length }
              ] : [
                { id: 'compliance', label: '🛡️ Datenschutz & Sicherheit', count: GUIDES_DATABASE.filter(g => g.category === 'compliance' && g.roles.includes(userRole)).length }
              ])
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id as any);
                  setSelectedGuideId(null);
                }}
                style={{
                  padding: '12px 14px',
                  background: 'none',
                  border: 'none',
                  borderBottom: activeTab === tab.id ? `3px solid ${themeColor}` : '3px solid transparent',
                  color: activeTab === tab.id ? '#0f172a' : '#64748b',
                  fontWeight: activeTab === tab.id ? 800 : 600,
                  fontSize: '0.84rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.15s ease'
                }}
              >
                <span>{tab.label}</span>
                <span style={{
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  padding: '1px 6px',
                  borderRadius: '100px',
                  background: activeTab === tab.id ? themeLightBg : '#f1f5f9',
                  color: activeTab === tab.id ? themeColor : '#94a3b8'
                }}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>
        )}

        {/* Content Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', background: '#fafcff' }}>
          
          {/* Detail View of a Selected Guide */}
          {activeGuide ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <button
                onClick={() => setSelectedGuideId(null)}
                style={{
                  alignSelf: 'flex-start',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: 'none',
                  border: 'none',
                  color: themeColor,
                  fontWeight: 800,
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                  padding: '4px 8px',
                  borderRadius: '8px'
                }}
              >
                ← Zurück zur Übersicht
              </button>

              <div style={{
                background: '#ffffff',
                borderRadius: '20px',
                padding: '24px',
                border: '1px solid #e2e8f0',
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.04)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  {activeGuide.badge && (
                    <span style={{
                      fontSize: '0.68rem',
                      fontWeight: 800,
                      textTransform: 'uppercase',
                      padding: '2px 8px',
                      borderRadius: '6px',
                      background: themeLightBg,
                      color: themeColor
                    }}>
                      {activeGuide.badge}
                    </span>
                  )}
                  <span style={{ fontSize: '0.72rem', fontWeight: 600, color: '#94a3b8' }}>
                    ID: {activeGuide.id}
                  </span>
                </div>

                <h2 style={{ margin: '0 0 8px 0', fontSize: '1.25rem', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.02em' }}>
                  {activeGuide.title}
                </h2>
                <p style={{ margin: '0 0 20px 0', fontSize: '0.88rem', color: '#475569', lineHeight: 1.5 }}>
                  {activeGuide.summary}
                </p>

                {/* Steps Flow (if present) */}
                {activeGuide.steps && activeGuide.steps.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '16px' }}>
                    {activeGuide.steps.map((step, idx) => (
                      <div 
                        key={idx}
                        style={{
                          display: 'flex',
                          gap: '14px',
                          background: '#f8fafc',
                          padding: '16px',
                          borderRadius: '14px',
                          border: '1px solid #edf2f7'
                        }}
                      >
                        <div style={{
                          width: '28px',
                          height: '28px',
                          borderRadius: '8px',
                          background: themeColor,
                          color: '#ffffff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 900,
                          fontSize: '0.8rem',
                          flexShrink: 0
                        }}>
                          {idx + 1}
                        </div>
                        <div>
                          <h4 style={{ margin: '0 0 4px 0', fontSize: '0.92rem', fontWeight: 800, color: '#0f172a' }}>
                            {step.title}
                          </h4>
                          <p style={{ margin: 0, fontSize: '0.84rem', color: '#475569', lineHeight: 1.5 }}>
                            {step.desc}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Rich Details (if present) */}
                {activeGuide.details && (
                  <div style={{ marginTop: '16px' }}>
                    {activeGuide.details}
                  </div>
                )}

                {/* Action Footer */}
                <div style={{
                  marginTop: '24px',
                  paddingTop: '16px',
                  borderTop: '1px solid #f1f5f9',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '10px'
                }}>
                  <button
                    onClick={() => handleCopy(`${activeGuide.title}\n\n${activeGuide.summary}\n\n${activeGuide.steps?.map((s, i) => `${i+1}. ${s.title}: ${s.desc}`).join('\n') || ''}`, activeGuide.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      background: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      padding: '8px 14px',
                      borderRadius: '10px',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      color: '#475569',
                      cursor: 'pointer'
                    }}
                  >
                    {copiedText === activeGuide.id ? <Check size={14} color="#16a34a" /> : <Copy size={14} />}
                    <span>{copiedText === activeGuide.id ? 'Inhalt kopiert!' : 'Leitfaden kopieren'}</span>
                  </button>

                  <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600 }}>
                    Campus-Groovelab Master-Standard
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* List of Guides */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              
              {/* Role-tailored Quickstart Hero Banner */}
              {activeTab === 'quickstart' && !searchQuery && (() => {
                const bannerConfig = userRole === 'teacher' ? {
                  tag: 'ENTERPRISE MASTER-STANDARD • LEHRKRAFT',
                  tagColor: '#34d399',
                  title: 'Dein digitaler Unterrichtsassistent',
                  desc: 'Hausaufgabenheft, Lehrkraft-Aufnahmen & Fokus-Timer: So begleitest du deine Schüler optimal.',
                  targetId: 'qs-teacher-first-lesson',
                  buttonText: 'Lehrkraft-Schnellstart öffnen'
                } : userRole === 'secretary' ? {
                  tag: 'ENTERPRISE MASTER-STANDARD • VERWALTUNG',
                  tagColor: '#f87171',
                  title: 'Campus-Verwaltung & Sekretariats-Zentrale',
                  desc: 'Schüleraufnahme, Raumbelegungen, Kiosk-Displays & automatisierte Eltern-Infoblätter.',
                  targetId: 'qs-secretary-workflow',
                  buttonText: 'Sekretariats-Schnellstart öffnen'
                } : userRole === 'student' ? {
                  tag: 'CAMPUS & GROOVELAB GUIDE • SCHÜLER',
                  tagColor: '#38bdf8',
                  title: 'Dein digitaler Campus-Pass',
                  desc: 'Hausaufgabenheft, Fokus-Timer, Streaks und deine interaktive Loopstation.',
                  targetId: 'qs-student-onboarding',
                  buttonText: 'Schüler-Guide öffnen'
                } : {
                  tag: 'TIER-1 ENTERPRISE MASTER-STANDARD • SCHULLEITUNG',
                  tagColor: '#facc15',
                  title: 'Deine Musikschule in 10 Minuten startklar',
                  desc: 'Folge dem 4-Schritte-Rollout, um Räume, Kollegium und Schüler ohne Datenstress einzurichten.',
                  targetId: 'qs-admin-school-setup',
                  buttonText: 'Schulleitungs-Schnellstart öffnen'
                };

                return (
                  <div style={{
                    background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
                    borderRadius: '18px',
                    padding: '20px',
                    color: '#ffffff',
                    boxShadow: '0 8px 24px rgba(15, 23, 42, 0.15)',
                    marginBottom: '6px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                      <Sparkles size={16} color={bannerConfig.tagColor} />
                      <span style={{ fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', color: bannerConfig.tagColor, letterSpacing: '0.06em' }}>
                        {bannerConfig.tag}
                      </span>
                    </div>
                    <h3 style={{ margin: '0 0 6px 0', fontSize: '1.05rem', fontWeight: 900, letterSpacing: '-0.01em' }}>
                      {bannerConfig.title}
                    </h3>
                    <p style={{ margin: '0 0 16px 0', fontSize: '0.8rem', color: '#94a3b8', lineHeight: 1.5 }}>
                      {bannerConfig.desc}
                    </p>
                    <button
                      onClick={() => setSelectedGuideId(bannerConfig.targetId)}
                      style={{
                        background: themeColor,
                        color: '#ffffff',
                        border: 'none',
                        padding: '8px 16px',
                        borderRadius: '10px',
                        fontSize: '0.8rem',
                        fontWeight: 800,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      <span>{bannerConfig.buttonText}</span>
                      <ChevronRight size={14} />
                    </button>
                  </div>
                );
              })()}

              {filteredGuides.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                  <div style={{ width: '48px', height: '48px', borderRadius: '16px', background: '#f1f5f9', color: '#94a3b8', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                    <Search size={22} />
                  </div>
                  <h4 style={{ margin: '0 0 4px 0', fontSize: '0.95rem', fontWeight: 800, color: '#0f172a' }}>
                    Kein Leitfaden gefunden
                  </h4>
                  <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b' }}>
                    Versuche es mit einem anderen Suchbegriff oder wechsle den Tab.
                  </p>
                </div>
              ) : (
                filteredGuides.map(guide => (
                  <div
                    key={guide.id}
                    onClick={() => setSelectedGuideId(guide.id)}
                    style={{
                      background: '#ffffff',
                      borderRadius: '16px',
                      padding: '16px 18px',
                      border: '1px solid #e2e8f0',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '14px',
                      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.02)'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = themeColor;
                      e.currentTarget.style.transform = 'translateY(-1px)';
                      e.currentTarget.style.boxShadow = `0 6px 16px ${themeColor}12`;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = '#e2e8f0';
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.02)';
                    }}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {guide.badge && (
                          <span style={{
                            fontSize: '0.66rem',
                            fontWeight: 800,
                            textTransform: 'uppercase',
                            padding: '1px 6px',
                            borderRadius: '5px',
                            background: themeLightBg,
                            color: themeColor
                          }}>
                            {guide.badge}
                          </span>
                        )}
                        <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 800, color: '#0f172a' }}>
                          {guide.title}
                        </h4>
                      </div>
                      <p style={{ margin: 0, fontSize: '0.78rem', color: '#64748b', lineHeight: 1.4 }}>
                        {guide.summary}
                      </p>
                    </div>

                    <div style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '10px',
                      background: '#f8fafc',
                      color: '#94a3b8',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      <ChevronRight size={16} />
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Footer Support Hub */}
        <div style={{
          padding: '14px 24px',
          borderTop: '1px solid #f1f5f9',
          background: '#ffffff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '10px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#22c55e' }} />
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569' }}>
              Campus-Groovelab Support & Wissensdatenbank
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {onOpenFeedbackHub && (
              <button
                onClick={() => {
                  onClose();
                  onOpenFeedbackHub();
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '7px 12px',
                  borderRadius: '10px',
                  background: '#ec4899',
                  color: '#ffffff',
                  border: 'none',
                  fontWeight: 800,
                  fontSize: '0.75rem',
                  cursor: 'pointer'
                }}
              >
                <Lightbulb size={13} />
                <span>Ideenschmiede</span>
              </button>
            )}
            
            <a
              href="mailto:support@campus-groovelab.de"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '7px 12px',
                borderRadius: '10px',
                background: '#f1f5f9',
                color: '#334155',
                border: 'none',
                fontWeight: 700,
                fontSize: '0.75rem',
                textDecoration: 'none',
                cursor: 'pointer'
              }}
            >
              <MessageSquare size={13} />
              <span>Hilfe anfordern</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
