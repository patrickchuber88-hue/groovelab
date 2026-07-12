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


