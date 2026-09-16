import { safeReplaceState } from './historyUtils';

/**
 * 🔒 Kiosk Token & URL Parameter Bootstrap
 * Extracts and scrubs kiosk credentials, station tokens, and platform overrides
 * from URL query parameters on initial page load, enforcing Zero-Trust per-tab isolation.
 */
export function initKioskUrlBootstrap(): void {
  if (typeof window === 'undefined') return;

  // Purge legacy shared credentials from localStorage to enforce per-tab isolation
  try {
    localStorage.removeItem('groovelab_user_id');
    localStorage.removeItem('groovelab_cached_user');
    localStorage.removeItem('groovelab_location_mode');
  } catch (e) {}

  // Auto-setup kiosk mode from URL parameters
  const params = new URLSearchParams(window.location.search);
  const isStandalone = Boolean(
    window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone
  );

  // Handle platform override from URL (e.g. from LandingPage search)
  const targetPlatform = params.get('platform');
  if (targetPlatform && (targetPlatform === 'campus' || targetPlatform === 'groovelab' || targetPlatform === 'ensembles')) {
    sessionStorage.setItem('groovelab_active_platform', targetPlatform);
    if (isStandalone) {
      params.delete('platform');
      const newSearch = params.toString();
      const newUrl = window.location.pathname + (newSearch ? `?${newSearch}` : '');
      if (window.history) {
        safeReplaceState({}, '', newUrl);
      }
    }
  }

  const kioskTokenParam = params.get('kiosk_token');
  if (kioskTokenParam) {
    localStorage.setItem('groovelab_kiosk_token', kioskTokenParam);
    
    // Persist station_id if provided in the redirect URL
    const urlStationId = params.get('station_id') || params.get('kiosk_station_id');
    if (urlStationId) {
      localStorage.setItem('groovelab_station_id', urlStationId);
    } else {
      localStorage.removeItem('groovelab_station_id');
    }

    // Persist kiosk_room_id if provided
    const urlRoomId = params.get('kiosk_room_id');
    if (urlRoomId) {
      localStorage.setItem('groovelab_kiosk_room_id', urlRoomId);
    } else {
      localStorage.removeItem('groovelab_kiosk_room_id');
    }

    sessionStorage.removeItem('groovelab_user_id');
    sessionStorage.removeItem('groovelab_location_mode');
    
    // Strip sensitive tokens from URL history universally across all browsers
    params.delete('kiosk_token');
    params.delete('station_id');
    params.delete('kiosk_station_id');
    params.delete('kiosk_room_id');
    const newSearch = params.toString();
    const newUrl = window.location.pathname + (newSearch ? `?${newSearch}` : '');
    safeReplaceState({}, '', newUrl);
  }

  const kioskStationId = params.get('kiosk_station_id') || params.get('station_id');
  if (kioskStationId) {
    localStorage.setItem('groovelab_station_id', kioskStationId);
    sessionStorage.removeItem('groovelab_user_id');
    sessionStorage.removeItem('groovelab_location_mode');
    
    // Strip parameters and redirect to clean up URL ONLY in standalone mode
    if (isStandalone) {
      params.delete('kiosk_station_id');
      params.delete('station_id');
      const newSearch = params.toString();
      const newUrl = window.location.pathname + (newSearch ? `?${newSearch}` : '');
      window.location.replace(newUrl);
    }
  }

  // Persist kiosk_room_id to localStorage so we can restore it on "Beenden"
  const kioskRoomIdFromUrl = params.get('kiosk_room_id');
  if (kioskRoomIdFromUrl) {
    localStorage.setItem('groovelab_kiosk_room_id', kioskRoomIdFromUrl);
  }
}
