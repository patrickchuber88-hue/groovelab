import { createClient } from '@supabase/supabase-js';

export const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://msyxlqljswpertszbotf.supabase.co';
export const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_GF8tj3-jMPuOUGMC5tDamA_NUrNyGh4';

console.log('[Supabase] Initializing with URL:', supabaseUrl ? `${supabaseUrl.substring(0, 15)}...` : 'MISSING');

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('[Supabase] Environment variables missing. Using stable fallback credentials.');
}

// Custom fetch wrapper to handle transient network errors (like Safari's "Load failed" preflight issue)
const customFetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
  const maxAttempts = 3;
  let lastError: any = null;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fetch(input, init);
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

