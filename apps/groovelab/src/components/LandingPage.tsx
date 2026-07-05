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

  const handleCTASubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      onRegister(email);
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

            <div onClick={() => scrollToSection('pricing')} style={{ fontWeight: 600, fontSize: '16px', color: '#232326' }}>Preise</div>
            
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
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{
              flex: '1 1 280px',
              padding: '16px 24px',
              borderRadius: '100px',
              border: '1px solid #e8e8ed',
              fontSize: '16px',
              backgroundColor: '#ffffff',
              outline: 'none',
              boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.02)'
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
          fontSize: '13px',
          color: '#7d7d82',
          marginBottom: '64px'
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
                <span style={{ fontSize: '15px', color: '#232326' }}><strong>Faire Servicegebühren:</strong> Lehrkräfte für 0,49 €/Monat, aktive Schüler für 0,49 €/Monat (bzw. 5,88 € im Jahr). Inaktive Schüler-Datensätze kosten nur 0,09 €/Monat.</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                <Check size={20} style={{ color: '#137333', marginTop: '2px', flexShrink: 0 }} />
                <span style={{ fontSize: '15px', color: '#232326' }}><strong>Faire Laufzeiten:</strong> Keine Einrichtungsgebühr. Nach Ablauf des 1-monatigen Probemonats läuft der Vertrag flexibel bis zum jeweiligen Schuljahresende (August).</span>
              </div>
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
