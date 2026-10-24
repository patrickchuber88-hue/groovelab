import React, { useState, useRef, useEffect } from 'react';
import { LayoutDashboard, Clock, BookOpen, Bell } from 'lucide-react';

export interface CarouselTabItem {
  id: string;
  label: string;
  icon: any;
  content: React.ReactNode;
}

interface MobileBriefingCarouselProps {
  heroBanner?: React.ReactNode;
  kpisGrid?: React.ReactNode;
  tagesplanWidget?: React.ReactNode;
  hausaufgabenWidget?: React.ReactNode;
  mitteilungenWidget?: React.ReactNode;
  absenceWidget?: React.ReactNode;
  ausfallWidget?: React.ReactNode;
  customTabs?: CarouselTabItem[];
  additionalTabs?: CarouselTabItem[];
  themeColor?: string;
}

export const MobileBriefingCarousel: React.FC<MobileBriefingCarouselProps> = ({
  heroBanner,
  kpisGrid,
  tagesplanWidget,
  hausaufgabenWidget,
  mitteilungenWidget,
  absenceWidget,
  ausfallWidget,
  customTabs,
  additionalTabs,
  themeColor = '#34a853'
}) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);

  const effectiveAbsenceWidget = absenceWidget || ausfallWidget;

  const defaultTabs: CarouselTabItem[] = [
    {
      id: 'cockpit',
      label: 'Cockpit',
      icon: LayoutDashboard,
      content: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', paddingBottom: '20px', width: '100%', maxWidth: '100%', boxSizing: 'border-box', animation: 'fadeIn 0.25s ease-out' }}>
          {kpisGrid}
          {heroBanner}
          {effectiveAbsenceWidget}
        </div>
      )
    },
    {
      id: 'tagesplan',
      label: 'Tagesplan',
      icon: Clock,
      content: (
        <div style={{ paddingBottom: '20px', width: '100%', boxSizing: 'border-box', animation: 'fadeIn 0.25s ease-out' }}>
          {tagesplanWidget}
        </div>
      )
    },
    {
      id: 'hausaufgaben',
      label: 'Kompass',
      icon: BookOpen,
      content: (
        <div style={{ paddingBottom: '20px', width: '100%', boxSizing: 'border-box', animation: 'fadeIn 0.25s ease-out' }}>
          {hausaufgabenWidget}
        </div>
      )
    },
    {
      id: 'feed',
      label: 'Feed',
      icon: Bell,
      content: (
        <div style={{ paddingBottom: '20px', width: '100%', boxSizing: 'border-box', animation: 'fadeIn 0.25s ease-out' }}>
          {mitteilungenWidget}
        </div>
      )
    }
  ];

  const tabs: CarouselTabItem[] = customTabs || (
    additionalTabs ? [...defaultTabs, ...additionalTabs] : defaultTabs
  );

  const handleSelectTab = (idx: number) => {
    setActiveIndex(idx);
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try { navigator.vibrate(10); } catch { /* ignore */ }
    }
    const scrollContainer = document.getElementById('main-content') || document.querySelector('.main-content');
    if (scrollContainer) {
      scrollContainer.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  useEffect(() => {
    const handleSwitchTabEvent = (e: Event) => {
      const customEvt = e as CustomEvent<{ tabId?: string; index?: number }>;
      if (typeof customEvt.detail?.index === 'number') {
        handleSelectTab(customEvt.detail.index);
      } else if (customEvt.detail?.tabId) {
        const targetIdx = tabs.findIndex(t => t.id === customEvt.detail.tabId);
        if (targetIdx !== -1) handleSelectTab(targetIdx);
      }
    };
    window.addEventListener('campus_mobile_briefing_switch_tab', handleSwitchTabEvent);
    return () => window.removeEventListener('campus_mobile_briefing_switch_tab', handleSwitchTabEvent);
  }, [tabs.length]);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (!touchStartX.current || !touchEndX.current) return;
    const diffX = touchStartX.current - touchEndX.current;
    const minSwipeDistance = 50;

    if (diffX > minSwipeDistance && activeIndex < tabs.length - 1) {
      handleSelectTab(activeIndex + 1);
    } else if (diffX < -minSwipeDistance && activeIndex > 0) {
      handleSelectTab(activeIndex - 1);
    }

    touchStartX.current = null;
    touchEndX.current = null;
  };

  return (
    <div 
      style={{ 
        width: '100%', 
        maxWidth: '100%',
        display: 'flex', 
        flexDirection: 'column', 
        gap: '12px',
        paddingBottom: '88px',
        boxSizing: 'border-box',
        overflowX: 'hidden'
      }}
    >
      {/* Active Tab Content Viewport */}
      <div
        role="tabpanel"
        id={`mobile-briefing-panel-${tabs[activeIndex]?.id}`}
        aria-labelledby={`mobile-briefing-tab-${tabs[activeIndex]?.id}`}
        tabIndex={0}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{
          width: '100%',
          maxWidth: '100%',
          position: 'relative',
          overflow: 'visible',
          boxSizing: 'border-box',
          outline: 'none'
        }}
      >
        {tabs[activeIndex]?.content}
      </div>

      {/* 🏛️ 0.1% Goldstandard: True Fixed Bottom Bar in the Thumb Zone across all tabs (Cockpit | Tagesplan | Kompass | Feed | Notizen) */}
      <nav
        role="tablist"
        aria-label="Briefing Schnellzugriff Navigation"
        className="mobile-briefing-bottom-dock student-briefing-mobile-bottom-dock"
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          width: '100%',
          zIndex: 900,
          height: 'calc(50px + max(6px, calc(env(safe-area-inset-bottom, 0px) * 0.45)))',
          paddingBottom: 'max(6px, calc(env(safe-area-inset-bottom, 0px) * 0.45))',
          paddingTop: '6px',
          background: '#ffffff',
          borderTop: '1px solid #e2e8f0',
          boxShadow: '0 -4px 20px rgba(15, 23, 42, 0.06)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-around',
          boxSizing: 'border-box',
          userSelect: 'none',
          WebkitUserSelect: 'none',
          fontFamily: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif"
        }}
      >
        {tabs.map((tab, idx) => {
          const isActive = activeIndex === idx;
          const IconComponent = tab.icon;

          return (
            <React.Fragment key={tab.id}>
              {idx > 0 && (
                <div
                  style={{
                    width: '1px',
                    height: '22px',
                    background: 'rgba(0, 0, 0, 0.08)',
                    borderRadius: '1px',
                    flexShrink: 0
                  }}
                />
              )}
              <button
                type="button"
                role="tab"
                id={`mobile-briefing-tab-${tab.id}`}
                aria-controls={`mobile-briefing-panel-${tab.id}`}
                aria-selected={isActive}
                tabIndex={isActive ? 0 : -1}
                onClick={() => handleSelectTab(idx)}
                style={{
                  flex: 1,
                  minWidth: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '3px',
                  height: '100%',
                  minHeight: '44px',
                  border: 'none',
                  borderRadius: 0,
                  background: 'transparent',
                  cursor: 'pointer',
                  padding: '2px 2px',
                  outline: 'none',
                  WebkitTapHighlightColor: 'transparent',
                  boxSizing: 'border-box',
                  position: 'relative',
                  touchAction: 'manipulation'
                }}
              >
                {/* 🏛️ 0,1% Goldstandard: Oberer 3px Akzent-Indikator bei Auswahl */}
                {isActive && (
                  <div style={{ position: 'absolute', top: 0, width: '24px', height: '3px', borderRadius: '999px', background: themeColor }} />
                )}

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '42px',
                    height: '26px',
                    borderRadius: '13px',
                    background: isActive ? 'rgba(52, 168, 83, 0.20)' : 'transparent',
                    border: isActive ? '1px solid rgba(52, 168, 83, 0.38)' : '1px solid transparent',
                    position: 'relative',
                    transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)'
                  }}
                >
                  <IconComponent
                    size={19}
                    color={isActive ? '#15803d' : '#64748b'}
                    strokeWidth={isActive ? 2.5 : 2.0}
                  />
                </div>
                <span
                  style={{
                    fontSize: '0.74rem',
                    fontWeight: isActive ? 800 : 600,
                    color: isActive ? '#15803d' : '#64748b',
                    letterSpacing: isActive ? '-0.01em' : '0',
                    lineHeight: 1,
                    maxWidth: '100%',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {tab.label}
                </span>
              </button>
            </React.Fragment>
          );
        })}
      </nav>
    </div>
  );
};
