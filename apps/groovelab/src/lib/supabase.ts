import { createClient } from '@supabase/supabase-js';
import { dbCircuitBreaker } from '../utils/circuitBreaker';

export const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://supabase.campus-groovelab.de';
export const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

console.log('[Supabase] Initializing with URL:', supabaseUrl ? `${supabaseUrl.substring(0, 15)}...` : 'MISSING');

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('[Supabase] Environment variables missing. Initialization failed.');
}

// Custom fetch wrapper to handle transient network errors and bypass CORS preflight issues
const customFetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
  if (!init) init = {};
  
  // Only include credentials on same-origin requests (e.g. production BFF /api/db)
  // to prevent browser CORS errors with Access-Control-Allow-Origin: * on localhost.
  const isSameOrigin = typeof window !== 'undefined' && (
    (typeof input === 'string' && (input.startsWith('/') || input.startsWith(window.location.origin))) ||
    (input instanceof URL && input.origin === window.location.origin)
  );
  if (isSameOrigin) {
    init.credentials = 'include';
  }

  // Convert headers to a plain record object to avoid Headers class serialization issues in some browsers
  const rawHeaders: Record<string, string> = {};
  if (init?.headers) {
    if (init.headers instanceof Headers) {
      init.headers.forEach((value, key) => {
        rawHeaders[key.toLowerCase()] = value;
      });
    } else if (Array.isArray(init.headers)) {
      init.headers.forEach(([key, value]) => {
        rawHeaders[key.toLowerCase()] = value;
      });
    } else {
      Object.entries(init.headers).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          rawHeaders[key.toLowerCase()] = String(value);
        }
      });
    }
  }
  
  // Base client info
  let clientInfo = rawHeaders['x-client-info'] || 'supabase-js/2.39.3';
  
  // Dynamically inject security session tokens into x-client-info to avoid CORS preflight (OPTIONS) blocks
  const sessionToken = typeof window !== 'undefined' 
    ? (sessionStorage.getItem('gl_active_session_lease_id') || localStorage.getItem('gl_active_session_lease_id') || localStorage.getItem('gl_global_device_key'))
    : null;
  if (sessionToken) {
    clientInfo += `;session_token=${sessionToken}`;
  }

  const activeUserId = typeof window !== 'undefined' ? sessionStorage.getItem('groovelab_user_id') : null;
  if (activeUserId) {
    clientInfo += `;user_id=${activeUserId}`;
  }
  
  let qrToken = typeof window !== 'undefined' ? sessionStorage.getItem('groovelab_qr_token') : null;
  if (!qrToken && typeof window !== 'undefined' && (window.location.pathname.startsWith('/onboarding') || window.location.pathname.startsWith('/qr'))) {
    const onboardingMatch = window.location.pathname.match(/^\/onboarding\/([^/?#]+)/);
    const qrMatch = window.location.pathname.match(/^\/qr\/([^/?#]+)/);
    if (onboardingMatch) {
      qrToken = onboardingMatch[1];
    } else if (qrMatch) {
      qrToken = qrMatch[1];
    }
  }
  if (qrToken) {
    clientInfo += `;qr_token=${qrToken}`;
  }

  let kioskToken = typeof window !== 'undefined' ? localStorage.getItem('groovelab_kiosk_token') : null;
  if (!kioskToken && typeof window !== 'undefined' && window.location.pathname.startsWith('/device-onboarding')) {
    const deviceMatch = window.location.pathname.match(/^\/device-onboarding\/([^/?#]+)/);
    if (deviceMatch) {
      kioskToken = deviceMatch[1];
    }
  }
  if (kioskToken) {
    clientInfo += `;kiosk_token=${kioskToken}`;
  }
  
  // Extract invite school id and token from URL params if present
  let inviteSchoolId = null;
  let inviteToken = null;
  if (typeof window !== 'undefined' && window.location.search && (window.location.search.includes('invite') || window.location.search.includes('token'))) {
    const urlParams = new URLSearchParams(window.location.search);
    inviteSchoolId = urlParams.get('invite_school_id');
    inviteToken = urlParams.get('token');
  }
  if (inviteSchoolId) {
    clientInfo += `;invite_school_id=${inviteSchoolId}`;
  }
  if (inviteToken) {
    clientInfo += `;invite_token=${inviteToken}`;
  }

  // Set the modified client info header
  rawHeaders['x-client-info'] = clientInfo;
  
  // Clean up any individual custom headers that would trigger CORS preflight block
  delete rawHeaders['x-user-id'];
  delete rawHeaders['x-qr-token'];
  delete rawHeaders['x-kiosk-token'];
  delete rawHeaders['x-invite-school-id'];
  delete rawHeaders['x-invite-token'];
  
  const newInit = {
    ...init,
    headers: rawHeaders
  };
  
  // Fast failover if circuit breaker is currently OPEN to protect connection poolers
  if (dbCircuitBreaker.getState() === 'OPEN') {
    console.warn('[Supabase Fetch] Circuit is OPEN. Fast-failing transient request to activate local cache fallback.');
    throw new Error('DATABASE_CIRCUIT_OPEN: DB-Verbindungspool ist ausgelastet. Lokaler Offline-Modus aktiv.');
  }

  const maxAttempts = 3;
  let lastError: any = null;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    let timeoutId: any = null;
    try {
      let fetchInit = newInit;
      // Wrap request with a resilient failover timeout (25s for normal queries, 60s for large audio/asset uploads)
      // 25s guarantees the client does not abort prematurely before PostgreSQL finishes complex joins
      if (!newInit.signal && typeof AbortController !== 'undefined') {
        const inputUrlStr = typeof input === 'string' ? input : (input instanceof URL ? input.href : '');
        const isStorageUpload = inputUrlStr.includes('/storage/v1/object/');
        const queryTimeout = isStorageUpload ? 60000 : 25000;
        const controller = new AbortController();
        timeoutId = setTimeout(() => controller.abort(), queryTimeout);
        fetchInit = { ...newInit, signal: controller.signal };
      }

      const response = await fetch(input, fetchInit);
      if (timeoutId) clearTimeout(timeoutId);
      
      // Security Guardrail: Only retry pure infrastructure transients (502, 503, 504)
      // NEVER retry 401, 403, or 429 rate limits to prevent brute-force or lockout amplification
      if (response.status === 503 || response.status === 502 || response.status === 504) {
        if (attempt < maxAttempts) {
          try {
            const clone = response.clone();
            const text = await clone.text();
            if (text.includes('schema cache') || text.includes('PGRST002') || text.includes('503') || text.includes('502') || text.includes('504')) {
              const backoff = attempt * 400 + Math.random() * 150;
              console.warn(`[Supabase Fetch] PostgREST infrastructure transient (HTTP ${response.status}). Retrying attempt ${attempt + 1} in ${Math.round(backoff)}ms...`);
              await new Promise(r => setTimeout(r, backoff));
              continue;
            }
          } catch (e) {}
        }
        dbCircuitBreaker.recordFailure(new Error(`HTTP ${response.status} from Supabase`));
      } else if (response.status < 500) {
        dbCircuitBreaker.recordSuccess();
      }

      return response;
    } catch (err: any) {
      if (timeoutId) clearTimeout(timeoutId);
      lastError = err;
      const errMsg = err?.message || String(err);

      // Check for transient network/CORS/WebKit errors that are safe to retry
      const isNetworkError = 
        errMsg.includes('Load failed') || 
        errMsg.includes('Failed to fetch') || 
        errMsg.includes('NetworkError') || 
        errMsg.includes('Network request failed') ||
        (typeof navigator !== 'undefined' && !navigator.onLine);
        
      if (isNetworkError && attempt < maxAttempts) {
        const delay = Math.min(1800, 250 * Math.pow(2, attempt - 1) + Math.random() * 100);
        console.warn(`[Supabase Fetch] Attempt ${attempt} failed with transient "${errMsg}". Retrying in ${Math.round(delay)}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
      // Client-side AbortError (navigation, modal close, component unmount) must NEVER trip the circuit breaker
      const isAbortError = errMsg.includes('AbortError') || errMsg.includes('aborted') || err?.name === 'AbortError';
      if (!isAbortError) {
        dbCircuitBreaker.recordFailure(err);
      }
      throw err;
    }
  }
  const isFinalAbort = lastError?.message?.includes('AbortError') || lastError?.message?.includes('aborted') || lastError?.name === 'AbortError';
  if (lastError && !isFinalAbort) {
    dbCircuitBreaker.recordFailure(lastError);
  }
  throw lastError;
};

// ─── Automated Health & Presence Auto-Recovery Monitor ─────────────────────
if (typeof window !== 'undefined') {
  let recoveryDebounceTimer: any = null;
  const triggerHealthRecovery = () => {
    if (recoveryDebounceTimer) clearTimeout(recoveryDebounceTimer);
    recoveryDebounceTimer = setTimeout(async () => {
      try {
        if (dbCircuitBreaker.getState() !== 'CLOSED') {
          const res = await fetch(`${supabaseUrl}/rest/v1/`, {
            method: 'HEAD',
            headers: { apikey: supabaseAnonKey }
          });
          if (res.ok || res.status === 401 || res.status === 200) {
            dbCircuitBreaker.recordSuccess();
            console.info('[Supabase Heartbeat] Connection probe successful. Circuit Breaker reset to CLOSED.');
          }
        }
        if (supabase && (supabase as any).realtime && typeof (supabase as any).realtime.connect === 'function') {
          (supabase as any).realtime.connect();
        }
        if (typeof (window as any).__groovelabRecoverRealtime === 'function') {
          (window as any).__groovelabRecoverRealtime();
        }
      } catch (e) {
        // Passive probe failed, will auto-retry on next interaction
      }
    }, 350);
  };

  window.addEventListener('online', triggerHealthRecovery);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      triggerHealthRecovery();
    }
  });
}

// ─── Custom in-memory auth lock ─────────────────────────────────────────────
// Replaces navigator.locks to avoid "lock was stolen by another request" errors
// that occur when Vite HMR reloads the supabase module and creates a new client
// while the old one still holds a Web Lock.
// Storing the queue on `window` makes it survive HMR reloads just like nameHelper.
declare global {
  interface Window {
    __sbAuthLock: Map<string, Promise<any>>;
  }
}
if (typeof window !== 'undefined' && !window.__sbAuthLock) {
  window.__sbAuthLock = new Map();
}

const customAuthLock = async (name: string, _acquireTimeout: number, fn: () => Promise<any>): Promise<any> => {
  if (typeof window === 'undefined') return fn();
  const lockMap = window.__sbAuthLock;
  const prev = lockMap.get(name) ?? Promise.resolve();
  // Serialize calls: wait for the previous one, then run fn()
  const next = prev.then(() => fn());
  // Keep the map entry until this call finishes (succces or error)
  lockMap.set(name, next.catch(() => {}));
  next.finally(() => {
    if (lockMap.get(name) === next) lockMap.delete(name);
  });
  return next;
};

export const supabase = createClient(
  supabaseUrl, 
  supabaseAnonKey, 
  {
    global: {
      fetch: customFetch
    },
    auth: {
      // 🔒 BANKING GOLDSTANDARD: 
      // Der Browser weiß nichts mehr von JWTs. Das Token liegt unsichtbar als HttpOnly-Cookie im Hintergrund.
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    realtime: {
      timeout: 20000,
      heartbeatIntervalMs: 15000
    }
  }
);

/**
 * Helper to physically and fully delete all storage assets associated with users (e.g. custom avatars and homework audio files)
 * from Supabase Storage buckets to ensure absolute GDPR/COPPA compliance when deleting a user/student.
 */
export const deleteUserStorageAssets = async (userIds: string[]) => {
  if (!userIds || userIds.length === 0) return;
  console.log('[GDPR/COPPA Cleanup] Starting physical storage cleanup for user IDs:', userIds);

  try {
    // 1. Fetch user photo_urls to delete custom avatars
    const { data: users, error: userErr } = await supabase
      .from('users')
      .select('id, photo_url')
      .in('id', userIds);

    if (!userErr && users) {
      const groovelabFiles: string[] = [];
      const campusFiles: string[] = [];

      users.forEach(user => {
        const url = user.photo_url;
        if (url && url.startsWith('http')) {
          // Check groovelab-assets
          const glMarker = '/storage/v1/object/public/groovelab-assets/';
          const glIdx = url.indexOf(glMarker);
          if (glIdx !== -1) {
            groovelabFiles.push(url.substring(glIdx + glMarker.length));
          }

          // Check campus-assets
          const cpMarker = '/storage/v1/object/public/campus-assets/';
          const cpIdx = url.indexOf(cpMarker);
          if (cpIdx !== -1) {
            campusFiles.push(url.substring(cpIdx + cpMarker.length));
          }
        }
      });

      if (groovelabFiles.length > 0) {
        console.log('[GDPR/COPPA Cleanup] Deleting custom avatars from groovelab-assets:', groovelabFiles);
        const { error: delErr } = await supabase.storage.from('groovelab-assets').remove(groovelabFiles);
        if (delErr) console.error('[GDPR/COPPA Cleanup] Error deleting groovelab custom avatars:', delErr);
      }
      if (campusFiles.length > 0) {
        console.log('[GDPR/COPPA Cleanup] Deleting custom avatars from campus-assets:', campusFiles);
        const { error: delErr } = await supabase.storage.from('campus-assets').remove(campusFiles);
        if (delErr) console.error('[GDPR/COPPA Cleanup] Error deleting campus custom avatars:', delErr);
      }
    }

    // 2. Fetch homework_notes containing audio from progress_matrix
    const { data: progressItems, error: pmErr } = await supabase
      .from('progress_matrix')
      .select('homework_notes')
      .in('student_id', userIds);

    if (!pmErr && progressItems) {
      const audioFilesToDelete: string[] = [];
      progressItems.forEach(item => {
        if (item.homework_notes) {
          try {
            const notes = typeof item.homework_notes === 'string' ? JSON.parse(item.homework_notes) : item.homework_notes;
            if (Array.isArray(notes)) {
              notes.forEach((note: string) => {
                if (note && note.startsWith('AUDIO:')) {
                  const parts = note.substring(6).split('|');
                  const audioUrl = parts[0];
                  if (audioUrl && audioUrl.startsWith('http')) {
                    const marker = '/storage/v1/object/public/campus-assets/';
                    const markerIdx = audioUrl.indexOf(marker);
                    if (markerIdx !== -1) {
                      audioFilesToDelete.push(audioUrl.substring(markerIdx + marker.length));
                    }
                  }
                }
              });
            }
          } catch (e) {
            console.error('[GDPR/COPPA Cleanup] Error parsing homework_notes for audio deletion:', e);
          }
        }
      });

      if (audioFilesToDelete.length > 0) {
        console.log('[GDPR/COPPA Cleanup] Physically deleting audio recordings from campus-assets:', audioFilesToDelete);
        const { error: delErr } = await supabase.storage.from('campus-assets').remove(audioFilesToDelete);
        if (delErr) console.error('[GDPR/COPPA Cleanup] Error deleting audio recordings:', delErr);
      }
    }
  } catch (err) {
    console.error('[GDPR/COPPA Cleanup] Unexpected error during asset deletion:', err);
  }
};

export { queryCache, cachedQuery, invalidateCacheKey, invalidateCachePrefix, clearQueryCache } from './queryCache';



