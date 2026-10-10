import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Award, Sparkles, X, ExternalLink, Heart } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { isDevEnvironment } from '../../utils/tenantUrlHelper';
import type { SchoolSponsorSettings, SchoolSponsorItem } from '../secretary/sponsors/SecretarySponsorsModal';

export interface CampusLoginSponsorBadgeProps {
  schoolId?: string;
  schoolData?: any;
  isGroovelabKiosk?: boolean;
  style?: React.CSSProperties;
}

export const CampusLoginSponsorBadge: React.FC<CampusLoginSponsorBadgeProps> = ({
  schoolId,
  schoolData,
  isGroovelabKiosk = false,
  style
}) => {
  const [sponsors, setSponsors] = useState<SchoolSponsorItem[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const resolveSponsors = async () => {
      try {
        const isDev = isDevEnvironment();
        let settings: SchoolSponsorSettings | null = null;
        let effectiveSchoolId = schoolId || schoolData?.id || '';

        // 1. From passed schoolData
        if (schoolData?.sponsor_settings) {
          settings = schoolData.sponsor_settings;
        }

        // 2. From localStorage
        if (!settings && effectiveSchoolId) {
          const stored = localStorage.getItem(`campus_sponsor_settings_${effectiveSchoolId}`);
          if (stored) {
            try { settings = JSON.parse(stored); } catch {}
          }
        }

        // 3. Fallback to generic last school ID
        if (!effectiveSchoolId) {
          effectiveSchoolId = localStorage.getItem('groovelab_last_school_id') || 
                              localStorage.getItem('groovelab_school_id') || '';
        }

        if (!settings && effectiveSchoolId) {
          const stored = localStorage.getItem(`campus_sponsor_settings_${effectiveSchoolId}`);
          if (stored) {
            try { settings = JSON.parse(stored); } catch {}
          }
        }

        // 4. Scan localStorage for any campus_sponsor_settings_*
        if (!settings || !settings.sponsors || settings.sponsors.length === 0) {
          for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            if (k && k.startsWith('campus_sponsor_settings_')) {
              try {
                const val = localStorage.getItem(k);
                if (val) {
                  const parsed = JSON.parse(val);
                  if (parsed && Array.isArray(parsed.sponsors) && parsed.sponsors.length > 0) {
                    settings = parsed;
                    if (!effectiveSchoolId) {
                      effectiveSchoolId = k.replace('campus_sponsor_settings_', '');
                    }
                    break;
                  }
                }
              } catch {}
            }
          }
        }

        // 5. Supabase direct fetch if still empty
        if ((!settings || !settings.sponsors || settings.sponsors.length === 0) && effectiveSchoolId && supabase) {
          try {
            const { data } = await supabase
              .from('schools')
              .select('sponsor_settings')
              .eq('id', effectiveSchoolId)
              .maybeSingle();

            if (data?.sponsor_settings && Array.isArray(data.sponsor_settings.sponsors) && data.sponsor_settings.sponsors.length > 0) {
              settings = data.sponsor_settings;
            }
          } catch {}
        }

        // Filter active
        const activeList: SchoolSponsorItem[] = (settings?.sponsors || []).filter(
          (s: any) => (s.isActive !== false && s.status !== 'inactive') && s.id !== 'demo-1' && (s.companyName || s.name)
        );

        if (activeList.length > 0) {
          if (isMounted) setSponsors(activeList);
          return;
        }

        // 6. Dev Fallback
        if (isDev) {
          if (isMounted) {
            setSponsors([
              {
                id: 'musaek-sponsor-1',
                companyName: 'sameday',
                industrySubline: 'Logistik & Fulfillment',
                city: 'Bad Säckingen',
                tier: 'haupt',
                isMainSponsor: true,
                isActive: true,
                createdAt: '2026-01-01T00:00:00.000Z'
              },
              {
                id: 'musaek-sponsor-2',
                companyName: 'Patrick Huber',
                industrySubline: 'Bildungsstiftung',
                city: 'Rheinfelden',
                tier: 'partner',
                isMainSponsor: false,
                isActive: true,
                createdAt: '2026-01-01T00:00:00.000Z'
              },
              {
                id: 'musaek-sponsor-3',
                companyName: 'Jasna',
                industrySubline: 'Tollste Frau der Welt',
                city: 'Bad Säckingen',
                tier: 'foerderer',
                isMainSponsor: false,
                isActive: true,
                createdAt: '2026-01-01T00:00:00.000Z'
              }
            ]);
          }
          return;
        }

        if (isMounted) setSponsors([]);
      } catch (e) {
        console.warn('[CampusLoginSponsorBadge] Error resolving sponsors:', e);
      }
    };

    resolveSponsors();

    const handleRefresh = () => resolveSponsors();
    window.addEventListener('campus_sponsor_refresh', handleRefresh);
    window.addEventListener('groovelab_auth_state_changed', handleRefresh);

    return () => {
      isMounted = false;
      window.removeEventListener('campus_sponsor_refresh', handleRefresh);
      window.removeEventListener('groovelab_auth_state_changed', handleRefresh);
    };
  }, [schoolId, schoolData]);

  // Handle ESC key for modal dismissal
  useEffect(() => {
    if (!isModalOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsModalOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isModalOpen]);

  if (!sponsors || sponsors.length === 0) {
    return null;
  }

  const primarySponsor = sponsors[0];
  const additionalCount = sponsors.length - 1;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setIsModalOpen(true);
    }
  };

  return (
    <>
      <div
        role="button"
        tabIndex={0}
        aria-label={`Offizielle Bildungsförderung durch ${primarySponsor.companyName || (primarySponsor as any).name || 'unsere Förderer'}. Details anzeigen`}
        aria-haspopup="dialog"
        aria-expanded={isModalOpen}
        onClick={() => setIsModalOpen(true)}
        onKeyDown={handleKeyDown}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          padding: '6px 14px',
          borderRadius: '9999px',
          background: isGroovelabKiosk
            ? (isHovered ? 'rgba(255, 255, 255, 0.95)' : 'rgba(255, 255, 255, 0.82)')
            : (isHovered ? 'rgba(255, 255, 255, 0.16)' : 'rgba(255, 255, 255, 0.09)'),
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          border: isGroovelabKiosk
            ? (isHovered ? '1px solid rgba(217, 119, 6, 0.45)' : '1px solid rgba(217, 119, 6, 0.25)')
            : (isHovered ? '1px solid rgba(255, 255, 255, 0.32)' : '1px solid rgba(255, 255, 255, 0.16)'),
          boxShadow: isHovered
            ? '0 6px 16px rgba(0, 0, 0, 0.18)'
            : '0 2px 8px rgba(0, 0, 0, 0.08)',
          cursor: 'pointer',
          userSelect: 'none',
          marginBottom: '20px',
          transition: 'all 0.22s cubic-bezier(0.16, 1, 0.3, 1)',
          transform: isHovered ? 'translateY(-1px)' : 'translateY(0)',
          outline: 'none',
          ...style
        }}
      >
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '18px',
          height: '18px',
          borderRadius: '50%',
          background: isGroovelabKiosk ? 'rgba(217, 119, 6, 0.15)' : 'rgba(250, 204, 21, 0.22)',
          color: isGroovelabKiosk ? '#d97706' : '#facc15'
        }}>
          <Award size={11} strokeWidth={2.4} />
        </div>

        <span style={{
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          fontSize: '12px',
          fontWeight: 600,
          letterSpacing: '-0.01em',
          color: isGroovelabKiosk ? '#78350f' : '#ffffff',
          whiteSpace: 'nowrap'
        }}>
          Bildungsförderung:{' '}
          <strong style={{ fontWeight: 800, color: isGroovelabKiosk ? '#92400e' : '#fde047' }}>
            {primarySponsor.companyName || (primarySponsor as any).name}
          </strong>
          {(primarySponsor.city || (primarySponsor as any).location) && (
            <span style={{ opacity: 0.8, fontWeight: 500 }}> • {primarySponsor.city || (primarySponsor as any).location}</span>
          )}
          {additionalCount > 0 && (
            <span style={{ opacity: 0.75, fontWeight: 500 }}> (+{additionalCount})</span>
          )}
        </span>
      </div>

      {/* Detail Dialog / Transparency Overlay */}
      {isModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="sponsor-modal-title"
          onClick={() => setIsModalOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(0, 0, 0, 0.65)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            padding: '16px',
            animation: 'fadeIn 0.2s ease-out'
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: '460px',
              backgroundColor: '#0f172a',
              borderRadius: '24px',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              padding: '24px',
              boxShadow: '0 25px 60px rgba(0, 0, 0, 0.45), 0 0 0 1px rgba(255, 255, 255, 0.05)',
              color: '#ffffff',
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              position: 'relative'
            }}
          >
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, rgba(250, 204, 21, 0.25), rgba(234, 179, 8, 0.1))',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#facc15'
                }}>
                  <Award size={20} strokeWidth={2.2} />
                </div>
                <div>
                  <h3 id="sponsor-modal-title" style={{ margin: 0, fontSize: '17px', fontWeight: 800, letterSpacing: '-0.02em' }}>
                    Offizielle Bildungsförderung
                  </h3>
                  <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#94a3b8', fontWeight: 500 }}>
                    Transparenz & gesellschaftliches Engagement
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                aria-label="Dialog schließen"
                style={{
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: 'none',
                  borderRadius: '50%',
                  width: '30px',
                  height: '30px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#cbd5e1',
                  cursor: 'pointer',
                  transition: 'background 0.15s ease'
                }}
              >
                <X size={16} />
              </button>
            </div>

            {/* List of Sponsors */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', margin: '16px 0' }}>
              {sponsors.map((sp, idx) => (
                <div
                  key={sp.id || idx}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 14px',
                    borderRadius: '14px',
                    backgroundColor: 'rgba(255, 255, 255, 0.04)',
                    border: '1px solid rgba(255, 255, 255, 0.08)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    {sp.logoUrl ? (
                      <img
                        src={sp.logoUrl}
                        alt={sp.companyName || (sp as any).name}
                        style={{ width: '38px', height: '38px', borderRadius: '8px', objectFit: 'contain', backgroundColor: '#ffffff', padding: '2px' }}
                      />
                    ) : (
                      <div style={{
                        width: '38px',
                        height: '38px',
                        borderRadius: '10px',
                        backgroundColor: 'rgba(250, 204, 21, 0.15)',
                        color: '#facc15',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 800,
                        fontSize: '14px'
                      }}>
                        {(sp.companyName || (sp as any).name || 'F').charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: 700, color: '#f8fafc' }}>
                        {sp.companyName || (sp as any).name}
                      </div>
                      <div style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 500 }}>
                        {sp.industrySubline || (sp as any).category || 'Bildungsförderer'}
                        {(sp.city || (sp as any).location) ? ` • ${sp.city || (sp as any).location}` : ''}
                      </div>
                    </div>
                  </div>

                  {(sp.websiteUrl || (sp as any).website) && (
                    <a
                      href={sp.websiteUrl || (sp as any).website}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        color: '#38bdf8',
                        padding: '6px',
                        borderRadius: '8px',
                        display: 'flex',
                        alignItems: 'center'
                      }}
                      aria-label={`Website von ${sp.companyName || (sp as any).name} aufrufen`}
                    >
                      <ExternalLink size={15} />
                    </a>
                  )}
                </div>
              ))}
            </div>

            {/* Explanatory Context */}
            <div style={{
              padding: '12px 14px',
              borderRadius: '12px',
              backgroundColor: 'rgba(56, 189, 248, 0.08)',
              border: '1px solid rgba(56, 189, 248, 0.2)',
              fontSize: '12px',
              color: '#bae6fd',
              lineHeight: 1.5,
              fontWeight: 500
            }}>
              💡 <strong>Warum fördern Unternehmen unsere Musikschule?</strong> Förderer ermöglichen moderne digitale Musikinstrumente, interaktive Übungswerkzeuge und Chancengleichheit für alle Musikschülerinnen und -schüler.
            </div>

            {/* Footer action */}
            <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                style={{
                  padding: '9px 18px',
                  borderRadius: '10px',
                  backgroundColor: '#ffffff',
                  color: '#0f172a',
                  border: 'none',
                  fontWeight: 700,
                  fontSize: '13px',
                  cursor: 'pointer',
                  transition: 'background 0.15s ease'
                }}
              >
                Verstanden
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
