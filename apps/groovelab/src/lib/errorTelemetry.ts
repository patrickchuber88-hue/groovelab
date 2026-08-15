import { supabase } from './supabase';

export interface ClientErrorLog {
  id: string;
  timestamp: string;
  message: string;
  stack?: string;
  componentStack?: string;
  route: string;
  userAgent: string;
  browserName: string;
  osName: string;
  deviceType: 'Mobile' | 'Tablet' | 'Desktop';
  severity: 'CRITICAL' | 'WARNING' | 'INFO';
  schoolId?: string | number;
  schoolName?: string;
  userId?: string;
  userRole?: string;
  resolved: boolean;
  resolvedAt?: string;
}

const STORAGE_KEY = 'campus_groovelab_telemetry_errors_v1';
const MAX_LOCAL_ENTRIES = 100;
let isInitialized = false;

// Helper to detect device and browser in a privacy-friendly way
const getClientEnvironment = () => {
  if (typeof window === 'undefined') {
    return { browserName: 'Server', osName: 'Server', deviceType: 'Desktop' as const };
  }

  const ua = navigator.userAgent;
  let browserName = 'Unbekannt';
  if (ua.includes('Firefox')) browserName = 'Firefox';
  else if (ua.includes('Edg')) browserName = 'Edge';
  else if (ua.includes('Chrome')) browserName = 'Chrome';
  else if (ua.includes('Safari')) browserName = 'Safari';

  let osName = 'Unbekannt';
  if (ua.includes('iPhone') || ua.includes('iPad')) osName = 'iOS';
  else if (ua.includes('Android')) osName = 'Android';
  else if (ua.includes('Mac OS')) osName = 'macOS';
  else if (ua.includes('Windows')) osName = 'Windows';
  else if (ua.includes('Linux')) osName = 'Linux';

  let deviceType: 'Mobile' | 'Tablet' | 'Desktop' = 'Desktop';
  if (/iPad|Tablet/i.test(ua) || (navigator.maxTouchPoints > 1 && ua.includes('Macintosh'))) {
    deviceType = 'Tablet';
  } else if (/Mobi|Android/i.test(ua)) {
    deviceType = 'Mobile';
  }

  return { browserName, osName, deviceType };
};

// Local storage backup buffer
const getLocalLogs = (): ClientErrorLog[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const saveLocalLogs = (logs: ClientErrorLog[]) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(logs.slice(0, MAX_LOCAL_ENTRIES)));
  } catch {
    // Ignore storage quota limits
  }
};

// Cache to prevent flood of identical errors in short timeframe (debounce 5 seconds)
const recentErrorHashes = new Set<string>();

/**
 * Report a client-side runtime error or unhandled exception
 */
export const reportClientError = async (
  error: Error | string | any,
  options: {
    componentStack?: string;
    severity?: 'CRITICAL' | 'WARNING' | 'INFO';
    context?: string;
    schoolId?: string | number;
    schoolName?: string;
  } = {}
): Promise<ClientErrorLog | null> => {
  try {
    const message = typeof error === 'string' 
      ? error 
      : (error?.message || error?.toString() || 'Unbekannter Laufzeitfehler');
    
    const stack = error?.stack || '';
    const componentStack = options.componentStack || '';
    const severity = options.severity || 'CRITICAL';

    // Simple deduplication hash
    const errorHash = `${message}:${componentStack.slice(0, 80)}`;
    if (recentErrorHashes.has(errorHash)) {
      return null;
    }
    recentErrorHashes.add(errorHash);
    setTimeout(() => recentErrorHashes.delete(errorHash), 5000);

    const { browserName, osName, deviceType } = getClientEnvironment();
    const route = typeof window !== 'undefined' ? window.location.pathname : '/';
    
    const logEntry: ClientErrorLog = {
      id: `ERR-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`,
      timestamp: new Date().toISOString(),
      message: message.substring(0, 500),
      stack: stack ? stack.substring(0, 2000) : undefined,
      componentStack: componentStack ? componentStack.substring(0, 1000) : undefined,
      route,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent.substring(0, 250) : 'N/A',
      browserName,
      osName,
      deviceType,
      severity,
      schoolId: options.schoolId || sessionStorage.getItem('groovelab_school_id') || undefined,
      schoolName: options.schoolName || undefined,
      userId: sessionStorage.getItem('groovelab_user_id') || undefined,
      userRole: sessionStorage.getItem('groovelab_role') || undefined,
      resolved: false
    };

    // 1. Save to local buffer immediately
    const existing = getLocalLogs();
    saveLocalLogs([logEntry, ...existing]);

    // 2. Broadcast storage event for real-time update in open MasterAdmin tabs
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('campus_groovelab_telemetry_event', { detail: logEntry }));
    }

    // 3. Attempt silent write to Supabase if table exists (graceful non-blocking)
    try {
      await supabase.from('system_error_logs').insert([{
        id: logEntry.id,
        created_at: logEntry.timestamp,
        error_message: logEntry.message,
        error_stack: logEntry.stack,
        component_stack: logEntry.componentStack,
        route: logEntry.route,
        browser_name: logEntry.browserName,
        os_name: logEntry.osName,
        device_type: logEntry.deviceType,
        severity: logEntry.severity,
        school_id: logEntry.schoolId,
        user_role: logEntry.userRole,
        is_resolved: false
      }]);
    } catch {
      // Graceful fallback to local buffer
    }

    return logEntry;
  } catch (loggingErr) {
    console.warn('[Telemetry] Error logging failed silently:', loggingErr);
    return null;
  }
};

/**
 * Fetch all error logs (merging Supabase table and local buffer)
 */
export const fetchErrorLogs = async (): Promise<ClientErrorLog[]> => {
  const localLogs = getLocalLogs();

  try {
    const { data, error } = await supabase
      .from('system_error_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);

    if (!error && data && data.length > 0) {
      const dbLogs: ClientErrorLog[] = data.map(row => ({
        id: row.id,
        timestamp: row.created_at,
        message: row.error_message,
        stack: row.error_stack,
        componentStack: row.component_stack,
        route: row.route,
        userAgent: row.user_agent || 'Client',
        browserName: row.browser_name || 'Browser',
        osName: row.os_name || 'OS',
        deviceType: row.device_type || 'Desktop',
        severity: row.severity || 'CRITICAL',
        schoolId: row.school_id,
        userRole: row.user_role,
        resolved: Boolean(row.is_resolved),
        resolvedAt: row.resolved_at
      }));

      // Merge unique logs
      const combined = [...dbLogs];
      const seenIds = new Set(dbLogs.map(l => l.id));
      for (const loc of localLogs) {
        if (!seenIds.has(loc.id)) {
          combined.push(loc);
        }
      }
      return combined.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    }
  } catch {
    // If Supabase table query fails, return local logs
  }

  return localLogs;
};

/**
 * Mark an error log as resolved
 */
export const markErrorResolved = async (id: string): Promise<void> => {
  const local = getLocalLogs().map(log => 
    log.id === id ? { ...log, resolved: true, resolvedAt: new Date().toISOString() } : log
  );
  saveLocalLogs(local);

  try {
    await supabase
      .from('system_error_logs')
      .update({ is_resolved: true, resolved_at: new Date().toISOString() })
      .eq('id', id);
  } catch {
    // Fallback
  }
};

/**
 * Clear all error logs
 */
export const clearAllErrorLogs = async (): Promise<void> => {
  saveLocalLogs([]);
  try {
    await supabase.from('system_error_logs').delete().neq('id', 'keep_schema');
  } catch {
    // Fallback
  }
};

/**
 * Generate a simulated test error for UI verification
 */
export const simulateTestClientError = async (type: 'AUDIO' | 'NETWORK' | 'RENDER' = 'AUDIO'): Promise<ClientErrorLog | null> => {
  const samples = {
    AUDIO: {
      message: 'AudioContext decodeAudioData error: Invalid MP3 sample rate in Loopstation buffer.',
      stack: 'Error: decodeAudioData failed\n    at AudioLoopstationEngine.loadTrack (LoopstationEngine.ts:142)\n    at HTMLButtonElement.dispatch (App.tsx:842)',
      componentStack: '    in AudioLoopstationModal\n    in StudentDashboard\n    in ErrorBoundary',
      severity: 'WARNING' as const
    },
    NETWORK: {
      message: 'Supabase real-time sync timeout after 15000ms: WebSocket disconnected unexpectedly.',
      stack: 'Error: RealtimeSubscriptionTimeout\n    at RealtimeClient.connect (realtime.js:89)\n    at syncScheduleBoard (ScheduleBoard.tsx:312)',
      componentStack: '    in ScheduleBoard\n    in TeacherDashboard\n    in ErrorBoundary',
      severity: 'CRITICAL' as const
    },
    RENDER: {
      message: 'TypeError: Cannot read properties of undefined (reading "slice") in HomeworkBookWidget.',
      stack: 'TypeError: Cannot read properties of undefined\n    at HomeworkBookWidget.render (HomeworkBookWidget.tsx:98)\n    at renderWithHooks (react-dom.js:14938)',
      componentStack: '    in HomeworkBookWidget\n    in CampusModule\n    in ErrorBoundary',
      severity: 'CRITICAL' as const
    }
  };

  const sample = samples[type];
  return reportClientError(new Error(sample.message), {
    componentStack: sample.componentStack,
    severity: sample.severity,
    context: `Simulation: ${type}`
  });
};

/**
 * Initialize global window listeners for unhandled errors and promise rejections
 */
export const initGlobalErrorListeners = () => {
  if (isInitialized || typeof window === 'undefined') return;
  isInitialized = true;

  window.addEventListener('error', (event) => {
    // Ignore script loading errors from external browser extensions
    if (event.filename && (event.filename.includes('chrome-extension://') || event.filename.includes('moz-extension://'))) {
      return;
    }
    reportClientError(event.error || event.message, {
      severity: 'CRITICAL',
      context: 'window.onerror'
    });
  });

  window.addEventListener('unhandledrejection', (event) => {
    reportClientError(event.reason || 'Unhandled Promise Rejection', {
      severity: 'WARNING',
      context: 'unhandledrejection'
    });
  });
};
