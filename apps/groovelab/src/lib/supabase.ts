import { createClient } from '@supabase/supabase-js';

export const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://supabase.178.105.10.2.sslip.io';
export const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzgwNDE3ODE1LCJleHAiOjQ5MzQwMTc4MTV9.zOsuxweIlQBi7doeBoUqg9aTR6-qzOr0sjsa0Oee5cc';

console.log('[Supabase] Initializing with URL:', supabaseUrl ? `${supabaseUrl.substring(0, 15)}...` : 'MISSING');

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('[Supabase] Environment variables missing. Using stable fallback credentials.');
}

// Custom fetch wrapper to handle transient network errors (like Safari's "Load failed" preflight issue)
const customFetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
  const maxAttempts = 3;
  let lastError: any = null;
  
  // Create a mutable copy of headers
  const headers = new Headers(init?.headers);
  
  // Dynamically inject security session headers
  const userId = sessionStorage.getItem('groovelab_user_id') || localStorage.getItem('groovelab_user_id');
  if (userId) {
    headers.set('x-user-id', userId);
  }
  
  const kioskToken = localStorage.getItem('groovelab_kiosk_token');
  if (kioskToken) {
    headers.set('x-kiosk-token', kioskToken);
  }

  const qrToken = sessionStorage.getItem('groovelab_qr_token');
  if (qrToken) {
    headers.set('x-qr-token', qrToken);
  }
  
  // Extract invite school id from URL params if present
  let inviteSchoolId = null;
  if (typeof window !== 'undefined') {
    const urlParams = new URLSearchParams(window.location.search);
    inviteSchoolId = urlParams.get('invite_school_id');
  }
  if (inviteSchoolId) {
    headers.set('x-invite-school-id', inviteSchoolId);
  }
  
  const newInit = {
    ...init,
    headers
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

