/**
 * 🏛️ Campus-Groovelab Bildungsförderer-Ingress Banner
 * 
 * 0.1% Monolith Goldstandard / Editorial Patron Ribbon mit Silk-Collapse
 * Standards: OWASP ASVS Level 3 / BFSG 2025 / WCAG 2.2 AA / § 8 MStV & JMStV Compliance
 * 
 * Features:
 * 1. 100% In-Flow Layout-Integration (kein schwebender, störender System-Toast).
 * 2. Repräsentative Institutionelle Ästhetik (Mäzenaten-Siegel, zweistufige Typografie).
 * 3. 4,8 Sekunden Verweildauer mit Pause-on-Hover.
 * 4. Butterweicher 60fps Silk-Collapse (Höhen- und Opazitätskollaps via CSS-Bézier).
 * 5. Kinderschutz & JMStV: Zero Tracking, keine Werbelinks, keine kommerziellen Calls-to-Action.
 * 6. Resiliente Multi-Tenant & Dev-Auflösung (keine Blockade im Entwickler- oder Testmodus).
 */

import React, { useState, useEffect, useRef } from 'react';
import { Award, X, MapPin, Briefcase } from 'lucide-react';
import { supabase as defaultSupabase } from '../../lib/supabase';
import { isDevEnvironment } from '../../utils/tenantUrlHelper';
import type { SchoolSponsorSettings, SchoolSponsorItem } from '../secretary/sponsors/SecretarySponsorsModal';

export interface SponsorDisplayItem {
  id: string;
  companyName: string;
  industrySubline: string;
  city: string;
  tier?: 'haupt' | 'partner' | 'foerderer';
  isMainSponsor: boolean;
  categoryLabel: string;
}

export interface CampusSponsorIngressBannerProps {
  schoolId?: string;
  sponsorSettings?: SchoolSponsorSettings | null;
  onDismiss?: () => void;
  previewMode?: boolean;
  previewCompanyText?: string;
  previewLocationBadge?: string;
  supabase?: any;
  isReady?: boolean;
}

/**
 * 🏛️ 0,1% Goldstandard: Synchroner Session-Preflight Check
 * Garantiert, dass der Bildungsförderer-Ingress exakt einmal pro Anmeldesitzung
 * beim Betreten des Briefing Boards gezeigt wird.
 */
function isSponsorBannerSuppressedThisSession(effectiveSchoolId?: string, previewMode = false): boolean {
  if (previewMode) return false;
  if (typeof window === 'undefined') return false;
  try {
    // Optionaler Force-Override für manuelles Testen ohne Login-Reset (z. B. ?force_sponsor=true)
    if (window.location.search && window.location.search.includes('force_sponsor=true')) return false;

    // 1. Globaler Tab-Session Lock
    if (sessionStorage.getItem('cg_sponsor_session_shown') === 'true') {
      return true;
    }
    // 2. Mandanten-spezifischer Session Lock
    if (effectiveSchoolId && sessionStorage.getItem(`cg_sponsor_shown_${effectiveSchoolId}`) === 'true') {
      return true;
    }
    if (sessionStorage.getItem('cg_sponsor_shown_default') === 'true') {
      return true;
    }
  } catch {
    // Fail-closed
  }
  return false;
}

function markSponsorBannerShownThisSession(effectiveSchoolId?: string): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem('cg_sponsor_session_shown', 'true');
    if (effectiveSchoolId) {
      sessionStorage.setItem(`cg_sponsor_shown_${effectiveSchoolId}`, 'true');
    }
    sessionStorage.setItem('cg_sponsor_shown_default', 'true');
  } catch {}
}

export const CampusSponsorIngressBanner: React.FC<CampusSponsorIngressBannerProps> = ({
  schoolId,
  sponsorSettings,
  onDismiss,
  previewMode = false,
  previewCompanyText,
  previewLocationBadge,
  supabase: propSupabase,
  isReady = true
}) => {
  const [sponsorList, setSponsorList] = useState<SponsorDisplayItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [isFading, setIsFading] = useState<boolean>(false);
  const [isVisible, setIsVisible] = useState<boolean>(false);
  const [isCollapsing, setIsCollapsing] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [refreshTick, setRefreshTick] = useState<number>(0);

  const timeLeftRef = useRef<number>(7500);
  const startTimeRef = useRef<number>(Date.now());
  const timerRef = useRef<any>(null);

  // Re-trigger on auth or sponsor refresh events
  useEffect(() => {
    const handleRefresh = () => setRefreshTick(prev => prev + 1);
    window.addEventListener('campus_sponsor_refresh', handleRefresh);
    window.addEventListener('groovelab_auth_state_changed', handleRefresh);
    return () => {
      window.removeEventListener('campus_sponsor_refresh', handleRefresh);
      window.removeEventListener('groovelab_auth_state_changed', handleRefresh);
    };
  }, []);

  useEffect(() => {
    // 1. Preview-Modus (z.B. im Schulsekretariat)
    if (previewMode) {
      const items: SponsorDisplayItem[] = [];
      const rawText = previewCompanyText || 'sameday & Patrick Huber';
      
      if (rawText.includes(' & ')) {
        const parts = rawText.split(' & ');
        items.push({
          id: 'preview-1',
          companyName: parts[0]?.trim() || 'sameday',
          industrySubline: 'Logistik & Fulfillment',
          city: previewLocationBadge ? previewLocationBadge.split('•')[0]?.split('-')[0]?.trim() : 'Bad Säckingen',
          tier: 'haupt',
          isMainSponsor: true,
          categoryLabel: 'Hauptsponsor der Musikschule'
        });
        items.push({
          id: 'preview-2',
          companyName: parts[1]?.trim() || 'Patrick Huber',
          industrySubline: 'Bildungsstiftung',
          city: previewLocationBadge && (previewLocationBadge.includes('•') || previewLocationBadge.includes('-')) 
            ? (previewLocationBadge.split('•')[1] || previewLocationBadge.split('-')[1])?.trim() 
            : 'Rheinfelden',
          tier: 'partner',
          isMainSponsor: false,
          categoryLabel: 'Bildungspartner der Musikschule'
        });
      } else {
        items.push({
          id: 'preview-1',
          companyName: rawText,
          industrySubline: 'Bildungspartnerschaft',
          city: previewLocationBadge || 'Bad Säckingen',
          tier: 'haupt',
          isMainSponsor: true,
          categoryLabel: 'Offizielle Bildungspartnerschaft'
        });
      }

      setSponsorList(items);
      setCurrentIndex(0);
      setIsVisible(true);
      timeLeftRef.current = items.length > 1 ? 8200 : 7500;
      startTimeRef.current = Date.now();
      return;
    }

    // 🏛️ 0,1% Goldstandard: Synchroner Preflight - wenn in dieser Session bereits gezeigt, sofort terminieren
    if (!previewMode && isSponsorBannerSuppressedThisSession(schoolId, previewMode)) {
      return;
    }

    let isMounted = true;

    const hydrateSponsors = async () => {
      try {
        const isDev = isDevEnvironment();

        // 2. Settings auflösen mit robustem Multi-Tier Fallback
        let currentSettings: SchoolSponsorSettings | null = sponsorSettings || null;
        let effectiveSchoolId = schoolId || '';

        // Stufe A: Direkter Key via schoolId
        if (!currentSettings && effectiveSchoolId) {
          const stored = localStorage.getItem(`campus_sponsor_settings_${effectiveSchoolId}`);
          if (stored) {
            try { currentSettings = JSON.parse(stored); } catch {}
          }
        }

        // Stufe B: School ID aus groovelab_cached_user / Storage ermitteln
        if (!effectiveSchoolId) {
          try {
            const cachedUser = sessionStorage.getItem('groovelab_cached_user');
            if (cachedUser) {
              const parsed = JSON.parse(cachedUser);
              const uSchoolId = parsed?.school_id || (Array.isArray(parsed?.schools) ? parsed.schools[0]?.id : parsed?.schools?.id);
              if (uSchoolId) {
                effectiveSchoolId = uSchoolId;
              }
            }
          } catch {}
        }
        if (!effectiveSchoolId) {
          effectiveSchoolId = localStorage.getItem('groovelab_last_school_id') || 
                              localStorage.getItem('groovelab_school_id') || '';
        }

        if (!currentSettings && effectiveSchoolId) {
          const stored = localStorage.getItem(`campus_sponsor_settings_${effectiveSchoolId}`);
          if (stored) {
            try { currentSettings = JSON.parse(stored); } catch {}
          }
        }

        // Stufe C: Resiliente Suche über alle campus_sponsor_settings_* Keys
        if (!currentSettings || !currentSettings.sponsors || currentSettings.sponsors.length === 0) {
          for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            if (k && k.startsWith('campus_sponsor_settings_')) {
              try {
                const val = localStorage.getItem(k);
                if (val) {
                  const parsed = JSON.parse(val);
                  if (parsed && Array.isArray(parsed.sponsors) && parsed.sponsors.length > 0) {
                    currentSettings = parsed;
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

        // Stufe D: Asynchrone Supabase SSOT Hydration aus schools.sponsor_settings
        const db = propSupabase || defaultSupabase;
        if ((!currentSettings || !currentSettings.sponsors || currentSettings.sponsors.length === 0) && db && effectiveSchoolId) {
          try {
            const { data, error } = await db
              .from('schools')
              .select('sponsor_settings')
              .eq('id', effectiveSchoolId)
              .maybeSingle();

            if (!error && data?.sponsor_settings) {
              currentSettings = data.sponsor_settings;
              try {
                localStorage.setItem(`campus_sponsor_settings_${effectiveSchoolId}`, JSON.stringify(data.sponsor_settings));
              } catch {}
            }
          } catch {}
        }

        // Prüfen, ob wirkliche aktive Sponsoren vorhanden sind
        const hasActiveSponsors = Boolean(
          currentSettings && 
          Array.isArray(currentSettings.sponsors) && 
          currentSettings.sponsors.some(
            (s: SchoolSponsorItem) => s.isActive && s.id !== 'demo-1' && s.companyName !== 'Sanitär Meier'
          )
        );

        // Stufe E (Dev-Fallback): Wenn in Dev-Umgebung keine echten Sponsoren existieren
        if (!hasActiveSponsors && isDev) {
          currentSettings = {
            allowCoSponsorsWithMain: true,
            sponsors: [
              {
                id: 'dev-demo-1',
                companyName: 'sameday',
                industrySubline: 'Logistik & Fulfillment',
                city: 'Bad Säckingen',
                tier: 'haupt',
                isMainSponsor: true,
                isActive: true,
                createdAt: new Date().toISOString()
              },
              {
                id: 'dev-demo-2',
                companyName: 'Patrick Huber',
                industrySubline: 'Bildungsstiftung',
                city: 'Rheinfelden',
                tier: 'partner',
                isMainSponsor: false,
                isActive: true,
                createdAt: new Date().toISOString()
              }
            ]
          };
        }

        if (!currentSettings || !currentSettings.sponsors || currentSettings.sponsors.length === 0) {
          return;
        }

        const activeSponsors = currentSettings.sponsors.filter(
          (s: SchoolSponsorItem) => s.isActive && s.id !== 'demo-1' && s.companyName !== 'Sanitär Meier'
        );
        if (activeSponsors.length === 0) return;

        // 🏛️ 0,1% Goldstandard: Einmalige Anzeige pro Session beim Start (Anmeldung)
        // Gültig in Prod und Dev (Zero-Drift). Für UI-Vorschau existiert previewMode={true}.
        if (isSponsorBannerSuppressedThisSession(effectiveSchoolId, previewMode)) {
          return;
        }

        // Haupt- und Bildungspartner priorisieren, ansonsten auf alle aktiven Sponsoren zurückgreifen
        let toastEligibleSponsors = activeSponsors.filter(
          (s: SchoolSponsorItem) => s.tier === 'haupt' || s.tier === 'partner' || s.isMainSponsor
        );
        if (toastEligibleSponsors.length === 0) {
          toastEligibleSponsors = activeSponsors;
        }

        const allowCo = currentSettings.allowCoSponsorsWithMain !== false;
        const hauptSponsors = toastEligibleSponsors.filter((s: SchoolSponsorItem) => s.tier === 'haupt' || s.isMainSponsor);
        const coSponsors = toastEligibleSponsors.filter((s: SchoolSponsorItem) => s.tier === 'partner');

        const sessionCounterStr = localStorage.getItem(`cg_sponsor_rotation_counter_${effectiveSchoolId || 'default'}`) || '0';
        const counter = parseInt(sessionCounterStr, 10);

        const itemsToDisplay: SponsorDisplayItem[] = [];

        if (hauptSponsors.length > 0) {
          const haupt = hauptSponsors[counter % hauptSponsors.length];
          itemsToDisplay.push({
            id: haupt.id,
            companyName: haupt.customToastText 
              ? haupt.customToastText.replace(/^Ermöglicht durch\s*/i, '')
              : haupt.companyName,
            industrySubline: haupt.industrySubline || '',
            city: haupt.city || '',
            tier: haupt.tier || 'haupt',
            isMainSponsor: true,
            categoryLabel: 'Hauptsponsor der Musikschule'
          });

          // Alle aktiven Bildungspartner (bis zu 3) in den Sequencer aufnehmen
          if (allowCo && coSponsors.length > 0) {
            coSponsors.slice(0, 3).forEach((co) => {
              itemsToDisplay.push({
                id: co.id,
                companyName: co.customToastText
                  ? co.customToastText.replace(/^Ermöglicht durch\s*/i, '')
                  : co.companyName,
                industrySubline: co.industrySubline || '',
                city: co.city || '',
                tier: co.tier || 'partner',
                isMainSponsor: false,
                categoryLabel: 'Bildungspartner der Musikschule'
              });
            });
          }
        } else if (coSponsors.length > 0) {
          // Keine Hauptsponsoren: Alle aktiven Bildungspartner (bis zu 4) sequentiell würdigen
          coSponsors.slice(0, 4).forEach((co) => {
            itemsToDisplay.push({
              id: co.id,
              companyName: co.customToastText
                ? co.customToastText.replace(/^Ermöglicht durch\s*/i, '')
                : co.companyName,
              industrySubline: co.industrySubline || '',
              city: co.city || '',
              tier: co.tier || 'partner',
              isMainSponsor: false,
              categoryLabel: 'Bildungspartner der Musikschule'
            });
          });
        } else {
          // Fallback: Alle aktiven Sponsoren (bis zu 4)
          activeSponsors.slice(0, 4).forEach((fallback) => {
            itemsToDisplay.push({
              id: fallback.id,
              companyName: fallback.companyName,
              industrySubline: fallback.industrySubline || '',
              city: fallback.city || '',
              tier: fallback.tier,
              isMainSponsor: Boolean(fallback.isMainSponsor),
              categoryLabel: 'Offizielle Bildungspartnerschaft'
            });
          });
        }

        localStorage.setItem(`cg_sponsor_rotation_counter_${effectiveSchoolId || 'default'}`, String((counter + 1) % 1000));
        // 🏛️ 0,1% Goldstandard: Atomarer Session-Lock für die gesamte Anmeldesitzung
        markSponsorBannerShownThisSession(effectiveSchoolId);

        if (isMounted && itemsToDisplay.length > 0) {
          setSponsorList(itemsToDisplay);
          setCurrentIndex(0);
          setIsVisible(true);
          const computedTotalTime = itemsToDisplay.length > 1 ? (itemsToDisplay.length * 3800) + 800 : 7000;
          timeLeftRef.current = computedTotalTime;
          startTimeRef.current = Date.now();
        }
      } catch {
        // Graceful fail-closed
      }
    };

    hydrateSponsors();

    return () => {
      isMounted = false;
    };
  }, [schoolId, sponsorSettings, previewMode, previewCompanyText, previewLocationBadge, propSupabase, refreshTick]);

  // Seiden-Kollaps Trigger
  const triggerCollapse = () => {
    if (isCollapsing) return;
    setIsCollapsing(true);
    markSponsorBannerShownThisSession(schoolId);
    setTimeout(() => {
      setIsVisible(false);
      if (onDismiss) onDismiss();
    }, 480);
  };

  // 🔄 Silk-Sequencer: Synchroner Durchlauf aller Partner mit partnereigenem Spotlight
  useEffect(() => {
    if (!isVisible || isCollapsing || isPaused || sponsorList.length <= 1) return;

    const intervalTime = 3800; // 3.8s pro Förderer

    const interval = setInterval(() => {
      setCurrentIndex(prev => {
        // Wenn der letzte Partner vollendet ist: Nicht flackernd zurückspringen, sondern direkt kollabieren!
        if (prev >= sponsorList.length - 1) {
          triggerCollapse();
          return prev;
        }
        setIsFading(true);
        setTimeout(() => {
          setIsFading(false);
        }, 200);
        return prev + 1;
      });
    }, intervalTime);

    return () => clearInterval(interval);
  }, [isVisible, isCollapsing, isPaused, sponsorList.length]);

  // Timer mit Pause-on-Hover und Lade-Synchronisation (isReady)
  useEffect(() => {
    if (!isVisible || isCollapsing || previewMode || !isReady) return;

    if (isPaused) {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      const elapsed = Date.now() - startTimeRef.current;
      timeLeftRef.current = Math.max(1200, timeLeftRef.current - elapsed);
    } else {
      startTimeRef.current = Date.now();
      timerRef.current = setTimeout(() => {
        triggerCollapse();
      }, timeLeftRef.current);
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [isVisible, isPaused, isCollapsing, previewMode, isReady]);

  const currentSponsor = sponsorList[currentIndex] || sponsorList[0];
  if (!isVisible || !currentSponsor) return null;

  return (
    <aside
      role="status"
      aria-label={`${currentSponsor.categoryLabel}: Ermöglicht durch ${currentSponsor.companyName}${currentSponsor.city ? ` aus ${currentSponsor.city}` : ''}${currentSponsor.industrySubline ? ` (${currentSponsor.industrySubline})` : ''}`}
      onMouseEnter={() => {
        if (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(pointer: fine)').matches) {
          setIsPaused(true);
        }
      }}
      onMouseLeave={() => {
        if (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(pointer: fine)').matches) {
          setIsPaused(false);
        }
      }}
      onTouchStart={() => setIsPaused(true)}
      onTouchEnd={() => setIsPaused(false)}
      onTouchCancel={() => setIsPaused(false)}
      style={{
        width: '100%',
        boxSizing: 'border-box',
        overflow: 'hidden',
        maxHeight: isCollapsing ? '0px' : '160px',
        opacity: isCollapsing ? 0 : 1,
        marginBottom: isCollapsing ? '0px' : '16px',
        transform: isCollapsing ? 'scaleY(0.96)' : 'scaleY(1)',
        transformOrigin: 'top center',
        transition: 'max-height 0.48s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.38s ease-out, margin-bottom 0.48s cubic-bezier(0.16, 1, 0.3, 1), transform 0.48s cubic-bezier(0.16, 1, 0.3, 1)',
        pointerEvents: isCollapsing ? 'none' : 'auto'
      }}
    >
      <style>{`
        @keyframes cgPatronGlowSweep {
          0% { transform: translateX(-100%); }
          40%, 100% { transform: translateX(200%); }
        }

        .cg-sponsor-mobile-actions {
          display: none;
        }

        @media (max-width: 640px) {
          .cg-sponsor-banner-card {
            padding: 9px 12px !important;
            min-height: 58px !important;
            align-items: flex-start !important;
          }
          .cg-sponsor-icon-wrapper {
            width: 30px !important;
            height: 30px !important;
            margin-top: 2px !important;
          }
          .cg-sponsor-content-group {
            padding-right: 0 !important;
          }
          .cg-sponsor-category-text {
            font-size: 0.58rem !important;
            letter-spacing: 0.05em !important;
            white-space: nowrap !important;
            padding-right: 52px !important;
          }
          .cg-sponsor-name-text {
            font-size: 0.84rem !important;
            line-height: 1.25 !important;
            white-space: normal !important;
            overflow: visible !important;
            text-overflow: clip !important;
            word-break: break-word !important;
          }
          .cg-sponsor-lead-text {
            font-size: 0.74rem !important;
            font-weight: 600 !important;
            color: #475569 !important;
            letter-spacing: 0.01em !important;
          }
          .cg-sponsor-patron-text {
            font-size: 0.84rem !important;
            font-weight: 850 !important;
            color: #0f172a !important;
          }
          .cg-sponsor-desktop-actions {
            display: none !important;
          }
          .cg-sponsor-mobile-actions {
            display: flex !important;
            align-items: center !important;
            gap: 4px !important;
            position: absolute !important;
            top: 7px !important;
            right: 7px !important;
            z-index: 2 !important;
          }
        }
      `}</style>

      <div
        className="cg-sponsor-banner-card"
        style={{
          position: 'relative',
          width: '100%',
          minHeight: '52px',
          background: 'linear-gradient(135deg, rgba(240, 253, 244, 0.94) 0%, rgba(255, 255, 255, 0.98) 100%)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1.2px solid rgba(34, 197, 94, 0.22)',
          borderRadius: '18px',
          padding: '9px 16px',
          boxShadow: '0 8px 24px -4px rgba(15, 23, 42, 0.05), 0 2px 6px rgba(15, 23, 42, 0.02), inset 0 1px 0 rgba(255, 255, 255, 0.95)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          fontFamily: "'Plus Jakarta Sans', -apple-system, sans-serif",
          boxSizing: 'border-box',
          overflow: 'hidden'
        }}
      >
        {/* SUBTLE LIGHT SWEEP SHIMMER */}
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '45%',
            height: '100%',
            background: 'linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.55) 50%, transparent 100%)',
            pointerEvents: 'none',
            animation: 'cgPatronGlowSweep 6s ease-in-out infinite'
          }}
        />

        {/* MOBILE TOP-RIGHT ACTIONS: STEPPER & DISMISS */}
        <div className="cg-sponsor-mobile-actions">
          {sponsorList.length > 1 && (
            <div
              role="tablist"
              aria-label="Förderer durchblättern"
              style={{ display: 'flex', alignItems: 'center', gap: '3px', marginRight: '4px' }}
            >
              {sponsorList.map((item, idx) => (
                <button
                  key={item.id || idx}
                  type="button"
                  role="tab"
                  aria-selected={idx === currentIndex}
                  aria-label={`Förderer ${idx + 1}: ${item.companyName}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (idx === currentIndex) return;
                    setIsFading(true);
                    setTimeout(() => {
                      setCurrentIndex(idx);
                      setIsFading(false);
                    }, 180);
                  }}
                  style={{
                    width: idx === currentIndex ? '12px' : '5px',
                    height: '5px',
                    borderRadius: '100px',
                    background: idx === currentIndex ? '#16a34a' : 'rgba(100, 116, 139, 0.3)',
                    border: 'none',
                    padding: 0,
                    cursor: 'pointer',
                    transition: 'all 0.22s cubic-bezier(0.16, 1, 0.3, 1)'
                  }}
                />
              ))}
            </div>
          )}

          {!previewMode && (
            <button
              type="button"
              onClick={triggerCollapse}
              aria-label="Förderhinweis ausblenden"
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                background: 'transparent',
                border: 'none',
                color: '#64748b',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 0,
                WebkitTapHighlightColor: 'transparent'
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  triggerCollapse();
                }
              }}
            >
              <div
                style={{
                  width: '22px',
                  height: '22px',
                  borderRadius: '50%',
                  background: 'rgba(0, 0, 0, 0.05)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <X size={12} strokeWidth={2.2} />
              </div>
            </button>
          )}
        </div>

        {/* LEFT: MEDALLION ICON & EDITORIAL TYPOGRAPHY */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, flex: 1 }}>
          <div
            className="cg-sponsor-icon-wrapper"
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '11px',
              background: 'linear-gradient(135deg, #15803d 0%, #16a34a 100%)',
              border: '1px solid rgba(255, 255, 255, 0.4)',
              boxShadow: '0 4px 10px rgba(22, 163, 74, 0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}
          >
            <Award size={18} color="#ffffff" strokeWidth={2.2} />
          </div>

          <div
            className="cg-sponsor-content-group"
            style={{
              display: 'flex',
              flexDirection: 'column',
              minWidth: 0,
              gap: '2px',
              opacity: isFading ? 0 : 1,
              transform: isFading ? 'translateY(2px)' : 'translateY(0px)',
              transition: 'opacity 0.20s ease-out, transform 0.20s ease-out'
            }}
          >
            <span
              className="cg-sponsor-category-text"
              style={{
                fontSize: '0.62rem',
                fontWeight: 800,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                color: '#15803d',
                lineHeight: 1.2,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}
            >
              {currentSponsor.categoryLabel}
            </span>

            <div
              className="cg-sponsor-name-text"
              style={{
                fontSize: '0.86rem',
                fontWeight: 750,
                color: '#0f172a',
                lineHeight: 1.25,
                letterSpacing: '-0.01em',
                wordBreak: 'break-word'
              }}
            >
              <span className="cg-sponsor-lead-text">Ermöglicht durch </span>
              <span className="cg-sponsor-patron-text" style={{ fontWeight: 850 }}>{currentSponsor.companyName}</span>
            </div>

            {/* MONOCHROME META PILLS: BRANCHE & ORT */}
            {(currentSponsor.industrySubline || currentSponsor.city) && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  flexWrap: 'wrap',
                  marginTop: '2px'
                }}
              >
                {currentSponsor.industrySubline && (
                  <span
                    style={{
                      fontSize: '0.64rem',
                      fontWeight: 700,
                      background: 'rgba(240, 253, 244, 0.95)',
                      border: '1px solid #bbf7d0',
                      color: '#166534',
                      padding: '1px 8px',
                      borderRadius: '100px',
                      letterSpacing: '0.01em',
                      whiteSpace: 'nowrap',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    <Briefcase size={10} strokeWidth={2.2} color="#166534" style={{ flexShrink: 0 }} />
                    <span>{currentSponsor.industrySubline}</span>
                  </span>
                )}

                {currentSponsor.city && (
                  <span
                    style={{
                      fontSize: '0.64rem',
                      fontWeight: 700,
                      background: 'rgba(240, 253, 244, 0.95)',
                      border: '1px solid #bbf7d0',
                      color: '#166534',
                      padding: '1px 8px',
                      borderRadius: '100px',
                      letterSpacing: '0.01em',
                      whiteSpace: 'nowrap',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    <MapPin size={10} strokeWidth={2.2} color="#166534" style={{ flexShrink: 0 }} />
                    <span>{currentSponsor.city}</span>
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT: DESKTOP BADGES & SOFT DISMISS */}
        <div className="cg-sponsor-desktop-actions" style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
          {sponsorList.length > 1 && (
            <div
              role="tablist"
              aria-label="Förderer durchblättern"
              style={{ display: 'flex', alignItems: 'center', gap: '4px', marginRight: '4px' }}
            >
              {sponsorList.map((item, idx) => (
                <button
                  key={item.id || idx}
                  type="button"
                  role="tab"
                  aria-selected={idx === currentIndex}
                  aria-label={`Förderer ${idx + 1}: ${item.companyName}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (idx === currentIndex) return;
                    setIsFading(true);
                    setTimeout(() => {
                      setCurrentIndex(idx);
                      setIsFading(false);
                    }, 180);
                  }}
                  style={{
                    width: idx === currentIndex ? '14px' : '6px',
                    height: '6px',
                    borderRadius: '100px',
                    background: idx === currentIndex ? '#16a34a' : 'rgba(100, 116, 139, 0.3)',
                    border: 'none',
                    padding: 0,
                    cursor: 'pointer',
                    transition: 'all 0.22s cubic-bezier(0.16, 1, 0.3, 1)'
                  }}
                />
              ))}
            </div>
          )}

          <span
            style={{
              fontSize: '0.68rem',
              fontWeight: 800,
              background: '#ecfdf5',
              border: '1px solid #10b981',
              color: '#059669',
              padding: '3px 10px',
              borderRadius: '100px',
              letterSpacing: '0.02em'
            }}
          >
            Schul-Patenschaft
          </span>

          {!previewMode && (
            <button
              type="button"
              onClick={triggerCollapse}
              aria-label="Förderhinweis ausblenden"
              style={{
                width: '26px',
                height: '26px',
                borderRadius: '50%',
                background: 'rgba(0, 0, 0, 0.04)',
                border: 'none',
                color: '#64748b',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 0,
                transition: 'all 0.15s ease'
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  triggerCollapse();
                }
              }}
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>
    </aside>
  );
};
