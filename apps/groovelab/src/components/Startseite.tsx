import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, Search, School, MapPin, Loader2, ArrowRight } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface StartseiteProps {
  onLogin: () => void;
  onRegister: (email?: string) => void;
  onShowPrivacy?: () => void;
  onShowAgb?: () => void;
  onShowImpressum?: () => void;
}

export const Startseite: React.FC<StartseiteProps> = ({ 
  onLogin, 
  onRegister,
  onShowPrivacy,
  onShowAgb,
  onShowImpressum
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  // Close results when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fallback schools for offline/connection failure scenarios
  const FALLBACK_SCHOOLS = [
    {
      id: 'musaek-bad-saeckingen-static-id',
      name: 'Musikschule Bad Säckingen',
      subdomain: 'musaek-bad-saeckingen',
      city: 'Bad Säckingen',
      has_campus_subscription: true,
      has_groovelab_subscription: true,
      logo_url: null
    },
    {
      id: 'groovelab-demo-static-id',
      name: 'GrooveLab Demo',
      subdomain: 'demo',
      city: 'Stuttgart',
      has_campus_subscription: true,
      has_groovelab_subscription: true,
      logo_url: null
    }
  ];

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (searchQuery.trim().length < 2) {
        setSearchResults([]);
        setIsSearching(false);
        return;
      }

      setIsSearching(true);
      try {
        const queryPromise = supabase
          .from('schools')
          .select('id, name, subdomain, logo_url, city, has_campus_subscription, has_groovelab_subscription')
          .ilike('name', `%${searchQuery.trim()}%`)
          .not('subdomain', 'is', null)
          .limit(6);

        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Query timeout')), 2500)
        );

        const { data, error } = await Promise.race([queryPromise, timeoutPromise]) as any;

        if (!error && data) {
          setSearchResults(data);
          // Cache successful school list
          try {
            localStorage.setItem('groovelab_cached_schools', JSON.stringify(data));
          } catch (e) {}
        } else {
          throw error || new Error('No data');
        }
      } catch (err) {
        console.error('Search error, using fallback:', err);
        // Load from local storage cache if available
        let fallbackList = FALLBACK_SCHOOLS;
        try {
          const cached = localStorage.getItem('groovelab_cached_schools');
          if (cached) {
            fallbackList = JSON.parse(cached);
          }
        } catch (e) {}
        
        const filtered = fallbackList.filter((s: any) => 
          (s.name || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
          (s.city || '').toLowerCase().includes(searchQuery.toLowerCase())
        );
        setSearchResults(filtered);
      } finally {
        setIsSearching(false);
      }
    }, 300); // 300ms debounce

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleSchoolSelect = (school: any) => {
    if (typeof window !== 'undefined') {
      let targetPlatform = 'campus'; // Default to campus when campus or campus+groovelab is booked
      if (!school.has_campus_subscription && school.has_groovelab_subscription) {
        targetPlatform = 'groovelab';
      }

      localStorage.setItem('groovelab_active_platform', targetPlatform);
      localStorage.setItem('groovelab_last_school_id', school.id);
      if (school.subdomain) {
        localStorage.setItem('groovelab_last_subdomain', school.subdomain);
      }

      const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      if (isLocalhost) {
        window.location.href = `http://${window.location.hostname}:${window.location.port}/?school_id=${school.id}&subdomain=${school.subdomain}&platform=${targetPlatform}`;
      } else {
        const baseDomain = window.location.hostname.replace('www.', ''); // e.g. campus-groovelab.de
        window.location.href = `${window.location.protocol}//${school.subdomain}.${baseDomain}/?school_id=${school.id}&platform=${targetPlatform}`;
      }
    }
  };

  const handleLogoDoubleClick = () => {
    if (typeof window !== 'undefined') {
      const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      if (isLocalhost) {
        window.location.href = `http://${window.location.hostname}:${window.location.port}/login?platform=campus`;
      } else {
        const parts = window.location.hostname.replace('www.', '').split('.');
        const baseDomain = parts.slice(-2).join('.');
        window.location.href = `${window.location.protocol}//${baseDomain}/login?platform=campus`;
      }
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: '#050505', // Deep absolute dark
      fontFamily: '"Outfit", "Inter", system-ui, -apple-system, sans-serif',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      color: '#f4f4f5',
      textAlign: 'center',
      position: 'relative',
      overflow: 'hidden',
      boxSizing: 'border-box'
    }}>
      {/* Dynamic background ambient glows */}
      <style>{`
        @keyframes float-glow-1 {
          0% { transform: translate(0px, 0px) scale(1); }
          50% { transform: translate(40px, -60px) scale(1.2); }
          100% { transform: translate(0px, 0px) scale(1); }
        }
        @keyframes float-glow-2 {
          0% { transform: translate(0px, 0px) scale(1.1); }
          50% { transform: translate(-50px, 50px) scale(0.9); }
          100% { transform: translate(0px, 0px) scale(1.1); }
        }
        .ambient-glow-1 {
          position: absolute;
          top: 10%;
          left: 15%;
          width: 600px;
          height: 600px;
          background: radial-gradient(circle, rgba(16, 185, 129, 0.08) 0%, rgba(16, 185, 129, 0) 70%);
          filter: blur(80px);
          pointer-events: none;
          animation: float-glow-1 15s infinite ease-in-out;
        }
        .ambient-glow-2 {
          position: absolute;
          bottom: 10%;
          right: 15%;
          width: 650px;
          height: 650px;
          background: radial-gradient(circle, rgba(234, 179, 8, 0.06) 0%, rgba(234, 179, 8, 0) 70%);
          filter: blur(90px);
          pointer-events: none;
          animation: float-glow-2 18s infinite ease-in-out;
        }
        
        /* Magic Search Styles */
        .magic-search-container {
          position: relative;
          width: 100%;
          max-width: 580px;
          margin: 40px auto 0;
          z-index: 20;
        }
        .magic-search-input {
          width: 100%;
          background: rgba(20, 20, 25, 0.65);
          backdrop-filter: blur(32px);
          -webkit-backdrop-filter: blur(32px);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 24px;
          padding: 24px 32px 24px 64px;
          font-size: 1.25rem;
          color: #ffffff;
          box-shadow: 0 30px 60px rgba(0, 0, 0, 0.5), inset 0 1px 1px rgba(255, 255, 255, 0.08);
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
          outline: none;
          font-family: inherit;
        }
        .magic-search-input:focus {
          border-color: rgba(16, 185, 129, 0.5);
          box-shadow: 0 40px 80px rgba(0, 0, 0, 0.7), 0 0 0 2px rgba(16, 185, 129, 0.2), inset 0 1px 1px rgba(255, 255, 255, 0.15);
          background: rgba(24, 24, 30, 0.8);
        }
        .magic-search-input::placeholder {
          color: rgba(255, 255, 255, 0.3);
        }
        .magic-search-icon {
          position: absolute;
          left: 24px;
          top: 50%;
          transform: translateY(-50%);
          color: rgba(255, 255, 255, 0.4);
          transition: color 0.3s;
          pointer-events: none;
        }
        .magic-search-input:focus ~ .magic-search-icon {
          color: #10b981;
        }
        
        /* Dropdown Results */
        .search-results-dropdown {
          position: absolute;
          top: calc(100% + 16px);
          left: 0;
          right: 0;
          background: rgba(24, 24, 28, 0.85);
          backdrop-filter: blur(40px);
          -webkit-backdrop-filter: blur(40px);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 24px;
          padding: 12px;
          box-shadow: 0 40px 100px rgba(0, 0, 0, 0.8), inset 0 1px 1px rgba(255, 255, 255, 0.1);
          opacity: 0;
          visibility: hidden;
          transform: translateY(-10px);
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
          max-height: 400px;
          overflow-y: auto;
        }
        .search-results-dropdown.visible {
          opacity: 1;
          visibility: visible;
          transform: translateY(0);
        }
        .search-result-item {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 16px 20px;
          border-radius: 16px;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
          text-align: left;
          background: transparent;
          border: 1px solid transparent;
        }
        .search-result-item:hover {
          background: rgba(255, 255, 255, 0.06);
          border-color: rgba(255, 255, 255, 0.15);
          transform: scale(1.015) translateY(-1px);
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3), 0 0 16px rgba(255, 255, 255, 0.05);
        }
        .school-logo-placeholder {
          width: 48px;
          height: 48px;
          border-radius: 12px;
          background: linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%);
          border: 1px solid rgba(255, 255, 255, 0.08);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #a1a1aa;
        }
        .school-logo-image {
          width: 48px;
          height: 48px;
          border-radius: 12px;
          object-fit: cover;
          border: 1px solid rgba(255, 255, 255, 0.08);
          background: white;
        }
        
        .text-gradient {
          background: linear-gradient(135deg, #ffffff 0%, #a1a1aa 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        /* Footer Links */
        .footer-link {
          color: #71717a;
          text-decoration: none;
          font-size: 0.8rem;
          font-weight: 600;
          transition: all 0.2s;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .footer-link:hover {
          color: #f4f4f5;
        }
        
        /* Scrollbar for dropdown */
        .search-results-dropdown::-webkit-scrollbar {
          width: 6px;
        }
        .search-results-dropdown::-webkit-scrollbar-track {
          background: transparent;
        }
        .search-results-dropdown::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 10px;
        }
        .search-results-dropdown::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.2);
        }
      `}</style>

      {/* Decorative Blur Spheres */}
      <div className="ambient-glow-1"></div>
      <div className="ambient-glow-2"></div>

      <div style={{ position: 'relative', zIndex: 10, width: '100%', maxWidth: '800px', padding: '0 20px' }}>
        
        {/* Header / Brand */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '24px', marginBottom: '16px' }}>
          <div 
            onDoubleClick={handleLogoDoubleClick}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '0.75rem',
              fontWeight: 800,
              color: '#10b981',
              background: 'rgba(16, 185, 129, 0.08)',
              border: '1px solid rgba(16, 185, 129, 0.2)',
              padding: '8px 20px',
              borderRadius: '100px',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              boxShadow: '0 4px 12px rgba(16, 185, 129, 0.05)',
              cursor: 'pointer',
              userSelect: 'none'
            }}>
            <Sparkles size={14} style={{ color: '#facc15' }} />
            Campus-Groovelab
          </div>
          
          <h1 className="text-gradient" style={{
            fontSize: 'clamp(2.5rem, 5vw, 4rem)',
            fontWeight: 800,
            margin: '0',
            letterSpacing: '-0.03em',
            lineHeight: 1.1
          }}>
            Finde deine Musikschule
          </h1>
          
          <p style={{
            fontSize: '1.1rem',
            color: '#a1a1aa',
            maxWidth: '460px',
            margin: '0 auto',
            lineHeight: 1.6,
            fontWeight: 400
          }}>
            Logge dich in das Profil deiner Schule ein und entdecke deinen Fortschritt, Aufgaben und Repertoire.
          </p>
        </div>

        {/* Magic Search */}
        <div className="magic-search-container" ref={searchRef}>
          <input
            type="text"
            className="magic-search-input"
            placeholder="Name deiner Schule..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setShowResults(true);
            }}
            onFocus={() => setShowResults(true)}
          />
          <div className="magic-search-icon">
            {isSearching ? <Loader2 size={24} className="animate-spin" /> : <Search size={24} />}
          </div>

          {/* Results Dropdown */}
          <div className={`search-results-dropdown ${showResults && searchQuery.length >= 2 ? 'visible' : ''}`}>
            {searchResults.length > 0 ? (
              searchResults.map((school) => (
                <div 
                  key={school.id} 
                  className="search-result-item"
                  onClick={() => handleSchoolSelect(school)}
                >
                  {school.logo_url ? (
                    <img src={school.logo_url} alt={school.name} className="school-logo-image" />
                  ) : (
                    <div className="school-logo-placeholder">
                      <School size={24} style={{ opacity: 0.6 }} />
                    </div>
                  )}
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginBottom: '4px' }}>
                      <span style={{ fontSize: '1.1rem', fontWeight: 600, color: '#ffffff' }}>
                        {school.name}
                      </span>
                      {school.has_campus_subscription && (
                        <span style={{
                          fontSize: '0.65rem',
                          fontWeight: 800,
                          color: '#34a853',
                          background: 'rgba(52, 168, 83, 0.1)',
                          border: '1px solid rgba(52, 168, 83, 0.2)',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em'
                        }}>
                          Campus
                        </span>
                      )}
                      {school.has_groovelab_subscription && (
                        <span style={{
                          fontSize: '0.65rem',
                          fontWeight: 800,
                          color: '#eab308',
                          background: 'rgba(234, 179, 8, 0.1)',
                          border: '1px solid rgba(234, 179, 8, 0.2)',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em'
                        }}>
                          GrooveLab
                        </span>
                      )}
                    </div>
                    {school.city && (
                      <div style={{ fontSize: '0.85rem', color: '#71717a', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <MapPin size={12} />
                        {school.city}
                      </div>
                    )}
                  </div>
                  <div style={{ color: '#10b981', opacity: 0.8, display: 'flex', alignItems: 'center' }}>
                    <ArrowRight size={20} />
                  </div>
                </div>
              ))
            ) : !isSearching && searchQuery.length >= 2 ? (
              <div style={{ padding: '32px 20px', textAlign: 'center', color: '#71717a' }}>
                <School size={32} style={{ opacity: 0.2, margin: '0 auto 12px' }} />
                <div style={{ fontWeight: 500, marginBottom: '4px' }}>Keine Schule gefunden</div>
                <div style={{ fontSize: '0.85rem' }}>Überprüfe die Schreibweise oder frage deinen Lehrer.</div>
              </div>
            ) : null}
          </div>
        </div>

      </div>

      {/* Footer Links */}
      <div style={{
        position: 'absolute',
        bottom: '32px',
        left: '0',
        right: '0',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        gap: '32px',
        padding: '0 24px',
        flexWrap: 'wrap'
      }}>
        <div className="footer-link" onClick={() => onRegister()}>
          <School size={14} />
          Als Schule registrieren
        </div>
        <div style={{ width: '1px', height: '12px', background: 'rgba(255,255,255,0.1)' }}></div>
        <div className="footer-link" onClick={() => onShowPrivacy?.()}>Datenschutz</div>
        <div className="footer-link" onClick={() => onShowAgb?.()}>AGB</div>
        <div className="footer-link" onClick={() => onShowImpressum?.()}>Impressum</div>
      </div>
    </div>
  );
};

export const LandingPage2 = Startseite;
export const LandingPage = Startseite;
