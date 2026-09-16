import React, { useState, useMemo, useEffect } from 'react';
import { useMasterPricing } from '../context/MasterPricingContext';
import { scrubSensitiveUrlParams, scrubSensitiveUrlPath } from '../utils/urlSecurityScrubber';
import { initAuthBroadcastListener } from '../utils/authBroadcastSync';

export interface UseCampusMaintenanceAndBroadcastParams {
  locationPathname: string;
  searchParams?: any;
}

export interface UseCampusMaintenanceAndBroadcastReturn {
  masterPricing: any;
  maintenanceBypass: boolean;
  setMaintenanceBypass: React.Dispatch<React.SetStateAction<boolean>>;
  maintenanceState: any;
  broadcastAnnouncement: any;
  showStandardLogin: boolean;
  setShowStandardLogin: React.Dispatch<React.SetStateAction<boolean>>;
  isSignup: boolean;
  currentView: 'login' | 'landing' | 'dashboard';
}

/**
 * 🏛️ Hook: useCampusMaintenanceAndBroadcast
 * Bounded Context für Wartungssperre, Plattform-Broadcasts, View-Resolution & URL-Scrubbing.
 */
export function useCampusMaintenanceAndBroadcast({
  locationPathname,
  searchParams
}: UseCampusMaintenanceAndBroadcastParams): UseCampusMaintenanceAndBroadcastReturn {
  const masterPricing = useMasterPricing();

  const [maintenanceBypass, setMaintenanceBypass] = useState<boolean>(() => {
    return typeof window !== 'undefined' && (
      sessionStorage.getItem('cg_maintenance_bypass') === 'true' || 
      localStorage.getItem('cg_maintenance_bypass') === 'true'
    );
  });

  const maintenanceState = useMemo(() => {
    if (masterPricing?.specialOffers) {
      const entry = masterPricing.specialOffers.find((o: any) => o?.id === '__cg_master_maintenance_state__');
      if (entry?.state) return entry.state;
    }
    if (typeof window !== 'undefined') {
      const local = localStorage.getItem('cg_master_maintenance_state');
      if (local) {
        try { return JSON.parse(local); } catch (e) {}
      }
    }
    return null;
  }, [masterPricing?.specialOffers]);

  const broadcastAnnouncement = useMemo(() => {
    if (masterPricing?.specialOffers) {
      const entry = masterPricing.specialOffers.find((o: any) => o?.id === '__cg_master_broadcast_announcement__');
      if (entry?.state) return entry.state;
    }
    if (typeof window !== 'undefined') {
      const local = localStorage.getItem('cg_master_broadcast_announcement');
      if (local) {
        try { return JSON.parse(local); } catch (e) {}
      }
    }
    return null;
  }, [masterPricing?.specialOffers]);

  const [showStandardLogin, setShowStandardLogin] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    try {
      const stored = localStorage.getItem('groovelab_local_profiles');
      const list = stored ? JSON.parse(stored) : [];
      return !Array.isArray(list) || list.length === 0;
    } catch {
      return true;
    }
  });

  const isSignup = locationPathname === '/signup';
  const currentView: 'login' | 'landing' | 'dashboard' = (
    locationPathname === '/login' || 
    locationPathname === '/signup' || 
    locationPathname === '/master-admin' || 
    locationPathname === '/admin'
  )
    ? 'login'
    : (locationPathname === '/' ? 'landing' : 'dashboard');

  useEffect(() => {
    // Proactive URL token scrubbing to protect user history and referrers
    const timer = setTimeout(() => {
      scrubSensitiveUrlParams();
      // If user is already loaded/logged in on /qr/ or /onboarding/, scrub the path to protect history
      if (sessionStorage.getItem('groovelab_user_id') || sessionStorage.getItem('gl_active_session_lease_id')) {
        scrubSensitiveUrlPath('/');
      }
    }, 1500);
    return () => clearTimeout(timer);
  }, [locationPathname, searchParams]);

  // Multi-tab logout synchronization (Zero-Trust Session Invalidation)
  useEffect(() => {
    const cleanup = initAuthBroadcastListener();
    return cleanup;
  }, []);

  return {
    masterPricing,
    maintenanceBypass,
    setMaintenanceBypass,
    maintenanceState,
    broadcastAnnouncement,
    showStandardLogin,
    setShowStandardLogin,
    isSignup,
    currentView
  };
}
