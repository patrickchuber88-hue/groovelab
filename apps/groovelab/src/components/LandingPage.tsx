import React, { useState } from 'react';
import { 
  Music, Calendar, ShieldCheck, Users, 
  Layers, ChevronDown, Check, ArrowRight, X, Menu, BookOpen, Sparkles
} from 'lucide-react';

interface LandingPageProps {
  onLogin: () => void;
  onRegister: (email?: string) => void;
}

export function LandingPage({ onLogin, onRegister }: LandingPageProps) {
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
                    <div style={{ fontWeight: 600, fontSize: '14px', color: '#137333' }}>Für Musiklehrer</div>
                    <div style={{ fontSize: '12px', color: '#7d7d82' }}>Direktes Feedback &amp; einfaches Zuweisen.</div>
                  </div>
                  <div style={{ cursor: 'pointer' }} onClick={() => scrollToSection('target-audiences')}>
                    <div style={{ fontWeight: 600, fontSize: '14px', color: '#137333' }}>Für Schüler &amp; Eltern</div>
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
                color: '#137333',
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
                backgroundColor: '#137333',
                color: '#ffffff',
                border: 'none',
                borderRadius: '100px',
                fontWeight: 600,
                fontSize: '14px',
                padding: '10px 20px',
                cursor: 'pointer',
                boxShadow: '0 4px 10px rgba(19, 115, 51, 0.15)',
                transition: 'all 0.2s'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.backgroundColor = '#0f5b29';
                e.currentTarget.style.transform = 'translateY(-1px)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = '#137333';
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
              <div onClick={() => scrollToSection('target-audiences')} style={{ fontWeight: 600, fontSize: '16px', color: '#137333', paddingLeft: '8px' }}>Für Musiklehrer</div>
              <div onClick={() => scrollToSection('target-audiences')} style={{ fontWeight: 600, fontSize: '16px', color: '#137333', paddingLeft: '8px' }}>Für Schüler &amp; Eltern</div>
            </div>

            <div onClick={() => { scrollToSection('pricing'); setMobileMenuOpen(false); }} style={{ fontWeight: 600, fontSize: '16px', color: '#232326', cursor: 'pointer' }}>Preise</div>
            
            <div onClick={() => { setShowPrivacyAudits(true); setMobileMenuOpen(false); }} style={{ fontWeight: 650, fontSize: '16px', color: '#137333', cursor: 'pointer' }}>🛡️ Datenschutz &amp; Sicherheit</div>
            
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
                  backgroundColor: '#137333',
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
          <span style={{ color: '#137333' }}>In perfekter Harmonie.</span>
        </h1>
        
        <p style={{
          fontSize: 'clamp(1rem, 2vw, 1.25rem)',
          color: '#232326',
          maxWidth: '750px',
          lineHeight: 1.6,
          marginBottom: '40px'
        }}>
          Als intelligentes Add-on schließt Campus-Groovelab die Lücke zwischen Verwaltung, Lehrkräften und Schülern für einen reibungslosen, effizienten und unbürokratischen Schulalltag.
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
              e.currentTarget.style.borderColor = '#137333';
              e.currentTarget.style.boxShadow = '0 0 0 3px rgba(19, 115, 51, 0.2), inset 0 1px 2px rgba(0,0,0,0.02)';
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
              backgroundColor: '#137333',
              color: '#ffffff',
              border: 'none',
              borderRadius: '100px',
              fontWeight: 600,
              fontSize: '16px',
              padding: '16px 32px',
              cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(19, 115, 51, 0.2)',
              transition: 'all 0.2s'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.backgroundColor = '#0f5b29';
              e.currentTarget.style.transform = 'translateY(-1px)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.backgroundColor = '#137333';
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
          Mit Klick auf „Jetzt kostenlos starten“ stimmen Sie den <a href="#" onClick={(e) => { e.preventDefault(); setActiveDocument('terms'); }} style={{ color: '#137333', textDecoration: 'underline', fontWeight: 700 }}>Nutzungsbedingungen</a> zu und bestätigen, die <a href="#" onClick={(e) => { e.preventDefault(); setActiveDocument('privacy'); }} style={{ color: '#137333', textDecoration: 'underline', fontWeight: 700 }}>Datenschutzerklärung</a> zur Kenntnis genommen zu haben.
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
              color: '#137333',
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
                Schulleitung &amp; Sekretariat
              </h3>
              
              <div style={{ marginBottom: '24px' }}>
                <h4 style={{ fontSize: '13px', fontWeight: 800, color: '#ea4335', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '8px' }}>
                  Die ruhigste Musikschule Deutschlands.
                </h4>
                <p style={{ fontSize: '14.5px', color: '#232326', lineHeight: 1.55, fontWeight: 550 }}>
                  Stell dir vor, der Schulbetrieb läuft einfach. Campus-Groovelab nimmt dir das Planungs-Chaos ab. Die Smart Room Engine weiß genau, welches Instrument in welchen Raum gehört – und durch das digitale Eltern-Onboarding fließen alle Wunschzeiten direkt ins System. Die Verwaltung muss nur noch überwachen, dass es keine Konflikte gibt. Den Rest erledigt unsere App.
                </p>
              </div>

              <div style={{ marginTop: 'auto', borderTop: '1px solid #e8e8ed', paddingTop: '24px' }}>
                <h5 style={{ fontSize: '12px', fontWeight: 700, color: '#7d7d82', textTransform: 'uppercase', marginBottom: '16px' }}>Highlights:</h5>
                <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '12px', padding: 0, margin: 0 }}>
                  <li style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '14px', color: '#232326' }}>
                    <Check size={16} style={{ color: '#ea4335', marginTop: '2px', flexShrink: 0 }} />
                    <span><strong>Smart Room Engine:</strong> Automatische Eignungs-Klassifizierung für Räume.</span>
                  </li>
                  <li style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '14px', color: '#232326' }}>
                    <Check size={16} style={{ color: '#ea4335', marginTop: '2px', flexShrink: 0 }} />
                    <span><strong>Digitales Onboarding:</strong> Wunschzeiten der Eltern fließen direkt ins Planungssystem ein.</span>
                  </li>
                  <li style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '14px', color: '#232326' }}>
                    <Check size={16} style={{ color: '#ea4335', marginTop: '2px', flexShrink: 0 }} />
                    <span><strong>Schulweite Briefings:</strong> Ankündigungen mit einem Klick an alle Lehrkräfte senden.</span>
                  </li>
                  <li style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '14px', color: '#232326' }}>
                    <Check size={16} style={{ color: '#ea4335', marginTop: '2px', flexShrink: 0 }} />
                    <span><strong>100% DSGVO &amp; Schrems II-konform:</strong> Ausschließlich deutsches Cloud-Hosting (Hetzner in Sachsen). Kein US-Haftungsrisiko.</span>
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
                <Users size={24} style={{ color: '#137333' }} />
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
                <h4 style={{ fontSize: '13px', fontWeight: 800, color: '#137333', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '8px' }}>
                  Unterrichten mit Superkräften.
                </h4>
                <p style={{ fontSize: '14.5px', color: '#232326', lineHeight: 1.55, fontWeight: 550 }}>
                  Lass Stundenpläne in Sekundenschnelle generieren und koordiniere Schüler-Ensembles automatisch mit dem Probenplaner. Verschiebst du eine Stunde, bekommen Schüler und Eltern den neuen Termin sofort zur Bestätigung. Dazu reichst du den Übungspfad mit dem digitalen Hausaufgabenheft direkt weiter.
                </p>
              </div>

              <div style={{ marginTop: 'auto', borderTop: '1px solid #e8e8ed', paddingTop: '24px' }}>
                <h5 style={{ fontSize: '12px', fontWeight: 700, color: '#7d7d82', textTransform: 'uppercase', marginBottom: '16px' }}>Highlights:</h5>
                <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '12px', padding: 0, margin: 0 }}>
                  <li style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '14px', color: '#232326' }}>
                    <Check size={16} style={{ color: '#137333', marginTop: '2px', flexShrink: 0 }} />
                    <span><strong>Digitales Hausaufgabenheft:</strong> Wochenziele und Übungspfade direkt digital übermitteln.</span>
                  </li>
                  <li style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '14px', color: '#232326' }}>
                    <Check size={16} style={{ color: '#137333', marginTop: '2px', flexShrink: 0 }} />
                    <span><strong>Stundenplan &amp; Röntgen-Matrix:</strong> Wunsch- und Sperrzeiten beim Verschieben von Schülern sofort visualisieren.</span>
                  </li>
                  <li style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '14px', color: '#232326' }}>
                    <Check size={16} style={{ color: '#137333', marginTop: '2px', flexShrink: 0 }} />
                    <span><strong>Ensembles &amp; Probenplaner:</strong> Schüler-Bands anlegen und Probenzeiten automatisch abstimmen lassen.</span>
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
                <Sparkles size={24} style={{ color: '#137333' }} />
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
                <h4 style={{ fontSize: '13px', fontWeight: 800, color: '#137333', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '8px' }}>
                  Der Grund, warum Kinder plötzlich freiwillig üben.
                </h4>
                <p style={{ fontSize: '14.5px', color: '#232326', lineHeight: 1.55, fontWeight: 550 }}>
                  Wir verwandeln Pflicht in Spielfreude. Im Campus sammeln Schüler XP und Sticker für gemeisterte Challenges beim Üben. Eltern tragen ihre Wunschzeiten stressfrei per Direktlink am Handy ein. Ein Handy-Detox-Modus per smarter Sensorentechnik schirmt die Schüler beim Üben vor Ablenkung ab.
                </p>
              </div>

              <div style={{ marginTop: 'auto', borderTop: '1px solid #e8e8ed', paddingTop: '24px' }}>
                <h5 style={{ fontSize: '12px', fontWeight: 700, color: '#7d7d82', textTransform: 'uppercase', marginBottom: '16px' }}>Highlights:</h5>
                <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '12px', padding: 0, margin: 0 }}>
                  <li style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '14px', color: '#232326' }}>
                    <Check size={16} style={{ color: '#137333', marginTop: '2px', flexShrink: 0 }} />
                    <span><strong>Fähigkeiten-Radar:</strong> Interaktive Visualisierung des Übungsfortschritts pro Instrument im Schülerprofil.</span>
                  </li>
                  <li style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '14px', color: '#232326' }}>
                    <Check size={16} style={{ color: '#137333', marginTop: '2px', flexShrink: 0 }} />
                    <span><strong>Eltern-Direktlink:</strong> Wunschzeiten-Eingabe einfach per QR-Scan auf dem Smartphone der Eltern (ohne App).</span>
                  </li>
                  <li style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '14px', color: '#232326' }}>
                    <Check size={16} style={{ color: '#137333', marginTop: '2px', flexShrink: 0 }} />
                    <span><strong>Handy-Detox-Modus:</strong> Smarte Sensorentechnik sperrt Ablenkungen während des Übens.</span>
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
            color: '#137333',
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
                color: '#137333',
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
                  background: 'linear-gradient(135deg, rgba(52, 168, 83, 0.15) 0%, rgba(19, 115, 51, 0.25) 100%)',
                  border: '1px solid rgba(52, 168, 83, 0.3)',
                  color: '#d1fae5',
                  cursor: 'pointer',
                  fontWeight: 750,
                  fontSize: '13.5px',
                  transition: 'all 0.2s',
                  width: 'fit-content'
                }}
                className="hover-scale"
              >
                <span>🛡️ 13 von 13 Sicherheits-Stufen erfüllt</span>
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
                  color: '#22c55e',
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
            color: '#137333',
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

          {/* Pricing Card */}
          <div style={{
            maxWidth: '550px',
            margin: '0 auto',
            backgroundColor: '#ffffff',
            border: '1px solid #e8e8ed',
            borderRadius: '28px',
            padding: '48px 32px',
            boxShadow: '0 20px 50px rgba(0,0,0,0.04)',
            textAlign: 'center',
            height: 'auto'
          }}>
            <h3 style={{
              fontSize: '20px',
              fontWeight: 800,
              color: '#000000',
              marginBottom: '16px'
            }}>
              Campus-Groovelab Softwarelizenz
            </h3>

            <div style={{
              fontSize: '48px',
              fontWeight: 900,
              color: '#137333',
              marginBottom: '8px',
              letterSpacing: '-0.04em'
            }}>
              100% kostenlos
            </div>

            <p style={{
              fontSize: '14px',
              color: '#7d7d82',
              marginBottom: '32px'
            }}>
              Dauerhafte Nutzung der Kernanwendung.
            </p>

            <hr style={{ border: 'none', borderTop: '1px solid #e8e8ed', marginBottom: '32px' }} />

            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              textAlign: 'left',
              maxWidth: '440px',
              margin: '0 auto 40px auto'
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                <Check size={20} style={{ color: '#137333', marginTop: '2px', flexShrink: 0 }} />
                <span style={{ fontSize: '15px', color: '#232326' }}><strong>Dauerhaft gratis Softwarelizenz:</strong> Die Nutzung von Campus-Groovelab ist und bleibt für alle kostenlos.</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                <Check size={20} style={{ color: '#137333', marginTop: '2px', flexShrink: 0 }} />
                <span style={{ fontSize: '15px', color: '#232326' }}><strong>Kostenloses Hosting-Basis-Modul:</strong> Nur 7,99 €/Monat für die Bereitstellung des Campus-Moduls für deine gesamte Schule.</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                <Check size={20} style={{ color: '#137333', marginTop: '2px', flexShrink: 0 }} />
                <span style={{ fontSize: '15px', color: '#232326' }}><strong>Faire Servicegebühren:</strong> Lehrkräfte für 0,49 €/Monat, aktive Schüler für 0,49 €/Monat (im 1. Jahr nur 5,39 € dank Gratis-Probemonat, danach 5,88 €/Jahr). Inaktive Schüler-Datensätze kosten nur 0,09 €/Monat.</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                <Check size={20} style={{ color: '#137333', marginTop: '2px', flexShrink: 0 }} />
                <span style={{ fontSize: '15px', color: '#232326' }}><strong>Faire Laufzeiten:</strong> Keine Einrichtungsgebühr. Nach Ablauf des 1-monatigen Probemonats läuft der Vertrag flexibel bis zum jeweiligen Schuljahresende (August).</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                <Check size={20} style={{ color: '#137333', marginTop: '2px', flexShrink: 0 }} />
                <span style={{ fontSize: '15px', color: '#232326' }}><strong>0,00 € Schul-Budget-Belastung:</strong> Nutze die Direktabrechnung mit den Eltern (0,49 €/Monat). Die Musikschule zahlt dann 0,00 € Schüler-Datenbankgebühren.</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                <Check size={20} style={{ color: '#137333', marginTop: '2px', flexShrink: 0 }} />
                <span style={{ fontSize: '15px', color: '#232326' }}><strong>Soziales Freikontingent (5%):</strong> Bei Eltern-Direktabrechnung erhält deine Schule automatisch 5 % Freilizenzen für Härtefälle (z. B. Geschwisterrabatte, Sozialtarife) zur freien Zuweisung.</span>
              </div>
            </div>

            {/* Interactive Price Calculator */}
            <div style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '24px',
              padding: '24px',
              textAlign: 'left',
              marginBottom: '32px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px'
            }}>
              <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 900, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                🧮 Interaktiver Preisrechner
              </h4>
              <p style={{ margin: 0, fontSize: '12px', color: '#64748b', fontWeight: 550, lineHeight: 1.4 }}>
                Simuliere deine monatlichen Hosting- & Servicegebühren. Da der erste Monat <strong>kostenlos</strong> ist, reduzieren sich die restlichen Jahreskosten für das laufende Schuljahr auf <strong>{getPaidMonthsUntilAugust()} Abrechnungsmonate</strong> (bis August).
              </p>

              {/* Module select toggles */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: calcCampus ? '#e6f4ea' : '#ffffff',
                  border: calcCampus ? '1.5px solid #137333' : '1.5px solid #cbd5e1',
                  padding: '10px 12px',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontWeight: 800,
                  transition: 'all 0.2s',
                  userSelect: 'none'
                }}>
                  <input
                    type="checkbox"
                    checked={calcCampus}
                    onChange={(e) => setCalcCampus(e.target.checked)}
                    style={{ accentColor: '#137333', cursor: 'pointer' }}
                  />
                  Campus (7,99 €)
                </label>

                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: calcGroovelab ? '#e6f4ea' : '#ffffff',
                  border: calcGroovelab ? '1.5px solid #137333' : '1.5px solid #cbd5e1',
                  padding: '10px 12px',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontWeight: 800,
                  transition: 'all 0.2s',
                  userSelect: 'none'
                }}>
                  <input
                    type="checkbox"
                    checked={calcGroovelab}
                    onChange={(e) => setCalcGroovelab(e.target.checked)}
                    style={{ accentColor: '#137333', cursor: 'pointer' }}
                  />
                  GrooveLab (4,99 €)
                </label>
              </div>

              {/* Billing model segmented toggle */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', borderTop: '1px solid #e2e8f0', paddingTop: '12px' }}>
                <span style={{ fontSize: '11px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Abrechnung der Schüler-Lizenzen:
                </span>
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: '1fr 1fr', 
                  background: '#f1f5f9', 
                  borderRadius: '12px', 
                  padding: '3px',
                  border: '1px solid #e2e8f0'
                }}>
                  <button
                    type="button"
                    onClick={() => setCalcBillingModel('parent')}
                    style={{
                      background: calcBillingModel === 'parent' ? '#ffffff' : 'none',
                      color: calcBillingModel === 'parent' ? '#137333' : '#475569',
                      border: 'none',
                      padding: '8px 12px',
                      borderRadius: '10px',
                      fontSize: '11.5px',
                      fontWeight: 800,
                      cursor: 'pointer',
                      boxShadow: calcBillingModel === 'parent' ? '0 2px 8px rgba(0,0,0,0.06)' : 'none',
                      transition: 'all 0.2s',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '4px'
                    }}
                  >
                    <span>🛡️ Eltern-Direktzahler (Standard)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setCalcBillingModel('school')}
                    style={{
                      background: calcBillingModel === 'school' ? '#ffffff' : 'none',
                      color: calcBillingModel === 'school' ? '#137333' : '#475569',
                      border: 'none',
                      padding: '8px 12px',
                      borderRadius: '10px',
                      fontSize: '11.5px',
                      fontWeight: 800,
                      cursor: 'pointer',
                      boxShadow: calcBillingModel === 'school' ? '0 2px 8px rgba(0,0,0,0.06)' : 'none',
                      transition: 'all 0.2s',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '4px'
                    }}
                  >
                    <span>🏫 Schule (Sammelzahler)</span>
                  </button>
                </div>
              </div>

              {/* Slider / Numbers inputs */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', fontWeight: 800, color: '#334155', marginBottom: '6px' }}>
                    <span>Aktive Schüler:</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <input
                        type="number"
                        min="0"
                        max="9999"
                        value={calcStudents}
                        onChange={(e) => {
                          const val = Math.max(0, Math.min(9999, parseInt(e.target.value) || 0));
                          setCalcStudents(val);
                        }}
                        style={{
                          width: '64px',
                          padding: '4px 6px',
                          borderRadius: '8px',
                          border: '1px solid #cbd5e1',
                          textAlign: 'center',
                          fontWeight: 800,
                          color: '#137333',
                          fontSize: '12px',
                          outline: 'none'
                        }}
                      />
                      <span>Schüler ({(calcStudents * 0.49).toFixed(2)} €/Mo)</span>
                    </div>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="2000"
                    step="5"
                    value={Math.min(calcStudents, 2000)}
                    onChange={(e) => setCalcStudents(parseInt(e.target.value))}
                    style={{ width: '100%', accentColor: '#137333', cursor: 'pointer' }}
                  />
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', fontWeight: 800, color: '#334155', marginBottom: '6px' }}>
                    <span>Lehrer & Admins:</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <input
                        type="number"
                        min="0"
                        max="999"
                        value={calcTeachers}
                        onChange={(e) => {
                          const val = Math.max(0, Math.min(999, parseInt(e.target.value) || 0));
                          setCalcTeachers(val);
                        }}
                        style={{
                          width: '54px',
                          padding: '4px 6px',
                          borderRadius: '8px',
                          border: '1px solid #cbd5e1',
                          textAlign: 'center',
                          fontWeight: 800,
                          color: '#137333',
                          fontSize: '12px',
                          outline: 'none'
                        }}
                      />
                      <span>Profile ({(calcTeachers * 0.49).toFixed(2)} €/Mo)</span>
                    </div>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="150"
                    step="1"
                    value={Math.min(calcTeachers, 150)}
                    onChange={(e) => setCalcTeachers(parseInt(e.target.value))}
                    style={{ width: '100%', accentColor: '#137333', cursor: 'pointer' }}
                  />
                </div>
              </div>

              {/* Enterprise / Large school discount warning */}
              {calcStudents >= 500 && (
                <div style={{
                  background: 'rgba(245, 158, 11, 0.08)',
                  border: '1px dashed rgba(245, 158, 11, 0.4)',
                  borderRadius: '12px',
                  padding: '10px 14px',
                  fontSize: '11px',
                  color: '#b45309',
                  fontWeight: 700,
                  lineHeight: 1.4,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <span>💡</span>
                  <span>
                    <strong>Großschul-Vorteil:</strong> Ab 500 aktiven Schülern bieten wir vergünstigte Flatrates & Volumenrabatte an. Nimm Kontakt mit uns auf!
                  </span>
                </div>
              )}

              {/* Calculations Box */}
              {(() => {
                const baseVal = (calcCampus && calcGroovelab) ? 9.99 : (calcCampus ? 7.99 : (calcGroovelab ? 4.99 : 0.00));
                const studentFee = calcBillingModel === 'parent' ? 0.00 : (calcStudents * 0.49);
                const teacherFee = calcTeachers * 0.49;
                const userVal = studentFee + teacherFee;
                const monthlyTotal = baseVal + userVal;
                const paidM = getPaidMonthsUntilAugust();
                const totalYear = monthlyTotal * paidM;

                return (
                  <div style={{
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '16px',
                    padding: '16px',
                    fontSize: '12px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#475569', fontWeight: 600 }}>
                      <span>Monatliche Basis-Gebühr:</span>
                      <span style={{ fontWeight: 800, color: '#0f172a' }}>{baseVal.toFixed(2).replace('.', ',')} €/Mo</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#475569', fontWeight: 600 }}>
                      <span>Service-Gebühr Lehrkräfte ({calcTeachers} Profile):</span>
                      <span style={{ fontWeight: 800, color: '#0f172a' }}>{teacherFee.toFixed(2).replace('.', ',')} €/Mo</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#475569', fontWeight: 600 }}>
                      <span>Service-Gebühr Schüler ({calcStudents} Schüler):</span>
                      {calcBillingModel === 'parent' ? (
                        <span style={{ fontWeight: 800, color: '#137333' }}>0,00 € (Direktabrechnung)</span>
                      ) : (
                        <span style={{ fontWeight: 800, color: '#0f172a' }}>{studentFee.toFixed(2).replace('.', ',')} €/Mo</span>
                      )}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed #e2e8f0', paddingTop: '8px', fontWeight: 800, color: '#0f172a' }}>
                      <span>Regulärer Monatspreis für die Schule:</span>
                      <span style={{ color: '#137333', fontSize: '14px' }}>{monthlyTotal.toFixed(2).replace('.', ',')} €/Mo</span>
                    </div>

                    <div style={{
                      marginTop: '8px',
                      background: '#e6f4ea',
                      borderRadius: '10px',
                      padding: '10px',
                      borderLeft: '4px solid #137333',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: '#137333', fontWeight: 900, fontSize: '13px' }}>
                        <span>Kosten im 1. Schuljahr:</span>
                        <span>{totalYear.toFixed(2).replace('.', ',')} €</span>
                      </div>
                      <div style={{ fontSize: '11px', color: '#137333', fontWeight: 650 }}>
                        (Bestehend aus 1 Probemonat für 0,00 € + {paidM} Abrechnungsmonaten bis August. Du sparst {monthlyTotal.toFixed(2).replace('.', ',')} € im ersten Jahr gegenüber einem regulären 12-Monatstarif!)
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>

            <button 
              onClick={() => onRegister()}
              style={{
                width: '100%',
                padding: '16px 32px',
                backgroundColor: '#137333',
                color: '#ffffff',
                border: 'none',
                borderRadius: '100px',
                fontWeight: 600,
                fontSize: '16px',
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(19, 115, 51, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              Jetzt unverbindlich registrieren <ArrowRight size={18} />
            </button>
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
            maxWidth: '640px',
            maxHeight: '80vh',
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
                  {activeDocument === 'terms' ? '📜 Nutzungsbedingungen (AGB)' : '🛡️ Datenschutzerklärung'}
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
                    <h4 style={{ margin: '0 0 6px 0', color: '#0f172a', fontWeight: 800 }}>1. Geltungsbereich & Dienste</h4>
                    <p style={{ margin: 0 }}>Diese Nutzungsbedingungen regeln die Bereitstellung und Verwendung der Webanwendung Campus-Groovelab. Durch das Erstellen eines Profils erklären Sie sich mit diesen Bedingungen einverstanden.</p>
                  </div>
                  <div>
                    <h4 style={{ margin: '0 0 6px 0', color: '#0f172a', fontWeight: 800 }}>2. Kostenfreie Basis-Softwarelizenz</h4>
                    <p style={{ margin: 0 }}>Die Basis-Softwarelizenz der Plattform Campus-Groovelab ist dauerhaft 100% kostenlos. Für Hosting-Infrastruktur, zusätzliche Teammitglieder oder Schüleraktivierungen können zusätzliche variable oder fixe Tarife gemäß Preisliste anfallen.</p>
                  </div>
                  <div>
                    <h4 style={{ margin: '0 0 6px 0', color: '#0f172a', fontWeight: 800 }}>3. Gewährleistung und Haftung</h4>
                    <p style={{ margin: 0 }}>Der Plattform-Betreiber bemüht sich um eine kontinuierliche Verfügbarkeit der Web-App. Die Nutzung erfolgt auf eigene Gefahr. Für Datenverluste oder Ausfälle wird keine Haftung übernommen, es sei denn, es liegt grobe Fahrlässigkeit vor.</p>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <div>
                    <h4 style={{ margin: '0 0 6px 0', color: '#0f172a', fontWeight: 800 }}>1. Erhebung und Speicherung personenbezogener Daten</h4>
                    <p style={{ margin: 0 }}>Wir erheben Ihre E-Mail-Adresse zum Zweck der Systemregistrierung. Personenbezogene Profildaten von Schülern (Name, Vorname, Geburtsdatum) werden zur Bereitstellung der Stundenplan- und Homework-Funktionen verwendet. Vornamen werden verschlüsselt in der Datenbank abgelegt.</p>
                  </div>
                  <div>
                    <h4 style={{ margin: '0 0 6px 0', color: '#0f172a', fontWeight: 800 }}>2. Lokale Kamera-Verarbeitung</h4>
                    <p style={{ margin: 0 }}>Das Einscannen der QR-Ausweise geschieht vollständig lokal in Ihrem Webbrowser. Videodaten, Einzelbilder oder biometrische Merkmale werden zu keinem Zeitpunkt an externe Server übertragen oder dort dauerhaft gespeichert.</p>
                  </div>
                  <div>
                    <h4 style={{ margin: '0 0 6px 0', color: '#0f172a', fontWeight: 800 }}>3. Auskunftsrecht & Löschung</h4>
                    <p style={{ margin: 0 }}>Sie haben jederzeit das Recht, unentgeltlich Auskunft über Herkunft, Empfänger und Zweck Ihrer gespeicherten personenbezogenen Daten zu erhalten. Sie haben außerdem ein Recht, die Berichtigung oder Löschung dieser Daten zu verlangen.</p>
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
                  background: '#137333',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '100px',
                  fontWeight: 650,
                  fontSize: '0.85rem',
                  padding: '10px 24px',
                  cursor: 'pointer',
                  boxShadow: '0 2px 6px rgba(19, 115, 51, 0.15)',
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
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 900, color: '#137333', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  🛡️ Das Campus-Groovelab Sicherheitsversprechen
                </h3>
                <span style={{ fontSize: '0.72rem', color: '#137333', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  13 von 13 Sicherheits- & Datenschutz-Stufen erfüllt
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

              {/* 10 Stufen Grid/Liste */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                
                {[
                  {
                    title: '1. PGP-Verschlüsselung der Namen (Art. 32 DSGVO)',
                    desc: 'Schülervornamen werden in der Datenbank durch starke symmetrische PGP-Verschlüsselung geschützt. Selbst bei direktem Datenbankzugriff sind diese ohne den Schlüssel absolut unlesbar.'
                  },
                  {
                    title: '2. E-Mail-Fragmentierung (Präfix- & Suffix-Splitting)',
                    desc: 'Jede E-Mail-Adresse wird in zwei Teile getrennt: Der vordere, persönliche Teil (das Präfix) wird PGP-verschlüsselt in einer Tabelle abgelegt. Der hintere Anbieter-Teil (das Suffix, z. B. @gmail.com) liegt physisch isoliert in einer anderen Tabelle.'
                  },
                  {
                    title: '3. Strikte Row-Level Security (RLS)',
                    desc: 'Die Datenbank-Engine erzwingt auf unterster Ebene RLS-Policies. Es ist technisch ausgeschlossen, dass eine Musikschule jemals Daten einer anderen Schule sieht.'
                  },
                  {
                    title: '4. Einweg-Hashing von Passwörtern & PINs',
                    desc: 'Weder Passwörter noch die 4-stelligen Eltern-PINs werden im Klartext gespeichert. Sie werden über modernste kryptografische Hashes (Bcrypt & SHA-256) einweg-verschlüsselt.'
                  },
                  {
                    title: '5. Brute-Force-Sperre (Lockout-Logic)',
                    desc: 'Die Eingabe der PINs wird streng überwacht. Nach drei Falscheingaben wird der Zugriff für die jeweilige Sitzung aus Sicherheitsgründen für 15 Minuten komplett gesperrt.'
                  },
                  {
                    title: '6. Eltern-Souveränität (Art. 8 DSGVO)',
                    desc: 'Eltern verwalten die Rechte ihres Kindes über ein feingranulares Dashboard. Chat-Rechte, Timer, Gruppenbeitritte und Songvorschläge können einzeln de-/aktiviert werden.'
                  },
                  {
                    title: '7. Revisionssichere Einwilligungsprotokolle',
                    desc: 'Jede Einwilligung der Eltern und Verträge der Schulen werden revisionssicher inklusive Timestamp, anonymisierter IP und Browser-Fingerprint rechtssicher archiviert.'
                  },
                  {
                    title: '8. Lokale Kamera-Verarbeitung (Zero-Cloud Bio-Login)',
                    desc: 'Kamera-Feeds für QR-Logins und Biometrie werden ausschließlich lokal auf dem Endgerät verarbeitet. Es findet niemals eine Übertragung von Bild- oder Gesichtsdaten statt.'
                  },
                  {
                    title: '9. Eliminierte Entwickler-Bypässe im Release',
                    desc: 'Alle Debug- und Bypass-Schnittstellen für Entwickler werden beim Kompilieren des Produktions-Builds durch strikte Compiler-Flags physisch aus dem Programmcode gelöscht.'
                  },
                  {
                    title: '10. Lokaler Fingerabdruck- & Passkey-Login (TouchID/FaceID)',
                    desc: 'Nutzer können sich über die biometrische Hardware ihres Endgeräts (TouchID/FaceID) einloggen. Die Verifizierung erfolgt zu 100 % lokal – biometrische Merkmale verlassen niemals das Endgerät.'
                  },
                  {
                    title: '11. Automatische Inaktivitäts-Sperre (Auto-Lock)',
                    desc: 'Auf gemeinsam genutzten Geräten in den Unterrichtsräumen (Lab-Modus) meldet die App inaktive Nutzer nach 20 Minuten automatisch ab (inkl. 30s Warn-Countdown), um unbefugten Zugriff Dritter zu verhindern.'
                  },
                  {
                    title: '12. Server-Standort Deutschland (ISO 27001)',
                    desc: 'Das Hosting erfolgt ausschließlich in nach ISO 27001 zertifizierten Hochsicherheits-Rechenzentren in Deutschland (Falkenstein/Sachsen) – kein US-Schrems-II-Haftungsrisiko.'
                  },
                  {
                    title: '13. Modul-Kapselung & QR-Sperre vor Ort (Schulbetrieb)',
                    desc: 'Auf gemeinsam genutzten Schul-Geräten (Lab-Modus) wird das datensensible Campus-Modul physisch gekapselt. Schüler können nicht ohne Weiteres dorthin wechseln; sie müssen sich vor Ort per schnellem QR-Scan erneut verifizieren.'
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
                      color: '#137333',
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
                  background: '#137333',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '100px',
                  fontWeight: 650,
                  fontSize: '0.85rem',
                  padding: '10px 24px',
                  cursor: 'pointer',
                  boxShadow: '0 2px 6px rgba(19, 115, 51, 0.15)',
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
