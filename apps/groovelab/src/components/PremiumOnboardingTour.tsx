import React, { useState, useEffect, useRef, useMemo } from 'react';
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

  const lastPositionRef = useRef<{
    rect: { left: number; top: number; width: number; height: number } | null;
    top: number;
    left: number;
    placement: string;
  } | null>(null);

  // Reset tour state if key changes to avoid state leaks between different pages/tabs
  useEffect(() => {
    setIsTourActive(false);
    setCurrentTourStep(0);
  }, [tourKey]);

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
    // Reset tracker when step or active status changes to guarantee immediate position updates
    lastPositionRef.current = null;

    if (!isTourActive) {
      setSpotlightRect(null);
      return;
    }
    const step = steps[currentTourStep];
    if (!step) return;

    if (step.selector) {
      const el = document.getElementById(step.selector);
      if (el) {
        try {
          el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
          setTimeout(() => updatePosition(), 350);
        } catch (_) {}
      }
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
      return;
    }

    const updatePosition = () => {
      const el = document.getElementById(step.selector!) || document.getElementById('tour-teacher-briefing') || document.querySelector('.cg-full-height-board');
      if (el) {
        const rect = el.getBoundingClientRect();

        const simEl = document.querySelector('.sim-viewport-mobile, .sim-viewport-portrait, .sim-viewport-ipad-portrait, .sim-viewport-ipad-landscape, [class*="sim-viewport"]');
        let frameLeft = 0;
        let frameRight = window.innerWidth;
        let frameTop = 0;
        let frameBottom = window.innerHeight;

        if (simEl) {
          const simRect = simEl.getBoundingClientRect();
          frameLeft = simRect.left;
          frameRight = simRect.right;
          frameTop = simRect.top;
          frameBottom = simRect.bottom;
        }

        const frameWidth = frameRight - frameLeft;
        const frameHeight = frameBottom - frameTop;
        const isMobileView = frameWidth <= 768 || Boolean(simEl);
        
        let pos: 'right' | 'left' | 'top' | 'bottom' = 'right';
        let top = 0;
        let left = 0;

        const cardWidth = Math.min(frameWidth - 24, 340);
        const cardHeight = Math.min(frameHeight - 32, 220);

        // Mobile & Tablet Portrait Smart Positioning (including Device Simulator)
        if (isMobileView) {
          left = frameLeft + Math.max(12, (frameWidth - cardWidth) / 2);
          const elementCenterY = rect.top + rect.height / 2;
          if (elementCenterY > frameTop + frameHeight / 2) {
            // Target is in bottom half -> place tooltip at top
            pos = 'top';
            top = Math.max(frameTop + 16, rect.top - cardHeight - 16);
          } else {
            // Target is in top half -> place tooltip at bottom
            pos = 'bottom';
            top = Math.min(frameBottom - cardHeight - 16, rect.bottom + 16);
          }
        } else {
          // Desktop Positioning
          if (rect.right + 360 < frameRight) {
            pos = 'right';
          } else if (rect.left - 360 > frameLeft) {
            pos = 'left';
          } else if (rect.bottom + 260 < frameBottom) {
            pos = 'bottom';
          } else {
            pos = 'top';
          }

          if (pos === 'right') {
            left = rect.right + 18;
            top = rect.top + rect.height / 2 - 100;
          } else if (pos === 'left') {
            left = rect.left - cardWidth - 18;
            top = rect.top + rect.height / 2 - 100;
          } else if (pos === 'bottom') {
            left = rect.left + rect.width / 2 - cardWidth / 2;
            top = rect.bottom + 18;
          } else {
            left = rect.left + rect.width / 2 - cardWidth / 2;
            top = rect.top - cardHeight - 18;
          }
        }

        // Adjust bounds to stay inside frame safely
        if (left < frameLeft + 12) left = frameLeft + 12;
        if (left + cardWidth > frameRight - 12) left = frameRight - cardWidth - 12;
        if (top < frameTop + 12) top = frameTop + 12;
        if (top + cardHeight > frameBottom - 12) top = frameBottom - cardHeight - 12;

        // Check if anything has changed
        const last = lastPositionRef.current;
        const hasRectChanged = !last || !last.rect ||
          last.rect.left !== rect.left ||
          last.rect.top !== rect.top ||
          last.rect.width !== rect.width ||
          last.rect.height !== rect.height;
        
        const hasTooltipChanged = !last ||
          last.top !== top ||
          last.left !== left ||
          last.placement !== pos;

        if (hasRectChanged || hasTooltipChanged) {
          lastPositionRef.current = {
            rect: { left: rect.left, top: rect.top, width: rect.width, height: rect.height },
            top,
            left,
            placement: pos
          };

          setSpotlightRect(rect);
          setPlacement(pos);
          setTooltipStyle({
            position: 'fixed',
            top: `${top}px`,
            left: `${left}px`,
            zIndex: 999999,
            transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
          });
        }
      } else {
        const last = lastPositionRef.current;
        if (last !== null) {
          lastPositionRef.current = null;
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

  // We keep a ref of all dynamic values/state required by TourComponent
  const stateRef = useRef({
    isTourActive,
    currentTourStep,
    placement,
    spotlightRect,
    tooltipStyle,
    steps,
    platformTheme,
    endTour,
    setCurrentTourStep,
  });

  // Keep it updated on every render
  stateRef.current = {
    isTourActive,
    currentTourStep,
    placement,
    spotlightRect,
    tooltipStyle,
    steps,
    platformTheme,
    endTour,
    setCurrentTourStep,
  };

  // Define TourComponent as a stable component reference
  const TourComponent = useMemo(() => {
    return function StableTourComponent() {
      const {
        isTourActive: active,
        currentTourStep: stepIdx,
        placement: place,
        spotlightRect: rect,
        tooltipStyle: style,
        steps: tourSteps,
        platformTheme: theme,
        endTour: handleEnd,
        setCurrentTourStep: setStep,
      } = stateRef.current;

      if (!active || tourSteps.length === 0 || !tourSteps[stepIdx]) return null;

      const step = tourSteps[stepIdx];
      const isLastStep = stepIdx === tourSteps.length - 1;

      let primaryColor = '#34a853';
      let primaryBg = '#e6f4ea';
      let btnTextColor = 'white';

      if (theme === 'groovelab') {
        primaryColor = '#eab308';
        primaryBg = '#fefce8';
        btnTextColor = '#1d1d1f';
      } else if (theme === 'admin') {
        primaryColor = '#ea4335';
        primaryBg = '#fce8e6';
      }

      let arrowPlacementStyle: React.CSSProperties = {};
      if (step.selector && rect) {
        if (place === 'right') {
          arrowPlacementStyle = {
            left: '-7px',
            top: '40px',
            borderRight: 'none',
            borderBottom: 'none',
          };
        } else if (place === 'left') {
          arrowPlacementStyle = {
            right: '-7px',
            top: '40px',
            borderLeft: 'none',
            borderTop: 'none',
          };
        } else if (place === 'bottom') {
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
          {rect ? (
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
                    x={rect.left - 6} 
                    y={rect.top - 6} 
                    width={rect.width + 12} 
                    height={rect.height + 12} 
                    rx="16" 
                    ry="16" 
                    fill="black" 
                    style={{
                      transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
                    }}
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
                onClick={handleEnd}
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
              onClick={handleEnd}
            />
          )}

          {/* Spotlight Glow Ring */}
          {rect && (
            <div 
              style={{
                position: 'fixed',
                left: `${rect.left - 8}px`,
                top: `${rect.top - 8}px`,
                width: `${rect.width + 16}px`,
                height: `${rect.height + 16}px`,
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
              ...style,
              pointerEvents: 'none'
            }}
          >
            <div
              style={{
                position: 'relative',
                width: 'calc(100vw - 32px)',
                maxWidth: '340px',
                maxHeight: 'calc(100vh - 48px)',
                overflowY: 'auto',
                backgroundColor: 'rgba(255, 255, 255, 0.96)',
                backdropFilter: 'blur(24px) saturate(190%)',
                WebkitBackdropFilter: 'blur(24px) saturate(190%)',
                borderRadius: '24px',
                border: '1px solid rgba(255, 255, 255, 0.8)',
                padding: '24px',
                boxShadow: '0 24px 64px -12px rgba(0, 0, 0, 0.25)',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px',
                pointerEvents: 'auto',
                fontFamily: 'Outfit, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                animation: 'onboardingCardAppear 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                transformOrigin: place === 'right' ? 'left center' : place === 'left' ? 'right center' : place === 'bottom' ? 'top center' : 'bottom center'
              }}
            >
              {/* Tooltip Anchor Arrow */}
              {step.selector && rect && (
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
                    Schritt {stepIdx + 1} von {tourSteps.length}
                  </span>
                  
                  {/* Horizontal Progress Pill Dots */}
                  <div style={{ display: 'flex', gap: '4px', marginTop: '6px' }}>
                    {tourSteps.map((_, idx) => (
                      <div 
                        key={idx} 
                        style={{
                          width: idx === stepIdx ? '16px' : '6px',
                          height: '6px',
                          borderRadius: '3px',
                          background: idx === stepIdx ? primaryColor : '#cbd5e1',
                          transition: 'all 0.25s ease'
                        }} 
                      />
                    ))}
                  </div>
                </div>

                <button 
                  type="button" 
                  onClick={handleEnd}
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
                  onClick={handleEnd}
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
                  {stepIdx > 0 && (
                    <button
                      type="button"
                      onClick={() => setStep(prev => prev - 1)}
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
                        handleEnd();
                      } else {
                        setStep(prev => prev + 1);
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
                      boxShadow: theme === 'groovelab' ? '0 4px 12px rgba(234, 179, 8, 0.2)' : theme === 'admin' ? '0 4px 12px rgba(234, 67, 53, 0.2)' : '0 4px 12px rgba(52, 168, 83, 0.2)'
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
  }, []);

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
