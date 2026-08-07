import React, { useState, useRef } from 'react';

interface MobileBriefingCarouselProps {
  heroBanner: React.ReactNode;
  kpisGrid: React.ReactNode;
  tagesplanWidget: React.ReactNode;
  hausaufgabenWidget: React.ReactNode;
  mitteilungenWidget: React.ReactNode;
}

export const MobileBriefingCarousel: React.FC<MobileBriefingCarouselProps> = ({
  heroBanner,
  kpisGrid,
  tagesplanWidget,
  hausaufgabenWidget,
  mitteilungenWidget
}) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);

  const tabs = [
    { id: 'cockpit', label: '☀️ Cockpit' },
    { id: 'tagesplan', label: '📅 Tagesplan' },
    { id: 'hausaufgaben', label: '📝 Hausaufgaben' },
    { id: 'feed', label: '🔔 Feed' }
  ];

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
        display: 'flex', 
        flexDirection: 'column', 
        gap: '12px',
        boxSizing: 'border-box'
      }}
    >
      {/* Top Segment Pills Navigation */}
      <div 
        style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          background: 'rgba(255, 255, 255, 0.85)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          borderRadius: '100px',
          padding: '4px',
          border: '1px solid rgba(226, 232, 240, 0.8)',
          boxShadow: '0 2px 10px rgba(0,0,0,0.03)',
          overflowX: 'auto'
        }}
      >
        {tabs.map((tab, idx) => {
          const isActive = activeIndex === idx;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveIndex(idx)}
              style={{
                flex: 1,
                padding: '6px 10px',
                borderRadius: '100px',
                border: 'none',
                background: isActive ? '#34a853' : 'transparent',
                color: isActive ? '#ffffff' : '#64748b',
                fontWeight: isActive ? 800 : 700,
                fontSize: '0.72rem',
                cursor: 'pointer',
                transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
                whiteSpace: 'nowrap',
                textAlign: 'center'
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Swipeable Viewport */}
      <div
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{
          width: '100%',
          minHeight: '440px',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        {activeIndex === 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', animation: 'fadeIn 0.25s ease-out' }}>
            {heroBanner}
            {kpisGrid}
          </div>
        )}

        {activeIndex === 1 && (
          <div style={{ animation: 'fadeIn 0.25s ease-out' }}>
            {tagesplanWidget}
          </div>
        )}

        {activeIndex === 2 && (
          <div style={{ animation: 'fadeIn 0.25s ease-out' }}>
            {hausaufgabenWidget}
          </div>
        )}

        {activeIndex === 3 && (
          <div style={{ animation: 'fadeIn 0.25s ease-out' }}>
            {mitteilungenWidget}
          </div>
        )}
      </div>

      {/* Bottom Instagram-Style Page Indicator Dots */}
      <div 
        style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          gap: '6px', 
          padding: '6px 0' 
        }}
      >
        {tabs.map((_, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => setActiveIndex(idx)}
            style={{
              width: activeIndex === idx ? '18px' : '6px',
              height: '6px',
              borderRadius: '100px',
              background: activeIndex === idx ? '#34a853' : '#cbd5e1',
              border: 'none',
              cursor: 'pointer',
              transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
              padding: 0
            }}
          />
        ))}
      </div>
    </div>
  );
};
