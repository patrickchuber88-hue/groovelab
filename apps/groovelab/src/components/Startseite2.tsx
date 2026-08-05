import React, { useState, useEffect } from 'react';
import { 
  Music, Calendar, ShieldCheck, Users, 
  Layers, ChevronDown, Check, ArrowRight, X, Menu, BookOpen, Sparkles
} from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Startseite2Props {
  onLogin: () => void;
  onRegister: (email?: string) => void;
  onShowPrivacy?: () => void;
  onShowAgb?: () => void;
  onShowImpressum?: () => void;
}

export function Startseite2({ onLogin, onRegister }: Startseite2Props) {
  const [activeTab, setActiveTab] = useState<number>(0);
  const [email, setEmail] = useState<string>('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const [hoveredMenu, setHoveredMenu] = useState<string | null>(null);
  const [activeDocument, setActiveDocument] = useState<'none' | 'terms' | 'privacy'>('none');
  const [calcCampus, setCalcCampus] = useState<boolean>(true);
  const [calcGroovelab, setCalcGroovelab] = useState<boolean>(true);
  const [calcStudents, setCalcStudents] = useState<number>(80);
  const [calcTeachers, setCalcTeachers] = useState<number>(8);
  const [calcBillingModel, setCalcBillingModel] = useState<'parent' | 'school'>('parent');
  const [showPrivacyAudits, setShowPrivacyAudits] = useState<boolean>(false);

  // Dynamic pricing state (loaded from master_billing_settings in MasterAdminDashboard)
  const [pricing, setPricing] = useState({
    campus: 7.99,
    groovelab: 4.99,
    kombi: 9.99,
    teacher: 0.49,
    student: 0.49
  });

  useEffect(() => {
    const fetchGlobalPricing = async () => {
      try {
        const { data } = await supabase
          .from('master_billing_settings')
          .select('*')
          .eq('id', 1)
          .maybeSingle();

        if (data) {
          const c = Number(data.price_module_campus) || 7.99;
          const g = Number(data.price_module_groovelab) || 4.99;
          // Dynamic 20% discount formula for Kombi-Vorteil
          const calculatedKombi = Math.round((c + g) * 0.8 * 100) / 100;
          const k = data.price_module_kombi ? Number(data.price_module_kombi) : calculatedKombi;
          const t = Number(data.price_user_teacher) || 0.49;
          const s = Number(data.price_user_student) || 0.49;

          setPricing({
            campus: c,
            groovelab: g,
            kombi: k,
            teacher: t,
            student: s
          });
        }
      } catch (e) {
        console.warn('Could not fetch dynamic pricing:', e);
      }
    };

    fetchGlobalPricing();
  }, []);

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
      onRegister(email.trim().toLowerCase());
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
      title: 'Termingekoppelte Shoutbox.',
      slogan: '100% DSGVO- & schulrechtskonform.',
      description: 'Kein WhatsApp-Zwang, keine Preisgabe privater Handynummern. Direktnachrichten sind exklusiv an den Unterrichtstermin gekoppelt, transport- und serververschlüsselt (TLS 1.3 & AES-256) und frieren nach 48 Stunden automatisch ein. Schützt die Privatsphäre der Lehrer, wahrt den Kinderschutz und erfüllt die Dienstaufsichtspflicht der Musikschule.',
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
            <Music size={24} style={{ color: '#232326' }} />
            <span>Campus-Groovelab</span>
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
              <button style={{
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
              <button style={{
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
              onClick={() => onRegister()}
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
              Kostenlos registrieren
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
                onClick={() => onRegister()}
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
                Kostenlos registrieren
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
          fontSize: 'clamp(1rem, 2vw, 1.25rem)',
          color: '#232326',
          maxWidth: '750px',
          lineHeight: 1.6,
          marginBottom: '40px'
        }}>
          Unser Fokus liegt nicht in der Verwaltung, sondern in der Umsetzung. Campus-Groovelab schließt als intelligenter Übebegleiter und smarter Organisator die Lücke zwischen Schülern, Lehrkräften und Verwaltung – für weniger Missverständnisse und mehr Freude am Musikmachen.
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
            placeholder="Deine E-Mail-Adresse"
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
              fontWeight: 600,
              fontSize: '16px',
              padding: '16px 32px',
              cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(52, 168, 83, 0.2)',
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
            Jetzt kostenlos starten
          </button>
        </form>

        <p style={{
          fontSize: '11px',
          color: '#64748b',
          marginTop: '-4px',
          marginBottom: '20px',
          textAlign: 'center',
          lineHeight: 1.4,
          maxWidth: '540px'
        }}>
          Mit Klick auf „Jetzt kostenlos starten“ stimmen Sie den <a href="#" onClick={(e) => { e.preventDefault(); setActiveDocument('terms'); }} style={{ color: '#34a853', textDecoration: 'underline', fontWeight: 700 }}>Nutzungsbedingungen</a> zu und bestätigen, die <a href="#" onClick={(e) => { e.preventDefault(); setActiveDocument('privacy'); }} style={{ color: '#34a853', textDecoration: 'underline', fontWeight: 700 }}>Datenschutzerklärung</a> zur Kenntnis genommen zu haben.
        </p>

        <p style={{
          fontSize: '13px',
          color: '#7d7d82',
          marginBottom: '64px',
          marginTop: '0px'
        }}>
          Die Basis-Softwarelizenz ist zu 100% kostenlos. Keine Kreditkarte erforderlich.
        </p>

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
                  Weniger Kommunikation über drei Ecken (Schüler, Lehrer, Verwaltung) und ein reibungsloser Ablauf. Wir liefern ein blitzschnelles Krankheitsabwicklungssystem, unkompliziertes Onboarding beim Einrichten der Schule sowie eine effiziente Raumvergabe und Raumbuchung. So bleibt der Fokus auf dem Wesentlichen bei deutlich weniger aktivem Eingreifen durch die Verwaltung.
                </p>
              </div>

              <div style={{ marginTop: 'auto', borderTop: '1px solid #e8e8ed', paddingTop: '24px' }}>
                <h5 style={{ fontSize: '12px', fontWeight: 700, color: '#7d7d82', textTransform: 'uppercase', marginBottom: '16px' }}>Highlights:</h5>
                <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '12px', padding: 0, margin: 0 }}>
                  <li style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '14px', color: '#232326' }}>
                    <Check size={16} style={{ color: '#ea4335', marginTop: '2px', flexShrink: 0 }} />
                    <span><strong>Schnelles Krankheits-System:</strong> Die meisten Nutzer direkt über die App erreichen und aufwendige Telefonketten minimieren.</span>
                  </li>
                  <li style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '14px', color: '#232326' }}>
                    <Check size={16} style={{ color: '#ea4335', marginTop: '2px', flexShrink: 0 }} />
                    <span><strong>Raumvergabe &amp; Buchung:</strong> Schnelle Zuweisung von Räumen und Dienstaufgaben im System.</span>
                  </li>
                  <li style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '14px', color: '#232326' }}>
                    <Check size={16} style={{ color: '#ea4335', marginTop: '2px', flexShrink: 0 }} />
                    <span><strong>Direkter Info-Fluss:</strong> Keine Umwege mehr bei der Kommunikation zwischen allen Beteiligten.</span>
                  </li>
                  <li style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '14px', color: '#232326' }}>
                    <Check size={16} style={{ color: '#ea4335', marginTop: '2px', flexShrink: 0 }} />
                    <span><strong>Einfaches Onboarding:</strong> In wenigen Schritten eingerichtet und sofort startklar.</span>
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
                  Für Lehrer liefern wir eine effiziente Organisation und einfache Kommunikation mit den Schülern. Dokumentiere den Fortschritt spielend leicht im Alltag, melde dich im Krankheitsfall ohne Zusatzaufwand ab und erstelle den Stundenplan mit nur wenigen Klicks. Minimiert Missverständnisse und Ausfälle im Handumdrehen.
                </p>
              </div>

              <div style={{ marginTop: 'auto', borderTop: '1px solid #e8e8ed', paddingTop: '24px' }}>
                <h5 style={{ fontSize: '12px', fontWeight: 700, color: '#7d7d82', textTransform: 'uppercase', marginBottom: '16px' }}>Highlights:</h5>
                <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '12px', padding: 0, margin: 0 }}>
                  <li style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '14px', color: '#232326' }}>
                    <Check size={16} style={{ color: '#34a853', marginTop: '2px', flexShrink: 0 }} />
                    <span><strong>Klick-Stundenplan:</strong> In wenigen Klicks erstellt mit schnellem Onboarding.</span>
                  </li>
                  <li style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '14px', color: '#232326' }}>
                    <Check size={16} style={{ color: '#34a853', marginTop: '2px', flexShrink: 0 }} />
                    <span><strong>iCal-Kalenderabo:</strong> Termine abonnieren und bei Verschiebungen direkt benachrichtigt werden.</span>
                  </li>
                  <li style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '14px', color: '#232326' }}>
                    <Check size={16} style={{ color: '#34a853', marginTop: '2px', flexShrink: 0 }} />
                    <span><strong>Einfache Dokumentation:</strong> Unterrichtsdetails festhalten, bevor sie im Alltag untergehen.</span>
                  </li>
                  <li style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '14px', color: '#232326' }}>
                    <Check size={16} style={{ color: '#34a853', marginTop: '2px', flexShrink: 0 }} />
                    <span><strong>Schnelle Krankmeldung:</strong> Statusmeldung senden, ohne administrativen Zusatzaufwand.</span>
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
                  Aus Sicht des Schülers der perfekte Übebegleiter: Wir liefern zeitgemäße Gamification, um das Üben als Gewohnheit statt als Pflicht zu etablieren. Wir liefern nicht einfach nur Noten, sondern die Gewohnheit, diese spielerisch zu meistern. Termine lassen sich bequem per iCal abonnieren, und schnelle Benachrichtigungen bei Verschiebungen verhindern Missverständnisse.
                </p>
              </div>

              <div style={{ marginTop: 'auto', borderTop: '1px solid #e8e8ed', paddingTop: '24px' }}>
                <h5 style={{ fontSize: '12px', fontWeight: 700, color: '#7d7d82', textTransform: 'uppercase', marginBottom: '16px' }}>Highlights:</h5>
                <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '12px', padding: 0, margin: 0 }}>
                  <li style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '14px', color: '#232326' }}>
                    <Check size={16} style={{ color: '#34a853', marginTop: '2px', flexShrink: 0 }} />
                    <span><strong>Gewohnheit statt Pflicht:</strong> Spielerische Routinen etablieren das Üben im Alltag.</span>
                  </li>
                  <li style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '14px', color: '#232326' }}>
                    <Check size={16} style={{ color: '#34a853', marginTop: '2px', flexShrink: 0 }} />
                    <span><strong>Moderne Gamification:</strong> Zeitgeistentsprechende Motivation, die Kinder begeistert.</span>
                  </li>
                  <li style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '14px', color: '#232326' }}>
                    <Check size={16} style={{ color: '#34a853', marginTop: '2px', flexShrink: 0 }} />
                    <span><strong>Noten meistern:</strong> Wir vermitteln die Gewohnheit zum Meistern der Musiknoten.</span>
                  </li>
                  <li style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '14px', color: '#232326' }}>
                    <Check size={16} style={{ color: '#34a853', marginTop: '2px', flexShrink: 0 }} />
                    <span><strong>iCal-Integration:</strong> Alle Unterrichtstermine abonnieren und immer auf dem Laufenden bleiben.</span>
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
            Warum Musikschulen Campus-Groovelab lieben
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
              Wir überlassen Datenschutz nicht dem Zufall. Weil Campus-Groovelab sich als Add-on versteht, speichern wir nur das absolute Minimum an Nutzerdaten – keine Bankverbindungen, keine Wohnadressen. Dieser minimale Daten-Fußabdruck ermöglicht uns innovative Interaktionsfeatures, die klassische, überladene Administrationssoftwares aus Datenschutzgründen gar nicht erst umsetzen dürfen.
            </p>

            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '20px',
              textAlign: 'left',
              marginBottom: '32px'
            }}>
              <div>
                <h4 style={{ fontSize: '15px', fontWeight: 800, color: '#ffffff', marginBottom: '4px' }}>🛡️ Hermetische Datenisolation</h4>
                <p style={{ fontSize: '13.5px', color: '#a1a1aa', lineHeight: 1.5 }}>
                  Schüler- und Lehrerdaten sind durch PostgreSQL Row-Level Security (RLS) im Datenbankkern isoliert. Abfragen werden direkt auf Datenbankebene validiert – Datenlecks durch Anwendungsfehler sind technisch ausgeschlossen.
                </p>
              </div>
              <div>
                <h4 style={{ fontSize: '15px', fontWeight: 800, color: '#ffffff', marginBottom: '4px' }}>🎫 Kryptografische QR-Logins</h4>
                <p style={{ fontSize: '13.5px', color: '#a1a1aa', lineHeight: 1.5 }}>
                  Der Schülerausweis enthält keine Klartext-Personendaten. Der QR-Code codiert ein zufälliges kryptografisches Token (UUIDv4) – für Fremde absolut bedeutungslos (DSGVO-konforme Pseudonymisierung).
                </p>
              </div>
              <div>
                <h4 style={{ fontSize: '15px', fontWeight: 800, color: '#ffffff', marginBottom: '4px' }}>🔐 1-Klick-Entwertung</h4>
                <p style={{ fontSize: '13.5px', color: '#a1a1aa', lineHeight: 1.5 }}>
                  Geht ein Ausweis verloren, sperrst und regenerierst du das Token im Admin-Bereich mit nur einem Klick – ohne Passwörter oder Schülerprofile ändern zu müssen.
                </p>
              </div>
              <div>
                <h4 style={{ fontSize: '15px', fontWeight: 800, color: '#ffffff', marginBottom: '4px' }}>🔒 Modul-Kapselung vor Ort</h4>
                <p style={{ fontSize: '13.5px', color: '#a1a1aa', lineHeight: 1.5 }}>
                  Auf gemeinsam genutzten Schul-iPads sperrt die App den Campus-Bereich automatisch ab. Der Wechsel dorthin erfordert eine kurze QR-Scan-Bestätigung des Schülers.
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
                <span style={{ fontSize: '15px', fontWeight: 600 }}>100% DSGVO-konformes Hosting in Europa</span>
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
                <span style={{ fontSize: '15px', fontWeight: 600 }}>Echtzeit-Datenisolation via Row-Level Security</span>
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
                <span>🛡️ 15 von 15 Sicherheits-Stufen erfüllt</span>
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
                <strong>Sicherheit, die im Code lebt:</strong> Dieses reale Datenbank-Protokoll garantiert, dass Abfragen direkt auf Serverebene isoliert werden. Datenlecks durch Softwarefehler sind damit mathematisch ausgeschlossen.
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
            Fokus auf die Musik. Nicht auf die Kosten.
          </h2>

          <p style={{
            fontSize: '16px',
            color: '#7d7d82',
            maxWidth: '600px',
            margin: '0 auto 64px auto',
            lineHeight: 1.6
          }}>
            Wir glauben an die Kraft der Musik. Deshalb ist die Kernanwendung für deine Schule dauerhaft kostenfrei. Ohne Risiko, ohne Bedingungen.
          </p>

          {/* Professional Senior Sales Pricing Model */}
          <div style={{
            maxWidth: '1100px',
            margin: '0 auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '48px'
          }}>
            
            {/* Prominent Core Value Banner: 100% Free Core License */}
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
                Die Core-Softwarelizenz ist dauerhaft 100% kostenlos
              </h3>
              <p style={{
                fontSize: '16px',
                color: '#2d4d38',
                maxWidth: '750px',
                margin: '0 auto',
                lineHeight: 1.6,
                fontWeight: 550
              }}>
                Keine Einrichtungsgebühr, keine Vertragskosten für die Softwarenutzung und unbegrenzte Admin-, Lehrer- & Schülerkonten in der Basisversion. Du bezahlst ausschließlich das dedizierte Cloud-Hosting oder aktive Service-Funktionen.
              </p>
            </div>

            {/* Grid for Hosting Modules & Bundles */}
            <div>
              <h4 style={{
                fontFamily: 'Urbanist, sans-serif',
                fontSize: '22px',
                fontWeight: 800,
                color: '#0f172a',
                marginBottom: '24px',
                textAlign: 'left'
              }}>
                1. Dedicated Server-Hosting & Infrastruktur
              </h4>
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
                    <span style={{ fontSize: '36px', fontWeight: 900, color: '#0f172a' }}>{pricing.campus.toFixed(2).replace('.', ',')} €</span>
                    <span style={{ fontSize: '14px', color: '#64748b', fontWeight: 600 }}>/ Monat</span>
                  </div>
                  <p style={{ fontSize: '14px', color: '#475569', lineHeight: 1.5, margin: '0 0 24px 0', flexGrow: 1 }}>
                    Bereitstellung der zentralen Datenbank, des intelligenten Stundenplandesigners, der Raum-Engine sowie des Meisterwerk-Protokolls, Übe-Timers (inkl. Übungs-Streaks &amp; XP), der Audio-Loopstation und des 48h Auto-Freeze Chats.
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', fontSize: '13px', color: '#334155' }}>
                      <Check size={16} style={{ color: '#34a853' }} /> <span>Meisterwerk-Protokoll &amp; Hausaufgabenheft</span>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', fontSize: '13px', color: '#334155' }}>
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
                    <span style={{ fontSize: '36px', fontWeight: 900, color: '#0f172a' }}>{pricing.groovelab.toFixed(2).replace('.', ',')} €</span>
                    <span style={{ fontSize: '14px', color: '#64748b', fontWeight: 600 }}>/ Monat</span>
                  </div>
                  <p style={{ fontSize: '14px', color: '#475569', lineHeight: 1.5, margin: '0 0 24px 0', flexGrow: 1 }}>
                    Bereitstellung des Bandbereichs mit Band-Kommunikation, Repertoire-Planer, Songverwaltung (inkl. Song-Mastering), Live Lab, Skill-Radar und Schüler- &amp; Band-Avataren.
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', fontSize: '13px', color: '#334155' }}>
                      <Check size={16} style={{ color: '#34a853' }} /> <span>Bandgründung, Live Lab &amp; Repertoire</span>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', fontSize: '13px', color: '#334155' }}>
                      <Check size={16} style={{ color: '#34a853' }} /> <span>Musiker- &amp; Band-Avatare + Skill-Radar</span>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', fontSize: '13px', color: '#334155' }}>
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
                    <span style={{ fontSize: '36px', fontWeight: 900, color: '#34a853' }}>{pricing.kombi.toFixed(2).replace('.', ',')} €</span>
                    <span style={{ fontSize: '14px', color: '#64748b', fontWeight: 600 }}>/ Monat</span>
                  </div>
                  <p style={{ fontSize: '14px', color: '#475569', lineHeight: 1.5, margin: '0 0 24px 0', flexGrow: 1 }}>
                    Voller Zugriff auf beide Module auf einem dedizierten Server. Perfekt für moderne Musikschulen, die Organisation und Übe-Spaß vereinen möchten.
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', background: 'rgba(52, 168, 83, 0.05)', padding: '12px', borderRadius: '12px', marginBottom: '4px' }}>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', fontSize: '13px', color: '#34a853', fontWeight: 700 }}>
                      <span>💡 Du sparst dauerhaft {(pricing.campus + pricing.groovelab - pricing.kombi).toFixed(2).replace('.', ',')} € / Monat!</span>
                    </div>
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
                  2. Nutzer-Lizenzen &amp; Profile
                </h4>
                <p style={{ fontSize: '14px', color: '#64748b', lineHeight: 1.5, marginBottom: '24px' }}>
                  Um die anfallenden Cloud-Ressourcen fair und nutzungsbasiert zu skalieren, berechnen wir extrem geringe Gebühren pro aktivem Account.
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                    <div style={{ fontWeight: 800, fontSize: '15px', color: '#0f172a', marginBottom: '4px' }}>Lehrkräfte</div>
                    <div style={{ fontSize: '13px', color: '#475569', lineHeight: 1.4 }}>
                      <strong>0,49 € / Monat</strong> je aktives Lehrer-Profil. Verwaltungs- und Sekretariats-Accounts (Rollen admin &amp; secretary) sind vollständig kostenfrei inklusive.
                    </div>
                  </div>

                  <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                    <div style={{ fontWeight: 800, fontSize: '15px', color: '#0f172a', marginBottom: '4px' }}>Schüler-Aktivierungen &amp; Deaktivierung</div>
                    <div style={{ fontSize: '13px', color: '#475569', lineHeight: 1.4 }}>
                      <strong>0,49 € / Monat</strong> je aktiver Schüler-Zugang. Bei Deaktivierung (monatlich) entfällt die Gebühr zum Monatsende. Bereits bezahlte Jahresbeiträge bleiben bis zum Schuljahresende aktiv und werden dann inaktiviert.
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
                      Entlaste das Schulbudget auf <strong>0,00 € Schülergebühren</strong>. Die Eltern übernehmen den Kleinstbetrag direkt über die Plattform.
                    </div>
                    <div style={{ fontSize: '12px', color: '#475569', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <span>• <strong>Vollständig:</strong> Eltern zahlen 0,49 €/Mo. Schule zahlt 0,00 € Schülergebühr.</span>
                      <span>• <strong>Teilweise:</strong> Eltern zahlen 0,40 €/Mo, Schule stützt mit 0,09 €/Mo.</span>
                    </div>

                    {/* Solidaritätsversprechen Highlight Box */}
                    <div style={{ marginTop: '12px', background: '#ffffff', padding: '12px 14px', borderRadius: '12px', border: '1px solid #bbf7d0', boxShadow: '0 2px 8px rgba(52, 168, 83, 0.05)' }}>
                      <div style={{ fontSize: '13px', fontWeight: 800, color: '#15803d', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                        <span>💚 Das Solidaritätsversprechen deiner Musikschule: Das 20:1 Prinzip</span>
                      </div>
                      <div style={{ fontSize: '12px', color: '#334155', lineHeight: 1.45 }}>
                        Kein Kind soll aus finanziellen Gründen vom Musiklernen ausgeschlossen werden. Bei der Eltern-Direktabrechnung schaltet das System für <strong>je 20 aktivierte Schüler-Profile automatisch 1 kostenfreie Freilizenz für Härtefälle &amp; Geschwisterkinder</strong> frei. Wer ein aktives Profil bezahlt, unterstützt so solidarisch benachteiligte Familien!
                      </div>
                    </div>
                  </div>

                  <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                    <div style={{ fontWeight: 800, fontSize: '15px', color: '#0f172a', marginBottom: '4px' }}>B: Musikschule übernimmt (Sammelzahler)</div>
                    <div style={{ fontSize: '13px', color: '#475569', lineHeight: 1.4, marginBottom: '8px' }}>
                      Die Musikschule zahlt gesammelt für alle Schüler. Hier profitierst du von exzellenten Skalierungsrabatten:
                    </div>
                    <div style={{ fontSize: '12px', color: '#475569', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <span>• <strong>Monatliche Abrechnung:</strong> Abrechnung nach exakter Live-Schüleranzahl (0,49 €/Schüler). Konten ohne Login für mehr als 2 Monate werden automatisch inaktiviert – Kosten fallen somit nur bei tatsächlicher Nutzung an.</span>
                      <span>• <strong>Jahresbeitrag (10% Rabatt):</strong> Die Aktivierung eines Schülerprofils löst den Jahresbeitrag aus. Unterjährige Neuanmeldungen lassen sich jederzeit flexibel hinzufügen – der Beitrag wird dabei automatisiert auf die verbleibende Restlaufzeit berechnet.</span>
                      <span>• <strong>Aktivierung aller Schüler zum Schuljahresstart (September) (20% Rabatt):</strong> Einmalige, gesammelte Aktivierung aller Schüler im September für das gesamte Schuljahr.</span>
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
              <div style={{ fontSize: '13px', fontWeight: 800, color: '#b45309' }}>
                💡 Großschulen &amp; Vereine: Unsere Server-Flatrates und fairen Rabatt-Staffeln skalieren vollautomatisch mit der Größe deiner Musikschule – 100% transparent ohne Verhandlungsaufwand.
              </div>
              <button 
                onClick={() => onRegister()}
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
            <Music size={20} style={{ color: '#232326' }} />
            <span>Campus-Groovelab</span>
          </div>

          <div style={{ fontSize: '14px', color: '#7d7d82' }}>
            &copy; {new Date().getFullYear()} Campus-Groovelab. Alle Rechte vorbehalten.
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
 
      {/* Legal documents Modal popup */}
      {activeDocument !== 'none' && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.6)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '24px'
        }}
        onClick={() => setActiveDocument('none')}
        >
          <div style={{
            background: '#ffffff',
            borderRadius: '32px',
            width: '100%',
            maxWidth: '700px',
            maxHeight: '85vh',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            border: '1px solid rgba(0,0,0,0.06)'
          }}
          onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{
              padding: '24px 32px',
              borderBottom: '1px solid #f1f5f9',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: '#f8fafc'
            }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900, color: '#0f172a' }}>
                  {activeDocument === 'terms' ? '📜 Allgemeine Geschäftsbedingungen (AGB)' : activeDocument === 'privacy' ? '🛡️ Datenschutzerklärung (DSGVO & COPPA)' : '🏛️ Impressum'}
                </h3>
                <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 750, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Campus-Groovelab Plattform
                </span>
              </div>
              <button
                onClick={() => setActiveDocument('none')}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '1.5rem',
                  fontWeight: 300,
                  cursor: 'pointer',
                  color: '#94a3b8',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  outline: 'none'
                }}
              >
                &times;
              </button>
            </div>
            {/* Modal Content */}
            <div style={{
              padding: '32px',
              overflowY: 'auto',
              fontSize: '0.9rem',
              color: '#334155',
              lineHeight: 1.6,
              textAlign: 'left'
            }}>
              {activeDocument === 'terms' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <div>
                    <p style={{ margin: 0, fontWeight: 700 }}>Vertragspartner und Anbieter:</p>
                    <p style={{ margin: '4px 0 0 0' }}>Patrick Huber (Einzelunternehmer), Karl-Fürstenberg-Str. 59, 79618 Rheinfelden, nachfolgend „Anbieter“</p>
                    <p style={{ margin: '8px 0 0 0', fontSize: '12px', color: '#64748b' }}>
                      <strong>Geltungsbereich:</strong> Ausschließlich für den unternehmerischen Geschäftsverkehr (B2B)<br/>
                      <strong>Stand und Gültigkeit:</strong> August 2026
                    </p>
                  </div>

                  {/* TEIL A */}
                  <div style={{ borderTop: '2px solid #e2e8f0', paddingTop: '16px' }}>
                    <h3 style={{ margin: '0 0 8px 0', fontSize: '15px', fontWeight: 900, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.05em' }}>TEIL A: Allgemeine Nutzungsbedingungen (Gilt für alle Module)</h3>
                    <p style={{ margin: '0 0 12px 0', fontSize: '11px', color: '#64748b', fontStyle: 'italic' }}>Dieser Teil regelt die grundlegenden rechtlichen Bedingungen für die Nutzung der Plattform Campus-Groovelab und gilt unabhängig von den gebuchten Modulen.</p>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <div>
                        <h4 style={{ margin: '0 0 4px 0', fontSize: '13px', fontWeight: 800, color: '#1e293b' }}>📋 PRÄAMBEL</h4>
                        <p style={{ margin: 0 }}>Der Anbieter betreibt und vertreibt die mandantenfähige, cloudbasierte Software-as-a-Service (SaaS)-Plattform „Campus-Groovelab“ (bestehend aus den Modulen „Campus“ und „GrooveLab“, nachfolgend einheitlich „Software“). Die Software dient als integriertes, digitales Zusatz- und Kommunikationssystem (Add-On) für Musikschulen zur Optimierung des Lehrbetriebs.</p>
                        <p style={{ margin: '4px 0 0 0' }}>Die Software-Lizenz selbst wird dem Kunden dauerhaft zu 100 % kostenlos und lizenzgebührenfrei zur Verfügung gestellt. Der Kunde entrichtet das vertraglich vereinbarte Entgelt ausschließlich für den Server-Betrieb, das Hosting sowie Service- und Supportleistungen (nachfolgend „Server- & Servicegebühren“) durch den Anbieter.</p>
                        <p style={{ margin: '4px 0 0 0' }}><strong>Souveränitäts-Versprechen:</strong> Die Bereitstellung erfolgt über zertifizierte, deutsche Server (Hetzner Online GmbH, Standort Falkenstein). Der Anbieter garantiert, dass keine außereuropäische Cloud-Infrastrukturen (wie AWS, Azure oder Google Cloud) zur Kern-Datenhaltung verwendet werden.</p>
                      </div>

                      <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '8px' }}>
                        <h4 style={{ margin: '0 0 4px 0', fontSize: '13px', fontWeight: 800, color: '#1e293b' }}>§ 1 VERTRAGSGEGENSTAND, LEISTUNGSUMFANG & ÜBERGABEPUNKT</h4>
                        <p style={{ margin: 0 }}><strong>1. Vertragsgegenstand:</strong> Gegenstand ist die Bereitstellung der Software zur Nutzung über das Internet im Wege des SaaS-Modells. Die Vergütung versteht sich als reines Infrastruktur- und Serviceentgelt. Das Verhältnis qualifiziert sich rechtlich als gemischter Miet- und Dienstleistungsvertrag (§§ 535 ff., 611 BGB).</p>
                        <p style={{ margin: '4px 0 0 0' }}><strong>2. Modulbezug:</strong> Der konkrete Leistungsumfang ist modulbezogen und beschränkt sich auf die vom Kunden jeweils separat gebuchten Systembestandteile (Modul „Campus“, Modul „GrooveLab“ oder Kombi-Paket).</p>
                        <p style={{ margin: '4px 0 0 0' }}><strong>3. Übergabepunkt:</strong> Der Übergabepunkt ist der Ausgang des Rechenzentrums. Für die Internetanbindung und Endgeräte ist der Kunde selbst verantwortlich.</p>
                        <p style={{ margin: '4px 0 0 0' }}><strong>4. Add-On-Status:</strong> Die Software ersetzt nicht das primäre Verwaltungs- und ERP-System (z. B. iMikel) des Kunden. Der Kunde bleibt verpflichtet, grundlegende Verwaltungsakte, Abrechnung und finale Stundenpläne im führenden ERP-System zu pflegen.</p>
                      </div>

                      <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '8px' }}>
                        <h4 style={{ margin: '0 0 4px 0', fontSize: '13px', fontWeight: 800, color: '#1e293b' }}>§ 2 AUTHENTIFIZIERUNG, DIEBSTAHLSCHUTZ & DEVICE-PAIRING</h4>
                        <p style={{ margin: 0 }}><strong>1. QR-Code-Login:</strong> Der Zugang erfolgt passwortlos über eindeutige QR-Codes. Der Kunde verpflichtet sich, Mitarbeiter im sorgsamen Umgang mit den Codes zu schulen.</p>
                        <p style={{ margin: '4px 0 0 0' }}><strong>2. Anti-Theft Device-Pairing (PIN-Schranke):</strong> Um unbefugten Zugriff bei physischem QR-Verlust zu verhindern, fordert das System auf neuen Geräten einmalig ein schülerbezogenes Sicherheitsmerkmal (PIN) an, bevor das Endgerät registriert wird.</p>
                      </div>

                      <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '8px' }}>
                        <h4 style={{ margin: '0 0 4px 0', fontSize: '13px', fontWeight: 800, color: '#1e293b' }}>§ 3 DATENSCHUTZ UND GEHEIMHALTUNG (DSGVO)</h4>
                        <p style={{ margin: 0 }}><strong>1. Rollen:</strong> Der Kunde ist „Verantwortlicher“ (Art. 4 Nr. 7 DSGVO), der Anbieter ist „Auftragsverarbeiter“ (Art. 4 Nr. 8 DSGVO). Die Details regelt ein gesonderter AV-Vertrag (AVV) nach Art. 28 DSGVO.</p>
                        <p style={{ margin: '4px 0 0 0' }}><strong>2. Zero-Mail & Anti-CLOUD-Act:</strong> Administrative Benachrichtigungen erfolgen lokal via `mailto:` ohne externe E-Mail-Dienstleister. Da der Anbieter ein deutsches Unternehmen ohne US-Muttergesellschaft ist, besteht Schutz vor dem US-amerikanischen CLOUD Act.</p>
                      </div>

                      <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '8px' }}>
                        <h4 style={{ margin: '0 0 4px 0', fontSize: '13px', fontWeight: 800, color: '#1e293b' }}>§ 4 HAFTUNG & GEWÄHRLEISTUNG</h4>
                        <p style={{ margin: 0 }}><strong>1. Gesetzliche Haftungsschranken:</strong> Der Anbieter haftet unbeschränkt für Vorsatz, grobe Fahrlässigkeit sowie Verletzung von Leben, Körper oder Gesundheit. Bei einfacher Fahrlässigkeit haftet der Anbieter nur bei Verletzung wesentlicher Vertragspflichten (Kardinalpflichten), begrenzt auf vertragstypisch vorhersehbare Schäden.</p>
                        <p style={{ margin: '4px 0 0 0' }}><strong>2. Schenkungshaftung (§ 599 BGB):</strong> Da die Softwarelizenzierung vollständig unentgeltlich erfolgt, haftet der Anbieter für Mängel der Software selbst (mit Ausnahme von kostenpflichtigen Server- und Verbindungsleistungen gemäß § 7) nur für Vorsatz und grobe Fahrlässigkeit.</p>
                      </div>

                      <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '8px' }}>
                        <h4 style={{ margin: '0 0 4px 0', fontSize: '13px', fontWeight: 800, color: '#1e293b' }}>§ 5 SYSTEMVERFÜGBARKEIT & RATE-LIMITING</h4>
                        <p style={{ margin: 0 }}><strong>1. Verfügbarkeit:</strong> Der Anbieter gewährleistet 99,0 % Systemverfügbarkeit im Jahresmittel am Übergabepunkt. Ausgenommen sind angekündigte Wartungsfenster und Ausfälle durch höhere Gewalt.</p>
                        <p style={{ margin: '4px 0 0 0' }}><strong>2. Rate-Limiting:</strong> Zum Schutz vor Cyberangriffen (DDoS, Bruteforce) blockiert das System auffällige IP-Adressen temporär. Diese Sperren dienen der Datensicherheit und stellen keinen Mangel dar.</p>
                      </div>

                      <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '8px' }}>
                        <h4 style={{ margin: '0 0 4px 0', fontSize: '13px', fontWeight: 800, color: '#1e293b' }}>§ 6 LIZENZGEBÜHRENFREIHEIT & NUTZUNGSRECHTE</h4>
                        <p style={{ margin: 0 }}><strong>1. Nutzungsrechte:</strong> Der Kunde erhält ein einfaches, nicht übertragbares, zeitlich auf die Vertragslaufzeit beschränktes Nutzungsrecht an der Software.</p>
                        <p style={{ margin: '4px 0 0 0' }}><strong>2. Schutzrechte:</strong> Dem Kunden ist es untersagt, die Software zu kopieren, zurückzuentwickeln (Reverse Engineering) oder zu modifizieren.</p>
                      </div>

                      <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '8px' }}>
                        <h4 style={{ margin: '0 0 4px 0', fontSize: '13px', fontWeight: 800, color: '#1e293b' }}>§ 7 VERTRAGSLAUFZEIT, PREISE &amp; KÜNDIGUNG</h4>
                        <p style={{ margin: 0 }}><strong>1. Schuljahres-Kopplung &amp; Kündigung:</strong> Die Vertragslaufzeit für den Serverbetrieb orientiert sich am Schuljahr (Kündigungsfrist 1 Monat zum 31. August). Ohne Kündigung verlängert sich die Laufzeit automatisch um ein weiteres Schuljahr.</p>
                        <p style={{ margin: '4px 0 0 0' }}><strong>2. Kostenlose Software-Lizenz:</strong> Die Bereitstellung der Basis-Softwarelizenz von Campus-Groovelab ist dauerhaft 100 % kostenlos. Der Kunde entrichtet Entgelte ausschließlich für Server-Hosting, gebuchte Zusatzmodule, Teammitglieder-Zusatzlizenzen und aktive Schüler-Freischaltungen.</p>
                        <p style={{ margin: '4px 0 0 0' }}><strong>3. Modulpreise &amp; Kombi-Vorteil:</strong> Die monatliche Server-Hosting-Pauschale pro Musikschule beträgt für das Modul „Campus“ 7,99 € und für das Modul „GrooveLab“ 4,99 €. Werden beide Module gebucht, gilt der Kombi-Vorteil von 9,99 € (Ersparnis von 2,99 €/Monat). Administrations- und Sekretariats-Nutzer sind inklusive. Jede aktive Lehrkraft bzw. jeder Verwaltungs-Mitarbeiter wird mit 0,49 €/Monat berechnet.</p>
                        <p style={{ margin: '4px 0 0 0' }}><strong>4. Schüleraktivierungs-Modelle (Campus-Modul):</strong> Für Schülerfreischaltungen stehen zwei Zahlungswege zur Verfügung:
                          <br />a) <em>Sammelzahler (Schule trägt Kosten):</em> Abrechnung über die Musikschule mit 0,49 €/Monat je aktivem Schüler. Bei Nicht-Nutzung von über 2 Monaten erfolgt eine automatische Inaktivierung zur Kostenvermeidung. Alternativ wird ein Jahresbeitrag bei Aktivierung mit 10 % Rabatt oder eine Einmal-Aktivierung zum Schuljahresstart im September mit 20 % Rabatt angeboten.
                          <br />b) <em>Direktabrechnung (Eltern/Schüler zahlen):</em> Die Abrechnung erfolgt direkt mit den Eltern/Schülern (0,49 €/Monat bzw. 5,88 € Jahresbeitrag) oder teilsubventioniert (Eltern zahlen 0,40 €/Monat, Schule trägt 0,09 €/Monat). Härtefälle/Geschwisterrabatte können von der Schule manuell befreit werden.
                          <br /><em>Hinweis:</em> GrooveLab-Schülerfreischaltungen werden immer vollumfänglich von der Musikschule getragen (keine Direktabrechnung mit Eltern).
                        </p>
                        <p style={{ margin: '4px 0 0 0' }}><strong>5. Schüler-Deaktivierung:</strong> Bei monatlicher Abrechnung entfällt die Gebühr ab dem Folgemonat der Deaktivierung. Bei jährlicher Vorauszahlung verbleiben das Profil und alle Funktionen bis zum Ende des laufenden Schuljahres aktiv und erlöschen erst zum Schuljahreswechsel.</p>
                        <p style={{ margin: '4px 0 0 0' }}><strong>6. Rechnungsstellung:</strong> Die Server- und Servicegebühren werden monatlich zum Monatsende fällig. Der Anbieter wendet die Kleinunternehmerregelung (§ 19 UStG) an, es wird keine Umsatzsteuer ausgewiesen.</p>
                      </div>

                      <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '8px' }}>
                        <h4 style={{ margin: '0 0 4px 0', fontSize: '13px', fontWeight: 800, color: '#1e293b' }}>§ 8 GERICHTSSTAND & SALVATORISCHE KLAUSEL</h4>
                        <p style={{ margin: 0 }}>Es gilt deutsches Recht. Ausschließlicher Gerichtsstand ist Rheinfelden. Sollten Bestimmungen unwirksam sein, bleibt der restliche Vertrag in Kraft.</p>
                      </div>
                    </div>
                  </div>

                  {/* TEIL B */}
                  <div style={{ borderTop: '2px solid #e2e8f0', paddingTop: '16px' }}>
                    <h3 style={{ margin: '0 0 8px 0', fontSize: '15px', fontWeight: 900, color: '#34a853', textTransform: 'uppercase', letterSpacing: '0.05em' }}>TEIL B: Besondere Bedingungen für das Modul „Campus“</h3>
                    <p style={{ margin: '0 0 12px 0', fontSize: '11px', color: '#64748b', fontStyle: 'italic' }}>Die Bestimmungen dieses Teils gelten zusätzlich zu Teil A, sofern das Campus-Modul gebucht ist.</p>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <div>
                        <h4 style={{ margin: '0 0 4px 0', fontSize: '13px', fontWeight: 800, color: '#34a853' }}>§ 9 LEISTUNGSUMFANG CAMPUS</h4>
                        <p style={{ margin: 0 }}>Das Campus-Modul umfasst das digitale Hausaufgabenheft mit Übungsstreaks, das Meisterwerk-Protokoll, die Audio-Loopstation, den Stundenplan-Designer sowie die interne Schul- und Raumbelegungs-Engine.</p>
                        <p style={{ margin: '4px 0 0 0' }}><strong>1. Übe-Timer & Sensorik:</strong> Der Fokus-Timer wertet die Lagesensoren (DeviceOrientation API) aus. Das System gewährt eine 10-sekündige Toleranzzeit (Grace Period), die erst nach Ablauf der Fokus-Minuten greift. Gewährleistung für Timer-Fehlfunktionen durch inkompatible oder falsch kalibrierte Sensoren ist ausgeschlossen.</p>
                        <p style={{ margin: '4px 0 0 0' }}><strong>2. Audio-Loopstation:</strong> Die Loopstation verwendet ein 4-Takte-Pause-Verfahren (Variante 1) zur Sicherstellung der Sample-Synchronität und Vermeidung von Signal-Verschluckungen.</p>
                      </div>

                      <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '8px' }}>
                        <h4 style={{ margin: '0 0 4px 0', fontSize: '13px', fontWeight: 800, color: '#34a853' }}>§ 10 SCHNITTSTELLEN & KALENDER-EXPORT</h4>
                        <p style={{ margin: 0 }}><strong>1. CSV-Import:</strong> Datenimporte aus ERP-Systemen (z. B. iMikel) erfolgen über Copy-and-Paste eines CSV-Textstroms. Bei Import-Formatfehlern bricht das System die Transaktion automatisch ohne Datenverlust ab (Rollback).</p>
                        <p style={{ margin: '4px 0 0 0' }}><strong>2. iCal-Kalender-Kopplung:</strong> Exporte von Kalenderdaten im .ics-Format pseudonymisieren Schülernamen (z. B. „Jonas M.“ statt „Jonas Müller“) zur Einhaltung des Datenschutzes. Für Aktualisierungsverzögerungen externer Kalender-Clients haftet der Anbieter nicht.</p>
                      </div>

                      <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '8px' }}>
                        <h4 style={{ margin: '0 0 4px 0', fontSize: '13px', fontWeight: 800, color: '#34a853' }}>§ 11 NAMENSANONYMISIERUNG & PROFILAUSWAHL</h4>
                        <p style={{ margin: 0 }}><strong>1. Namensmaskierung:</strong> Schülernamen werden im Lehrer-Dashboard auf „Vorname + Anfangsbuchstabe Nachname“ und im Schüler-Dashboard auf generische Begriffe (z. B. „Hausaufgabenheft“) begrenzt.</p>
                        <p style={{ margin: '4px 0 0 0' }}><strong>2. Profilauswahl (Familien-Sharing):</strong> Zur Vereinfachung des Zugangs für Familien mit mehreren Kindern im Haushalt wird eine PIN-lose Profil-Schnellwahl (analog dem Netflix-Prinzip) im Campus-Modul gestattet.</p>
                      </div>
                    </div>
                  </div>

                  {/* TEIL C */}
                  <div style={{ borderTop: '2px solid #e2e8f0', paddingTop: '16px' }}>
                    <h3 style={{ margin: '0 0 8px 0', fontSize: '15px', fontWeight: 900, color: '#a16207', textTransform: 'uppercase', letterSpacing: '0.05em' }}>TEIL C: Besondere Bedingungen für das Modul „GrooveLab“</h3>
                    <p style={{ margin: '0 0 12px 0', fontSize: '11px', color: '#64748b', fontStyle: 'italic' }}>Die Bestimmungen dieses Teils gelten zusätzlich zu Teil A, sofern das GrooveLab-Modul gebucht ist.</p>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <div>
                        <h4 style={{ margin: '0 0 4px 0', fontSize: '13px', fontWeight: 800, color: '#a16207' }}>§ 12 LEISTUNGSUMFANG GROOVELAB</h4>
                        <p style={{ margin: 0 }}>Das GrooveLab-Modul umfasst die Bandgründung und Band-Mitgliederverwaltung, die Song-Bibliotheken, den Repertoire-Planer, das Skill-Radar, Musiker- und Band-Avatare sowie das Live Lab Echtzeit-Bandmodul.</p>
                      </div>

                      <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '8px' }}>
                        <h4 style={{ margin: '0 0 4px 0', fontSize: '13px', fontWeight: 800, color: '#a16207' }}>§ 13 STANDORTERMITTLUNG (GEOFENCING) & HARDWARE-ZUGRIFF</h4>
                        <p style={{ margin: 0 }}><strong>1. Lokales Geofencing im Live Lab:</strong> Die Verifikation der Anwesenheit vor Ort zur Echtzeit-Bandkoordination erfolgt über die Standortfreigabe (GPS) des Webbrowsers. Diese Daten werden ausschließlich lokal im Browser verarbeitet, um die Anwesenheit im Umkreis der Musikschule zu berechnen, und werden zu keinem Zeitpunkt dauerhaft auf Servern des Anbieters gespeichert oder als Bewegungsprofil aufgezeichnet.</p>
                        <p style={{ margin: '4px 0 0 0' }}><strong>2. Kamera- & QR-Scanner:</strong> Die Aktivierung der Gerätekamera dient rein dem lokalen QR-Scan. Es erfolgt keine Übertragung von Bild- oder Videodaten an Server.</p>
                      </div>

                      <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '8px' }}>
                        <h4 style={{ margin: '0 0 4px 0', fontSize: '13px', fontWeight: 800, color: '#a16207' }}>§ 14 AVATAR-ANZEIGEREGELN</h4>
                        <p style={{ margin: 0 }}><strong>1. Musiker-Avatare:</strong> Schüler und Lehrer im GrooveLab-Modul erhalten Zugriff auf spielerische Musiker-Avatare (im GrooveLab-Modul als Standard der Geist-Avatar). Administrations- und Sekretariatsprofile (Rollen <code>admin</code> und <code>secretary</code>) dürfen keine spielerischen Avatare nutzen; sie verwenden systemweit das neutrale Schultafel-Profilbild (<code>/campus_login_hero.png</code>).</p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : activeDocument === 'privacy' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <div>
                    <h4 style={{ margin: '0 0 6px 0', color: '#0f172a', fontWeight: 800 }}>1. Grundlagen der DSGVO &amp; COPPA-Konformität</h4>
                    <p style={{ margin: 0 }}>Als deutscher Betreiber stellen wir den Schutz personenbezogener Daten von Minderjährigen in den Mittelpunkt. Unsere Software basiert auf strikter Datenminimierung: Es werden keine Bankdaten, SEPA-Mandate, Vertragsdaten oder E-Mail-Adressen von Schülern erhoben oder auf unseren Systemen verarbeitet.</p>
                    <p style={{ margin: '8px 0 0 0' }}>Für die Bereitstellung der Übungs- und Klassenzimmerplattform „GrooveLab“ werden ausschließlich der Vorname, der Anfangsbuchstabe des Nachnamens, das Instrument, erspielte XP-Punkte, Songs, das Band-Matching sowie das Band-Repertoire verarbeitet. Zur Gewährleistung eines Höchstmaßes an Sicherheit werden die Vornamen im System explizit verschlüsselt gespeichert.</p>
                  </div>
                  <div>
                    <h4 style={{ margin: '0 0 6px 0', color: '#0f172a', fontWeight: 800 }}>2. Symmetrische Verschlüsselung & E-Mail-Vermeidung (Art. 32 DSGVO)</h4>
                    <p style={{ margin: 0 }}>Zur Gewährleistung der Vertraulichkeit werden Schülervornamen in der SQL-Datenbank symmetrisch mittels PGP verschlüsselt gespeichert (<code>pgp_sym_encrypt</code>). Plaintext-E-Mails von Schülern sind vollständig eliminiert. Um den absoluten Datenschutzstandard für Schulsoftware einzuhalten, werden derzeit keinerlei E-Mail-Adressen von Erziehungsberechtigten erhoben oder verarbeitet. Sollte zu einem späteren Zeitpunkt eine E-Mail-Kommunikation mit Erziehungsberechtigten eingeführt werden, wird diese kryptografisch streng getrennt: Nur die anonyme Domain-Endung (z.B. <code>@gmail.com</code>) wird für statistische Zwecke im Klartext vorgehalten, während die eigentliche Adresse getrennt und verschlüsselt geschützt wird.</p>
                  </div>
                  <div>
                    <h4 style={{ margin: '0 0 6px 0', color: '#0f172a', fontWeight: 800 }}>3. Server-Standort Deutschland und Auftragsverarbeitung (AVV)</h4>
                    <p style={{ margin: 0 }}>Sämtliche Datenverarbeitungsprozesse finden auf ISO 27001 zertifizierten und nach BSI C5 Typ 2 geprüften dedizierten Infrastrukturen unseres Vertragspartners Hetzner Online GmbH statt. Der Serverstandort liegt zu 100% in Deutschland (Falkenstein/Sachsen). Ein datenschutzkonformer AVV gem. Art. 28 DSGVO liegt vor.</p>
                  </div>
                  <div>
                    <h4 style={{ margin: '0 0 6px 0', color: '#0f172a', fontWeight: 800 }}>4. Hardware-Sicherheit und Audio-Uploads</h4>
                    <p style={{ margin: 0 }}>Kamera- und Mikrofonzugriffe dienen ausschließlich lokalen Anwendungsfunktionen (QR-Login, Einspielen von Übe-Protokollen) und werden beim Schließen des jeweiligen Moduls sofort physisch freigegeben. Audio-Aufnahmen werden verschlüsselt an ein geschütztes Supabase Storage-Bucket übermittelt und bei Löschung durch den Benutzer physisch und unwiderruflich vom Datenträger entfernt.</p>
                  </div>
                  <div>
                    <h4 style={{ margin: '0 0 6px 0', color: '#0f172a', fontWeight: 800 }}>5. Betroffenenrechte & Auskunft</h4>
                    <p style={{ margin: 0 }}>Lizenznehmer und Erziehungsberechtigte können jederzeit unentgeltlich Auskunft, Berichtigung, Sperrung oder vollständige Löschung der dem Profil zugeordneten Fortschrittsdaten verlangen.</p>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <div>
                    <h4 style={{ margin: '0 0 6px 0', color: '#0f172a', fontWeight: 800 }}>Angaben gemäß § 5 TMG</h4>
                    <p style={{ margin: 0 }}>
                      Patrick Huber<br />
                      Karl-Fürstenberg Str. 59<br />
                      79618 Rheinfelden<br />
                      Deutschland
                    </p>
                  </div>
                  <div>
                    <h4 style={{ margin: '0 0 6px 0', color: '#0f172a', fontWeight: 800 }}>Kontakt</h4>
                    <p style={{ margin: 0 }}>
                      E-Mail: patrick.huber@musaek.de
                    </p>
                  </div>
                  <div>
                    <h4 style={{ margin: '0 0 6px 0', color: '#0f172a', fontWeight: 800 }}>Haftungsausschluss (Disclaimer)</h4>
                    <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b' }}>
                      Als Diensteanbieter sind wir gemäß § 7 Abs.1 TMG für eigene Inhalte auf diesen Seiten nach den allgemeinen Gesetzen verantwortlich. Nach §§ 8 bis 10 TMG sind wir als Diensteanbieter jedoch nicht verpflichtet, übermittelte oder gespeicherte fremde Informationen zu überwachen. Bei Bekanntwerden von entsprechenden Rechtsverletzungen werden wir diese Inhalte umgehend entfernen.
                    </p>
                  </div>
                </div>
              )}
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
                onClick={() => setActiveDocument('none')}
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
                Schließen
              </button>
            </div>
          </div>
        </div>
      )}

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
                  🛡️ Das Campus-Groovelab Sicherheitsversprechen
                </h3>
                <span style={{ fontSize: '0.72rem', color: '#34a853', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  15-stufiges Sicherheits- & Datenschutzkonzept
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
                Als deutscher App-Betreiber hat der Schutz minderjähriger Schülerdaten für uns oberste Priorität. Unsere Plattform wurde von Grund auf nach dem Prinzip <strong>Privacy by Design</strong> entwickelt und setzt fortschrittliche kryptografische Härtungen ein, um ein maximales Sicherheitsniveau zu garantieren:
              </p>

              <div style={{
                background: '#e6f4ea',
                border: '1.5px solid #cbd5e1',
                borderRadius: '20px',
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                textAlign: 'left'
              }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 900, color: '#34a853', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  💡 Datensparsamkeit als aktive Härtung (Warum wir weniger Daten speichern)
                </span>
                <p style={{ margin: 0, fontSize: '0.78rem', color: '#1e293b', lineHeight: 1.5, opacity: 0.9 }}>
                  Da Campus-Groovelab als interaktives Lehr- und Organisations-Add-on agiert, verzichten wir bewusst auf die Erfassung vollständiger Stammdaten (keine Wohnadressen, E-Mail-Adressen von Kindern/Lehrern oder Bankverbindungen). Dieser extrem minimale Daten-Fußabdruck schützt Musikschulen wirksam vor Haftungsrisiken, beschleunigt die Freigabe durch Behörden/Datenschützer und garantiert: <strong>Daten, die gar nicht existieren, können niemals gestohlen werden.</strong>
                </p>
              </div>

              {/* 10 Stufen Grid/Liste */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                
                {[
                  {
                    title: '1. Verschlüsselung nach Stand der Technik (Art. 32 DSGVO)',
                    desc: 'Sämtliche Daten werden im Transportweg mit Ende-zu-Ende TLS 1.3 und in der Datenbank ruhend mit militärischer AES-256-Bit-Verschlüsselung geschützt. Selbst bei physischem Zugriff auf die Serverinfrastruktur bleiben alle Daten ohne Autorisierung nach aktuellem Stand der Technik unlesbar.'
                  },
                  {
                    title: '2. E-Mail-Vermeidung für Schüler & Lehrer (Datenminimierung)',
                    desc: 'Zur maximalen Datensparsamkeit erheben und speichern wir für Schüler und Lehrer keinerlei E-Mail-Adressen. Die gesamte App-Funktionalität läuft ohne diese Angabe. Lediglich die Kontakt-E-Mail der Musikschule als Vertragspartner wird erfasst.'
                  },
                  {
                    title: '3. Strikte Row-Level Security & Mandantentrennung (RLS)',
                    desc: 'Die Datenbank-Engine erzwingt auf unterster Ebene RLS-Policies und strikte Mandantentrennung (Multi-Tenancy Isolation). Dies stellt sicher, dass eine Musikschule systemisch bedingt nur auf die eigenen Daten zugreifen kann.'
                  },
                  {
                    title: '4. Kryptografisches Salted-Hashing von Passwörtern & PINs',
                    desc: 'Weder Passwörter noch 4-stellige Eltern-PINs werden im Klartext gespeichert. Sie werden über kryptografische Einweg-Funktionen (Bcrypt mit dynamischem Salt) gepfeffert und irreversibel gehasht.'
                  },
                  {
                    title: '5. Brute-Force-Sperre (Lockout-Logic)',
                    desc: 'Die Eingabe der PINs wird überwacht. Nach drei Falscheingaben wird der Zugriff für die jeweilige Sitzung aus Sicherheitsgründen für 15 Minuten gesperrt.'
                  },
                  {
                    title: '6. Eltern-Souveränität (Art. 8 DSGVO)',
                    desc: 'Eltern verwalten die Rechte ihres Kindes über ein feingranulares Dashboard. Chat-Rechte, Timer, Gruppenbeitritte und Songvorschläge können einzeln de-/aktiviert werden.'
                  },
                  {
                    title: '7. Revisionssichere Einwilligungsprotokolle',
                    desc: 'Jede Einwilligung der Eltern und Verträge der Schulen werden revisionssicher inklusive Timestamp, anonymisierter IP und Browser-Fingerprint archiviert.'
                  },
                  {
                    title: '8. Lokale Kamera-Verarbeitung (Zero-Cloud Bio-Login)',
                    desc: 'Kamera-Feeds für QR-Logins und Biometrie werden ausschließlich lokal auf dem Endgerät verarbeitet. Es findet keine Übertragung von Bild- oder Gesichtsdaten auf unsere Server statt.'
                  },
                  {
                    title: '9. Eliminierte Entwickler-Bypässe im Release',
                    desc: 'Alle Debug- und Bypass-Schnittstellen für Entwickler werden beim Kompilieren des Produktions-Builds durch strikte Compiler-Flags aus dem Programmcode gelöscht.'
                  },
                  {
                    title: '10. Lokaler Fingerabdruck- & Passkey-Login (TouchID/FaceID)',
                    desc: 'Nutzer können sich über die biometrische Hardware ihres Endgeräts (TouchID/FaceID) einloggen. Die Verifizierung erfolgt lokal – biometrische Merkmale verlassen das Endgerät nicht.'
                  },
                  {
                    title: '11. Intelligente 45-Minuten Live-Lab Sperre (GrooveLab)',
                    desc: 'Auf gemeinsam genutzten Schul-iPads im Live-Lab-Bandraum schützt eine 45-minütige Inaktivitäts-Sperre (inkl. Warn-Countdown nach Ablauf der Unterrichtseinheit) die Daten der Schülergruppe. Auf privaten Geräten im Campus-Modus läuft bewusst kein Countdown, um ungestörtes Üben zu Hause zu garantieren.'
                  },
                  {
                    title: '12. Server-Standort 100% in Deutschland (ISO 27001)',
                    desc: 'Das Hosting erfolgt ausschließlich in nach ISO 27001 zertifizierten Hochsicherheits-Rechenzentren der Hetzner Online GmbH in Deutschland (Standort Falkenstein/Sachsen) – somit besteht keinerlei US-Haftungsrisiko.'
                  },
                  {
                    title: '13. Modul-Kapselung & QR-Sperre vor Ort (Schulbetrieb)',
                    desc: 'Auf gemeinsam genutzten Schul-Geräten (Lab-Modus) wird das datensensible Campus-Modul physisch gekapselt. Schüler können nicht ohne Weiteres dorthin wechseln; sie müssen sich vor Ort per schnellem QR-Scan erneut verifizieren.'
                  },
                  {
                    title: '14. DSGVO-konforme Nachnamensmaskierung (Schulterblick-Schutz)',
                    desc: 'Im laufenden Betrieb auf den Dashboards werden Schülernachnamen standardmäßig auf den Anfangsbuchstaben gekürzt (z. B. „Max M.“). Erst durch eine bewusste Klick-Interaktion (Auge-Symbol) können berechtigte Lehrkräfte oder Verwaltungsmitarbeiter den vollständigen Nachnamen für ein Zeitfenster von genau 10 Sekunden einblenden. Dies verhindert das Mitlesen durch Dritte an Arbeitsplätzen und im Unterrichtsraum.'
                  },
                  {
                    title: '15. Hardware-Mikrofonschutz & 48h-Auto-Freeze im Chat (Schulrecht-Plus)',
                    desc: 'Beim Verlassen aller Übe- und Loopstation-Module stoppt die Hardware-Audio-Engine sofort sämtliche Mikrofon-Tracks (kein Weiterleuchten der Aufnahmelampe). Direktnachrichten laufen ohne private Handynummern über die Schul-App. Der Chat ist strikt an den Unterrichtstermin gebunden und friert nach 48 Stunden automatisch ein (Auto-Freeze), um die Privatsphäre der Lehrkräfte zu schützen und gleichzeitig die gesetzliche Dienstaufsichtspflicht der Musikschule zu wahren.'
                  }
                ].map((stufe, idx) => (
                  <div key={idx} style={{
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '16px',
                    padding: '16px 20px',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '16px',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.01)'
                  }}>
                    <div style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '50%',
                      background: '#e6f4ea',
                      color: '#34a853',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 800,
                      fontSize: '0.85rem',
                      flexShrink: 0
                    }}>
                      ✓
                    </div>
                    <div>
                      <h4 style={{ margin: '0 0 4px 0', fontSize: '0.85rem', fontWeight: 800, color: '#0f172a' }}>
                        {stufe.title}
                      </h4>
                      <p style={{ margin: 0, fontSize: '0.78rem', color: '#64748b', fontWeight: 600, lineHeight: 1.4 }}>
                        {stufe.desc}
                      </p>
                    </div>
                  </div>
                ))}

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
