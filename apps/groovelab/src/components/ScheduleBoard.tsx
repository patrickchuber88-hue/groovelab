import React, { useState, useEffect, useMemo } from 'react';
import { LiquidGlassSkeleton } from './ui/LiquidGlassSkeleton';
import type { Student, DayBoard } from '../domain/schedule/scheduleBoardTypes';

export type { Student, DayBoard };

interface ScheduleBoardProps {
  schoolId: string;
  userId: string;
}

// 🏛️ Tier-1 Enterprise Dynamic Code-Splitting:
// Desktop und Mobile Chunks werden strikt bedarfsgesteuert on-demand geladen.
const ScheduleBoardDesktop = React.lazy(() => 
  import('./ScheduleBoardDesktop').then(m => ({ default: m.ScheduleBoardDesktop }))
);

const ScheduleBoardMobile = React.lazy(() => 
  import('./ScheduleBoardMobile').then(m => ({ default: m.ScheduleBoardMobile }))
);

export function ScheduleBoard({ schoolId, userId }: ScheduleBoardProps) {
  const [windowWidth, setWindowWidth] = useState(() => typeof window !== 'undefined' ? window.innerWidth : 1200);
  const [orientationTick, setOrientationTick] = useState(0);

  useEffect(() => {
    const handleOrientationChange = () => {
      setWindowWidth(window.innerWidth);
      setOrientationTick(t => t + 1);
    };
    window.addEventListener('resize', handleOrientationChange);
    window.addEventListener('orientationchange', handleOrientationChange);
    window.addEventListener('groovelab_orientation_changed', handleOrientationChange);
    return () => {
      window.removeEventListener('resize', handleOrientationChange);
      window.removeEventListener('orientationchange', handleOrientationChange);
      window.removeEventListener('groovelab_orientation_changed', handleOrientationChange);
    };
  }, []);

  const isMobilePortrait = useMemo(() => {
    const isInsideSim = typeof document !== 'undefined' && (
      document.querySelector('.sim-viewport-mobile, .sim-viewport-portrait') !== null ||
      document.querySelector('.sim-viewport-tablet') !== null
    );

    const isSimLandscape = typeof document !== 'undefined' && document.querySelector('.sim-viewport-landscape') !== null;

    const isLandscapeMode = isSimLandscape || (
      !isInsideSim && typeof window !== 'undefined' && window.innerWidth > window.innerHeight && window.innerWidth > 768
    );

    return !isLandscapeMode && (
      (typeof document !== 'undefined' && document.querySelector('.sim-viewport-mobile, .sim-viewport-portrait') !== null && !isSimLandscape) ||
      (!isInsideSim && typeof window !== 'undefined' && window.innerWidth <= 834)
    );
  }, [windowWidth, orientationTick]);

  const activePlatform = typeof localStorage !== 'undefined' ? localStorage.getItem('groovelab_active_platform') : 'groovelab';
  const colorTheme = activePlatform === 'campus' ? 'campus' : 'groovelab';

  return (
    <React.Suspense fallback={<LiquidGlassSkeleton type="dashboard" colorTheme={colorTheme as any} />}>
      {isMobilePortrait ? (
        <ScheduleBoardMobile schoolId={schoolId} userId={userId} />
      ) : (
        <ScheduleBoardDesktop schoolId={schoolId} userId={userId} />
      )}
    </React.Suspense>
  );
}
