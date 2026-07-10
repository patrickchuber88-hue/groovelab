import { createClient } from '@supabase/supabase-js';

export const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://supabase.campus-groovelab.de';
export const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzgwNDE3ODE1LCJleHAiOjQ5MzQwMTc4MTV9.zOsuxweIlQBi7doeBoUqg9aTR6-qzOr0sjsa0Oee5cc';

console.log('[Supabase] Initializing with URL:', supabaseUrl ? `${supabaseUrl.substring(0, 15)}...` : 'MISSING');

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('[Supabase] Environment variables missing. Initialization failed.');
}

// Custom fetch wrapper to handle transient network errors and bypass CORS preflight issues
const customFetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
  const maxAttempts = 3;
  let lastError: any = null;
  
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
  const userId = sessionStorage.getItem('groovelab_user_id') || localStorage.getItem('groovelab_user_id');
  if (userId) {
    clientInfo += `;user_id=${userId}`;
  }
  
  const qrToken = sessionStorage.getItem('groovelab_qr_token');
  if (qrToken) {
    clientInfo += `;qr_token=${qrToken}`;
  }

  const kioskToken = localStorage.getItem('groovelab_kiosk_token');
  if (kioskToken && !qrToken) {
    clientInfo += `;kiosk_token=${kioskToken}`;
  }
  
  // Extract invite school id and token from URL params if present
  let inviteSchoolId = null;
  let inviteToken = null;
  if (typeof window !== 'undefined') {
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
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fetch(input, newInit);
    } catch (err: any) {
      lastError = err;
      const errMsg = err?.message || String(err);
      
      // Check for transient network/CORS errors that are safe to retry
      const isNetworkError = 
        errMsg.includes('Load failed') || 
        errMsg.includes('Failed to fetch') || 
        errMsg.includes('NetworkError') || 
        errMsg.includes('Network request failed');
        
      if (isNetworkError && attempt < maxAttempts) {
        const delay = attempt * 150; // Exponential backoff: 150ms, 300ms
        console.warn(`[Supabase Fetch] Attempt ${attempt} failed with "${errMsg}". Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      throw err;
    }
  }
  throw lastError;
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  global: {
    fetch: customFetch
  }
});

