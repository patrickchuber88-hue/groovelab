import React, { useState, useEffect } from 'react';
import { X, Info, ChevronRight, ChevronLeft, Sparkles } from 'lucide-react';

export interface TourStep {
  title: string;
  description: string;
  selector?: string; // DOM ID of the element to highlight
}

interface TourConfig {
  tourKey: string;
  steps: TourStep[];
  platformTheme?: 'campus' | 'groovelab' | 'admin';
}

export function usePremiumOnboardingTour({ tourKey, steps, platformTheme = 'campus' }: TourConfig) {
  const [isTourActive, setIsTourActive] = useState(false);
  const [currentTourStep, setCurrentTourStep] = useState(0);
  const [placement, setPlacement] = useState<'right' | 'left' | 'top' | 'bottom'>('right');
  const [spotlightRect, setSpotlightRect] = useState<DOMRect | null>(null);
  const [tooltipStyle, setTooltipStyle] = useState<React.CSSProperties>({
    position: 'fixed',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    zIndex: 999999
  });

  // Check if tour should run automatically
  useEffect(() => {
    if (!tourKey || steps.length === 0) return;
    const isCompleted = localStorage.getItem(tourKey);
    if (!isCompleted) {
      const timer = setTimeout(() => {
        setIsTourActive(true);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [tourKey, steps]);

  useEffect(() => {
    if (!isTourActive) {
      setSpotlightRect(null);
      return;
    }
    const step = steps[currentTourStep];
    if (!step) return;

    if (!step.selector) {
      setSpotlightRect(null);
      setTooltipStyle({
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 999999,
        transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
      });
      return;
    }

    const updatePosition = () => {
      const el = document.getElementById(step.selector!);
      if (el) {
        const rect = el.getBoundingClientRect();
        setSpotlightRect(rect);

        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        
        let pos: 'right' | 'left' | 'top' | 'bottom' = 'right';
        
        // Decide best placement based on space
        if (rect.right + 360 < viewportWidth) {
          pos = 'right';
        } else if (rect.left - 360 > 0) {
          pos = 'left';
        } else if (rect.bottom + 260 < viewportHeight) {
          pos = 'bottom';
        } else {
          pos = 'top';
        }
        
        setPlacement(pos);

        let top = 0;
        let left = 0;

        if (pos === 'right') {
          left = rect.right + 18;
          top = rect.top + rect.height / 2 - 100;
        } else if (pos === 'left') {
          left = rect.left - 320 - 18;
          top = rect.top + rect.height / 2 - 100;
        } else if (pos === 'bottom') {
          left = rect.left + rect.width / 2 - 160;
          top = rect.bottom + 18;
        } else {
          left = rect.left + rect.width / 2 - 160;
          top = rect.top - 240 - 18;
        }

        // Adjust bounds to stay inside viewport safely
        if (left < 16) left = 16;
        if (left + 320 > viewportWidth - 16) left = viewportWidth - 320 - 16;
        if (top < 16) top = 16;
        if (top + 240 > viewportHeight - 16) top = viewportHeight - 240 - 16;

        setTooltipStyle({
          position: 'fixed',
          top: `${top}px`,
          left: `${left}px`,
          zIndex: 999999,
          transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
        });
      } else {
        setSpotlightRect(null);
        setTooltipStyle({
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 999999,
          transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
        });
      }
    };

    updatePosition();
    
    const interval = setInterval(updatePosition, 250);
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);

    return () => {
      clearInterval(interval);
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [currentTourStep, isTourActive, steps]);

  const endTour = () => {
    localStorage.setItem(tourKey, 'true');
    setIsTourActive(false);
    setCurrentTourStep(0);
  };

  const startTour = () => {
    setCurrentTourStep(0);
    setIsTourActive(true);
  };

  const TourComponent = () => {
    if (!isTourActive || steps.length === 0 || !steps[currentTourStep]) return null;
    
    const step = steps[currentTourStep];
    const isLastStep = currentTourStep === steps.length - 1;
    
    let primaryColor = '#34a853';
    let primaryBg = '#e6f4ea';
    let btnTextColor = 'white';
    
    if (platformTheme === 'groovelab') {
      primaryColor = '#eab308';
      primaryBg = '#fefce8';
      btnTextColor = '#1d1d1f';
    } else if (platformTheme === 'admin') {
      primaryColor = '#ea4335';
      primaryBg = '#fce8e6';
    }

    let arrowPlacementStyle: React.CSSProperties = {};
    if (step.selector && spotlightRect) {
      if (placement === 'right') {
        arrowPlacementStyle = {
          left: '-7px',
          top: '40px',
          borderRight: 'none',
          borderBottom: 'none',
        };
      } else if (placement === 'left') {
        arrowPlacementStyle = {
          right: '-7px',
          top: '40px',
          borderLeft: 'none',
          borderTop: 'none',
        };
      } else if (placement === 'bottom') {
        arrowPlacementStyle = {
          top: '-7px',
          left: 'calc(50% - 7px)',
          borderRight: 'none',
          borderTop: 'none',
        };
      } else {
        arrowPlacementStyle = {
          bottom: '-7px',
          left: 'calc(50% - 7px)',
          borderLeft: 'none',
          borderBottom: 'none',
        };
      }
    }

    return (
      <>
        <style>{`
          @keyframes onboardingCardAppear {
            from { transform: scale(0.94); opacity: 0; }
            to { transform: scale(1); opacity: 1; }
          }
          @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
          @keyframes pulseGlow {
            0% {
              box-shadow: 0 0 0 0px ${primaryColor}50, 0 0 15px ${primaryColor}30;
            }
            70% {
              box-shadow: 0 0 0 8px ${primaryColor}00, 0 0 22px ${primaryColor}30;
            }
            100% {
              box-shadow: 0 0 0 0px ${primaryColor}00, 0 0 15px ${primaryColor}20;
            }
          }
          .onboarding-action-btn {
            transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
          }
          .onboarding-action-btn:hover {
            transform: translateY(-1px);
            filter: brightness(0.96);
          }
          .onboarding-action-btn:active {
            transform: translateY(0);
          }
        `}</style>

        {/* Guided Tour Backdrop Overlay */}
        {spotlightRect ? (
          <svg 
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              width: '100vw',
              height: '100vh',
              zIndex: 999990,
              pointerEvents: 'none'
            }}
          >
            <defs>
              <mask id="onboarding-spotlight-mask">
                <rect x="0" y="0" width="100%" height="100%" fill="white" />
                <rect 
                  x={spotlightRect.left - 6} 
                  y={spotlightRect.top - 6} 
                  width={spotlightRect.width + 12} 
                  height={spotlightRect.height + 12} 
                  rx="16" 
                  ry="16" 
                  fill="black" 
                />
              </mask>
            </defs>
            <rect 
              x="0" 
              y="0" 
              width="100%" 
              height="100%" 
              fill="rgba(15, 23, 42, 0.55)" 
              mask="url(#onboarding-spotlight-mask)" 
              style={{ pointerEvents: 'auto', cursor: 'pointer' }}
              onClick={endTour}
            />
          </svg>
        ) : (
          <div 
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(15, 23, 42, 0.55)',
              backdropFilter: 'blur(4px)',
              WebkitBackdropFilter: 'blur(4px)',
              zIndex: 999990,
              animation: 'fadeIn 0.25s ease-out'
            }}
            onClick={endTour}
          />
        )}

        {/* Spotlight Glow Ring */}
        {spotlightRect && (
          <div 
            style={{
              position: 'fixed',
              left: `${spotlightRect.left - 8}px`,
              top: `${spotlightRect.top - 8}px`,
              width: `${spotlightRect.width + 16}px`,
              height: `${spotlightRect.height + 16}px`,
              borderRadius: '18px',
              border: `2.5px solid ${primaryColor}`,
              pointerEvents: 'none',
              zIndex: 999995,
              animation: 'pulseGlow 2s infinite',
              transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
            }}
          />
        )}

        {/* Guided Tour Tooltip Card Wrapper */}
        <div
          style={{
            ...tooltipStyle,
            pointerEvents: 'none'
          }}
        >
          <div
            style={{
              position: 'relative',
              width: '320px',
              backgroundColor: 'rgba(255, 255, 255, 0.94)',
              backdropFilter: 'blur(20px) saturate(190%)',
              WebkitBackdropFilter: 'blur(20px) saturate(190%)',
              borderRadius: '24px',
              border: '1px solid rgba(255, 255, 255, 0.7)',
              padding: '24px',
              boxShadow: '0 24px 64px -12px rgba(0, 0, 0, 0.22)',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              pointerEvents: 'auto',
              fontFamily: 'Outfit, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
              animation: 'onboardingCardAppear 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
              transformOrigin: placement === 'right' ? 'left center' : placement === 'left' ? 'right center' : placement === 'bottom' ? 'top center' : 'bottom center'
            }}
          >
            {/* Tooltip Anchor Arrow */}
            {step.selector && spotlightRect && (
              <div style={{
                position: 'absolute',
                width: '14px',
                height: '14px',
                backgroundColor: 'rgba(255, 255, 255, 0.94)',
                border: '1px solid rgba(255, 255, 255, 0.7)',
                ...arrowPlacementStyle,
                transform: 'rotate(45deg)',
                zIndex: -1
              }} />
            )}

            {/* Header / Step Indicator */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ 
                  fontSize: '0.65rem', 
                  fontWeight: 900, 
                  color: primaryColor, 
                  background: primaryBg, 
                  padding: '4px 10px', 
                  borderRadius: '10px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.07em',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  width: 'fit-content'
                }}>
                  <Sparkles size={10} />
                  Schritt {currentTourStep + 1} von {steps.length}
                </span>
                
                {/* Horizontal Progress Pill Dots */}
                <div style={{ display: 'flex', gap: '4px', marginTop: '6px' }}>
                  {steps.map((_, idx) => (
                    <div 
                      key={idx} 
                      style={{
                        width: idx === currentTourStep ? '16px' : '6px',
                        height: '6px',
                        borderRadius: '3px',
                        background: idx === currentTourStep ? primaryColor : '#cbd5e1',
                        transition: 'all 0.25s ease'
                      }} 
                    />
                  ))}
                </div>
              </div>

              <button 
                type="button" 
                onClick={endTour}
                style={{ 
                  background: 'rgba(0,0,0,0.04)', 
                  border: 'none', 
                  cursor: 'pointer', 
                  color: '#64748b', 
                  width: '26px',
                  height: '26px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.color = '#1e293b';
                  e.currentTarget.style.background = 'rgba(0,0,0,0.08)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.color = '#64748b';
                  e.currentTarget.style.background = 'rgba(0,0,0,0.04)';
                }}
              >
                <X size={14} />
              </button>
            </div>

            {/* Title & Body Description */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 900, color: '#1e293b', letterSpacing: '-0.02em' }}>
                {step.title}
              </h4>
              <p style={{ margin: 0, fontSize: '0.82rem', lineHeight: '1.5', color: '#64748b', fontWeight: 500 }}>
                {step.description}
              </p>
            </div>

            {/* Footer Navigation Panel */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px', borderTop: '1px solid rgba(0,0,0,0.06)', paddingTop: '16px' }}>
              <button
                type="button"
                onClick={endTour}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#94a3b8',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  padding: '6px 12px 6px 0',
                  transition: 'color 0.2s'
                }}
                onMouseEnter={e => e.currentTarget.style.color = '#475569'}
                onMouseLeave={e => e.currentTarget.style.color = '#94a3b8'}
              >
                Überspringen
              </button>

              <div style={{ display: 'flex', gap: '8px' }}>
                {currentTourStep > 0 && (
                  <button
                    type="button"
                    onClick={() => setCurrentTourStep(prev => prev - 1)}
                    style={{
                      background: 'rgba(0, 0, 0, 0.05)',
                      border: 'none',
                      color: '#475569',
                      fontWeight: 800,
                      padding: '8px 14px',
                      borderRadius: '12px',
                      fontSize: '0.78rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(0, 0, 0, 0.08)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'rgba(0, 0, 0, 0.05)'}
                  >
                    <ChevronLeft size={14} />
                    Zurück
                  </button>
                )}
                
                <button
                  type="button"
                  className="onboarding-action-btn"
                  onClick={() => {
                    if (isLastStep) {
                      endTour();
                    } else {
                      setCurrentTourStep(prev => prev + 1);
                    }
                  }}
                  style={{
                    background: primaryColor,
                    border: 'none',
                    color: btnTextColor,
                    fontWeight: 900,
                    padding: '8px 18px',
                    borderRadius: '12px',
                    fontSize: '0.78rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    boxShadow: platformTheme === 'groovelab' ? '0 4px 12px rgba(234, 179, 8, 0.2)' : platformTheme === 'admin' ? '0 4px 12px rgba(234, 67, 53, 0.2)' : '0 4px 12px rgba(52, 168, 83, 0.2)'
                  }}
                >
                  {isLastStep ? 'Fertig' : 'Weiter'}
                  {!isLastStep && <ChevronRight size={14} />}
                </button>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  };

  return { isTourActive, startTour, endTour, TourComponent };
}

export function TourStartButton({ onClick, platformTheme = 'campus' }: { onClick: () => void, platformTheme?: 'campus' | 'groovelab' | 'admin' }) {
  const color = platformTheme === 'campus' ? '#34a853' : platformTheme === 'admin' ? '#ea4335' : '#eab308';
  return (
    <button
      onClick={onClick}
      title="Tour starten"
      style={{
        background: 'transparent',
        border: 'none',
        cursor: 'pointer',
        padding: '6px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: color,
        opacity: 0.7,
        transition: 'all 0.2s ease',
        borderRadius: '50%'
      }}
      onMouseOver={e => {
        e.currentTarget.style.opacity = '1';
        e.currentTarget.style.background = `${color}15`;
      }}
      onMouseOut={e => {
        e.currentTarget.style.opacity = '0.7';
        e.currentTarget.style.background = 'transparent';
      }}
    >
      <Info size={18} />
    </button>
  );
}
