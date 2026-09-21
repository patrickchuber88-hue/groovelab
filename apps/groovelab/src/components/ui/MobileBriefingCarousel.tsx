import React, { useState, useRef } from 'react';
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
          {heroBanner}
          {kpisGrid}
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
      label: 'Hausaufgaben',
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

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (!touchStartX.current || !touchEndX.current) return;
    const diffX = touchStartX.current - touchEndX.current;
    const minSwipeDistance = 40;

    if (diffX > minSwipeDistance && activeIndex < tabs.length - 1) {
      setActiveIndex(prev => prev + 1);
    } else if (diffX < -minSwipeDistance && activeIndex > 0) {
      setActiveIndex(prev => prev - 1);
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
        boxSizing: 'border-box',
        overflowX: 'hidden'
      }}
    >
      {/* Top Segment Pills Navigation (100% Zero-Scrollbar Apple Segmented Control) */}
      <div 
        role="tablist"
        aria-label="Briefing Navigation"
        className="no-scrollbar"
        style={{ 
          display: 'grid', 
          gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))`,
          alignItems: 'center', 
          background: 'rgba(255, 255, 255, 0.85)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          borderRadius: '100px',
          padding: '3px',
          border: '1px solid rgba(226, 232, 240, 0.8)',
          boxShadow: '0 2px 10px rgba(0,0,0,0.03)',
          overflow: 'hidden',
          width: '100%',
          maxWidth: '100%',
          boxSizing: 'border-box'
        }}
      >
        {tabs.map((tab, idx) => {
          const isActive = activeIndex === idx;
          const IconComponent = tab.icon;
          const iconSize = 13;
          const iconDimension = '13px';

          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              id={`mobile-briefing-tab-${tab.id}`}
              aria-controls={`mobile-briefing-panel-${tab.id}`}
              aria-selected={isActive}
              tabIndex={isActive ? 0 : -1}
              onClick={() => setActiveIndex(idx)}
              style={{
                width: '100%',
                minWidth: 0,
                minHeight: '40px',
                padding: '6px 3px',
                borderRadius: '100px',
                border: 'none',
                background: isActive ? themeColor : 'transparent',
                color: isActive ? '#ffffff' : '#64748b',
                fontWeight: isActive ? 800 : 700,
                fontSize: '0.74rem',
                cursor: 'pointer',
                transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
                whiteSpace: 'nowrap',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px',
                boxSizing: 'border-box',
                touchAction: 'manipulation'
              }}
            >
              <IconComponent 
                size={iconSize} 
                color={isActive ? '#ffffff' : '#64748b'} 
                strokeWidth={2.2}
                style={{ 
                  width: iconDimension, 
                  height: iconDimension, 
                  minWidth: iconDimension, 
                  minHeight: iconDimension, 
                  maxWidth: iconDimension,
                  maxHeight: iconDimension,
                  flexShrink: 0 
                }} 
              />
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Instagram-Style Page Indicator Dots (Positioned under top pills) */}
      <div 
        style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          gap: '4px', 
          padding: '2px 0 6px 0' 
        }}
      >
        {tabs.map((tab, idx) => (
          <button
            key={idx}
            type="button"
            aria-label={`Gehe zu Tab ${tab.label}`}
            onClick={() => setActiveIndex(idx)}
            style={{
              minWidth: '24px',
              minHeight: '24px',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              padding: 0,
              touchAction: 'manipulation'
            }}
          >
            <span
              style={{
                width: activeIndex === idx ? '18px' : '6px',
                height: '6px',
                borderRadius: '100px',
                background: activeIndex === idx ? themeColor : '#cbd5e1',
                transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                display: 'block'
              }}
            />
          </button>
        ))}
      </div>

      {/* Swipeable Viewport */}
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
    </div>
  );
};
