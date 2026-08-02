import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Music, Tablet, ShieldCheck, FileText, X, Check, School, AlertCircle, ArrowRight, Download, User, Upload, Key, KeyRound, RotateCw, HelpCircle, Lock, Calendar, Clock, ArrowLeft, Mail, Users, Plus, Fingerprint, Timer, Trophy, Smartphone, Camera, CameraOff, Unlink, SwitchCamera, Star, Ban } from 'lucide-react';
import { getDistanceFromLatLonInM } from '../utils/geo';
import { isWebAuthnSupported, registerBiometrics } from '../utils/webauthn';
import { StudentMobileScheduleWizard } from './StudentMobileScheduleWizard';

const isIOS = typeof window !== 'undefined' && (/iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1));
const isStandalone = typeof window !== 'undefined' && (window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone);

const getInstrumentAvatarUrl = (instr: string) => {
  const low = (instr || '').toLowerCase();
  if (low.includes('gitarre') || low.includes('guitar')) return '/gitarre_avatar_new.png';
  if (low.includes('bass') || low.includes('kontrabass') || low.includes('contrabass')) return '/bass_avatar.png';
  if (low.includes('schlagzeug') || low.includes('drums')) return '/schlagzeug_avatar.png';
  if (low.includes('klavier') || low.includes('piano')) return '/klavier_avatar_new.png';
  if (low.includes('gesang') || low.includes('vocals') || low.includes('vocal')) return '/gesang_avatar.png';
  if (low.includes('trompete') || low.includes('trumpet')) return '/trompete_avatar_new.png';
  if (low.includes('posaune') || low.includes('trombone')) return '/posaune_avatar.png';
  return '/avatar_ghost.jpg';
};

let jsQRInstance: any = null;
async function loadJSQR() {
  if (!jsQRInstance) {
    const mod = await import('jsqr');
    jsQRInstance = mod.default || mod;
  }
  return jsQRInstance;
}

interface LoginScreenProps {
  onLogin: (userId: string, isHome?: boolean, stationId?: string | null) => void;
  kioskStationId?: string | null;
}

interface CustomQRScannerProps {
  onScan: (value: string) => void;
  onError: (error: any) => void;
  paused?: boolean;
  facingMode: 'user' | 'environment';
}

export function CustomQRScanner({ onScan, onError, paused, facingMode }: CustomQRScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const requestRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const lastFacingModeRef = useRef<'user' | 'environment' | null>(null);
  const [needsManualActivation, setNeedsManualActivation] = useState(isIOS && isStandalone);

  // Keep stable refs to avoid recreating the animation loop or triggers when handlers change
  const onScanRef = useRef(onScan);
  useEffect(() => {
    onScanRef.current = onScan;
  }, [onScan]);

  const onErrorRef = useRef(onError);
  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  // 1. Separate Effect to handle unmount cleanup only
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
        requestRef.current = null;
      }
    };
  }, []);

  // 2. Primary Effect to manage camera lifecycle
  useEffect(() => {
    let active = true;
    loadJSQR(); // Start loading/getting jsQR in background when scanner mounts

    async function startCamera() {
      // Delay camera request by 150ms to prevent race conditions during component mounting/state updates
      await new Promise(resolve => setTimeout(resolve, 150));
      if (!active) return;

      // If we already have an active stream with the correct facing mode, keep it!
      if (streamRef.current) {
        const videoTrack = streamRef.current.getVideoTracks()[0];
        if (videoTrack && videoTrack.readyState === 'live' && lastFacingModeRef.current === facingMode) {
          return;
        }
        // Stop current stream before changing mode
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        const err = new Error('Kamera-API wird in diesem Kontext nicht unterstützt (z.B. kein HTTPS).');
        onErrorRef.current(err);
        return;
      }

      try {
        const constraints: MediaStreamConstraints = {
          video: {
            facingMode: facingMode,
            width: { ideal: 480 },
            height: { ideal: 480 }
          },
          audio: false
        };

        let stream: MediaStream;
        try {
          stream = await navigator.mediaDevices.getUserMedia(constraints);
        } catch (err) {
          console.warn('[Scanner] getUserMedia with constraints failed, retrying with simple constraints:', err);
          if (!active) return;
          stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        }

        if (!active) {
          stream.getTracks().forEach(track => track.stop());
          return;
        }

        streamRef.current = stream;
        lastFacingModeRef.current = facingMode;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.setAttribute('playsinline', 'true');
          videoRef.current.play().catch(err => {
            console.warn('[Scanner] Play failed:', err);
            // Safety: Stop tracks on failure so they do not run silently in the background
            if (stream) {
              stream.getTracks().forEach(track => track.stop());
            }
            if (streamRef.current === stream) {
              streamRef.current = null;
            }
            if (videoRef.current) {
              videoRef.current.srcObject = null;
            }
            setNeedsManualActivation(true);
          });
        }
      } catch (err: any) {
        console.error('[Scanner] getUserMedia error:', err);
        // Safety: ensure any allocated tracks are stopped
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
        }
        if (videoRef.current) {
          videoRef.current.srcObject = null;
        }
        // On mount failure (usually permission prompt blocked/need gesture), set manual activation
        setNeedsManualActivation(true);
      }
    }

    if (!paused && !needsManualActivation) {
      startCamera();
    } else if (paused) {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
        lastFacingModeRef.current = null;
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    }

    return () => {
      active = false;
    };
  }, [facingMode, paused, needsManualActivation]);

  // 3. Effect to manage canvas rendering and jsQR parsing frame-loop
  useEffect(() => {
    if (paused) {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
        requestRef.current = null;
      }
      return;
    }

    canvasRef.current = document.createElement('canvas');
    let lastScanTime = 0;

    const scanFrame = (timestamp: number) => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (video && canvas && video.readyState === video.HAVE_ENOUGH_DATA) {
        // Only run jsQR every 150ms to save CPU and battery power
        if (timestamp - lastScanTime > 150) {
          lastScanTime = timestamp;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            // Downscale to 320x320 to reduce parsed pixels by 75%+
            canvas.width = 320;
            canvas.height = 320;
            ctx.drawImage(video, 0, 0, 320, 320);
            const imageData = ctx.getImageData(0, 0, 320, 320);
            if (jsQRInstance) {
              const code = jsQRInstance(imageData.data, imageData.width, imageData.height, {
                inversionAttempts: 'dontInvert'
              });
              if (code && code.data) {
                onScanRef.current(code.data);
              }
            }
          }
        }
      }
      requestRef.current = requestAnimationFrame(scanFrame);
    };

    requestRef.current = requestAnimationFrame(scanFrame);

    return () => {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
        requestRef.current = null;
      }
    };
  }, [paused]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', background: 'black' }}>
      <video
        ref={videoRef}
        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        playsInline
        autoPlay
        muted
      />
      {needsManualActivation && (
        <div style={{ 
          position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', 
          alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.85)', zIndex: 10 
          // Note: Monochrome design accents rules are followed (yellow highlight for button matches groovelab theme color)
        }}>
          <div style={{ background: 'white', padding: '12px', borderRadius: '50%', marginBottom: '16px' }}>
            <Camera size={32} color="#1e293b" />
          </div>
          <p style={{ color: 'white', marginBottom: '20px', textAlign: 'center', padding: '0 20px', fontWeight: 600 }}>
            Kamera-Zugriff erforderlich
          </p>
          <button 
            onClick={async (e) => {
              e.preventDefault();
              e.stopPropagation();
              
              if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                const err = new Error('Kamera-API wird in diesem Kontext nicht unterstützt (z.B. kein HTTPS).');
                onErrorRef.current(err);
                return;
              }
              
              try {
                if (streamRef.current) {
                  streamRef.current.getTracks().forEach(track => track.stop());
                  streamRef.current = null;
                }
                
                const constraints: MediaStreamConstraints = {
                  video: {
                    facingMode: facingMode,
                    width: { ideal: 480 },
                    height: { ideal: 480 }
                  },
                  audio: false
                };
                
                let stream: MediaStream;
                try {
                  stream = await navigator.mediaDevices.getUserMedia(constraints);
                } catch (err) {
                  console.warn('[Scanner] Manual: getUserMedia with constraints failed, retrying simple:', err);
                  stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
                }
                
                streamRef.current = stream;
                lastFacingModeRef.current = facingMode;
                
                if (videoRef.current) {
                  videoRef.current.srcObject = stream;
                  videoRef.current.setAttribute('playsinline', 'true');
                  await videoRef.current.play();
                }
                
                setNeedsManualActivation(false);
              } catch (err: any) {
                console.error('[Scanner] Manual activation failed:', err);
                if (streamRef.current) {
                  streamRef.current.getTracks().forEach(track => track.stop());
                  streamRef.current = null;
                }
                if (videoRef.current) {
                  videoRef.current.srcObject = null;
                }
                onErrorRef.current(err);
              }
            }}
            style={{ 
              background: '#facc15', color: '#1e293b', border: 'none', 
              padding: '12px 24px', borderRadius: '12px', fontWeight: 800, 
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px',
              boxShadow: '0 4px 12px rgba(250, 204, 21, 0.4)',
              width: isIOS && isStandalone ? '200px' : 'auto',
              justifyContent: 'center'
            }}
          >
            Kamera aktivieren
          </button>
          {isIOS && isStandalone && (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                window.open(window.location.href, '_blank');
              }}
              style={{
                marginTop: '10px',
                background: 'rgba(255, 255, 255, 0.1)',
                color: '#ffffff',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                padding: '10px 20px',
                borderRadius: '12px',
                fontWeight: 700,
                fontSize: '12px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                width: '200px',
                justifyContent: 'center'
              }}
            >
              In Safari öffnen
            </button>
          )}
        </div>
      )}
    </div>
  );
}

const isWithinOpeningHours = (openingHours: any) => {
  if (!openingHours) return true;
  try {
    const now = new Date();
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const currentDay = dayNames[now.getDay()];
    const dayConfig = openingHours[currentDay];

    if (!dayConfig || !dayConfig.active) return false;

    const [startH, startM] = dayConfig.start.split(':').map(Number);
    const [endH, endM] = dayConfig.end.split(':').map(Number);
    
    const startTime = new Date();
    startTime.setHours(startH, startM, 0, 0);
    
    const endTime = new Date();
    endTime.setHours(endH, endM, 0, 0);
    
    return now >= startTime && now <= endTime;
  } catch (e) {
    console.error("Error checking opening hours:", e);
    return true;
  }
};

// Simple layout adjustment to prevent overlapping of iPad stations
const adjustPositions = (stations: any[], containerWidth: number = 364) => {
  // Clone stations with pos_x and pos_y, and save original coordinates to detect alignment
  const items = stations.map(s => ({
    ...s,
    x: s.pos_x !== null && s.pos_x !== undefined ? s.pos_x : 50,
    y: s.pos_y !== null && s.pos_y !== undefined ? s.pos_y : 50,
    origX: s.pos_x !== null && s.pos_x !== undefined ? s.pos_x : 50,
    origY: s.pos_y !== null && s.pos_y !== undefined ? s.pos_y : 50
  }));

  const containerHeight = containerWidth / 1.4;
  
  // Safe margin is button radius (62px * 1.08 / 2 = 33.48px) + box shadow glow (4px) + margin rule (2px) = 39.48px.
  // We round this to 40px to guarantee empty space.
  const safeMarginPx = 40;
  const safeMinX = Math.min(45, (safeMarginPx / containerWidth) * 100);
  const safeMaxX = Math.max(55, 100 - safeMinX);
  const safeMinY = Math.min(45, (safeMarginPx / containerHeight) * 100);
  const safeMaxY = Math.max(55, 100 - safeMinY);
  
  // Minimum gap of 4px: Button width/height is 62px, so minimum center-to-center is 62px + 4px = 66px.
  const minXDistPx = 66;
  const minYDistPx = 66;

  const iterations = 50;
  const minXDist = (minXDistPx / containerWidth) * 100; // minimum X distance in percentage
  const minYDist = (minYDistPx / containerHeight) * 100; // minimum Y distance in percentage

  for (let iter = 0; iter < iterations; iter++) {
    let moved = false;
    for (let i = 0; i < items.length; i++) {
      for (let j = i + 1; j < items.length; j++) {
        const dx = items[i].x - items[j].x;
        const dy = items[i].y - items[j].y;
        
        // Check if they overlap (distance in X < minXDist AND Y < minYDist)
        if (Math.abs(dx) < minXDist && Math.abs(dy) < minYDist) {
          moved = true;
          
          // Detect alignment intent from database coordinates (threshold of 6% variation)
          const isVerticallyAligned = Math.abs(items[i].origX - items[j].origX) < 6;
          const isHorizontallyAligned = Math.abs(items[i].origY - items[j].origY) < 6;
          
          if (isVerticallyAligned && !isHorizontallyAligned) {
            // They are aligned vertically: only push them apart vertically, preserving X alignment
            const overlapY = minYDist - Math.abs(dy);
            const forceY = dy === 0 ? (i % 2 === 0 ? 1 : -1) : Math.sign(dy);
            const pushY = forceY * (overlapY / 2);
            
            items[i].y += pushY;
            items[j].y -= pushY;
            
            // Keep X aligned to their original intended column position
            items[i].x = items[i].origX;
            items[j].x = items[j].origX;
          } else if (isHorizontallyAligned && !isVerticallyAligned) {
            // They are aligned horizontally: only push them apart horizontally, preserving Y alignment
            const overlapX = minXDist - Math.abs(dx);
            const forceX = dx === 0 ? (i % 2 === 0 ? 1 : -1) : Math.sign(dx);
            const pushX = forceX * (overlapX / 2);
            
            items[i].x += pushX;
            items[j].x -= pushX;
            
            // Keep Y aligned to their original intended row position
            items[i].y = items[i].origY;
            items[j].y = items[j].origY;
          } else {
            // No strict alignment or both (e.g. direct overlap at same spot): push on both axes
            const overlapX = minXDist - Math.abs(dx);
            const overlapY = minYDist - Math.abs(dy);
            
            const forceX = dx === 0 ? (Math.random() - 0.5 || 0.1) : Math.sign(dx);
            const forceY = dy === 0 ? (Math.random() - 0.5 || 0.1) : Math.sign(dy);
            
            const pushX = forceX * (overlapX / 2);
            const pushY = forceY * (overlapY / 2);
            
            items[i].x += pushX;
            items[j].x -= pushX;
            items[i].y += pushY;
            items[j].y -= pushY;
          }
          
          // Clamp individual positions to keep them inside the safe area during force adjustment
          items[i].x = Math.max(safeMinX, Math.min(safeMaxX, items[i].x));
          items[j].x = Math.max(safeMinX, Math.min(safeMaxX, items[j].x));
          items[i].y = Math.max(safeMinY, Math.min(safeMaxY, items[i].y));
          items[j].y = Math.max(safeMinY, Math.min(safeMaxY, items[j].y));
        }
      }
    }
    if (!moved) break;
  }

  // Ensure ALL items strictly adhere to the minimum edge distance, even if they had no collisions
  items.forEach(item => {
    item.x = Math.max(safeMinX, Math.min(safeMaxX, item.x));
    item.y = Math.max(safeMinY, Math.min(safeMaxY, item.y));
  });

  return items;
};

const cleanRoomName = (name: string | null | undefined): string => {
  if (!name) return 'Unbenannter Raum';
  return name.replace(/^#\d+\s*[-:]*\s*/, '').trim();
};

const getStationColor = (name: string | null | undefined, dbColor?: string | null) => {
  if (!name) return '#64748b';
  
  const isStandardIpad = /^ipad\s*\d+/i.test(name);
  if (dbColor && dbColor !== '#e5e7eb' && dbColor !== '#e2e8f0' && dbColor !== '#cbd5e1') {
    if (isStandardIpad && dbColor === '#64748b') {
      // Fall through to number-based standard color
    } else {
      return dbColor;
    }
  }

  const lowerName = name.toLowerCase();
  if (lowerName.includes('lehrer') || lowerName.includes('teacher')) return '#34a853'; // Green
  const matches = name.match(/\d+/g);
  if (!matches) return '#64748b';
  const num = parseInt(matches[matches.length - 1]);
  if (num === 1 || num === 2) return '#eab308'; // Yellow
  if (num === 3 || num === 4) return '#a855f7'; // Purple
  if (num === 5 || num === 6) return '#3b82f6'; // Blue
  if (num === 7 || num === 8) return '#eab308'; // Yellow
  return '#64748b';
};

const isMusaekSchool = (id: string | null | undefined) => {
  if (!id) return false;
  return id === 'cc05137f-5904-4774-80be-6a172c52bf99' || id === '53e83805-1d5a-4ed8-988e-1fb0b8200b9c';
};

export function LoginScreen({ onLogin, kioskStationId }: LoginScreenProps) {
  const navigate = useNavigate();
  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' ? window.innerWidth < 800 : false);
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 800);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const [loading, setLoading] = useState(false);
  const [pinSetupUser, setPinSetupUser] = useState<any>(null);
  const [pinVerificationUser, setPinVerificationUser] = useState<any>(null);
  const [pinSetupInput, setPinSetupInput] = useState('');
  const [pinVerificationInput, setPinVerificationInput] = useState('');
  const [pinVerificationIsWithinRoom, setPinVerificationIsWithinRoom] = useState(false);
  const [pinVerificationAttempts, setPinVerificationAttempts] = useState(0);

  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [error, setError] = useState<string | null>(null);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showAgb, setShowAgb] = useState(false);
  const [showParentAgb, setShowParentAgb] = useState(false);
  const [showImpressum, setShowImpressum] = useState(false);
  const [firstNameFocused, setFirstNameFocused] = useState(false);
  const [lastNameFocused, setLastNameFocused] = useState(false);

  // Manual PIN Login and Kiosk Activator States
  const [pinInput, setPinInput] = useState('');
  const [kioskRooms, setKioskRooms] = useState<any[]>([]);
  const [kioskStations, setKioskStations] = useState<any[]>([]);
  const kioskMapRef = useRef<HTMLDivElement>(null);
  const [kioskMapWidth, setKioskMapWidth] = useState<number>(364);
  const [kioskSelectedRoomId, setKioskSelectedRoomId] = useState<string>('');
  const [activeSessionStationIds, setActiveSessionStationIds] = useState<string[]>([]);
  const [loadingKioskData, setLoadingKioskData] = useState(false);
  const [loadingLocation, setLoadingLocation] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(true);
  const [cameraHasError, setCameraHasError] = useState(false);
  const [scanSuccess, setScanSuccess] = useState(false);

  // Onboarding States
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingStep, setOnboardingStep] = useState(1);
  const [onboardSchoolName, setOnboardSchoolName] = useState('');
  const [onboardRepresentedBy, setOnboardRepresentedBy] = useState('');
  const [onboardStreet, setOnboardStreet] = useState('');
  const [onboardZip, setOnboardZip] = useState('');
  const [onboardCity, setOnboardCity] = useState('');
  const [onboardEmail, setOnboardEmail] = useState('');
  const [onboardAdminFirstName, setOnboardAdminFirstName] = useState('');
  const [onboardAdminLastName, setOnboardAdminLastName] = useState('');
  const [onboardDpaAccepted, setOnboardDpaAccepted] = useState(false);
  const [onboardCreatedUser, setOnboardCreatedUser] = useState<any>(null);
  const [onboardIPAddress, setOnboardIPAddress] = useState('unknown');
  const [loginConsentAccepted, setLoginConsentAccepted] = useState(false);
  const [expandedSection, setExpandedSection] = useState<'none' | 'pin' | 'kiosk' | 'parentOnboarding'>(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('onboarding') === 'parent' || params.get('parent_onboarding') === 'true') {
      return 'parentOnboarding';
    }
    return 'none';
  });
  const [isGroovelabKiosk, setIsGroovelabKiosk] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('platform') === 'campus' || params.get('module') === 'campus') {
      return false;
    }
    const hasKioskToken = typeof window !== 'undefined' && !!localStorage.getItem('groovelab_kiosk_token');
    const isKioskModeActive = typeof window !== 'undefined' && localStorage.getItem('groovelab_kiosk_mode') === 'true';
    return !!kioskStationId || hasKioskToken || isKioskModeActive || params.get('groovelab') === 'true' || params.get('platform') === 'groovelab';
  });
  const [hasAutoCheckedPlatform, setHasAutoCheckedPlatform] = useState(false);
  const [selectedKioskStationId, setSelectedKioskStationId] = useState<string | null>(null);
  const [coupledStationName, setCoupledStationName] = useState<string | null>(null);
  const [coupledStationColor, setCoupledStationColor] = useState<string | null>(null);
  const [showKioskScanner, setShowKioskScanner] = useState(false);

  // Parents Onboarding & Magic Link States
  const [parentFirstName, setParentFirstName] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('first_name') || '';
  });
  const [parentLastName, setParentLastName] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('last_name') || '';
  });
  const [parentInstrument, setParentInstrument] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('instrument') || '';
  });
  const [parentDayOfBirth, setParentDayOfBirth] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('day') || '';
  });
  const [parentEmail, setParentEmail] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('email') || '';
  });
  const [parentOnboardingStep, setParentOnboardingStep] = useState<'verify' | 'setup-pin' | 'pin' | 'frozen' | 'email' | 'preferences' | 'success'>('verify');
  const [studentPaymentMethod, setStudentPaymentMethod] = useState<'debit' | 'cash'>('debit');
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [parentNotes, setParentNotes] = useState('');
  
  // Neue Onboarding-Sicherheitsstates
  const [onboardingPin, setOnboardingPin] = useState<string[]>(['', '', '', '']);
  const [tempStudentId, setTempStudentId] = useState<string | null>(null);
  const [onboardingInviteToken, setOnboardingInviteToken] = useState<string | null>(null);
  const [isPinSetupNeeded, setIsPinSetupNeeded] = useState(false);
  const [newOnboardingPin, setNewOnboardingPin] = useState<string[]>(['', '', '', '']);
  const [newOnboardingPinConfirm, setNewOnboardingPinConfirm] = useState<string[]>(['', '', '', '']);
  const [isTimetableAssigned, setIsTimetableAssigned] = useState(false);

  // Biometrics / WebAuthn States
  const [biometricsAvailable, setBiometricsAvailable] = useState(false);
  const [biometricsStatus, setBiometricsStatus] = useState<'idle' | 'registering' | 'success' | 'error'>('idle');
  const [biometricsErrorMessage, setBiometricsErrorMessage] = useState('');
  const [qrScanPrompt, setQrScanPrompt] = useState<string | null>(null);

  useEffect(() => {
    setBiometricsAvailable(isWebAuthnSupported());
  }, []);

  const getDynamicAnnualPriceLocal = (startDateStr: string | null | undefined, isCoFinancing: boolean = false): number => {
    const contractDateObj = startDateStr ? new Date(startDateStr) : new Date('2026-06-12T19:30:38+02:00');
    const month = contractDateObj.getMonth() + 1; // 1-indexed

    const monthsMap: Record<number, number> = {
      9: 12,  // September
      10: 11, // October
      11: 10, // November
      12: 9,  // December
      1: 8,   // January
      2: 7,   // February
      3: 6,   // March
      4: 5,   // April
      5: 4,   // May
      6: 3,   // June
      7: 2,   // July
      8: 1    // August
    };

    const monthsRemaining = monthsMap[month] !== undefined ? monthsMap[month] : 12;
    const basePrice = 4.80;
    return parseFloat(((monthsRemaining / 12) * basePrice).toFixed(2));
  };

  const [selectedSlots, setSelectedSlots] = useState<{[key: string]: 'wunsch' | 'gesperrt'}>({});
  const [teacherAvailabilityState, setTeacherAvailabilityState] = useState<any>(null);
  const [preferenceMode, setPreferenceMode] = useState<'wunsch' | 'gesperrt'>('wunsch');
  const [showSaturday, setShowSaturday] = useState(false);
  const [verifiedStudentId, setVerifiedStudentId] = useState<string | null>(null);
  const [verifiedStudentDetails, setVerifiedStudentDetails] = useState<any>(null);
  const [parentOnboardingError, setParentOnboardingError] = useState<string | null>(null);
  const [parentOnboardingLoading, setParentOnboardingLoading] = useState(false);
  const [magicLinkEmail, setMagicLinkEmail] = useState('');
  const [showMagicLinkModal, setShowMagicLinkModal] = useState(false);
  const [magicLinkMessage, setMagicLinkMessage] = useState<string | null>(null);
  const [magicLinkSuccess, setMagicLinkSuccess] = useState(false);
  const [isAlreadyOnboarded, setIsAlreadyOnboarded] = useState(false);

  useEffect(() => {
    const checkInviteToken = async () => {
      const params = new URLSearchParams(window.location.search);
      const token = params.get('token');
      if (token) {
        setOnboardingInviteToken(token);
        setParentOnboardingLoading(true);
        try {
          const { data, error } = await supabase.rpc('verify_onboarding_token', {
            input_token: token
          });
          if (error) throw error;
          const result = Array.isArray(data) ? data[0] : data;
          if (result && result.success) {
            setVerifiedStudentId(result.student_id);
            setParentFirstName(result.first_name || '');
            setParentLastName(result.last_name || '');
            setParentInstrument(result.instrument || '');
            
            // Check student status and pre-load entries
            const { data: studentRow } = await supabase
              .from('students')
              .select('status, parent_notes')
              .eq('id', result.student_id)
              .single();

            const isAlreadyDone = studentRow ? studentRow.status !== 'ausstehend' : false;
            setIsAlreadyOnboarded(isAlreadyDone);
            setParentNotes(studentRow?.parent_notes || '');

            const { data: prefSlots } = await supabase
              .from('student_schedule_preferences')
              .select('day_of_week, start_time, end_time, preference_type')
              .eq('student_id', result.student_id);

            const loadedSlots: { [key: string]: 'wunsch' | 'gesperrt' } = {};
            prefSlots?.forEach(slot => {
              const startTimeClean = slot.start_time.substring(0, 5);
              const cellKey = `${slot.day_of_week}-${startTimeClean}`;
              loadedSlots[cellKey] = slot.preference_type as 'wunsch' | 'gesperrt';
            });
            setSelectedSlots(loadedSlots);

            const { data: mainStudentData } = await supabase
              .from('users')
              .select('school_id, sibling_group_id, birth_date')
              .eq('id', result.student_id)
              .single();

            setSchoolId(mainStudentData?.school_id || null);

            const initialChildren = [{
              id: result.student_id,
              first_name: result.first_name || '',
              last_name: result.last_name || '',
              instrument: result.instrument || '',
              birth_date: mainStudentData?.birth_date || undefined,
              selectedSlots: loadedSlots,
              isNew: false
            }];
            setParentChildren(initialChildren);
            setActiveParentChildIndex(0);
            setSibLastName(result.last_name || '');

            sessionStorage.setItem('groovelab_user_id', result.student_id);
            setVerifiedStudentDetails({
              first_name: result.first_name,
              last_name: result.last_name,
              instrument: result.instrument,
              id: result.student_id
            });

            // Since they used a cryptographic invite link, we bypass PIN verification and prompt to set up a new PIN in step 2
            setIsPinSetupNeeded(true);
            setParentOnboardingStep('setup-pin');
          } else {
            setParentOnboardingError(result?.message || 'Ungültiger oder abgelaufener Einladungs-Link.');
          }
        } catch (err: any) {
          console.error('Error verifying token:', err);
          setParentOnboardingError(err.message || 'Fehler beim Laden des Einladungs-Links.');
        } finally {
          setParentOnboardingLoading(false);
        }
      }
    };
    checkInviteToken();
  }, []);

  useEffect(() => {
    if (verifiedStudentId) {
      const fetchTeacherAvailability = async () => {
        try {
          const { data: studentUser } = await supabase
            .from('users')
            .select('teacher_id')
            .eq('id', verifiedStudentId)
            .single();

          if (studentUser?.teacher_id) {
            const { data: teacherUser } = await supabase
              .from('users')
              .select('teacher_onboarding_completed, teacher_availability')
              .eq('id', studentUser.teacher_id)
              .single();

            if (teacherUser?.teacher_onboarding_completed) {
              setTeacherAvailabilityState(teacherUser.teacher_availability);
            } else {
              setTeacherAvailabilityState(null);
            }
          }
        } catch (err) {
          console.error('Error fetching teacher availability:', err);
        }
      };
      fetchTeacherAvailability();
    }
  }, [verifiedStudentId]);

  // Geschwister-Zustände im Onboarding
  interface SiblingChild {
    id?: string;
    first_name: string;
    last_name: string;
    instrument: string;
    birth_date?: string;
    selectedSlots: {[key: string]: 'wunsch' | 'gesperrt'};
    isNew?: boolean;
  }
  const [parentChildren, setParentChildren] = useState<SiblingChild[]>([]);
  const [activeParentChildIndex, setActiveParentChildIndex] = useState<number>(0);
  const [showSiblingForm, setShowSiblingForm] = useState(false);
  const [sibFirstName, setSibFirstName] = useState('');
  const [sibLastName, setSibLastName] = useState('');
  const [sibInstrument, setSibInstrument] = useState('Gitarre');
  const [sibBirthDate, setSibBirthDate] = useState('');
  const [schoolId, setSchoolId] = useState<string | null>(null);

  useEffect(() => {
    if (!kioskMapRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect.width) {
          setKioskMapWidth(entry.contentRect.width);
        }
      }
    });
    observer.observe(kioskMapRef.current);
    return () => observer.disconnect();
  }, [kioskMapRef.current, isGroovelabKiosk]);


  const fetchIpAddress = async () => {
    try {
      const res = await fetch('https://api.ipify.org?format=json');
      const data = await res.json();
      return data.ip || 'unknown';
    } catch (e) {
      console.warn("Failed to fetch IP address, using fallback", e);
      return 'unknown';
    }
  };

  const downloadQrCode = () => {
    if (!onboardCreatedUser) return;
    const url = `https://chart.googleapis.com/chart?chs=300x300&cht=qr&chl=${encodeURIComponent(`${window.location.origin}/qr/${onboardCreatedUser.qr_token}`)}`;
    const link = document.createElement('a');
    link.href = url;
    link.target = '_blank';
    link.download = `groovelab_ausweis_${onboardCreatedUser.first_name}_${onboardCreatedUser.last_name}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleOnboardingSubmit = async () => {
    if (!onboardSchoolName.trim() || !onboardRepresentedBy.trim() || !onboardStreet.trim() || !onboardZip.trim() || !onboardCity.trim() || !onboardEmail.trim() || !onboardAdminFirstName.trim() || !onboardAdminLastName.trim()) {
      alert("Bitte alle Felder ausfüllen.");
      return;
    }
    
    setLoading(true);
    try {
      // 1. Get client IP address
      const ip = await fetchIpAddress();
      setOnboardIPAddress(ip);

      // 2. Create the school
      const schoolId = crypto.randomUUID();
      const { data: newSchool, error: schoolErr } = await supabase
        .from('schools')
        .insert({
          id: schoolId,
          name: onboardSchoolName.trim(),
          represented_by: onboardRepresentedBy.trim(),
          street: onboardStreet.trim(),
          zip_code: onboardZip.trim(),
          city: onboardCity.trim(),
          email: onboardEmail.trim(),
          primary_color: '#3b82f6'
        })
        .select()
        .single();

      if (schoolErr) throw schoolErr;

      // 3. Create the admin user
      const adminId = crypto.randomUUID();
      const adminQrToken = crypto.randomUUID();
      const { data: newAdmin, error: adminErr } = await supabase
        .from('users')
        .insert({
          id: adminId,
          school_id: schoolId,
          role: 'admin',
          first_name: onboardAdminFirstName.trim(),
          last_name: onboardAdminLastName.trim(),
          qr_token: adminQrToken
        })
        .select()
        .single();

      if (adminErr) throw adminErr;

      // 4. Log the DPA Agreement
      const { error: dpaErr } = await supabase
        .from('dpa_agreements')
        .insert({
          school_id: schoolId,
          user_id: adminId,
          dpa_version: 'v1.0-DSGVO',
          ip_address: ip
        });

      if (dpaErr) throw dpaErr;

      // Save admin info to display QR code in step 3
      setOnboardCreatedUser({
        first_name: onboardAdminFirstName.trim(),
        last_name: onboardAdminLastName.trim(),
        qr_token: adminQrToken,
        schoolName: onboardSchoolName.trim()
      });
      setOnboardingStep(3);
    } catch (err: any) {
      console.error("Onboarding failed:", err);
      alert("Fehler bei der Registrierung: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const renderOnboardingScreen = () => {
    return (
      <div style={{ 
        position: 'fixed',
        inset: 0,
        backgroundColor: '#f8fafc', 
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        fontFamily: 'Inter, system-ui, sans-serif',
        zIndex: 9999,
        overflowY: 'auto'
      }}>
        <div style={{
          width: '100%',
          maxWidth: onboardingStep === 2 ? '650px' : '550px',
          background: '#ffffff',
          borderRadius: '40px',
          padding: '40px',
          boxShadow: '0 30px 80px rgba(15, 23, 42, 0.06)',
          border: '1px solid #f1f5f9',
          display: 'flex',
          flexDirection: 'column',
          gap: '24px',
          maxHeight: '90vh',
          overflowY: 'auto'
        }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '16px', background: '#fef9c3', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#eab308' }}>
              <School size={28} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '22px', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.02em' }}>Musikschule Onboarding</h2>
              <p style={{ margin: 0, fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {onboardingStep === 1 && "Schritt 1: Stammdaten & Administrator"}
                {onboardingStep === 2 && "Schritt 2: AV-Vertrag (DPA)"}
                {onboardingStep === 3 && "Schritt 3: Abschluss & Login-Ausweis"}
              </p>
            </div>
          </div>

          {onboardingStep === 1 && (
            <form onSubmit={(e) => { e.preventDefault(); setOnboardingStep(2); }} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase', marginBottom: '6px' }}>Name der Schule *</label>
                  <input type="text" required value={onboardSchoolName} onChange={e => setOnboardSchoolName(e.target.value)} placeholder="z.B. Campus-Groovelab Musikakademie" style={inputStyle} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase', marginBottom: '6px' }}>Vertreten durch (Schulleitung) *</label>
                  <input type="text" required value={onboardRepresentedBy} onChange={e => setOnboardRepresentedBy(e.target.value)} placeholder="z.B. Dr. Max Mustermann" style={inputStyle} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase', marginBottom: '6px' }}>E-Mail-Adresse *</label>
                  <input type="email" required value={onboardEmail} onChange={e => setOnboardEmail(e.target.value)} placeholder="leitung@musikschule.de" style={inputStyle} />
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase', marginBottom: '6px' }}>Straße & Hausnummer *</label>
                    <input type="text" required value={onboardStreet} onChange={e => setOnboardStreet(e.target.value)} placeholder="Hauptstr. 12" style={inputStyle} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase', marginBottom: '6px' }}>PLZ *</label>
                    <input type="text" required value={onboardZip} onChange={e => setOnboardZip(e.target.value)} placeholder="79713" style={inputStyle} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase', marginBottom: '6px' }}>Ort *</label>
                    <input type="text" required value={onboardCity} onChange={e => setOnboardCity(e.target.value)} placeholder="Bad Säckingen" style={inputStyle} />
                  </div>
                </div>

                <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '16px', marginTop: '8px' }}>
                  <h4 style={{ margin: '0 0 12px 0', fontSize: '13px', fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>Administrator / Erstes Lehrer-Konto</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase', marginBottom: '6px' }}>Vorname *</label>
                      <input type="text" required value={onboardAdminFirstName} onChange={e => setOnboardAdminFirstName(e.target.value)} placeholder="Max" style={inputStyle} />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase', marginBottom: '6px' }}>Nachname *</label>
                      <input type="text" required value={onboardAdminLastName} onChange={e => setOnboardAdminLastName(e.target.value)} placeholder="Mustermann" style={inputStyle} />
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
                <button type="button" onClick={() => { setShowOnboarding(false); setOnboardingStep(1); }} style={backButtonStyle}>Abbrechen</button>
                <button type="submit" style={nextButtonStyle}>
                  Weiter zu Schritt 2 <ArrowRight size={16} />
                </button>
              </div>
            </form>
          )}

          {onboardingStep === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ 
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '16px',
                padding: '20px',
                maxHeight: '260px',
                overflowY: 'auto',
                fontSize: '12px',
                lineHeight: '1.6',
                color: '#334155',
                textAlign: 'left'
              }}>
                <h4 style={{ margin: '0 0 10px 0', fontWeight: 800, fontSize: '13px' }}>AV-VERTRAG (VEREINBARUNG ZUR AUFTRAGSVERARBEITUNG NACH ART. 28 DSGVO)</h4>
                <p><strong>Vertragspartner:</strong><br/>
                Plattformbetreiber: GrooveLab App (Betreiber: Patrick Huber) (nachfolgend „Auftragnehmer“)<br/>
                Musikschule: {onboardSchoolName || 'unbenannt'} (nachfolgend „Auftraggeber“)</p>
                
                <h5 style={{ margin: '12px 0 6px 0', fontWeight: 800 }}>§ 1 Gegenstand und Dauer der Verarbeitung</h5>
                <p>Der Auftragnehmer stellt dem Auftraggeber die Software-Plattform „GrooveLab App“ als digitales Logbuch- und Raumverwaltungssystem zur Verfügung. Die Verarbeitung umfasst personenbezogene Daten der Schüler (Vorname, Nachname und der Tag des Geburtstags des Kindes; Vornamen werden zur Erhöhung der Sicherheit explizit verschlüsselt gespeichert) und Coaches (Check-ins, Lernfortschritte) des Auftraggebers.</p>
                
                <h5 style={{ margin: '12px 0 6px 0', fontWeight: 800 }}>§ 2 Technische und Organisatorische Maßnahmen (TOM)</h5>
                <p>Der Auftragnehmer sichert angemessene technische und organisatorische Maßnahmen nach Art. 32 DSGVO zu, um die Datensicherheit und Vertraulichkeit zu gewährleisten (z.B. Row Level Security Mandantentrennung, verschlüsselte Verbindungen). Die Datenverarbeitung und das Hosting erfolgen zu 100% in Deutschland auf der Infrastruktur von Hetzner Online GmbH (Hetzner.com) am Standort Falkenstein.</p>
                
                <h5 style={{ margin: '12px 0 6px 0', fontWeight: 800 }}>§ 3 Pflichten des Auftragnehmers</h5>
                <p>Die Verarbeitung der Daten erfolgt ausschließlich weisungsgebunden im Rahmen des vertraglich vereinbarten Verwendungszwecks. Der Auftragnehmer verpflichtet sein Personal auf Vertraulichkeit und unterstützt den Auftraggeber bei Betroffenenrechten und Audits nach bestem Wissen.</p>
                
                <h5 style={{ margin: '12px 0 6px 0', fontWeight: 800 }}>§ 4 Pflichten des Auftraggebers</h5>
                <p>Der Auftraggeber ist die „verantwortliche Stelle“ im Sinne der DSGVO und stellt sicher, dass für die Eingabe der Schüler- und Lehrerdaten eine gesetzliche Grundlage oder Einwilligung vorliegt.</p>
              </div>

              <div style={{ 
                display: 'flex', 
                alignItems: 'flex-start', 
                gap: '12px',
                background: '#fefcbf',
                border: '1px solid #fef08a',
                padding: '16px',
                borderRadius: '16px'
              }}>
                <input 
                  type="checkbox" 
                  id="dpa-accept-checkbox"
                  checked={onboardDpaAccepted}
                  onChange={(e) => setOnboardDpaAccepted(e.target.checked)}
                  style={{ marginTop: '3px', cursor: 'pointer', width: '18px', height: '18px' }}
                />
                <label htmlFor="dpa-accept-checkbox" style={{ fontSize: '12px', color: '#854d0e', fontWeight: 700, cursor: 'pointer', textAlign: 'left', lineHeight: '1.4' }}>
                  Ich bestätige die Vereinbarung zur Auftragsverarbeitung (AV-Vertrag / DPA) hiermit rechtsverbindlich für die oben genannte Musikschule „{onboardSchoolName}“ und erkläre, dass ich zur Schulleitung gehöre bzw. zeichnungsberechtigt bin.
                </label>
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button type="button" onClick={() => setOnboardingStep(1)} style={backButtonStyle}>Zurück</button>
                <button 
                  type="button" 
                  disabled={!onboardDpaAccepted || loading} 
                  onClick={handleOnboardingSubmit} 
                  style={{
                    ...nextButtonStyle,
                    opacity: (!onboardDpaAccepted || loading) ? 0.5 : 1,
                    cursor: (!onboardDpaAccepted || loading) ? 'not-allowed' : 'pointer'
                  }}
                >
                  {loading ? "Verarbeite..." : "Registrierung abschließen"}
                </button>
              </div>
            </div>
          )}

          {onboardingStep === 3 && onboardCreatedUser && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px', textAlign: 'center' }}>
              <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: '#e6f4ea', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#34a853', marginBottom: '8px' }}>
                <Check size={36} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 900, color: '#34a853' }}>Registrierung erfolgreich!</h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#64748b', fontWeight: 600 }}>Die Schule „{onboardCreatedUser.schoolName}“ wurde erfolgreich angelegt.</p>
              </div>

              {/* Admin Ausweis Card */}
              <div style={{
                background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
                borderRadius: '32px',
                padding: '24px',
                width: '320px',
                boxShadow: '0 20px 40px rgba(0, 0, 0, 0.15)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                color: 'white',
                border: '1px solid rgba(255,255,255,0.08)'
              }}>
                <div style={{ fontSize: '10px', fontWeight: 900, color: '#eab308', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: '16px' }}>Groovelab Admin-Ausweis</div>
                
                {/* QR Code Container */}
                <div style={{
                  background: 'white',
                  borderRadius: '24px',
                  padding: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.1)'
                }}>
                  <img 
                    src={`https://chart.googleapis.com/chart?chs=180x180&cht=qr&chl=${encodeURIComponent(`${window.location.origin}/qr/${onboardCreatedUser.qr_token}`)}`} 
                    alt="Admin QR Ausweis" 
                    style={{ width: '180px', height: '180px', display: 'block', borderRadius: '12px' }}
                  />
                </div>

                <div style={{ marginTop: '16px', fontWeight: 800, fontSize: '1.1rem' }}>
                  {onboardCreatedUser.first_name} {onboardCreatedUser.last_name}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', marginTop: '2px' }}>
                  Administrator
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%', maxWidth: '320px' }}>
                <button 
                  onClick={downloadQrCode} 
                  style={{
                    width: '100%',
                    padding: '14px',
                    borderRadius: '16px',
                    border: '1px solid #e2e8f0',
                    background: 'white',
                    color: '#475569',
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    transition: 'all 0.2s'
                  }}
                >
                  <Download size={16} /> Ausweis herunterladen (QR)
                </button>
                <button 
                  onClick={() => {
                    setShowOnboarding(false);
                    setOnboardingStep(1);
                    setOnboardDpaAccepted(false);
                  }}
                  style={{
                    width: '100%',
                    padding: '14px',
                    borderRadius: '16px',
                    border: 'none',
                    background: '#eab308',
                    color: '#0f172a',
                    fontWeight: 800,
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  Zurück zum Login-Bildschirm
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    boxSizing: 'border-box',
    padding: '12px 14px',
    borderRadius: '10px',
    background: '#f8fafc',
    border: '1px solid #cbd5e1',
    color: '#0f172a',
    fontSize: '0.9rem',
    outline: 'none',
    fontWeight: 700,
    fontFamily: 'Inter, system-ui, sans-serif'
  };

  const backButtonStyle: React.CSSProperties = {
    flex: 1,
    padding: '14px',
    borderRadius: '12px',
    background: 'white',
    border: '1px solid #e2e8f0',
    color: '#64748b',
    fontWeight: 800,
    fontSize: '0.9rem',
    cursor: 'pointer',
    transition: 'all 0.2s'
  };

  const nextButtonStyle: React.CSSProperties = {
    flex: 2,
    padding: '14px',
    borderRadius: '12px',
    background: 'linear-gradient(135deg, #eab308 0%, #ca8a04 100%)',
    border: 'none',
    color: '#0f172a',
    fontWeight: 800,
    fontSize: '0.9rem',
    cursor: 'pointer',
    boxShadow: '0 8px 20px rgba(234, 179, 8, 0.2)',
    transition: 'all 0.2s',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px'
  };

  // Secret Master Admin click combo state
  const [logoClicks, setLogoClicks] = useState(0);
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [adminUsernameInput, setAdminUsernameInput] = useState('');
  const [adminPasswordInput, setAdminPasswordInput] = useState('');
  const [adminLoginLoading, setAdminLoginLoading] = useState(false);

  // Teacher check-in choice modal state
  const [showTeacherChoiceModal, setShowTeacherChoiceModal] = useState(false);
  const [pendingTeacherUser, setPendingTeacherUser] = useState<{ user: any; isWithinAnyRoom: boolean } | null>(null);

  // Reset logo clicks after 3 seconds of inactivity
  useEffect(() => {
    if (logoClicks > 0) {
      const timer = setTimeout(() => setLogoClicks(0), 3000);
      return () => clearTimeout(timer);
    }
  }, [logoClicks]);

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminUsernameInput.trim() || !adminPasswordInput.trim()) return;
    try {
      setAdminLoginLoading(true);
      setError(null);
      
      const { data: user, error: userErr } = await supabase
        .rpc('login_master_admin', {
          p_username: adminUsernameInput.trim(),
          p_password: adminPasswordInput.trim()
        });

      if (userErr || !user) {
        throw new Error('Ungültige Master-Admin Anmeldedaten.');
      }

      console.log('[Login] Master Admin logged in with credentials.');
      setShowAdminModal(false);
      
      // Clean inputs
      setAdminUsernameInput('');
      setAdminPasswordInput('');
      
      finalizeLogin(user, null, true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setAdminLoginLoading(false);
    }
  };

  // Onboarding parameters for invited school coaches
  const urlParams = new URLSearchParams(window.location.search);
  const inviteSchoolId = urlParams.get('invite_school_id');
  const inviteRole = urlParams.get('role') || 'teacher';
  const schoolIdParam = urlParams.get('school_id');
  const schoolParam = urlParams.get('school') || urlParams.get('subdomain');
  
  const [schoolName, setSchoolName] = useState<string>('');
  const [schoolData, setSchoolData] = useState<any>(null);
  const [logoTheme, setLogoTheme] = useState<'light' | 'dark'>('light');



  useEffect(() => {
    if (!schoolData?.logo_url) return;
    
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          setLogoTheme('light');
          return;
        }
        
        canvas.width = 30;
        canvas.height = 30;
        ctx.drawImage(img, 0, 0, 30, 30);
        
        const imgData = ctx.getImageData(0, 0, 30, 30);
        const data = imgData.data;
        
        let darkPixels = 0;
        let lightPixels = 0;
        let totalCount = 0;
        
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          const a = data[i + 3];
          
          if (a > 50) { // Opaque enough
            const brightness = 0.299 * r + 0.587 * g + 0.114 * b;
            if (brightness < 140) { // Dark pixel threshold
              darkPixels++;
            } else {
              lightPixels++;
            }
            totalCount++;
          }
        }
        
        if (totalCount > 0) {
          // If more dark pixels than light pixels, it's a dark logo -> needs light background
          if (darkPixels > lightPixels) {
            setLogoTheme('light');
          } else {
            setLogoTheme('dark');
          }
        } else {
          setLogoTheme('light');
        }
      } catch (err) {
        console.warn("[Logo Analysis] CORS or canvas read error, defaulting to light background:", err);
        setLogoTheme('light');
      }
    };
    img.onerror = () => {
      setLogoTheme('light');
    };
    img.src = schoolData.logo_url;
  }, [schoolData?.logo_url]);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [registeredUser, setRegisteredUser] = useState<any>(null);
  const [loadingSchool, setLoadingSchool] = useState(false);
  const [signingUp, setSigningUp] = useState(false);
  const [userPos, setUserPos] = useState<{lat: number, lng: number} | null>(null);
  const [showPermissionHelp, setShowPermissionHelp] = useState(false);
  


  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const qrToken = urlParams.get('qr_token') || urlParams.get('teacher_qr_token');
    if (qrToken && !loading) {
      console.log('[Login] Auto-logging in via URL qr_token/teacher_qr_token:', qrToken);
      handlePinLogin(qrToken);
    }
  }, [schoolData]);

  useEffect(() => {
    if (schoolData && !hasAutoCheckedPlatform) {
      const urlParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
      const platParam = urlParams?.get('platform');
      const hasCampus = schoolData.has_campus_subscription !== false;
      
      if (platParam === 'campus' || (hasCampus && platParam !== 'groovelab')) {
        setIsGroovelabKiosk(false);
        localStorage.setItem('groovelab_active_platform', 'campus');
      } else if (!hasCampus || platParam === 'groovelab') {
        setIsGroovelabKiosk(true);
        localStorage.setItem('groovelab_active_platform', 'groovelab');
      }
      setHasAutoCheckedPlatform(true);
    }
  }, [schoolData, hasAutoCheckedPlatform]);

  const [availableInstruments, setAvailableInstruments] = useState<string[]>([]);

  useEffect(() => {
    async function fetchSubjects() {
      try {
        const { data, error } = await supabase
          .rpc('get_active_subjects', { target_school_id: schoolData?.id || null });
        
        if (data) {
          setAvailableInstruments(data.map((s: any) => s.name));
        }
      } catch (err) {
        console.error('Failed to fetch subjects:', err);
      }
    }
    fetchSubjects();
  }, [schoolData?.id]);

  let effectiveStationId = kioskStationId || localStorage.getItem('groovelab_station_id');
  if (effectiveStationId === 'skip') effectiveStationId = null;
  const loginStationId = isGroovelabKiosk ? (selectedKioskStationId || effectiveStationId) : null;

  useEffect(() => {
    async function loadSchoolInfo() {
      try {
        setLoadingSchool(true);

        const urlParams = new URLSearchParams(window.location.search);
        const schoolIdParam = urlParams.get('school_id') || urlParams.get('schoolId') || (typeof window !== 'undefined' ? localStorage.getItem('groovelab_last_school_id') : null);
        const inviteSchoolId = urlParams.get('invite_school_id');

        // 1. Direct school_id parameter match (highest priority)
        if (schoolIdParam) {
          const { data, error } = await supabase.from('schools').select('*').eq('id', schoolIdParam).maybeSingle();
          if (!error && data) {
            setSchoolName(data.name);
            setSchoolData(data);
            localStorage.setItem('groovelab_last_school_id', data.id);
            if (data.subdomain) localStorage.setItem('groovelab_last_subdomain', data.subdomain);
            return;
          }
        }

        if (inviteSchoolId) {
          const inviteToken = urlParams.get('token');
          if (inviteToken) {
            sessionStorage.setItem('groovelab_qr_token', inviteToken);
            localStorage.setItem('groovelab_kiosk_token', inviteToken);
          }
          const { data, error } = await supabase.from('schools').select('*').eq('id', inviteSchoolId).maybeSingle();
          if (!error && data) {
            setSchoolName(data.name);
            setSchoolData(data);
            localStorage.setItem('groovelab_last_school_id', data.id);
            if (data.subdomain) localStorage.setItem('groovelab_last_subdomain', data.subdomain);
            const validToken = data.secretary_onboarding_token || data.groovelab_kiosk_token || data.campus_login_token || inviteToken;
            if (validToken) {
              sessionStorage.setItem('groovelab_qr_token', validToken);
              localStorage.setItem('groovelab_kiosk_token', validToken);
            }
            return;
          }
        }

        // Subdomain resolution logic
        const getSubdomain = () => {
          const host = window.location.hostname;
          let sub = null;
          
          // If the hostname ends with the platform's main domain, strip it to isolate the subdomain
          const mainDomains = ['.campus-groovelab.de', '.groovelab.de', '.campus-groovelab.com'];
          for (const domain of mainDomains) {
            if (host.endsWith(domain)) {
              sub = host.substring(0, host.length - domain.length);
              break;
            }
          }
          
          if (!sub) {
            const parts = host.split('.');
            if (parts.length >= 3) {
              const first = parts[0];
              if (first !== 'www' && first !== 'admin' && first !== 'campus-groovelab') {
                sub = first;
              }
            } else if (parts.length === 2 && parts[1] === 'localhost') {
              sub = parts[0];
            }
          }

          if (!sub) {
            sub = urlParams.get('school') || urlParams.get('subdomain');
          }

          if (sub) {
            return sub.toLowerCase().trim();
          }

          return null;
        };

        const subdomain = getSubdomain();

        if (subdomain) {
          const { data: allSchools, error: allSchoolsErr } = await supabase.from('schools').select('*');
          if (!allSchoolsErr && allSchools) {
            const cleanSub = subdomain.toLowerCase().trim();

            // 1. Try exact ID match or exact subdomain match first
            let matchedSchool = allSchools.find(s => 
              s.id === cleanSub || (s.subdomain && s.subdomain.toLowerCase().trim() === cleanSub)
            );

            // 2. Fallback to slugified name match if exact subdomain match not found
            if (!matchedSchool) {
              const slugify = (name: string) => {
                return name
                  .toLowerCase()
                  .trim()
                  .replace(/[äöüß]/g, (match) => {
                    const mapping: Record<string, string> = { 'ä': 'ae', 'ö': 'oe', 'ü': 'ue', 'ß': 'ss' };
                    return mapping[match] || match;
                  })
                  .replace(/[^a-z0-9]/g, '-')
                  .replace(/-+/g, '-')
                  .replace(/^-+|-+$/g, '');
              };

              matchedSchool = allSchools.find(s => {
                const slug = slugify(s.name);
                return slug === cleanSub || slug.replace(/-/g, '') === cleanSub.replace(/-/g, '');
              });
            }

            if (matchedSchool) {
              setSchoolName(matchedSchool.name);
              setSchoolData(matchedSchool);
              localStorage.setItem('groovelab_last_school_id', matchedSchool.id);
              if (matchedSchool.subdomain) localStorage.setItem('groovelab_last_subdomain', matchedSchool.subdomain);
              return;
            }
          }
        }

        if (effectiveStationId) {
          const { data: stData, error: stError } = await supabase
            .from('stations')
            .select('rooms(schools(*))')
            .eq('id', effectiveStationId)
            .maybeSingle() as any;
            
          if (!stError && stData?.rooms?.schools) {
            const sc = Array.isArray(stData.rooms.schools) ? stData.rooms.schools[0] : stData.rooms.schools;
            if (sc) {
              setSchoolName(sc.name);
              setSchoolData(sc);
              return;
            }
          }
        }

        const kioskToken = localStorage.getItem('groovelab_kiosk_token');
        if (kioskToken) {
          console.log('[Login] Resolving school via groovelab_kiosk_token...');
          const { data: kData, error: kError } = await supabase
            .from('kiosks')
            .select('school_id')
            .eq('secret_token', kioskToken)
            .maybeSingle() as any;
            
          if (!kError && kData?.school_id) {
            const { data: sc, error: scErr } = await supabase
              .from('schools')
              .select('*')
              .eq('id', kData.school_id)
              .maybeSingle();
            if (!scErr && sc) {
              setSchoolName(sc.name);
              setSchoolData(sc);
            }
          }
        }
      } catch (err) {
        console.error("Error loading school info:", err);
      } finally {
        setLoadingSchool(false);
      }
    }
    loadSchoolInfo();
  }, [inviteSchoolId, effectiveStationId, schoolIdParam, schoolParam]);

  const finalizeLogin = async (user: any, stationId: string | null, isWithinAnyRoom: boolean, hidePresence = false) => {
    try {
      setLoading(true);
      const effectiveSchool = schoolData || (Array.isArray(user.schools) ? user.schools[0] : user.schools);
      if (isGroovelabKiosk && effectiveSchool?.groovelab_kiosk_token) {
        localStorage.setItem('groovelab_kiosk_token', effectiveSchool.groovelab_kiosk_token);
      }
      const rolesArray = Array.isArray(user.roles) ? user.roles : [];
      const hasAdminRole = rolesArray.includes('admin');
      const hasSecretaryRole = rolesArray.includes('secretary');
      if ((hasAdminRole || hasSecretaryRole) && user.role !== 'admin' && user.role !== 'secretary') {
        const newRole = hasAdminRole ? 'admin' : 'secretary';
        console.log(`[Role Auto-Switch] User has admin/secretary roles but active role is ${user.role}. Forcing auto-switch to ${newRole}`);
        await supabase
          .from('users')
          .update({ role: newRole })
          .eq('id', user.id);
        user.role = newRole;
      }

      let finalStationId = null;
      let isHome = false;

      const userSchool = Array.isArray(user.schools) ? user.schools[0] : user.schools;
      const isMaster = user.is_master_admin === true;



      const isAdminOrSecretary = user.role?.toLowerCase() === 'admin' || user.role?.toLowerCase() === 'secretary';
      const isTeacher = user.role?.toLowerCase() === 'teacher' || isAdminOrSecretary;
      
      if (!isMaster) {
        if (!isAdminOrSecretary) {
          const isTrial = userSchool?.is_trial ?? false;

          // Contract start date & booking check bypassed for timetable onboarding/design

          // Check school's module subscriptions based on active login portal
          const hasCampusSub = userSchool?.has_campus_subscription ?? false;
          const hasGroovelabSub = userSchool?.has_groovelab_subscription ?? false;

          if (isGroovelabKiosk) {
            if (!hasGroovelabSub && !isTrial) {
              alert("Login verweigert. Das GrooveLab App Modul ist für diese Schule aktuell nicht aktiv.");
              await supabase.auth.signOut();
              setLoading(false);
              return;
            }
          } else {
            if (!hasCampusSub && !isTrial) {
              alert("Login verweigert. Das Campus Modul ist für diese Schule aktuell nicht aktiv.");
              await supabase.auth.signOut();
              setLoading(false);
              return;
            }
          }

          // Enforce activation check (must have at least one active module)
          if (!user.is_campus_active && !user.is_groovelab_active) {
            if (user.role === 'student') {
              const tokenToUse = user.qr_token || user.ausweis_nummer || user.id;
              sessionStorage.setItem('groovelab_user_id', user.id);
              window.location.replace(`${window.location.origin}/qr/${tokenToUse}`);
              setLoading(false);
              return;
            } else {
              alert("Dein Zugang ist nicht aktiv. Bitte wende dich an deine Musikschule.");
              await supabase.auth.signOut();
              setLoading(false);
              return;
            }
          }

          // Enforce strict separation: Campus-Login strictly loads Campus, GrooveLab-Login strictly loads GrooveLab
          if (isGroovelabKiosk) {
            if (!user.is_groovelab_active) {
              if (user.is_campus_active && user.role === 'student') {
                localStorage.setItem('groovelab_active_platform', 'campus');
              } else {
                const tokenToUse = user.qr_token || user.ausweis_nummer || user.id;
                sessionStorage.setItem('groovelab_user_id', user.id);
                window.location.replace(`${window.location.origin}/qr/${tokenToUse}`);
                setLoading(false);
                return;
              }
            } else {
              localStorage.setItem('groovelab_active_platform', 'groovelab');
            }
          } else {
            if (!user.is_campus_active) {
              if (user.is_groovelab_active && user.role === 'student') {
                localStorage.setItem('groovelab_active_platform', 'groovelab');
              } else {
                const tokenToUse = user.qr_token || user.ausweis_nummer || user.id;
                sessionStorage.setItem('groovelab_user_id', user.id);
                window.location.replace(`${window.location.origin}/qr/${tokenToUse}`);
                setLoading(false);
                return;
              }
            } else {
              localStorage.setItem('groovelab_active_platform', 'campus');
              if (user.role === 'student' || user.role === 'teacher') {
                localStorage.setItem('campus_active_tab', 'briefing');
              }
            }
          }
        } else {
          // Admins and secretaries bypass activation flags and always land in the administration module under briefing
          localStorage.setItem('groovelab_active_workspace', 'secretary');
          localStorage.setItem('groovelab_active_platform', 'campus');
          localStorage.setItem('campus_active_tab', 'briefing');
          if (user.role === 'secretary') {
            localStorage.setItem('groovelab_secretary_subtab', 'briefing');
          }
        }

        // Enforce school matching check for students using component-level schoolData state or userSchool fallback
        if (user.role === 'student') {
          const effectiveSchool = schoolData || userSchool;
          if (!effectiveSchool?.id) {
            alert("Login verweigert. Für den Schüler-Login wird ein zugehöriger Schul-Link benötigt.");
            localStorage.removeItem('groovelab_station_id');
            await supabase.auth.signOut();
            setLoading(false);
            return;
          }
          const isFinalSchoolMatch = user.school_id === effectiveSchool.id || (isMusaekSchool(user.school_id) && isMusaekSchool(effectiveSchool.id));
          if (!isFinalSchoolMatch) {
            alert("Login verweigert. Dieser Login-Link gehört nicht zu deiner Schule. Kiosk-Station wurde zurückgesetzt.");
            localStorage.removeItem('groovelab_station_id');
            await supabase.auth.signOut();
            setLoading(false);
            return;
          }
        }

        if (userSchool?.is_paused || userSchool?.status === 'suspended') {
          alert("Login ist aktuell nicht möglich (Status gesperrt oder pausiert).");
          await supabase.auth.signOut();
          setLoading(false);
          return;
        } else if (userSchool?.is_trial && userSchool?.trial_ends_at) {
          const trialEnd = new Date(userSchool.trial_ends_at).getTime();
          const nowMs = new Date().getTime();
          if (nowMs > trialEnd) {
            alert("Login ist aktuell nicht möglich (Probezeit abgelaufen).");
            await supabase.auth.signOut();
            setLoading(false);
            return;
          }
        } else if (!userSchool?.is_trial && userSchool?.contract_ends_at) {
          const contractEnd = new Date(userSchool.contract_ends_at).getTime();
          const nowMs = new Date().getTime();
          if (nowMs > contractEnd) {
            alert("Login ist aktuell nicht möglich (Vertrag abgelaufen).");
            await supabase.auth.signOut();
            setLoading(false);
            return;
          }
        } else if (user.status === 'bypass') {
          alert("Dein Login ist aktuell gesperrt.");
          await supabase.auth.signOut();
          setLoading(false);
          return;
        } else if (user.is_trial && user.trial_ends_at) {
          const trialEnd = new Date(user.trial_ends_at).getTime();
          const nowMs = new Date().getTime();
          if (nowMs > trialEnd) {
            alert("Dein Login ist aktuell nicht möglich (Probezeit abgelaufen).");
            await supabase.auth.signOut();
            setLoading(false);
            return;
          }
        } else if (user.role !== 'student' && !user.is_trial && user.contract_ends_at) {
          const contractEnd = new Date(user.contract_ends_at).getTime();
          const nowMs = new Date().getTime();
          if (nowMs > contractEnd) {
            alert("Dein Login ist aktuell nicht möglich (Vertrag abgelaufen).");
            await supabase.auth.signOut();
            setLoading(false);
            return;
          }
        }
      }
      
      const now = new Date().toISOString();
      
      if (isTeacher) {
        if (hidePresence) {
          sessionStorage.setItem('groovelab_teacher_hide_presence', 'true');
        } else {
          sessionStorage.setItem('groovelab_teacher_hide_presence', 'false');
        }
      }

      const isCampus = !isGroovelabKiosk;
      
      // 1. Determine finalStationId and lookup teacher station if needed (only for GrooveLab kiosks)
      if (isTeacher && !isCampus) {
        const schoolId = user.school_id || (Array.isArray(user.schools) ? user.schools[0]?.id : user.schools?.id);
        const { data: tStations } = await supabase
          .from('stations')
          .select('id, room_id, name, rooms!inner(school_id)')
          .eq('name', 'Lehrer iPad')
          .eq('rooms.school_id', schoolId);
 
        if (tStations && tStations.length > 0) {
          let matchedStation = null;
          if (stationId) {
            const { data: scanSt } = await supabase.from('stations').select('room_id').eq('id', stationId).maybeSingle();
            if (scanSt?.room_id) {
              matchedStation = tStations.find(s => s.room_id === scanSt.room_id);
            }
          }
          finalStationId = (matchedStation || tStations[0]).id;
        } else {
          finalStationId = null;
        }
      } else {
        if (stationId && !isCampus) {
          const { data: curStation } = await supabase.from('stations').select('name').eq('id', stationId).maybeSingle();
          const stationName = curStation?.name?.toLowerCase() || '';
          if (stationName.includes('lehrer') || stationName.includes('teacher')) {
            alert("Login verweigert. Am Lehrer-iPad dürfen sich Schüler nicht einloggen.");
            await supabase.auth.signOut();
            setLoading(false);
            return;
          } else {
            finalStationId = stationId;
          }
        } else {
          finalStationId = null;
        }
      }
 
      // Geofence check
      // For Campus logins, we always bypass geofencing and sessions (force isHome = true).
      // For GrooveLab kiosk logins, we only force Home mode if teachers chose to hide presence or users are outside geofence.
      const shouldForceHome = isCampus || (isTeacher ? hidePresence : (!isWithinAnyRoom));
      if (shouldForceHome) {
        console.log(`[Login] Outside geofence, Campus platform or hiding presence. Forcing Home mode.`);
        isHome = true;
        finalStationId = null;
      }

      // Set user_id immediately so customFetch interceptor injects user_id into x-client-info for RLS authorization
      if (user?.id) {
        sessionStorage.setItem('groovelab_user_id', user.id);
        localStorage.setItem('groovelab_user_id', user.id);
      }

      // 1.5 Check opening hours for sessions (Students only) - Bypassed per user request
      const withinHours = true;
      const enforceHours = false;
      console.log('[Login] Opening hours check bypassed.');


      console.log(`[Login] Final Station ID: ${finalStationId}, isHome: ${isHome}, withinHours: ${withinHours}`);

      // Save station ID to localStorage based on geofence & check-in result
      const activePlatform = localStorage.getItem('groovelab_active_platform') || 'groovelab';
      if (activePlatform === 'groovelab') {
        if (isHome) {
          localStorage.removeItem('groovelab_station_id');
        } else {
          if (finalStationId) {
            localStorage.setItem('groovelab_station_id', finalStationId);
          } else {
            localStorage.setItem('groovelab_station_id', 'skip');
          }
        }
      }

      // 2. Session Management (Only for Academy/Lab sessions)
      // 2. Global Cleanup & Station Cleanup in parallel
      if (!isCampus) {
        let isTeacherStation = false;
        if (!isHome && finalStationId) {
          const { data: stData } = await supabase.from('stations').select('name').eq('id', finalStationId).maybeSingle();
          const nameLower = stData?.name?.toLowerCase() || '';
          if (nameLower.includes('lehrer') || nameLower.includes('teacher')) {
            isTeacherStation = true;
          }
        }

        await Promise.all([
          supabase.from('sessions').update({ check_out_time: now }).eq('user_id', user.id).is('check_out_time', null),
          (!isHome && finalStationId && !isTeacherStation)
            ? supabase.from('sessions').update({ check_out_time: now }).eq('station_id', finalStationId).is('check_out_time', null)
            : Promise.resolve()
        ]);
        if (!isHome) {
          const { data: sess, error: sessErr } = await supabase
            .from('sessions')
            .insert({
              user_id: user.id,
              station_id: finalStationId,
              gps_verified: true,
              check_in_time: now
            })
            .select()
            .single();

          if (sessErr) {
            console.error('[Login] Error creating session:', sessErr);
            alert('Fehler beim Erstellen der Sitzung: ' + sessErr.message);
          } else {
            console.log('[Login] Session created successfully:', sess.id);
          }
        } else {
          console.log(`[Login] Home mode detected. No new session created.`);
        }
      } else {
        console.log('[Login] Campus login: Bypassing session cleanup and creation, checking out any active sessions.');
        await supabase.from('sessions').update({ check_out_time: now }).eq('user_id', user.id).is('check_out_time', null);
      }

      sessionStorage.setItem('groovelab_user_id', user.id);
      sessionStorage.setItem('groovelab_location_mode', isHome ? 'home' : 'lab');
      setLoading(false);
      
       onLogin(user.id, isHome, finalStationId);
    } catch (err: any) {
      console.error('[Login] Finalize error:', err.message);
      sessionStorage.removeItem('groovelab_user_id');
      sessionStorage.removeItem('groovelab_location_mode');
      setError(err.message);
      setLoading(false);
    }
  };

  const [prefetchedRooms, setPrefetchedRooms] = useState<any[] | null>(null);

  // Pre-fetch rooms for the current station's school to save time during scan
  useEffect(() => {
    async function prefetch() {
      if (!effectiveStationId) return;
      try {
        // Find the school_id for this station
        const { data: stationData } = await supabase
          .from('stations')
          .select('rooms(school_id)')
          .eq('id', effectiveStationId)
          .single();
        
        const schoolId = (stationData?.rooms as any)?.school_id;
        if (schoolId) {
          const activePlatform = localStorage.getItem('groovelab_active_platform') || 'groovelab';
          let roomsQuery = supabase.from('rooms').select('*').eq('school_id', schoolId);
          if (activePlatform === 'campus') {
            roomsQuery = roomsQuery.eq('is_campus_active', true);
          } else {
            roomsQuery = roomsQuery.eq('is_groovelab_active', true);
          }
          const { data: rooms } = await roomsQuery.order('sort_order', { ascending: true });
          setPrefetchedRooms(rooms);
          console.log(`[Login] Pre-fetched ${rooms?.length} rooms for school: ${schoolId}`);
        }
      } catch (e) {
        console.warn('[Login] Pre-fetch failed', e);
      }
    }
    prefetch();
  }, [effectiveStationId]);

  // Fetch name of the coupled station from Supabase
  useEffect(() => {
    if (!effectiveStationId) {
      setCoupledStationName(null);
      setCoupledStationColor(null);
      return;
    }
    async function fetchStationName() {
      try {
        const { data, error } = await supabase
          .from('stations')
          .select('name, color')
          .eq('id', effectiveStationId)
          .maybeSingle();
        if (!error && data) {
          setCoupledStationName(data.name);
          setCoupledStationColor(data.color || null);
        }
      } catch (err) {
        console.error("Error fetching coupled station name:", err);
      }
    }
    fetchStationName();
  }, [effectiveStationId]);

  // Fetch rooms and stations for the Kiosk activator when schoolData is resolved (or query all active if not set yet)
  useEffect(() => {
    if (!isGroovelabKiosk || !schoolData?.id) return;
    async function fetchKioskData() {
      try {
        setLoadingKioskData(true);
        // The Kiosk Activator is always for GrooveLab Kiosks, so we fetch groovelab-active rooms
        let roomsQuery = supabase.from('rooms').select('*').eq('is_groovelab_active', true);
        if (schoolData?.id) {
          roomsQuery = roomsQuery.eq('school_id', schoolData.id);
        }
        const [roomsRes, stationsRes, sessionsRes] = await Promise.all([
          roomsQuery.order('sort_order', { ascending: true }),
          supabase.from('stations').select('*').order('name'),
          supabase.from('sessions').select('station_id').is('check_out_time', null)
        ]);
        
        const rData = roomsRes.data || [];
        setKioskRooms(rData);
        if (rData.length > 0) {
          setKioskSelectedRoomId(rData[0].id);
        }
        
        const roomIds = rData.map((r: any) => r.id);
        setKioskStations((stationsRes.data || []).filter((s: any) => roomIds.includes(s.room_id)));
        setActiveSessionStationIds((sessionsRes.data || []).map((s: any) => s.station_id));
      } catch (err) {
        console.error("Error fetching kiosk activator data:", err);
      } finally {
        setLoadingKioskData(false);
      }
    }
    fetchKioskData();
  }, [schoolData, isGroovelabKiosk]);

  // Pre-emptively request geolocation when GrooveLab Kiosk mode is active (ONLY on Login screen, NEVER during registration)
  useEffect(() => {
    if (!inviteSchoolId && isGroovelabKiosk && navigator.geolocation) {
      console.log('[Geofence] Pre-emptively fetching location to acquire permission...');
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setUserPos(coords);
          console.log('[Geofence] Pre-emptive location fetch successful:', coords);
        },
        (err) => {
          console.warn('[Geofence] Pre-emptive location fetch failed or denied:', err);
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 }
      );
    }
  }, [isGroovelabKiosk, inviteSchoolId]);


  const handleKeypadPress = (val: string, type: 'setup' | 'verify') => {
    if (type === 'setup') {
      if (val === 'back') {
        setPinSetupInput(prev => prev.slice(0, -1));
      } else if (pinSetupInput.length < 4) {
        setPinSetupInput(prev => prev + val);
      }
    } else {
      const limit = pinVerificationUser?.role === 'student' ? 2 : 4;
      if (val === 'back') {
        setPinVerificationInput(prev => prev.slice(0, -1));
      } else if (pinVerificationInput.length < limit) {
        setPinVerificationInput(prev => prev + val);
      }
    }
  };

  const renderKeypad = (type: 'setup' | 'verify') => {
    const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', '⌫'];
    return (
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '12px',
        width: '100%',
        maxWidth: '280px',
        margin: '20px auto 0 auto'
      }}>
        {keys.map((k) => {
          return (
            <button
              key={k}
              type="button"
              onClick={() => {
                if (k === 'C') {
                  if (type === 'setup') setPinSetupInput('');
                  else setPinVerificationInput('');
                } else if (k === '⌫') {
                  handleKeypadPress('back', type);
                } else {
                  handleKeypadPress(k, type);
                }
              }}
              style={{
                height: '56px',
                borderRadius: '16px',
                border: '1px solid #e2e8f0',
                background: '#f8fafc',
                color: '#0f172a',
                fontSize: '1.25rem',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.15s ease',
                outline: 'none',
                boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
              }}
            >
              {k}
            </button>
          );
        })}
      </div>
    );
  };

  const handleParentVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!parentFirstName.trim() || !parentLastName.trim() || !parentInstrument.trim() || !parentDayOfBirth.trim()) {
      setParentOnboardingError('Bitte fülle alle Pflichtfelder aus.');
      return;
    }
    
    const dayNum = parseInt(parentDayOfBirth);
    if (isNaN(dayNum) || dayNum < 1 || dayNum > 31) {
      setParentOnboardingError('Der Geburtstagstag muss zwischen 1 und 31 liegen.');
      return;
    }

    setParentOnboardingLoading(true);
    setParentOnboardingError(null);

    try {
      const { data, error } = await supabase.rpc('verify_onboarding', {
        input_first_name: parentFirstName.trim(),
        input_last_name: parentLastName.trim(),
        input_instrument: parentInstrument.trim(),
        input_day: dayNum
      });

      if (error) throw error;

      const result = Array.isArray(data) ? data[0] : data;

      if (result && result.success) {
        setVerifiedStudentId(result.student_id);
        
        // Check student status and pre-load entries if already onboarded
        const { data: studentRow } = await supabase
          .from('students')
          .select('status, parent_notes')
          .eq('id', result.student_id)
          .single();

        const isAlreadyDone = studentRow ? studentRow.status !== 'ausstehend' : false;
        setIsAlreadyOnboarded(isAlreadyDone);

        if (studentRow?.parent_notes) {
          setParentNotes(studentRow.parent_notes);
        } else {
          setParentNotes('');
        }

        // Fetch existing schedule preferences if any
        const { data: prefSlots } = await supabase
          .from('student_schedule_preferences')
          .select('day_of_week, start_time, end_time, preference_type')
          .eq('student_id', result.student_id);

        const loadedSlots: { [key: string]: 'wunsch' | 'gesperrt' } = {};
        prefSlots?.forEach(slot => {
          const startTimeClean = slot.start_time.substring(0, 5);
          const cellKey = `${slot.day_of_week}-${startTimeClean}`;
          loadedSlots[cellKey] = slot.preference_type as 'wunsch' | 'gesperrt';
        });
        setSelectedSlots(loadedSlots);

        // Get school_id and sibling_group_id
        const { data: mainStudentData } = await supabase
          .from('users')
          .select('school_id, sibling_group_id, birth_date')
          .eq('id', result.student_id)
          .single();

        const currentSchoolId = mainStudentData?.school_id || null;
        setSchoolId(currentSchoolId);

        const initialChildren: SiblingChild[] = [{
          id: result.student_id,
          first_name: parentFirstName.trim(),
          last_name: parentLastName.trim(),
          instrument: parentInstrument.trim(),
          birth_date: mainStudentData?.birth_date || undefined,
          selectedSlots: loadedSlots,
          isNew: false
        }];

        if (mainStudentData?.sibling_group_id) {
          const { data: siblingsData } = await supabase
            .from('users')
            .select('id, first_name, last_name, instrument, birth_date')
            .eq('sibling_group_id', mainStudentData.sibling_group_id)
            .neq('id', result.student_id);

          if (siblingsData && siblingsData.length > 0) {
            for (const s of siblingsData) {
              const { data: sAvails } = await supabase
                .from('student_schedule_preferences')
                .select('day_of_week, start_time, end_time, preference_type')
                .eq('student_id', s.id);

              const sSlots: {[key: string]: 'wunsch' | 'gesperrt'} = {};
              sAvails?.forEach(slot => {
                const startTimeClean = slot.start_time.substring(0, 5);
                const cellKey = `${slot.day_of_week}-${startTimeClean}`;
                sSlots[cellKey] = slot.preference_type as 'wunsch' | 'gesperrt';
              });

              initialChildren.push({
                id: s.id,
                first_name: s.first_name || '',
                last_name: s.last_name || '',
                instrument: s.instrument || '',
                birth_date: s.birth_date || undefined,
                selectedSlots: sSlots,
                isNew: false
              });
            }
          }
        }

        setParentChildren(initialChildren);
        setActiveParentChildIndex(0);
        setSibLastName(parentLastName.trim());

        sessionStorage.setItem('groovelab_user_id', result.student_id);
        setVerifiedStudentDetails({
          first_name: parentFirstName.trim(),
          last_name: parentLastName.trim(),
          instrument: parentInstrument.trim(),
          id: result.student_id,
          qr_token: result.qr_token
        });

        // Since verify_onboarding returned success and we don't have a PIN set yet, they go to setup-pin step
        setIsPinSetupNeeded(true);
        setParentOnboardingStep('setup-pin');
      } else if (result && result.message === 'pin_required') {
        setVerifiedStudentId(result.student_id);
        setIsPinSetupNeeded(false);
        setParentOnboardingStep('pin');
        sessionStorage.setItem('groovelab_user_id', result.student_id);
        setVerifiedStudentDetails({
          first_name: parentFirstName.trim(),
          last_name: parentLastName.trim(),
          instrument: parentInstrument.trim(),
          id: result.student_id
        });

        // 2-Wochen-Sicherheitsregel prüfen
        const { data: studentRow } = await supabase
          .from('students')
          .select('timetable_assigned_at')
          .eq('id', result.student_id)
          .single();
        if (studentRow?.timetable_assigned_at) {
          const assignedDate = new Date(studentRow.timetable_assigned_at);
          const diffTime = Math.abs(new Date().getTime() - assignedDate.getTime());
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          if (diffDays > 14) {
            setIsResetAllowed(false);
          } else {
            setIsResetAllowed(true);
          }
        } else {
          setIsResetAllowed(true);
        }
      } else if (result && result.message === 'frozen') {
        setVerifiedStudentId(result.student_id);
        setParentOnboardingStep('frozen');
      } else {
        setParentOnboardingError(result?.message || 'Eingabe überprüfen.');
      }
    } catch (err: any) {
      console.error('Verification error:', err);
      setParentOnboardingError(err.message || 'Ein unerwarteter Fehler ist aufgetreten.');
    } finally {
      setParentOnboardingLoading(false);
    }
  };

  const [isResetAllowed, setIsResetAllowed] = useState(true);

  const handleVerifyPin = async () => {
    if (!verifiedStudentId) return;
    const pinStr = onboardingPin.join('');
    if (pinStr.length < 4) {
      setParentOnboardingError('Bitte gib die 4-stellige PIN vollständig ein.');
      return;
    }

    setParentOnboardingLoading(true);
    setParentOnboardingError(null);

    try {
      const { data, error } = await supabase.rpc('verify_onboarding_pin', {
        input_student_id: verifiedStudentId,
        input_pin: pinStr
      });

      if (error) throw error;
      const result = Array.isArray(data) ? data[0] : data;

      if (result && result.success) {
        const { data: studentRow } = await supabase
          .from('students')
          .select('status, parent_notes')
          .eq('id', verifiedStudentId)
          .single();

        const isAlreadyDone = studentRow ? studentRow.status !== 'ausstehend' : false;
        setIsAlreadyOnboarded(isAlreadyDone);
        setParentNotes(studentRow?.parent_notes || '');

        const { data: prefSlots } = await supabase
          .from('student_schedule_preferences')
          .select('day_of_week, start_time, end_time, preference_type')
          .eq('student_id', verifiedStudentId);

        const loadedSlots: { [key: string]: 'wunsch' | 'gesperrt' } = {};
        setSelectedSlots({});

        const { data: mainStudentData } = await supabase
          .from('users')
          .select('school_id, sibling_group_id, birth_date')
          .eq('id', verifiedStudentId)
          .single();

        const currentSchoolId = mainStudentData?.school_id || null;
        setSchoolId(currentSchoolId);

        const initialChildren: SiblingChild[] = [{
          id: verifiedStudentId,
          first_name: parentFirstName.trim(),
          last_name: parentLastName.trim(),
          instrument: parentInstrument.trim(),
          birth_date: mainStudentData?.birth_date || undefined,
          selectedSlots: loadedSlots,
          isNew: false
        }];

        if (mainStudentData?.sibling_group_id) {
          const { data: siblingsData } = await supabase
            .from('users')
            .select('id, first_name, last_name, instrument, birth_date')
            .eq('sibling_group_id', mainStudentData.sibling_group_id)
            .neq('id', verifiedStudentId);

          if (siblingsData && siblingsData.length > 0) {
            for (const s of siblingsData) {
              const { data: sAvails } = await supabase
                .from('student_schedule_preferences')
                .select('day_of_week, start_time, end_time, preference_type')
                .eq('student_id', s.id);

              const sSlots: {[key: string]: 'wunsch' | 'gesperrt'} = {};
              sAvails?.forEach(slot => {
                const startTimeClean = slot.start_time.substring(0, 5);
                const cellKey = `${slot.day_of_week}-${startTimeClean}`;
                sSlots[cellKey] = slot.preference_type as 'wunsch' | 'gesperrt';
              });

              initialChildren.push({
                id: s.id,
                first_name: s.first_name || '',
                last_name: s.last_name || '',
                instrument: s.instrument || '',
                birth_date: s.birth_date || undefined,
                selectedSlots: sSlots,
                isNew: false
              });
            }
          }
        }

        setParentChildren(initialChildren);
        setActiveParentChildIndex(0);
        setSibLastName(parentLastName.trim());

        if (verifiedStudentId) {
          sessionStorage.setItem('groovelab_user_id', verifiedStudentId);
        }
        setVerifiedStudentDetails({
          first_name: parentFirstName.trim(),
          last_name: parentLastName.trim(),
          instrument: parentInstrument.trim(),
          id: verifiedStudentId
        });

        setIsPinSetupNeeded(false);
        setParentOnboardingStep('preferences');
      } else {
        setParentOnboardingError(result?.message || 'Falsche PIN. Bitte überprüfe deine Eingabe.');
      }
    } catch (err: any) {
      console.error('Verify PIN error:', err);
      setParentOnboardingError(err.message || 'Ein Fehler ist aufgetreten.');
    } finally {
      setParentOnboardingLoading(false);
    }
  };

  const handleFreezeProfile = async () => {
    if (!verifiedStudentId) return;
    setParentOnboardingLoading(true);
    setParentOnboardingError(null);
    try {
      const { data, error } = await supabase.rpc('freeze_onboarding_profile', {
        input_student_id: verifiedStudentId
      });
      if (error) throw error;
      setParentOnboardingStep('frozen');
    } catch (err: any) {
      console.error('Freeze error:', err);
      setParentOnboardingError('Konto konnte nicht gesperrt werden.');
    } finally {
      setParentOnboardingLoading(false);
    }
  };

  const handleParentEmailSubmission = async (e?: React.FormEvent, skipEmail = false) => {
    if (e) e.preventDefault();
    
    const emailToSubmit = skipEmail ? '' : parentEmail.trim();
    if (!skipEmail && !emailToSubmit) {
      setParentOnboardingError('Bitte gib eine gültige E-Mail-Adresse ein.');
      return;
    }

    if (!verifiedStudentId) {
      setParentOnboardingError('Schüler-ID fehlt.');
      return;
    }

    setParentOnboardingLoading(true);
    setParentOnboardingError(null);

    try {
      const { data, error } = await supabase.rpc('complete_onboarding', {
        input_student_id: verifiedStudentId,
        input_email: emailToSubmit
      });

      if (error) throw error;

      // Onboarding complete! The RPC returns the user profile row directly
      const studentUser = Array.isArray(data) ? data[0] : data;

      if (!studentUser) {
        throw new Error('Fehler beim Abrufen des Schülerprofils nach Onboarding.');
      }

      setVerifiedStudentDetails(studentUser);
      setParentOnboardingStep('preferences');
    } catch (err: any) {
      console.error('Email submission error:', err);
      setParentOnboardingError(err.message || 'Aktivierung konnte nicht abgeschlossen werden.');
    } finally {
      setParentOnboardingLoading(false);
    }
  };

  const handleSavePaymentSelection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verifiedStudentId) {
      setParentOnboardingError('Schüler-ID fehlt.');
      return;
    }

    setParentOnboardingLoading(true);
    setParentOnboardingError(null);

    try {
      const { error } = await supabase
        .from('users')
        .update({ student_billing_payment_method: studentPaymentMethod })
        .eq('id', verifiedStudentId);

      if (error) throw error;

      setParentOnboardingStep('preferences');
    } catch (err: any) {
      console.error('Save payment selection error:', err);
      setParentOnboardingError(err.message || 'Die Zahlungsmethode konnte nicht gespeichert werden.');
    } finally {
      setParentOnboardingLoading(false);
    }
  };

  const handleSavePreferences = async () => {
    if (!verifiedStudentId || parentChildren.length === 0) {
      setParentOnboardingError('Schüler-ID oder Kinderdaten fehlen.');
      return;
    }

    let finalPin: string | null = null;
    if (isPinSetupNeeded) {
      const pinStr = newOnboardingPin.join('');
      const confirmStr = newOnboardingPinConfirm.join('');
      if (pinStr.length < 4 || confirmStr.length < 4) {
        setParentOnboardingError('Bitte erstelle eine vollständige 4-stellige PIN und bestätige sie.');
        return;
      }
      if (pinStr !== confirmStr) {
        setParentOnboardingError('Die eingegebenen PINs stimmen nicht überein.');
        return;
      }
      finalPin = pinStr;
    }

    // Validate each child first
    for (let i = 0; i < parentChildren.length; i++) {
      const child = parentChildren[i];
      const childSlots = Object.entries(child.selectedSlots).map(([key, val]) => {
        const [dayStr, startTime] = key.split('-');
        const day = parseInt(dayStr);
        const [hourStr, minStr] = startTime.split(':');
        let hour = parseInt(hourStr);
        let min = parseInt(minStr) + 30;
        if (min >= 60) {
          hour += 1;
          min -= 60;
        }
        const endTime = `${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`;
        return { day_of_week: day, start_time: startTime, end_time: endTime, preference_type: val };
      });

      const wunschSlots = childSlots.filter(s => s.preference_type === 'wunsch');
      if (wunschSlots.length < 2) {
        setParentOnboardingError(`Bitte wähle für ${child.first_name} mindestens zwei Wunschzeit-Slots (grün) aus.`);
        return;
      }

      const totalDurationMinutes = wunschSlots.length * 30;
      if (totalDurationMinutes < 120) {
        setParentOnboardingError(`Die Gesamtdauer der Wunschzeiten für ${child.first_name} muss mindestens 2 Stunden betragen.`);
        return;
      }
    }

    setParentOnboardingLoading(true);
    setParentOnboardingError(null);

    try {
      let siblingGroupId: string | null = null;

      // If we have siblings, create a new sibling group if not exists
      if (parentChildren.length > 1) {
        const { data: userRow } = await supabase
          .from('users')
          .select('sibling_group_id')
          .eq('id', parentChildren[0].id)
          .single();
        
        siblingGroupId = userRow?.sibling_group_id || crypto.randomUUID();
        
        // Update first sibling group id if it was null
        if (!userRow?.sibling_group_id) {
          await supabase.from('users_raw').update({ sibling_group_id: siblingGroupId }).eq('id', parentChildren[0].id);
        }
      }

      // 2. Process each child
      for (let i = 0; i < parentChildren.length; i++) {
        const child = parentChildren[i];
        let currentUserId = child.id;

        // If it's a newly added sibling, insert into database first
        if (child.isNew && !currentUserId) {
          const qrToken = crypto.randomUUID();
          const avatarUrl = getInstrumentAvatarUrl(child.instrument);

          const hasCampus = schoolData?.has_campus_subscription !== false;
          const finalLastName = hasCampus ? child.last_name : (child.last_name?.trim() ? child.last_name.trim().charAt(0).toUpperCase() + '.' : '');
          const finalBirthDate = hasCampus ? (child.birth_date || null) : null;

          const { data: newStud, error: insertError } = await supabase
            .from('users_raw')
            .insert({
              school_id: schoolId,
              role: 'student',
              first_name: child.first_name,
              last_name: finalLastName,
              birth_date: finalBirthDate,
              photo_url: '/avatar_ghost.jpg',
              avatar_url: avatarUrl,
              qr_token: qrToken,
              instrument: child.instrument,
              sibling_group_id: siblingGroupId,
              is_campus_active: true,
              is_groovelab_active: true,
              app_usage_mode: 'student_only'
            })
            .select()
            .single();

          if (insertError) throw insertError;
          currentUserId = newStud.id;

          // Create avatar for new student
          await supabase.from('avatars').upsert({
            user_id: currentUserId,
            avatar_style: 'Premium_Hero',
            instrument_type: child.instrument,
            evolution_level: 1,
            xp: 0,
            asset_path: avatarUrl,
            streak_flame: 0
          });

          // Copy encrypted parent email from Sibling 1
          const { data: emailPref } = await supabase.from('user_email_prefixes').select('*').eq('user_id', parentChildren[0].id).maybeSingle();
          const { data: emailSuff } = await supabase.from('user_email_suffixes').select('*').eq('user_id', parentChildren[0].id).maybeSingle();
          
          if (emailPref) {
            await supabase.from('user_email_prefixes').insert({ user_id: currentUserId, prefix: emailPref.prefix });
          }
          if (emailSuff) {
            await supabase.from('user_email_suffixes').insert({ user_id: currentUserId, suffix: emailSuff.suffix });
          }
        }

        if (!currentUserId) continue;

        // Onboard the student profile
        const { error: completeErr } = await supabase.rpc('complete_onboarding', {
          input_student_id: currentUserId,
          input_email: '',
          input_pin: finalPin
        });
        if (completeErr) throw completeErr;

        // Save preferences
        const childSlots = Object.entries(child.selectedSlots).map(([key, val]) => {
          const [dayStr, startTime] = key.split('-');
          const day = parseInt(dayStr);
          const [hourStr, minStr] = startTime.split(':');
          let hour = parseInt(hourStr);
          let min = parseInt(minStr) + 30;
          if (min >= 60) {
            hour += 1;
            min -= 60;
          }
          const endTime = `${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`;
          return { day_of_week: day, start_time: startTime, end_time: endTime, preference_type: val };
        });

        const { error: savePrefErr } = await supabase.rpc('save_schedule_preferences', {
          input_student_id: currentUserId,
          slots: childSlots
        });
        if (savePrefErr) throw savePrefErr;
      }

      if (parentChildren[0]?.id) {
        sessionStorage.setItem('groovelab_user_id', parentChildren[0].id);
      }
      setParentOnboardingStep('success');
    } catch (err: any) {
      console.error('Save preferences error:', err);
      setParentOnboardingError(err.message || 'Die Termine konnten nicht gespeichert werden.');
    } finally {
      setParentOnboardingLoading(false);
    }
  };

  const handleMagicLinkRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!magicLinkEmail.trim()) {
      setMagicLinkMessage('Bitte gib eine E-Mail-Adresse ein.');
      return;
    }

    setParentOnboardingLoading(true);
    setMagicLinkMessage(null);

    try {
      const { data, error } = await supabase.rpc('request_magic_link', {
        input_email: magicLinkEmail.trim()
      });

      if (error) throw error;
      
      const result = Array.isArray(data) ? data[0] : data;
      setMagicLinkSuccess(true);
      setMagicLinkMessage(result?.message || 'Wenn die E-Mail registriert ist, wurde ein Magic Link gesendet.');
    } catch (err: any) {
      console.error('Magic link error:', err);
      setMagicLinkMessage(err.message || 'Fehler beim Anfordern des Magic Links.');
    } finally {
      setParentOnboardingLoading(false);
    }
  };

  const handleRegisterBiometrics = async () => {
    if (!verifiedStudentDetails) return;
    setBiometricsStatus('registering');
    setBiometricsErrorMessage('');
    try {
      // Mock random challenge from server
      const mockChallenge = btoa(crypto.randomUUID());
      const email = `${verifiedStudentDetails.first_name.toLowerCase()}.${verifiedStudentDetails.last_name.toLowerCase()}@campus-groovelab.local`;
      const result = await registerBiometrics(
        email,
        verifiedStudentDetails.id,
        mockChallenge
      );
      
      // Store in Supabase
      if (verifiedStudentDetails?.id) {
        sessionStorage.setItem('groovelab_user_id', verifiedStudentDetails.id);
      }
      const { error } = await supabase.from('user_credentials').insert({
        user_id: verifiedStudentDetails.id,
        credential_id: result.id,
        public_key: JSON.stringify(result.response),
        device_name: 'WebAuthn Device'
      });

      if (error) throw error;
      setBiometricsStatus('success');
    } catch (err: any) {
      console.error('Biometrics registration failed:', err);
      setBiometricsStatus('error');
      setBiometricsErrorMessage(err.message || 'Die Einrichtung wurde abgebrochen oder ist fehlgeschlagen.');
    }
  };

  const handleBiometricsLogin = async () => {
    setLoading(true);
    try {
      if (!isWebAuthnSupported()) {
        alert("Biometrisches Anmelden wird von diesem Gerät oder Browser nicht unterstützt.");
        setLoading(false);
        return;
      }

      // 1. Generate challenge
      const mockChallenge = btoa(crypto.randomUUID());
      const challengeBuffer = new Uint8Array(
        atob(mockChallenge).split("").map((c) => c.charCodeAt(0))
      ).buffer;

      // 2. Fetch the resident credential
      const assertion = (await navigator.credentials.get({
        publicKey: {
          challenge: challengeBuffer,
          userVerification: 'required',
          timeout: 60000,
        },
      })) as PublicKeyCredential;

      if (!assertion) {
        throw new Error("Keine biometrischen Daten empfangen.");
      }

      const credentialId = assertion.id;

      // 3. Find the credential row in DB using secure RPC
      const { data: matchedUserId, error: credErr } = await supabase
        .rpc('get_user_id_by_credential', { input_credential_id: credentialId });

      if (credErr || !matchedUserId) {
        throw new Error("Dieses Gerät ist nicht für ein Benutzerkonto registriert.");
      }

      // 4. Fetch the user details
      const { data: user, error: userErr } = await supabase
        .from('users')
        .select('*, schools(*)')
        .eq('id', matchedUserId)
        .single();

      if (userErr || !user) {
        throw new Error("Benutzerkonto konnte nicht geladen werden.");
      }

      // 5. Finalize login
      await finalizeLogin(user, loginStationId, false);

    } catch (err: any) {
      console.error('Biometrics login failed:', err);
      alert(err.message || 'Anmeldung per Fingerabdruck fehlgeschlagen.');
      setLoading(false);
    }
  };

  const downloadParentQrCode = async () => {
    try {
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(`${window.location.origin}/qr/${verifiedStudentDetails?.qr_token || verifiedStudentId}`)}`;
      const response = await fetch(qrUrl);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `groovelab-login-${verifiedStudentDetails?.first_name || 'schueler'}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Download error:', err);
      alert('Der QR-Code konnte nicht heruntergeladen werden. Bitte mache stattdessen einen Screenshot.');
    }
  };

  const downloadWalletPass = () => {
    const passContent = JSON.stringify({
      passTypeIdentifier: "pass.de.groovelab.student",
      serialNumber: verifiedStudentDetails?.qr_token || verifiedStudentId,
      teamIdentifier: "GROOVELAB",
      organizationName: "GrooveLab Music School",
      description: "GrooveLab Student Access Pass",
      logoText: "GrooveLab",
      foregroundColor: "rgb(255, 255, 255)",
      backgroundColor: "rgb(10, 54, 28)",
      labelColor: "rgb(230, 244, 234)",
      studentName: `${verifiedStudentDetails?.first_name} ${verifiedStudentDetails?.last_name}`,
      instrument: verifiedStudentDetails?.instrument || "ohne Zuweisung",
      qrToken: verifiedStudentDetails?.qr_token || verifiedStudentId
    }, null, 2);

    const blob = new Blob([passContent], { type: 'application/vnd.apple.pkpass' });
    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = `groovelab-pass-${verifiedStudentDetails?.first_name || 'schueler'}.pkpass`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePinLogin = async (pin: string) => {
    if (!pin.trim() || loading) return;
    if (!loginConsentAccepted) {
      alert("Bitte bestätige die Datenschutzerklärung vor dem Login.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      console.log('[Login] Attempting manual PIN login for:', pin);
      const cleanPin = pin.trim();
      sessionStorage.setItem('groovelab_qr_token', cleanPin);

      let query = supabase
        .from('users')
        .select('*, schools(*)');
      
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cleanPin);
      const upperPin = cleanPin.toUpperCase();

      if (isUuid) {
        query = query.or(`id.eq.${cleanPin},qr_token.eq.${cleanPin},teacher_qr_token.eq.${cleanPin}`);
      } else {
        query = query.or(`teacher_qr_token.eq.${cleanPin},ausweis_nummer.eq.${cleanPin},ausweis_nummer.eq.${upperPin}`);
      }

      if (schoolData?.id) {
        query = query.eq('school_id', schoolData.id);
      }

      let { data: user, error: userErr } = await query.maybeSingle();
      sessionStorage.removeItem('groovelab_qr_token');

      // Fallback for custom admin passwords/PINs stored in ausweis_nummer
      if (!user) {
        let fallbackQuery = supabase
          .from('users')
          .select('*, schools(*)');
        
        if (schoolData?.id) {
          fallbackQuery = fallbackQuery.eq('school_id', schoolData.id);
        }
        const { data: fallbackUser } = await fallbackQuery.eq('ausweis_nummer', cleanPin).maybeSingle();
        if (fallbackUser) {
          user = fallbackUser;
          userErr = null;
        }
      }

      if (userErr || !user) {
        throw new Error('Ungültiger Ausweis-PIN oder QR-Token.');
      }

      if (!user.is_master_admin && schoolData?.id && user.school_id && user.school_id !== schoolData.id) {
        throw new Error(`Dieser Zugangs-PIN gehört nicht zu der ausgewählten Musikschule (${schoolData.name}).`);
      }

      if (user.is_master_admin) {
        finalizeLogin(user, null, true);
        return;
      }

      const userSchool = Array.isArray(user.schools) ? user.schools[0] : user.schools;
      if (!user.school_id && userSchool?.id) {
        user.school_id = userSchool.id;
      }

      // Block students and teachers check bypassed for timetable onboarding/design

      if (user.role === 'student') {
        const { data: actDay } = await supabase.from('activation_days').select('day_of_birth').eq('student_id', user.id).maybeSingle();
        user.day_of_birth = actDay?.day_of_birth || null;
      }

      // Automatically resolve schoolData from the database if not present in the URL parameter
      if (!schoolData && userSchool) {
        setSchoolData(userSchool);
        setSchoolName(userSchool.name);
      }

      if (user.role === 'student') {
        const effectiveSchool = schoolData || userSchool;
        if (!effectiveSchool?.id) {
          throw new Error('Für den Schüler-Login wird ein zugehöriger Schul-Link benötigt.');
        }
        const isStudentSchoolMatch = user.school_id === effectiveSchool.id || (isMusaekSchool(user.school_id) && isMusaekSchool(effectiveSchool.id));
        if (!isStudentSchoolMatch) {
          throw new Error('Login verweigert. Dieser Login-Link gehört nicht zu deiner Schule.');
        }
      }

      const isTeacher = user.role?.toLowerCase() === 'teacher' || user.role?.toLowerCase() === 'admin';
      let isWithinAnyRoom = true;
      const isGroovelabScreen = isGroovelabKiosk;
      const effectiveSchool = schoolData || userSchool;
      const isBypass = !isGroovelabScreen || 
                       !!(schoolData?.opening_hours?.geofence_bypass) || 
                       !!(userSchool?.opening_hours?.geofence_bypass) ||
                       isMusaekSchool(schoolData?.id) || 
                       isMusaekSchool(userSchool?.id);

      // Geolocation is strictly restricted to GrooveLab Kiosk mode (yellow background)
      if (isGroovelabKiosk) {
        const isLocalhost = typeof window !== 'undefined' && (
          window.location.hostname === 'localhost' || 
          window.location.hostname === '127.0.0.1' ||
          window.location.hostname.endsWith('.local') ||
          /^192\.168\./.test(window.location.hostname) ||
          /^10\./.test(window.location.hostname) ||
          /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(window.location.hostname)
        );

        if (isLocalhost || isBypass) {
          isWithinAnyRoom = true;
          console.log('[Login] Geofence check bypassed (localhost or database bypass active) in PIN login.');
          setGeoDebug({
            isWithinAnyRoom: true,
            userPos: null,
            schoolCoords: effectiveSchool ? { lat: effectiveSchool.latitude, lng: effectiveSchool.longitude } : null,
            distToSchool: 0,
            withinHours: true
          });
        } else {
          isWithinAnyRoom = false;
          let currentPos = userPos;
          if (!currentPos && navigator.geolocation) {
            try {
              currentPos = await new Promise<{lat: number, lng: number}>((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(
                  (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
                  (err) => reject(err),
                  { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
                );
              });
              setUserPos(currentPos);
            } catch (e) {
              console.warn('[Login] Geolocation fetch failed during PIN login:', e);
            }
          }

          if (currentPos) {
            const activePlatform = localStorage.getItem('groovelab_active_platform') || 'groovelab';
            let roomsQuery = supabase.from('rooms').select('*').eq('school_id', user.school_id);
            if (activePlatform === 'campus') {
              roomsQuery = roomsQuery.eq('is_campus_active', true);
            } else {
              roomsQuery = roomsQuery.eq('is_groovelab_active', true);
            }
            const { data: rooms } = await roomsQuery.order('sort_order', { ascending: true });
            if (rooms) {
              for (const room of rooms) {
                const points = Array.isArray(room.geofence_points) ? room.geofence_points : [];
                const allCoords = [...points];
                if (room.latitude && room.longitude) allCoords.push({ lat: room.latitude, lng: room.longitude });
                
                for (const pt of allCoords) {
                  if (pt && pt.lat && pt.lng) {
                    const dist = getDistanceFromLatLonInM(currentPos.lat, currentPos.lng, Number(pt.lat), Number(pt.lng));
                    if (dist < 100) { 
                      isWithinAnyRoom = true;
                      break;
                    }
                  }
                }
                if (isWithinAnyRoom) break;
              }
            }

            if (!isWithinAnyRoom && effectiveSchool?.latitude && effectiveSchool?.longitude) {
              const distToSchool = getDistanceFromLatLonInM(currentPos.lat, currentPos.lng, Number(effectiveSchool.latitude), Number(effectiveSchool.longitude));
              const radius = effectiveSchool.geofence_radius_meters || 150;
              if (distToSchool < radius) {
                isWithinAnyRoom = true;
              }
            }
          }
        }
      }
      // Intercept login for PIN setup or verification if it's an Ausweis ID login
      const isQrLogin = cleanPin.startsWith('t_') || (cleanPin.includes('-') && cleanPin.length > 20);
      if (!isQrLogin) {
        if (user.role === 'student' && isGroovelabKiosk) {
          // Bypass birthday PIN setup and verification completely for students on GrooveLab
          await finalizeLogin(user, loginStationId, isBypass ? true : isWithinAnyRoom);
          return;
        }

        const studentBirthDay = (user.role === 'student' && !isGroovelabKiosk) && user.day_of_birth ? String(user.day_of_birth).padStart(2, '0') : '';
        const isPinActivated = user.role === 'student' ? (!!studentBirthDay || user.is_pin_activated) : user.is_pin_activated;

        if (!isPinActivated) {
          setPinSetupUser(user);
          setPinVerificationIsWithinRoom(isBypass ? true : isWithinAnyRoom);
          setPinSetupInput('');
          setLoading(false);
          return;
        } else {
          setPinVerificationUser(user);
          setPinVerificationIsWithinRoom(isBypass ? true : isWithinAnyRoom);
          setPinVerificationInput('');
          setPinVerificationAttempts(0);
          setLoading(false);
          return;
        }
      }


      if (isTeacher) {
        if (user.is_observer) {
          await finalizeLogin(user, loginStationId, false, true);
          return;
        }

        const isGroovelabScreen = isGroovelabKiosk;
        if (isGroovelabScreen) {
          await finalizeLogin(user, loginStationId, isBypass ? true : isWithinAnyRoom, false);
        } else {
          // Campus Login strictly bypasses GrooveLab presence check-in
          await finalizeLogin(user, loginStationId, false, true);
        }
        return;
      }

      if (isBypass) {
        await finalizeLogin(user, loginStationId, true);
      } else {
        await finalizeLogin(user, loginStationId, isWithinAnyRoom);
      }
    } catch (err: any) {
      console.error('[Login] PIN login error:', err.message);
      setError(err.message);
      setLoading(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setError(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = async () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          setError('Canvas-Kontext konnte nicht erstellt werden.');
          setLoading(false);
          return;
        }
        ctx.drawImage(img, 0, 0, img.width, img.height);
        const imageData = ctx.getImageData(0, 0, img.width, img.height);
        
        try {
          const jsqrLib = await loadJSQR();
          const code = jsqrLib(imageData.data, imageData.width, imageData.height);
          if (code) {
            handleScan(code.data);
          } else {
            setError('Kein QR-Code im Bild gefunden. Bitte lade ein schärferes Foto hoch.');
            setLoading(false);
          }
        } catch (err) {
          setError('QR-Code-Bibliothek konnte nicht geladen werden.');
          setLoading(false);
        }
      };
      img.onerror = () => {
        setError('Bild konnte nicht geladen werden.');
        setLoading(false);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleScan = async (scannedValue: string) => {
    if (loading) return;
    setLoading(true);
    setError(null);

    let qrToken = scannedValue.trim();
    try {
      if (scannedValue.startsWith('http://') || scannedValue.startsWith('https://')) {
        const urlObj = new URL(scannedValue);
        if (urlObj.pathname.includes('/qr/')) {
          const parts = urlObj.pathname.split('/qr/');
          const tokenFromPath = parts[parts.length - 1];
          if (tokenFromPath) {
            qrToken = tokenFromPath.trim();
          }
        } else {
          const parsedToken = urlObj.searchParams.get('qr_token') || 
                              urlObj.searchParams.get('teacher_qr_token') || 
                              urlObj.searchParams.get('token') || 
                              urlObj.searchParams.get('campus_pass');
          if (parsedToken) {
            qrToken = parsedToken.trim();
          }
        }
      } else if (scannedValue.includes('?')) {
        const urlObj = new URL(`http://dummy.com/${scannedValue}`);
        const parsedToken = urlObj.searchParams.get('qr_token') || 
                            urlObj.searchParams.get('teacher_qr_token') || 
                            urlObj.searchParams.get('token') || 
                            urlObj.searchParams.get('campus_pass');
        if (parsedToken) {
          qrToken = parsedToken.trim();
        }
      }
    } catch (e) {
      console.warn("Failed to parse scanned URL", e);
    }
    console.log('[Login] handleScan scannedValue:', scannedValue, '-> parsed qrToken:', qrToken);

    // Camera stream will be naturally released on page reload, avoiding browser locks.

    try {
      console.log('[Login] Starting scan for token:', qrToken);

      // 1. User finden
      sessionStorage.setItem('groovelab_qr_token', qrToken);
      let query = supabase.from('users').select('*, schools(*)');
      
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(qrToken);
      const upperToken = qrToken.toUpperCase();

      if (isUuid) {
        query = query.or(`id.eq.${qrToken},qr_token.eq.${qrToken},teacher_qr_token.eq.${qrToken}`);
      } else {
        query = query.or(`teacher_qr_token.eq.${qrToken},ausweis_nummer.eq.${qrToken},ausweis_nummer.eq.${upperToken}`);
      }
      
      const { data: user, error: userErr } = await query.maybeSingle();
      sessionStorage.removeItem('groovelab_qr_token');

      if (userErr || !user) throw new Error('Nutzer nicht gefunden.');

      // Early exit if the user scanned is the Master Admin
      if (user.is_master_admin) {
        console.log('[Login] Master Admin QR token scanned! Logging in directly.');
        finalizeLogin(user, null, true);
        return;
      }

      const userSchool = Array.isArray(user.schools) ? user.schools[0] : user.schools;
      
      // Ensure school_id is available for room lookups even if not directly on the user object
      if (!user.school_id && userSchool?.id) {
        user.school_id = userSchool.id;
      }

      if (user.role === 'student') {
        const { data: actDay } = await supabase.from('activation_days').select('day_of_birth').eq('student_id', user.id).maybeSingle();
        user.day_of_birth = actDay?.day_of_birth || null;
      }

      // Automatically align school context with the scanned user's authentic school
      if (userSchool) {
        setSchoolData(userSchool);
        setSchoolName(userSchool.name);

        const slugify = (name: string) => {
          return name
            .toLowerCase()
            .trim()
            .replace(/[äöüß]/g, (match) => {
              const mapping: Record<string, string> = { 'ä': 'ae', 'ö': 'oe', 'ü': 'ue', 'ß': 'ss' };
              return mapping[match] || match;
            })
            .replace(/[^a-z0-9]/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-+|-+$/g, '');
        };
        const schoolSlug = slugify(userSchool.name);
        try {
          const newUrl = new URL(window.location.href);
          newUrl.searchParams.set('school', schoolSlug);
          window.history.replaceState({}, '', newUrl.toString());
        } catch (e) {
          console.warn("Failed to update window URL state", e);
        }
      }

      const activeSchool = schoolData || userSchool;
      if (activeSchool?.id && user.school_id) {
        const isSchoolMatch = user.school_id === activeSchool.id || (isMusaekSchool(user.school_id) && isMusaekSchool(activeSchool.id));
        if (!isSchoolMatch) {
          // Auto-align if mismatch
          setSchoolData(userSchool);
          setSchoolName(userSchool.name);
        }
      }

      // 2. Geofence Check (Simpel & Stabil)
      const isTeacher = user.role?.toLowerCase() === 'teacher' || user.role?.toLowerCase() === 'admin';
      let isWithinAnyRoom = true;
      const isGroovelabScreen = isGroovelabKiosk;
      const effectiveSchool = schoolData || userSchool;
      const isBypass = !isGroovelabScreen || 
                       !!(schoolData?.opening_hours?.geofence_bypass) || 
                       !!(userSchool?.opening_hours?.geofence_bypass) ||
                       isMusaekSchool(schoolData?.id) || 
                       isMusaekSchool(userSchool?.id);

      const isLocalhost = typeof window !== 'undefined' && (
        window.location.hostname === 'localhost' || 
        window.location.hostname === '127.0.0.1' ||
        window.location.hostname.endsWith('.local') ||
        /^192\.168\./.test(window.location.hostname) ||
        /^10\./.test(window.location.hostname) ||
        /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(window.location.hostname)
      );

      // Geolocation is strictly restricted to GrooveLab Kiosk mode (yellow background)
      if (isGroovelabKiosk) {
        if (isLocalhost || isBypass) {
          isWithinAnyRoom = true;
          console.log('[Login] Geofence check bypassed (localhost or database bypass active).');
          setGeoDebug({
            isWithinAnyRoom: true,
            userPos: null,
            schoolCoords: effectiveSchool ? { lat: effectiveSchool.latitude, lng: effectiveSchool.longitude } : null,
            distToSchool: 0,
            withinHours: true
          });
        } else {
          isWithinAnyRoom = false;
          console.log('[Login] Geofence check active. Fetching current location...');
          
          let currentPos = userPos;
          if (!currentPos && navigator.geolocation) {
            try {
              currentPos = await new Promise<{lat: number, lng: number}>((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(
                  (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
                  (err) => reject(err),
                  { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
                );
              });
              setUserPos(currentPos);
            } catch (e) {
              console.warn('[Login] Geolocation fetch during scan failed:', e);
            }
          }

          if (currentPos) {
            // 1. Check Rooms (Multi-Point)
            const activePlatform = localStorage.getItem('groovelab_active_platform') || 'groovelab';
            let roomsQuery = supabase.from('rooms').select('*').eq('school_id', user.school_id);
            if (activePlatform === 'campus') {
              roomsQuery = roomsQuery.eq('is_campus_active', true);
            } else {
              roomsQuery = roomsQuery.eq('is_groovelab_active', true);
            }
            const { data: rooms } = await roomsQuery.order('sort_order', { ascending: true });
            if (rooms) {
              for (const room of rooms) {
                const points = Array.isArray(room.geofence_points) ? room.geofence_points : [];
                const allCoords = [...points];
                if (room.latitude && room.longitude) allCoords.push({ lat: room.latitude, lng: room.longitude });
                
                for (const pt of allCoords) {
                  if (pt && pt.lat && pt.lng) {
                    const dist = getDistanceFromLatLonInM(currentPos.lat, currentPos.lng, Number(pt.lat), Number(pt.lng));
                    if (dist < 100) { 
                      isWithinAnyRoom = true;
                      break;
                    }
                  }
                }
                if (isWithinAnyRoom) break;
              }
            }

            // 2. School Fallback (Single Point + Radius)
            if (!isWithinAnyRoom && effectiveSchool?.latitude && effectiveSchool?.longitude) {
              const distToSchool = getDistanceFromLatLonInM(
                currentPos.lat, currentPos.lng, 
                Number(effectiveSchool.latitude), Number(effectiveSchool.longitude)
              );
              const radius = effectiveSchool.geofence_radius_meters || 150;
              if (distToSchool < radius) {
                isWithinAnyRoom = true;
              }
            }
          } else {
            console.warn('[Login] Geofence check failed because user position could not be acquired.');
          }

          setGeoDebug({
            isWithinAnyRoom,
            userPos: currentPos,
            schoolCoords: effectiveSchool ? { lat: effectiveSchool.latitude, lng: effectiveSchool.longitude } : null,
            distToSchool: (currentPos && effectiveSchool?.latitude && effectiveSchool?.longitude)
              ? Math.round(getDistanceFromLatLonInM(currentPos.lat, currentPos.lng, Number(effectiveSchool.latitude), Number(effectiveSchool.longitude)))
              : null,
            withinHours: true
          });
        }
      } else {
        console.log('[Login] Geofence check bypassed.');
        setGeoDebug(null);
      }

      console.log(`[Login] Scan successful. Geofence match: ${isWithinAnyRoom}`);
      
      if (isGroovelabKiosk && (user.role === 'student' || isTeacher)) {
        await finalizeLogin(user, loginStationId, isBypass ? true : isWithinAnyRoom);
        return;
      }

      const studentBirthDay = (user.role === 'student' && !isGroovelabKiosk) && user.day_of_birth ? String(user.day_of_birth).padStart(2, '0') : '';
      const isPinActivated = user.role === 'student' ? (!!studentBirthDay || user.is_pin_activated) : user.is_pin_activated;

      if (!isPinActivated) {
        setPinSetupUser(user);
        setPinVerificationIsWithinRoom(isBypass ? true : isWithinAnyRoom);
        setPinSetupInput('');
        setLoading(false);
        return;
      }


      if (isTeacher) {
        if (user.is_observer) {
          // Hospitanten are always sent to home mode without prompt
          await finalizeLogin(user, loginStationId, false, true);
          return;
        }

        const isGroovelabScreen = isGroovelabKiosk;
        if (isGroovelabScreen) {
          await finalizeLogin(user, loginStationId, isBypass ? true : isWithinAnyRoom, false);
        } else {
          // Campus Login strictly bypasses GrooveLab presence check-in
          await finalizeLogin(user, loginStationId, false, true);
        }
        return;
      }

      if (isBypass) {
        await finalizeLogin(user, loginStationId, true);
      } else {
        await finalizeLogin(user, loginStationId, isWithinAnyRoom);
      }
    } catch (err: any) {
      console.error('[Login] Scan error:', err.message);
      setError(err.message);
      setLoading(false);
    }
  };

  const confirmTeacherLogin = async (hidePresence: boolean) => {
    if (!pendingTeacherUser) return;
    const { user, isWithinAnyRoom } = pendingTeacherUser;
    setShowTeacherChoiceModal(false);
    setPendingTeacherUser(null);
    await finalizeLogin(user, loginStationId, isWithinAnyRoom, hidePresence);
  };

  const [geoDebug, setGeoDebug] = useState<any>(null);
  const isLocalhost = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') && import.meta.env.DEV;

  // Intercept and render coach self-onboarding if invite parameters are in URL
  if (inviteSchoolId) {
    const isSecretary = inviteRole === 'secretary' || inviteRole === 'admin';

    if (registeredUser) {
      return (
        <div style={{
          position: 'fixed', inset: 0, 
          backgroundColor: isSecretary ? '#f8fafc' : '#0f172a',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          padding: '20px', fontFamily: '"Outfit", "Inter", sans-serif', zIndex: 9999, 
          color: isSecretary ? '#1e293b' : '#f8fafc'
        }}>
          <div style={{
            width: '100%', maxWidth: '440px', 
            background: isSecretary ? '#ffffff' : 'rgba(255, 255, 255, 0.03)',
            borderRadius: '24px', padding: '36px',
            border: isSecretary ? '1px solid #e2e8f0' : '1px solid rgba(255, 255, 255, 0.08)', 
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', 
            boxShadow: isSecretary ? '0 20px 50px rgba(15, 23, 42, 0.04)' : '0 40px 100px rgba(0, 0, 0, 0.4)', 
            boxSizing: 'border-box'
          }}>
            <div style={{
              width: '64px', height: '64px', borderRadius: '50%', 
              background: isSecretary ? '#e6f4ea' : '#34a85320',
              display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px'
            }}>
              <Check size={36} color={isSecretary ? '#34a853' : '#34a853'} strokeWidth={3} />
            </div>
            <h1 style={{ fontSize: '24px', fontWeight: 800, color: isSecretary ? '#34a853' : '#34a853', margin: '0 0 10px 0', textAlign: 'center', letterSpacing: '-0.02em' }}>
              Registrierung erfolgreich!
            </h1>
            <p style={{ color: isSecretary ? '#5f6368' : '#94a3b8', fontSize: '13px', textAlign: 'center', lineHeight: '1.5', margin: '0 0 24px 0', fontWeight: 600 }}>
              {isSecretary 
                ? 'Dein Groovelab Administrator-Ausweis wurde erstellt. Mache einen Screenshot oder drucke diesen QR-Code aus, um dich ab sofort einzuloggen.'
                : 'Dein Groovelab Coach-Ausweis wurde erstellt. Mache einen Screenshot oder drucke diesen QR-Code aus, um dich ab sofort einzuloggen.'}
            </p>
            
            {/* ID Card Wrapper */}
            <div style={{
              width: '100%',
              background: isSecretary ? '#f8fafc' : 'rgba(255, 255, 255, 0.02)',
              borderRadius: '20px',
              border: isSecretary ? '1px solid #e2e8f0' : '1px solid rgba(255,255,255,0.06)',
              padding: '24px',
              boxSizing: 'border-box',
              marginBottom: '24px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center'
            }}>
              <div style={{
                background: 'white', padding: '12px', borderRadius: '16px',
                boxShadow: isSecretary ? '0 8px 24px rgba(0, 0, 0, 0.03)' : '0 10px 30px rgba(0,0,0,0.2)', 
                border: isSecretary ? '1px solid #e2e8f0' : 'none',
                marginBottom: '16px',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <img 
                   src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(`${window.location.origin}/qr/${registeredUser.qr_token}`)}`} 
                  alt="QR Code" 
                  style={{ width: '180px', height: '180px', display: 'block' }}
                />
              </div>

              <div style={{ width: '100%', textAlign: 'center' }}>
                <div style={{ fontSize: '0.75rem', color: isSecretary ? '#5f6368' : '#94a3b8', marginBottom: '2px', fontWeight: 600 }}>Name</div>
                <div style={{ fontSize: '1.05rem', fontWeight: 700, color: isSecretary ? '#1d1d1f' : 'white', marginBottom: '12px' }}>
                  {registeredUser.first_name} {registeredUser.last_name}
                </div>
                
                <div style={{ fontSize: '0.75rem', color: isSecretary ? '#5f6368' : '#94a3b8', marginBottom: '2px', fontWeight: 600 }}>Schule</div>
                <div style={{ fontSize: '1.05rem', fontWeight: 700, color: isSecretary ? '#34a853' : '#eab308' }}>
                  {schoolName || 'GrooveLab Academy'}
                </div>
              </div>
            </div>

            <button
              onClick={() => onLogin(registeredUser.id, true)}
              style={{
                width: '100%', padding: '14px 20px', borderRadius: '100px',
                background: isSecretary ? '#34a853' : 'linear-gradient(135deg, #eab308 0%, #ca8a04 100%)',
                border: 'none', color: isSecretary ? '#ffffff' : '#0f172a', fontWeight: 800, fontSize: '0.95rem',
                cursor: 'pointer', boxShadow: isSecretary ? '0 4px 12px rgba(19, 115, 51, 0.2)' : '0 8px 24px rgba(234, 179, 8, 0.25)',
                transition: 'all 0.2s', outline: 'none'
              }}
            >
              Direkt zum Dashboard einloggen
            </button>
          </div>
        </div>
      );
    }

    return (
      <div style={{
        position: 'fixed', inset: 0, 
        backgroundColor: isSecretary ? '#f8fafc' : '#0f172a',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        padding: '20px', fontFamily: '"Outfit", "Inter", sans-serif', zIndex: 9999, 
        color: isSecretary ? '#1e293b' : '#f8fafc'
      }}>
        <div style={{
          width: '100%', maxWidth: '440px', 
          background: isSecretary ? '#ffffff' : 'rgba(255, 255, 255, 0.03)',
          borderRadius: '24px', padding: '36px',
          border: isSecretary ? '1px solid #e2e8f0' : '1px solid rgba(255, 255, 255, 0.08)', 
          display: 'flex', flexDirection: 'column',
          boxShadow: isSecretary ? '0 20px 50px rgba(15, 23, 42, 0.04)' : '0 40px 100px rgba(0, 0, 0, 0.4)', 
          boxSizing: 'border-box'
        }}>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
            <div style={{
              background: isSecretary ? '#e6f4ea' : '#eab308', 
              padding: '10px', borderRadius: '12px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: isSecretary ? '0 4px 12px rgba(19, 115, 51, 0.08)' : 'none'
            }}>
              {isSecretary ? (
                <School size={24} color="#34a853" strokeWidth={2.5} />
              ) : (
                <Music size={24} color="#0f172a" />
              )}
            </div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: isSecretary ? '#34a853' : '#ffffff' }}>
              {isSecretary ? 'Groovelab Admin Einladung' : 'Groovelab Coach Einladung'}
            </div>
          </div>

          <h2 style={{ fontSize: '1.35rem', fontWeight: 800, margin: '0 0 8px 0', letterSpacing: '-0.02em', color: isSecretary ? '#1d1d1f' : '#ffffff' }}>
            {isSecretary ? 'Registriere dich als Administrator' : 'Registriere dich als Coach'}
          </h2>
          <p style={{ color: isSecretary ? '#5f6368' : '#94a3b8', fontSize: '0.85rem', margin: '0 0 24px 0', lineHeight: '1.5', fontWeight: 600 }}>
            {isSecretary 
              ? `Du wurdest eingeladen, als Administrator/Verwaltung für die Schule `
              : `Du wurdest eingeladen, als Coach für die Schule `}
            <strong style={{ color: isSecretary ? '#34a853' : '#eab308' }}>{loadingSchool ? 'wird geladen...' : (schoolName || 'Campus-Groovelab Academy')}</strong> beizutreten.
          </p>

          <form onSubmit={async (e) => {
            e.preventDefault();
            if (!firstName.trim() || !lastName.trim()) return;
            try {
              setSigningUp(true);
              
              // Check limits if enabled for the school (only for teachers/admins, secretary might have different or no limits)
              if (schoolData?.limits_enabled && !isSecretary) {
                const { count, error: countErr } = await supabase
                  .from('users')
                  .select('*', { count: 'exact', head: true })
                  .eq('school_id', inviteSchoolId)
                  .in('role', ['teacher', 'admin']);
                  
                if (countErr) throw countErr;
                
                const maxTeachers = schoolData.max_teachers ?? 2;
                if (count !== null && count >= maxTeachers) {
                  alert(`Registrierung fehlgeschlagen: Das Limit für Lehrer/Admins an dieser Schule (${maxTeachers}) wurde erreicht. Bitte kontaktiere deinen System-Admin.`);
                  setSigningUp(false);
                  return;
                }
              }

              // Ensure school onboarding token is injected into fetch headers for Supabase RLS compliance
              const urlParams = new URLSearchParams(window.location.search);
              const activeOnboardingToken = urlParams.get('token') || schoolData?.secretary_onboarding_token || schoolData?.groovelab_kiosk_token || schoolData?.campus_login_token;
              if (activeOnboardingToken) {
                sessionStorage.setItem('groovelab_qr_token', activeOnboardingToken);
                localStorage.setItem('groovelab_kiosk_token', activeOnboardingToken);
              }

              const newQrToken = crypto.randomUUID();
              const newUserId = crypto.randomUUID();
              
              let finalRole = inviteRole;
              if (isSecretary) {
                // If it is the first secretary/admin registering, set them as 'admin' automatically!
                const { count, error: checkErr } = await supabase
                  .from('users')
                  .select('*', { count: 'exact', head: true })
                  .eq('school_id', inviteSchoolId)
                  .in('role', ['admin', 'secretary']);
                  
                if (!checkErr && (count === null || count === 0)) {
                  finalRole = 'admin';
                } else {
                  finalRole = 'secretary';
                }
              }
              
              const { data, error } = await supabase
                .from('users')
                .insert({
                  id: newUserId,
                  school_id: inviteSchoolId,
                  role: finalRole,
                  roles: [finalRole],
                  is_active: true,
                  is_campus_active: true,
                  is_groovelab_active: true,
                  first_name: firstName.trim(),
                  last_name: lastName.trim(),
                  qr_token: newQrToken,
                  photo_url: isSecretary ? '/campus_login_hero.png' : null,
                  avatar_url: isSecretary ? '/campus_login_hero.png' : null
                })
                .select()
                .single();

              if (error) throw error;
              setRegisteredUser(data);
            } catch (err: any) {
              console.error("Error signing up user:", err);
              alert("Fehler bei der Registrierung: " + err.message);
            } finally {
              setSigningUp(false);
            }
          }} style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '100%' }}>
            
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', color: isSecretary ? '#475569' : '#94a3b8', fontWeight: 700, marginBottom: '6px' }}>Vorname *</label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Max"
                required
                onFocus={() => setFirstNameFocused(true)}
                onBlur={() => setFirstNameFocused(false)}
                style={{
                  width: '100%', boxSizing: 'border-box', padding: '12px 16px', borderRadius: '8px',
                  background: isSecretary ? '#f8fafc' : 'rgba(255,255,255,0.05)', 
                  border: isSecretary 
                    ? `1px solid ${firstNameFocused ? '#34a853' : '#dadce0'}` 
                    : `1px solid ${firstNameFocused ? '#eab308' : 'rgba(255,255,255,0.08)'}`,
                  boxShadow: firstNameFocused && isSecretary ? '0 0 0 3px rgba(19, 115, 51, 0.12)' : 'none',
                  color: isSecretary ? '#1d1d1f' : 'white', fontSize: '0.95rem', outline: 'none',
                  fontWeight: 600,
                  transition: 'all 0.15s ease'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', color: isSecretary ? '#475569' : '#94a3b8', fontWeight: 700, marginBottom: '6px' }}>Nachname *</label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Mustermann"
                required
                onFocus={() => setLastNameFocused(true)}
                onBlur={() => setLastNameFocused(false)}
                style={{
                  width: '100%', boxSizing: 'border-box', padding: '12px 16px', borderRadius: '8px',
                  background: isSecretary ? '#f8fafc' : 'rgba(255,255,255,0.05)', 
                  border: isSecretary 
                    ? `1px solid ${lastNameFocused ? '#34a853' : '#dadce0'}` 
                    : `1px solid ${lastNameFocused ? '#eab308' : 'rgba(255,255,255,0.08)'}`,
                  boxShadow: lastNameFocused && isSecretary ? '0 0 0 3px rgba(19, 115, 51, 0.12)' : 'none',
                  color: isSecretary ? '#1d1d1f' : 'white', fontSize: '0.95rem', outline: 'none',
                  fontWeight: 600,
                  transition: 'all 0.15s ease'
                }}
              />
            </div>

            <button
              type="submit"
              disabled={signingUp}
              style={{
                marginTop: '8px', padding: '14px 20px', borderRadius: '100px',
                background: isSecretary ? '#34a853' : 'linear-gradient(135deg, #eab308 0%, #ca8a04 100%)',
                border: 'none', color: isSecretary ? '#ffffff' : '#0f172a', fontWeight: 800, fontSize: '0.95rem',
                cursor: 'pointer', boxShadow: isSecretary ? '0 4px 12px rgba(19, 115, 51, 0.2)' : '0 8px 20px rgba(234, 179, 8, 0.2)',
                transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}
            >
              {signingUp ? 'Registriere...' : 'Registrierung abschließen'}
            </button>
          </form>

        </div>
      </div>
    );
  }

  if (showOnboarding) {
    return renderOnboardingScreen();
  }

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: isGroovelabKiosk ? 'flex-start' : 'center',
      fontFamily: '"Outfit", "Inter", -apple-system, sans-serif',
      background: isGroovelabKiosk ? '#ca8a04' : '#0a361c', // Chalkboard yellow/green
      backgroundImage: isGroovelabKiosk 
        ? 'radial-gradient(circle at 50% 50%, #fef08a 0%, #ca8a04 100%)' 
        : 'radial-gradient(circle at 50% 50%, #11572e 0%, #062413 100%)',
      color: isGroovelabKiosk ? '#062413' : 'white',
      zIndex: 9999,
      overflowY: 'auto',
      padding: '48px 16px 24px 16px',
      boxSizing: 'border-box',
      transition: 'background 0.5s ease, color 0.5s ease'
    }}>
      {/* Subtle Chalk board dust overlays */}
      <div style={{
        position: 'absolute',
        inset: 0,
        opacity: 0.025,
        pointerEvents: 'none',
        backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noiseFilter\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.85\' numOctaves=\'3\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noiseFilter)\'/%3E%3C/svg%3E")'
      }} />
      {/* Left Presentation Panel: School green chalkboard artwork with Apple-style product presentation */}
      {false && !isMobile && (
        <div style={{
          flex: 1.2,
          background: '#0a361c', // Chalkboard dark green
          backgroundImage: 'radial-gradient(circle at 50% 50%, #11572e 0%, #062413 100%)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '40px',
          color: 'white',
          position: 'relative',
          overflow: 'hidden',
          boxShadow: 'inset -20px 0 40px rgba(0,0,0,0.15)',
          borderRight: '1px solid rgba(255,255,255,0.06)'
        }}>
          {/* Subtle Chalk board dust overlays */}
          <div style={{
            position: 'absolute',
            inset: 0,
            opacity: 0.03,
            pointerEvents: 'none',
            backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noiseFilter\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.85\' numOctaves=\'3\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noiseFilter)\'/%3E%3C/svg%3E")'
          }} />

          {/* Chalkboard frame/header */}
          <div style={{
            width: '100%',
            maxWidth: '460px',
            marginBottom: '32px',
            textAlign: 'center',
            zIndex: 2
          }}>
            <h2 
              onDoubleClick={() => setIsGroovelabKiosk(false)}
              style={{
                fontSize: '3.2rem',
                fontWeight: 900,
                color: '#ffffff',
                margin: 0,
                letterSpacing: '-0.04em',
                textShadow: '0 4px 12px rgba(0,0,0,0.2)',
                cursor: 'pointer',
                userSelect: 'none'
              }}
            >
              Groovelab
            </h2>
            <p style={{
              fontSize: '1.25rem',
              color: '#e6f4ea',
              marginTop: '6px',
              marginBottom: '0',
              fontWeight: 600,
              textShadow: '0 2px 4px rgba(0,0,0,0.1)'
            }}>
              Das digitale Musikzimmer.
            </p>
          </div>

          {/* Chalk board illustration frame */}
          <div style={{
            width: '100%',
            maxWidth: '460px',
            aspectRatio: '1/1',
            borderRadius: '24px',
            background: '#ffffff',
            padding: '12px',
            boxShadow: '0 25px 60px rgba(0,0,0,0.25), inset 0 2px 4px rgba(255,255,255,0.2)',
            border: '12px solid #5d4037', // Wooden brown board frame
            boxSizing: 'border-box',
            zIndex: 2,
            transform: 'rotate(-0.5deg)',
            transition: 'transform 0.3s ease'
          }}>
            <img 
              src="/campus_login_hero.png" 
              alt="Campus Chalk Illustration"

              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                borderRadius: '8px'
              }}
            />
          </div>

          {/* Friendly value statements */}
          <div style={{
            marginTop: '36px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            maxWidth: '420px',
            zIndex: 2
          }}>
            {[
              { icon: <Music size={18} strokeWidth={2.5} style={{ opacity: 0.9 }} />, text: "Lerne deine Lieblingssongs spielerisch leicht" },
              { icon: <Timer size={18} strokeWidth={2.5} style={{ opacity: 0.9 }} />, text: "Verfolge deine Übezeiten & Ziele in Echtzeit" },
              { icon: <Trophy size={18} strokeWidth={2.5} style={{ opacity: 0.9 }} />, text: "Meistere Levels & sammle Helden-Momente" }
            ].map(({ icon, text }, idx) => (
              <div key={idx} style={{
                fontSize: '1rem',
                fontWeight: 650,
                color: 'rgba(255,255,255,0.9)',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                textShadow: '0 1px 2px rgba(0,0,0,0.1)'
              }}>
                {icon}
                <span>{text}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Right Login Panel */}
      <div style={{
        width: '100%',
        maxWidth: '440px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        zIndex: 2
      }}>
        
        {schoolData?.logo_url ? (
          <div style={{
            maxHeight: '70px',
            maxWidth: '240px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '20px',
            background: logoTheme === 'light' ? 'rgba(255, 255, 255, 0.95)' : 'rgba(0, 0, 0, 0.6)',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            padding: '10px 24px',
            borderRadius: '20px',
            border: logoTheme === 'light' ? '1px solid rgba(255, 255, 255, 0.8)' : '1px solid rgba(255, 255, 255, 0.15)',
            boxShadow: '0 8px 24px rgba(0,0,0,0.15)'
          }}>
            <img 
              src={schoolData.logo_url} 
              alt="Logo" 

              style={{ 
                maxHeight: '60px',
                maxWidth: '100%',
                objectFit: 'contain'
              }} 
            />
          </div>
        ) : (
          <div className="loading-pulse" style={{
            width: '60px',
            height: '60px',
            background: 'rgba(255, 255, 255, 0.08)',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            borderRadius: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '20px',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.15)',
            overflow: 'hidden'
          }}>
            <Music size={28} color="#000000" />
          </div>
        )}

        <h1 
          onClick={() => {
            setLogoClicks(prev => {
              const next = prev + 1;
              if (next >= 5) {
                setShowAdminModal(true);
                return 0;
              }
              return next;
            });
          }}
          style={{ 
            fontSize: '32px', 
            fontWeight: 900, 
            color: isGroovelabKiosk ? '#062413' : '#ffffff', 
            marginBottom: '6px', 
            margin: 0, 
            letterSpacing: '-0.03em',
            cursor: 'default',
            userSelect: 'none',
            textAlign: 'center',
            textShadow: isGroovelabKiosk ? 'none' : '0 2px 8px rgba(0,0,0,0.2)',
            transition: 'color 0.5s ease'
          }}
        >
          {isGroovelabKiosk ? 'Groovelab-Login' : 'Campus-Login'}
        </h1>
        <p style={{ 
          color: isGroovelabKiosk ? '#78350f' : (qrScanPrompt ? '#fde047' : '#e6f4ea'), 
          textAlign: 'center', 
          fontSize: '14px', 
          marginBottom: '32px', 
          maxWidth: '340px', 
          lineHeight: '1.4', 
          fontWeight: 600, 
          textShadow: isGroovelabKiosk ? 'none' : '0 1px 2px rgba(0,0,0,0.1)',
          transition: 'color 0.5s ease'
        }}>
          {qrScanPrompt || (schoolName && !schoolData?.logo_url ? `für ${schoolName}` : `Halte deinen Ausweis vor die Kamera, um dich einzuloggen.`)}
        </p>

      {/* Main Standard QR-Scanner Card */}
      {expandedSection === 'none' && (
      <div style={{
        width: '100%',
        maxWidth: '420px',
        background: isGroovelabKiosk ? 'rgba(255, 255, 255, 0.82)' : 'rgba(255, 255, 255, 0.07)',
        borderRadius: '40px',
        padding: '28px',
        boxShadow: isGroovelabKiosk 
          ? '0 40px 100px rgba(120, 53, 15, 0.18), inset 0 1px 0 rgba(255, 255, 255, 0.6)' 
          : '0 40px 100px rgba(0, 0, 0, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.15)',
        border: isGroovelabKiosk 
          ? '1px solid rgba(255, 255, 255, 0.4)' 
          : '1px solid rgba(255, 255, 255, 0.12)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        position: 'relative',
        backdropFilter: 'blur(30px)',
        WebkitBackdropFilter: 'blur(30px)',
        transition: 'background 0.3s ease, border 0.3s ease, box-shadow 0.3s ease'
      }}>
        <div style={{ fontSize: '11px', fontWeight: 800, color: isGroovelabKiosk ? 'rgba(0, 0, 0, 0.6)' : 'rgba(255, 255, 255, 0.6)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px', width: '100%', justifyContent: 'center' }}>
          <Tablet size={14} style={{ color: isGroovelabKiosk ? '#78350f' : '#e6f4ea' }} />
          {isGroovelabKiosk 
            ? (effectiveStationId ? 'GROOVELAB QR-CODE SCANNEN' : 'Groovelab Kiosk einrichten') 
            : 'Standard Login über Groovelab QR-Ausweis'}
        </div>

        {/* Standard Camera Box (for standard login) */}
        {!isGroovelabKiosk && (
          <div style={{
            width: '100%',
            aspectRatio: '1/1',
            borderRadius: '32px',
            overflow: 'hidden',
            background: '#ffffff',
            position: 'relative',
            boxShadow: 'inset 0 3px 10px rgba(0, 0, 0, 0.06), 0 1px 3px rgba(0, 0, 0, 0.05), 0 16px 36px rgba(0, 0, 0, 0.07)',
            border: '1px solid #e2e8f0',
            borderBottomColor: '#cbd5e1', // Skeuomorphic top-down light border
            padding: '4.5px',
            boxSizing: 'border-box'
          }}>
            <div style={{
              width: '100%',
              height: '100%',
              borderRadius: '26px',
              overflow: 'hidden',
              position: 'relative',
              background: '#0c0f12'
            }}>
              {/* Recessed physical aperture shadow for 3D depth */}
              <div style={{
                position: 'absolute',
                inset: 0,
                boxShadow: 'inset 0 5px 15px rgba(0, 0, 0, 0.4)',
                borderRadius: '26px',
                pointerEvents: 'none',
                zIndex: 9
              }} />
              {isCameraActive && !cameraHasError ? (
                <>
                  <CustomQRScanner
                    onScan={(val) => {
                      console.log('[Scanner] Extracted QR value:', val);
                      handleScan(val);
                    }}
                    onError={(err: any) => {
                      console.error('[Scanner] Camera error:', err);
                      setCameraHasError(true);
                      const errMsg = err?.message || String(err || '');
                      if (!errMsg.toLowerCase().includes('abort') && !errMsg.toLowerCase().includes('aborted')) {
                        setError(`Kamera-Fehler: ${errMsg}`);
                      }
                    }}
                    paused={loading}
                    facingMode={facingMode}
                  />
  
                  {/* Scanner UI Overlay: Animated scan laser and bounding target corners */}
                  <div style={{
                    position: 'absolute',
                    inset: 0,
                    pointerEvents: 'none',
                    zIndex: 10
                  }}>
                    {/* 4 Corner brackets for scanner target */}
                    <div style={{ position: 'absolute', top: '20px', left: '20px', width: '24px', height: '24px', borderTop: '3px solid #eab308', borderLeft: '3px solid #eab308', borderTopLeftRadius: '8px' }} />
                    <div style={{ position: 'absolute', top: '20px', right: '20px', width: '24px', height: '24px', borderTop: '3px solid #eab308', borderRight: '3px solid #eab308', borderTopRightRadius: '8px' }} />
                    <div style={{ position: 'absolute', bottom: '20px', left: '20px', width: '24px', height: '24px', borderBottom: '3px solid #eab308', borderLeft: '3px solid #eab308', borderBottomLeftRadius: '8px' }} />
                    <div style={{ position: 'absolute', bottom: '20px', right: '20px', width: '24px', height: '24px', borderBottom: '3px solid #eab308', borderRight: '3px solid #eab308', borderBottomRightRadius: '8px' }} />
                    
                    {/* Animated Laser line */}
                    <div style={{
                      position: 'absolute',
                      left: 0,
                      width: '100%',
                      height: '80px',
                      background: 'linear-gradient(180deg, rgba(234, 179, 8, 0) 0%, rgba(234, 179, 8, 0.08) 50%, rgba(234, 179, 8, 0) 100%)',
                      filter: 'blur(6px)',
                      animation: 'scanLaser 4s ease-in-out infinite',
                      pointerEvents: 'none'
                    }} />
                  </div>
  
                  <style dangerouslySetInnerHTML={{__html: `
                    @keyframes scanLaser {
                      0% { top: -20%; }
                      50% { top: 100%; }
                      100% { top: -20%; }
                    }
                    @keyframes scanFlash {
                      0% { opacity: 1; }
                      100% { opacity: 0; }
                    }
                  `}} />
  
                  {/* Switch Camera Button */}
                  <button
                    onClick={() => setFacingMode(prev => prev === 'user' ? 'environment' : 'user')}
                    style={{
                      position: 'absolute',
                      top: '12px',
                      right: '12px',
                      zIndex: 15,
                      width: '38px',
                      height: '38px',
                      borderRadius: '50%',
                      background: 'rgba(255, 255, 255, 0.15)',
                      backdropFilter: 'blur(10px)',
                      WebkitBackdropFilter: 'blur(10px)',
                      border: '1px solid rgba(255, 255, 255, 0.25)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      color: 'white',
                      boxShadow: '0 4px 10px rgba(0,0,0,0.15)',
                      transition: 'all 0.2s ease',
                      outline: 'none'
                    }}
                    onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)'; }}
                    onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)'; }}
                    title="Kamera wechseln"
                  >
                    <RotateCw size={18} />
                  </button>
                </>
              ) : (
                <div style={{
                  width: '100%',
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '16px',
                  color: 'white',
                  padding: '24px',
                  textAlign: 'center',
                  boxSizing: 'border-box'
                }}>
                  <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'rgba(255, 255, 255, 0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#eab308' }}>
                    {cameraHasError ? <CameraOff size={24} style={{ color: '#ef4444' }} /> : <Tablet size={24} />}
                  </div>
                  {cameraHasError ? (
                    <>
                      <div style={{ fontSize: '13px', fontWeight: 800, color: '#fca5a5' }}>
                        Kamerazugriff blockiert oder nicht verfügbar
                      </div>
                      <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.45)', marginTop: '4px', lineHeight: '1.4', maxWidth: '240px' }}>
                        {isIOS && isStandalone 
                          ? "Auf dem iPad Home-Bildschirm ist eine erneute Freigabe der Kamera erforderlich."
                          : "Bitte erteilen Sie der App Kameraberechtigungen im Browser oder nutzen Sie die Passwort-Anmeldung."
                        }
                      </div>
                      {isIOS && isStandalone ? (
                        <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                          <button
                            type="button"
                            onClick={() => {
                              window.open(window.location.href, '_blank');
                            }}
                            style={{
                              padding: '8px 16px',
                              borderRadius: '10px',
                              border: 'none',
                              background: '#eab308',
                              color: '#062413',
                              fontWeight: 800,
                              fontSize: '11px',
                              cursor: 'pointer',
                              boxShadow: '0 4px 10px rgba(234, 179, 8, 0.2)'
                            }}
                          >
                            In Safari öffnen
                          </button>
                          <button
                            type="button"
                            onClick={() => setShowPermissionHelp(true)}
                            style={{
                              padding: '8px 16px',
                              borderRadius: '10px',
                              border: '1px solid rgba(255, 255, 255, 0.2)',
                              background: 'rgba(255, 255, 255, 0.08)',
                              color: '#ffffff',
                              fontWeight: 700,
                              fontSize: '11px',
                              cursor: 'pointer',
                            }}
                          >
                            Hilfe
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setShowPermissionHelp(true)}
                          style={{
                            marginTop: '8px',
                            padding: '8px 16px',
                            borderRadius: '10px',
                            border: '1px solid rgba(239, 68, 68, 0.3)',
                            background: 'rgba(239, 68, 68, 0.15)',
                            color: '#fca5a5',
                            fontWeight: 800,
                            fontSize: '11px',
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                          }}
                          onMouseOver={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.25)'}
                          onMouseOut={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.15)'}
                        >
                          Anleitung zur Freigabe
                        </button>
                      )}
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          setCameraHasError(false);
                          setIsCameraActive(true);
                        }}
                        style={{
                          padding: '10px 20px',
                          borderRadius: '12px',
                          border: 'none',
                          background: '#eab308',
                          color: '#062413',
                          fontWeight: 800,
                          fontSize: '13px',
                          cursor: 'pointer',
                          boxShadow: '0 4px 12px rgba(234, 179, 8, 0.2)'
                        }}
                      >
                        Kamera aktivieren
                      </button>
                      <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginTop: '8px', lineHeight: '1.4', maxWidth: '240px' }}>
                        Wähle bei der Abfrage <strong>„Erlauben“</strong>. <span onClick={() => setShowPermissionHelp(true)} style={{ color: '#eab308', textDecoration: 'underline', cursor: 'pointer', fontWeight: 800 }}>Hilfe</span>
                      </div>
                    </>
                  )}
                </div>
              )}
              {loading && (
                <div style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'rgba(0,0,0,0.6)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 10,
                  backdropFilter: 'blur(10px)'
                }}>
                  <div style={{ width: '36px', height: '36px', border: '3px solid #e6f4ea', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                </div>
              )}
            </div>
            {isCameraActive && !cameraHasError && (
              <p style={{
                fontSize: '10px',
                color: 'rgba(255, 255, 255, 0.45)',
                marginTop: '12px',
                marginBottom: 0,
                textAlign: 'center',
                lineHeight: 1.3,
                maxWidth: '280px'
              }}>
                🔒 Die Kamera-Verarbeitung erfolgt ausschließlich lokal auf Ihrem Gerät; es werden keine Bilddaten übertragen.
              </p>
            )}
          </div>
        )}
        {/* Kiosk Welcome Card (when coupled to a station) */}
        {isGroovelabKiosk && effectiveStationId && (
          <div style={{
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '4px 0 10px 0',
            boxSizing: 'border-box',
            gap: '14px'
          }}>

            {/* Hint text */}
            <p style={{
              margin: 0,
              fontSize: '12px',
              fontWeight: 600,
              color: 'rgba(120, 53, 15, 0.65)',
              textAlign: 'center',
              lineHeight: 1.4
            }}>
              Halte deinen QR-Ausweis vor die Kamera
            </p>

            {/* Full-width Camera Box */}
            <div style={{
              width: '100%',
              aspectRatio: '1/1',
              borderRadius: '24px',
              overflow: 'hidden',
              background: '#ffffff',
              position: 'relative',
              boxShadow: 'inset 0 3px 10px rgba(0, 0, 0, 0.06), 0 1px 3px rgba(0, 0, 0, 0.05), 0 12px 28px rgba(0, 0, 0, 0.07)',
              border: '1px solid rgba(0, 0, 0, 0.08)',
              padding: '4px',
              boxSizing: 'border-box'
            }}>
              <div style={{
                width: '100%',
                height: '100%',
                borderRadius: '20px',
                overflow: 'hidden',
                position: 'relative',
                background: '#0c0f12'
              }}>
                {/* Inner shadow overlay */}
                <div style={{
                  position: 'absolute',
                  inset: 0,
                  boxShadow: 'inset 0 5px 15px rgba(0, 0, 0, 0.4)',
                  borderRadius: '20px',
                  pointerEvents: 'none',
                  zIndex: 9
                }} />

                {/* Yellow scan-success flash overlay */}
                {scanSuccess && (
                  <div style={{
                    position: 'absolute',
                    inset: 0,
                    background: 'rgba(250, 204, 21, 0.35)',
                    borderRadius: '20px',
                    zIndex: 20,
                    animation: 'scanFlash 0.5s ease-out forwards',
                    pointerEvents: 'none'
                  }} />
                )}

                {isCameraActive && !cameraHasError ? (
                  <>
                    <CustomQRScanner
                      onScan={(val) => {
                        console.log('[KioskCardScanner] QR value:', val);
                        setScanSuccess(true);
                        setTimeout(() => setScanSuccess(false), 500);
                        handleScan(val);
                      }}
                      onError={(err: any) => {
                        console.error('[KioskCardScanner] Camera error:', err);
                        setCameraHasError(true);
                        const errMsg = err?.message || String(err || '');
                        if (!errMsg.toLowerCase().includes('abort') && !errMsg.toLowerCase().includes('aborted')) {
                          setError(`Kamera-Fehler: ${errMsg}`);
                        }
                      }}
                      paused={loading}
                      facingMode={facingMode}
                    />

                    {/* Target Corners */}
                    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 10 }}>
                      <div style={{ position: 'absolute', top: '20px', left: '20px', width: '24px', height: '24px', borderTop: '3px solid #facc15', borderLeft: '3px solid #facc15', borderTopLeftRadius: '7px' }} />
                      <div style={{ position: 'absolute', top: '20px', right: '20px', width: '24px', height: '24px', borderTop: '3px solid #facc15', borderRight: '3px solid #facc15', borderTopRightRadius: '7px' }} />
                      <div style={{ position: 'absolute', bottom: '20px', left: '20px', width: '24px', height: '24px', borderBottom: '3px solid #facc15', borderLeft: '3px solid #facc15', borderBottomLeftRadius: '7px' }} />
                      <div style={{ position: 'absolute', bottom: '20px', right: '20px', width: '24px', height: '24px', borderBottom: '3px solid #facc15', borderRight: '3px solid #facc15', borderBottomRightRadius: '7px' }} />
                      <div style={{
                        position: 'absolute',
                        left: 0,
                        width: '100%',
                        height: '70px',
                        background: 'linear-gradient(180deg, rgba(250, 204, 21, 0) 0%, rgba(250, 204, 21, 0.08) 50%, rgba(250, 204, 21, 0) 100%)',
                        filter: 'blur(4px)',
                        animation: 'scanLaser 4s ease-in-out infinite'
                      }} />
                    </div>

                    {/* Camera Switch Button — top right, pointer-events active */}
                    <button
                      onClick={() => setFacingMode(prev => prev === 'user' ? 'environment' : 'user')}
                      title="Kamera wechseln"
                      style={{
                        position: 'absolute',
                        top: '12px',
                        right: '12px',
                        zIndex: 15,
                        width: '36px',
                        height: '36px',
                        borderRadius: '50%',
                        background: 'rgba(0, 0, 0, 0.35)',
                        backdropFilter: 'blur(10px)',
                        WebkitBackdropFilter: 'blur(10px)',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        color: 'white',
                        transition: 'background 0.2s ease',
                        outline: 'none'
                      }}
                      onMouseOver={(e) => e.currentTarget.style.background = 'rgba(250, 204, 21, 0.4)'}
                      onMouseOut={(e) => e.currentTarget.style.background = 'rgba(0, 0, 0, 0.35)'}
                    >
                      <SwitchCamera size={16} />
                    </button>
                  </>
                ) : (
                  <div style={{
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '12px',
                    color: 'white',
                    padding: '16px',
                    textAlign: 'center',
                    boxSizing: 'border-box'
                  }}>
                    <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: 'rgba(255, 255, 255, 0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#facc15' }}>
                      {cameraHasError ? <CameraOff size={22} style={{ color: '#ef4444' }} /> : <RotateCw className="spin" size={22} />}
                    </div>
                    {cameraHasError ? (
                      <>
                        <div style={{ fontSize: '12px', fontWeight: 800, color: '#fca5a5' }}>Kamerazugriff blockiert</div>
                        <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.45)', lineHeight: '1.3', maxWidth: '180px' }}>
                          {isIOS && isStandalone 
                            ? "Auf dem iPad Home-Bildschirm ist eine erneute Freigabe erforderlich."
                            : "Kamerazugriff in den Browser-Einstellungen erlauben, dann erneut versuchen."
                          }
                        </div>
                        <div style={{ display: 'flex', gap: '6px', marginTop: '6px', justifyContent: 'center' }}>
                          {isIOS && isStandalone ? (
                            <>
                              <button
                                onClick={() => { window.open(window.location.href, '_blank'); }}
                                style={{
                                  background: '#facc15',
                                  border: 'none',
                                  color: '#062413',
                                  fontSize: '10px',
                                  fontWeight: 800,
                                  borderRadius: '20px',
                                  padding: '5px 12px',
                                  cursor: 'pointer',
                                  outline: 'none',
                                  boxShadow: '0 4px 10px rgba(250, 204, 21, 0.3)',
                                  transition: 'transform 0.2s'
                                }}
                                onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
                                onMouseOut={(e) => e.currentTarget.style.transform = 'none'}
                              >
                                In Safari öffnen
                              </button>
                              <button
                                onClick={() => setShowPermissionHelp(true)}
                                style={{
                                  background: 'rgba(255, 255, 255, 0.08)',
                                  border: '1px solid rgba(255, 255, 255, 0.2)',
                                  color: '#ffffff',
                                  fontSize: '10px',
                                  fontWeight: 700,
                                  borderRadius: '20px',
                                  padding: '5px 12px',
                                  cursor: 'pointer',
                                  outline: 'none',
                                }}
                              >
                                Hilfe
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => { setCameraHasError(false); setIsCameraActive(true); setError(''); }}
                                style={{
                                  background: 'rgba(255, 255, 255, 0.08)',
                                  border: '1px solid rgba(255, 255, 255, 0.2)',
                                  color: '#ffffff',
                                  fontSize: '10px',
                                  fontWeight: 700,
                                  borderRadius: '20px',
                                  padding: '5px 12px',
                                  cursor: 'pointer',
                                  outline: 'none',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  transition: 'background 0.2s'
                                }}
                                onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)'}
                                onMouseOut={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)'}
                              >
                                <RotateCw size={10} />
                                Erneut versuchen
                              </button>
                              <button
                                onClick={() => setShowPermissionHelp(true)}
                                style={{
                                  background: 'rgba(239, 68, 68, 0.15)',
                                  border: '1px solid rgba(239, 68, 68, 0.3)',
                                  color: '#fca5a5',
                                  fontSize: '10px',
                                  fontWeight: 700,
                                  borderRadius: '20px',
                                  padding: '5px 12px',
                                  cursor: 'pointer',
                                  outline: 'none',
                                  transition: 'background 0.2s'
                                }}
                                onMouseOver={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.25)'}
                                onMouseOut={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.15)'}
                              >
                                Anleitung
                              </button>
                            </>
                          )}
                        </div>
                      </>
                    ) : (
                      <div style={{ fontSize: '12px', fontWeight: 800, color: '#e6f4ea' }}>Kamera wird gestartet...</div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Coupled Station Footer — Premium Apple-style */}
            <div style={{
              width: '100%',
              marginTop: '4px',
              background: 'rgba(255, 255, 255, 0.65)',
              backdropFilter: 'blur(20px) saturate(180%)',
              WebkitBackdropFilter: 'blur(20px) saturate(180%)',
              border: '1px solid rgba(255, 255, 255, 0.5)',
              borderRadius: '20px',
              padding: '12px 14px',
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
              gap: '12px',
              boxSizing: 'border-box',
              boxShadow: '0 2px 12px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.8)'
            }}>
              {/* Device icon square */}
              {(() => {
                const stColor = getStationColor(coupledStationName, coupledStationColor);
                return (
                  <div style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '10px',
                    background: `${stColor}20`,
                    border: `1px solid ${stColor}40`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    boxShadow: `0 2px 8px ${stColor}30`
                  }}>
                    <Tablet size={18} style={{ color: stColor }} />
                  </div>
                );
              })()}

              {/* Text info */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1px', minWidth: 0 }}>
                <span style={{
                  fontSize: '15px',
                  fontWeight: 700,
                  color: '#1c1917',
                  lineHeight: 1.2,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}>
                  {coupledStationName || 'Station'}
                </span>
                <span style={{
                  fontSize: '11px',
                  fontWeight: 500,
                  color: 'rgba(28, 25, 23, 0.45)',
                  letterSpacing: '0.01em'
                }}>
                  Aktive Kiosk-Station
                </span>
              </div>

              {/* Green live dot */}
              <div style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: '#22c55e',
                flexShrink: 0,
                boxShadow: '0 0 0 2px rgba(34, 197, 94, 0.2)'
              }} />

              {/* Unlink button */}
              <button
                type="button"
                title="Kopplung aufheben"
                onClick={async () => {
                  // Nur Station-Kopplung aufheben — Kiosk-Modus (Token) bleibt erhalten
                  const token = localStorage.getItem('groovelab_kiosk_token');
                  if (token) {
                    try {
                      // Update active kiosk record in DB to decouple station
                      await supabase
                        .from('kiosks')
                        .update({ station_id: null, room_id: null })
                        .eq('secret_token', token);
                    } catch (err) {
                      console.error('[Trennen] DB update failed:', err);
                    }
                  }
                  localStorage.removeItem('groovelab_station_id');
                  localStorage.removeItem('groovelab_kiosk_room_id');
                  localStorage.setItem('groovelab_active_platform', 'groovelab');
                  // Token bleibt unberührt → Kiosk-Modus nach Reload aktiv
                  window.location.replace('/');
                }}
                style={{
                  background: 'rgba(0,0,0,0.05)',
                  border: '1px solid rgba(0,0,0,0.08)',
                  color: '#78716c',
                  fontSize: '11px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  height: '30px',
                  padding: '0 10px',
                  borderRadius: '10px',
                  outline: 'none',
                  flexShrink: 0,
                  transition: 'all 0.18s ease',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  whiteSpace: 'nowrap'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.background = 'rgba(239, 68, 68, 0.08)';
                  e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.2)';
                  e.currentTarget.style.color = '#dc2626';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.background = 'rgba(0,0,0,0.05)';
                  e.currentTarget.style.borderColor = 'rgba(0,0,0,0.08)';
                  e.currentTarget.style.color = '#78716c';
                }}
              >
                <Unlink size={11} />
                Trennen
              </button>
            </div>
          </div>
        )}

        {/* iOS-Style GrooveLab check-in button - Hidden in Kiosk Mode */}
        {!isGroovelabKiosk && (
          <div style={{ marginTop: '20px', width: '100%' }}>
            <button 
              onClick={() => {
                if (navigator.geolocation) {
                  setLoadingLocation(true);
                  navigator.geolocation.getCurrentPosition(
                    (pos) => {
                      const currentPos = { lat: pos.coords.latitude, lng: pos.coords.longitude };
                      setUserPos(currentPos);
                      console.log('[Kiosk] Geolocation success:', currentPos);
                      setLoadingLocation(false);
                      setIsGroovelabKiosk(true);
                      setIsCameraActive(true);
                    },
                    (err) => {
                      console.warn('[Kiosk] Geolocation failed:', err);
                      setLoadingLocation(false);
                      setIsGroovelabKiosk(true); // Fallback: still show kiosk rooms
                      setIsCameraActive(true);
                    },
                    { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 }
                  );
                } else {
                  setIsGroovelabKiosk(true);
                  setIsCameraActive(true);
                }
              }}
              disabled={loadingLocation}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '12px 16px',
                borderRadius: '16px',
                background: 'rgba(255, 255, 255, 0.06)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                color: '#ffffff',
                fontSize: '13px',
                fontWeight: 700,
                cursor: loadingLocation ? 'wait' : 'pointer',
                transition: 'all 0.2s',
                textAlign: 'center',
                boxSizing: 'border-box',
                height: '48px',
                outline: 'none',
                opacity: loadingLocation ? 0.7 : 1
              }}
              onMouseOver={(e) => { if (!loadingLocation) e.currentTarget.style.background = 'rgba(255, 255, 255, 0.12)'; }}
              onMouseOut={(e) => { if (!loadingLocation) e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)'; }}
            >
              {loadingLocation ? (
                <>
                  <div style={{ width: '12px', height: '12px', border: '2px solid white', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                  Standort wird ermittelt...
                </>
              ) : (
                <>
                  <Tablet size={16} color="#e6f4ea" />
                  Im GrooveLab anmelden
                </>
              )}
            </button>
          </div>
        )}

        {!isGroovelabKiosk && !schoolData && (
          <div style={{ marginTop: '12px', width: '100%' }}>
            <button 
              onClick={() => {
                navigate('/signup');
              }}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '12px 16px',
                borderRadius: '16px',
                background: 'transparent',
                border: '1px dashed rgba(255, 255, 255, 0.25)',
                color: '#ffffff',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.2s',
                textAlign: 'center',
                boxSizing: 'border-box',
                height: '48px',
                outline: 'none'
              }}
              onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'; }}
              onMouseOut={(e) => { e.currentTarget.style.background = 'transparent'; }}
            >
              <School size={16} color="#e6f4ea" />
              Neue Schule registrieren (Software-Lizenz 100% kostenlos)
            </button>
          </div>
        )}

        {error && (
          <div style={{ marginTop: '16px', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#fca5a5', padding: '14px', borderRadius: '16px', fontSize: '13px', fontWeight: 800, textAlign: 'center', width: '100%' }}>
            {error}
          </div>
        )}

        {/* Kiosk Activator Nested Inside Scanner Card - Hide if already coupled */}
        {isGroovelabKiosk && !effectiveStationId && (
          <div style={{
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            marginTop: '20px',
            borderTop: '1px solid rgba(0, 0, 0, 0.1)',
            paddingTop: '20px'
          }}>
            <div style={{ fontSize: '11px', fontWeight: 800, color: 'rgba(0, 0, 0, 0.6)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Tablet size={14} style={{ color: '#78350f' }} /> GrooveLab Kiosk aktivieren
            </div>
            
            {kioskRooms.length > 0 ? (
              <>
                {/* Room Selector */}
                <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
                  {kioskRooms.map((room, idx) => (
                    <button
                      key={room.id}
                      type="button"
                      onClick={() => {
                        setKioskSelectedRoomId(room.id);
                        // Trigger GPS request pre-emptively on user click gesture!
                        if (navigator.geolocation) {
                          navigator.geolocation.getCurrentPosition(
                            (pos) => {
                              const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
                              setUserPos(coords);
                              console.log('[GPS Room Click] Cached coords:', coords);
                            },
                            (err) => console.warn('[GPS Room Click] Failed:', err),
                            { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 }
                          );
                        }
                      }}
                      style={{
                        padding: '8px 14px',
                        borderRadius: '12px',
                        border: '1.5px solid',
                        borderColor: kioskSelectedRoomId === room.id ? '#eab308' : (isGroovelabKiosk ? 'rgba(133, 77, 14, 0.25)' : 'rgba(255, 255, 255, 0.15)'),
                        background: kioskSelectedRoomId === room.id ? '#eab308' : 'transparent',
                        color: kioskSelectedRoomId === room.id ? '#713f12' : (isGroovelabKiosk ? '#854d0e' : '#ffffff'),
                        fontSize: '12px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                        transition: 'all 0.2s'
                      }}
                    >
                      {`${idx + 1} - ${cleanRoomName(room.name)}`}
                    </button>
                  ))}
                </div>

                 {/* iPad Stations Visual Layout Map */}
                <div 
                  ref={kioskMapRef}
                  style={{
                    position: 'relative',
                    width: '100%',
                    aspectRatio: '1.4', // Standard room shape ratio
                    background: isGroovelabKiosk ? 'rgba(0, 0, 0, 0.04)' : 'rgba(255, 255, 255, 0.04)',
                    borderRadius: '24px',
                    border: isGroovelabKiosk ? '1px solid rgba(0, 0, 0, 0.08)' : '1px solid rgba(255, 255, 255, 0.1)',
                    marginTop: '12px',
                    overflow: 'hidden'
                  }}
                >
                  {adjustPositions(
                    kioskStations.filter(s => s.room_id === kioskSelectedRoomId),
                    kioskMapWidth
                  ).map((station) => {
                    const isTeacherStation = station.name?.toLowerCase().includes('lehrer') || station.name?.toLowerCase().includes('teacher');
                    const isOccupied = !isTeacherStation && activeSessionStationIds.includes(station.id);
                    const posX = station.x;
                    const posY = station.y;
                    const stationColor = getStationColor(station.name, station.color);

                    const isSelected = selectedKioskStationId === station.id;
                    const isYellow = stationColor.toLowerCase() === '#eab308';

                    return (
                      <button
                        key={station.id}
                        type="button"
                        onClick={async () => {
                          if (isOccupied) {
                            const confirm = window.confirm(`Dieses iPad ist besetzt. Möchtest du die alte Sitzung beenden und dieses iPad übernehmen?`);
                            if (!confirm) return;
                          }
                          const newSelection = isSelected ? null : station.id;
                          setSelectedKioskStationId(newSelection);
                          if (newSelection) {
                            try {
                              // Temporarily set the school's kiosk token to authenticate the Supabase request
                              if (schoolData?.groovelab_kiosk_token) {
                                localStorage.setItem('groovelab_kiosk_token', schoolData.groovelab_kiosk_token);
                              }

                               const isUuid = (str: any) => typeof str === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
                               const generatedSecretToken = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : (Date.now() + '-0000-4000-8000-' + Math.floor(Math.random()*1e12).toString(16).padStart(12, '0'));

                               // Check if kiosk record already exists for this station
                               const { data: existingKiosk, error: fetchErr } = isUuid(newSelection) ? await supabase
                                 .from('kiosks')
                                 .select('*')
                                 .eq('station_id', newSelection)
                                 .limit(1)
                                 .maybeSingle() : { data: null, error: null };

                               if (fetchErr) throw fetchErr;

                               let kioskRecord = existingKiosk;

                               if (!kioskRecord) {
                                 // Create new kiosk record if none exists
                                 const { data: insertedRows, error: insertErr } = await supabase
                                   .from('kiosks')
                                   .insert({
                                     school_id: schoolData.id,
                                     name: station.name || 'iPad Kiosk',
                                     secret_token: generatedSecretToken,
                                     room_id: isUuid(station.room_id) ? station.room_id : null,
                                     station_id: isUuid(station.id) ? station.id : null
                                   })
                                   .select();

                                 if (insertErr) throw insertErr;
                                 if (!insertedRows || insertedRows.length === 0) {
                                   throw new Error('Kopplungs-Eintrag konnte nicht erstellt werden.');
                                 }
                                 kioskRecord = insertedRows[0];
                               }

                              if (kioskRecord && kioskRecord.secret_token) {
                                // Overwrite the temporary school token with the kiosk's specific secret token
                                localStorage.setItem('groovelab_kiosk_token', kioskRecord.secret_token);
                                localStorage.setItem('groovelab_station_id', newSelection);
                                localStorage.setItem('groovelab_kiosk_room_id', station.room_id);
                                localStorage.setItem('groovelab_active_platform', 'groovelab');
                                // Force a redirect with full URL params so iOS Safari uses this as the PWA start_url
                                const redirectUrl = `/?platform=groovelab&kiosk_token=${encodeURIComponent(kioskRecord.secret_token)}&station_id=${encodeURIComponent(newSelection)}${station.room_id ? `&kiosk_room_id=${encodeURIComponent(station.room_id)}` : ''}`;
                                window.location.href = redirectUrl;
                              } else {
                                throw new Error('Kopplungs-Token konnte nicht geladen werden.');
                              }
                            } catch (err: any) {
                              console.error('[KioskActivation] Coupling failed:', err);
                              // Clear the temporary token on failure
                              localStorage.removeItem('groovelab_kiosk_token');
                              alert('Kopplung fehlgeschlagen: ' + err.message);
                              setSelectedKioskStationId(null);
                            }
                            
                            // Trigger GPS request pre-emptively on user click gesture!
                            if (navigator.geolocation) {
                              navigator.geolocation.getCurrentPosition(
                                (pos) => {
                                  const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
                                  setUserPos(coords);
                                  console.log('[GPS Station Click] Cached coords:', coords);
                                },
                                (err) => console.warn('[GPS Station Click] Failed:', err),
                                { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 }
                              );
                            }
                          } else {
                            localStorage.removeItem('groovelab_kiosk_token');
                            localStorage.removeItem('groovelab_station_id');
                          }
                        }}
                        style={{
                          position: 'absolute',
                          left: `${posX}%`,
                          top: `${posY}%`,
                          transform: isSelected ? 'translate(-50%, -50%) scale(1.08)' : 'translate(-50%, -50%)',
                          width: '62px',
                          height: '62px',
                          borderRadius: '14px',
                          border: isSelected
                            ? '1px solid #ffffff'
                            : `2px solid ${stationColor}`,
                          background: isSelected 
                            ? `linear-gradient(180deg, ${stationColor} 0%, color-mix(in srgb, ${stationColor} 96%, #000000 4%) 100%)`
                            : `${stationColor}15`,
                          color: isSelected
                            ? (isYellow ? '#09090b' : '#ffffff')
                            : (isGroovelabKiosk ? '#1e293b' : '#ffffff'),
                          cursor: 'pointer',
                          transition: 'all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)', // Spring-like feel
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '2px',
                          textAlign: 'center',
                          boxShadow: isSelected 
                            ? `inset 0 1.5px 0 rgba(255, 255, 255, ${isYellow ? '0.18' : '0.12'}), inset 0 -1px 0 rgba(0, 0, 0, 0.05), 0 0 16px ${stationColor}20, 0 4px 10px rgba(0, 0, 0, 0.08)`
                            : '0 4px 10px rgba(0, 0, 0, 0.05)',
                          outline: 'none',
                          zIndex: isSelected ? 10 : 1,
                          opacity: isSelected ? 1 : (isOccupied ? 0.7 : 1)
                        }}
                        title={`${station.name} (${isOccupied ? 'Besetzt' : 'Frei'})`}
                      >
                        {station.instrument && (
                          <span style={{ fontSize: '7px', textTransform: 'uppercase', letterSpacing: '0.05em', opacity: isSelected ? 0.8 : 0.6, fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', width: '100%', padding: '0 2px' }}>
                            {station.instrument}
                          </span>
                        )}
                        <span style={{ fontSize: '10px', fontWeight: 900, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', width: '100%', padding: '0 2px', lineHeight: 1.1 }}>
                          {station.name}
                        </span>
                        {isOccupied ? (
                          <Lock size={10} style={{ color: isSelected ? (isYellow ? '#09090b' : '#ffffff') : (isGroovelabKiosk ? '#ef4444' : '#fca5a5'), marginTop: '2px' }} />
                        ) : (
                          <div style={{ 
                            width: '6px', 
                            height: '6px', 
                            borderRadius: '50%', 
                            background: isSelected
                              ? (isYellow ? '#09090b' : '#ffffff')
                              : '#34a853',
                            border: isSelected ? 'none' : '1px solid rgba(255,255,255,0.2)',
                            marginTop: '3px',
                            boxShadow: isSelected ? `0 0 6px ${isYellow ? 'rgba(0,0,0,0.4)' : 'rgba(255,255,255,0.8)'}` : 'none'
                          }} />
                        )}
                      </button>
                    );
                  })}
                </div>
              </>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'center', margin: '8px 0' }}>
                <p style={{ fontSize: '12px', color: isGroovelabKiosk ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.6)', margin: 0, textAlign: 'center' }}>
                  Keine GrooveLab-iPad-Räume eingerichtet.
                </p>
              </div>
            )}
            
            <button 
              type="button" 
              onClick={() => {
                localStorage.removeItem('groovelab_station_id');
                localStorage.removeItem('groovelab_kiosk_token');
                localStorage.removeItem('groovelab_kiosk_room_id');
                localStorage.removeItem('groovelab_active_platform');
                setIsGroovelabKiosk(false);
                window.location.replace('/');
              }} 
              style={{ background: 'none', border: 'none', color: isGroovelabKiosk ? 'rgba(0, 0, 0, 0.4)' : 'rgba(255, 255, 255, 0.4)', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', marginTop: '12px', cursor: 'pointer', alignSelf: 'center' }}
            >
              Abbrechen
            </button>
          </div>
        )}
      </div>
      )}

      {/* Passwort Anmeldung & Eltern-Onboarding buttons under the card if available */}
      {expandedSection === 'none' && !isGroovelabKiosk && (
        <div style={{ marginTop: '24px', display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'center' }}>
          {biometricsAvailable && (
            <button 
              onClick={handleBiometricsLogin}
              style={{ 
                background: isGroovelabKiosk ? 'rgba(0, 0, 0, 0.06)' : 'rgba(255, 255, 255, 0.08)', 
                border: isGroovelabKiosk ? '1px solid rgba(0, 0, 0, 0.12)' : '1px solid rgba(255, 255, 255, 0.15)', 
                padding: '10px 24px',
                borderRadius: '100px',
                color: isGroovelabKiosk ? '#062413' : '#ffffff', 
                fontSize: '12px', 
                fontWeight: 800, 
                textTransform: 'uppercase', 
                letterSpacing: '0.05em', 
                cursor: 'pointer', 
                transition: 'all 0.2s',
                backdropFilter: 'blur(10px)',
                WebkitBackdropFilter: 'blur(10px)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
              onMouseOver={(e) => { e.currentTarget.style.background = isGroovelabKiosk ? 'rgba(0, 0, 0, 0.12)' : 'rgba(255, 255, 255, 0.16)'; }}
              onMouseOut={(e) => { e.currentTarget.style.background = isGroovelabKiosk ? 'rgba(0, 0, 0, 0.06)' : 'rgba(255, 255, 255, 0.08)'; }}
            >
              <Fingerprint size={14} color={isGroovelabKiosk ? '#062413' : '#e6f4ea'} />
              Fingerabdruck Login
            </button>
          )}

          {!isGroovelabKiosk && (
            <button 
              onClick={() => setExpandedSection('pin')}
              style={{ 
                background: 'rgba(255, 255, 255, 0.08)', 
                border: '1px solid rgba(255, 255, 255, 0.15)', 
                padding: '10px 24px',
                borderRadius: '100px',
                color: '#ffffff', 
                fontSize: '12px', 
                fontWeight: 800, 
                textTransform: 'uppercase', 
                letterSpacing: '0.05em', 
                cursor: 'pointer', 
                transition: 'all 0.2s',
                backdropFilter: 'blur(10px)',
                WebkitBackdropFilter: 'blur(10px)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
              onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.16)'; }}
              onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)'; }}
            >
              <KeyRound size={14} color="#e6f4ea" />
              Passwort Anmeldung
            </button>
          )}
        </div>
      )}

      {/* Teacher PIN Login under Coupled Kiosk Welcome Card */}
      {expandedSection === 'none' && isGroovelabKiosk && effectiveStationId && (
        <div style={{ marginTop: '24px', display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'center' }}>
          <button 
            onClick={() => setExpandedSection('pin')}
            style={{ 
              background: 'rgba(0, 0, 0, 0.04)', 
              border: '1px solid rgba(133, 77, 14, 0.15)', 
              padding: '10px 24px',
              borderRadius: '100px',
              color: '#854d0e', 
              fontSize: '12px', 
              fontWeight: 800, 
              textTransform: 'uppercase', 
              letterSpacing: '0.05em', 
              cursor: 'pointer', 
              transition: 'all 0.2s',
              backdropFilter: 'blur(10px)',
              WebkitBackdropFilter: 'blur(10px)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
            onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(133, 77, 14, 0.08)'; }}
            onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(0, 0, 0, 0.04)'; }}
          >
            <KeyRound size={14} color="#854d0e" />
            Lehrer-Login (PIN / Passwort)
          </button>
        </div>
      )}

      {/* Manueller PIN Zugang */}
      {expandedSection === 'pin' && (
      <div style={{
        width: '100%',
        maxWidth: '420px',
        background: isGroovelabKiosk ? 'rgba(255, 255, 255, 0.82)' : 'rgba(255, 255, 255, 0.07)',
        borderRadius: '40px',
        padding: '28px',
        boxShadow: isGroovelabKiosk 
          ? '0 40px 100px rgba(120, 53, 15, 0.18), inset 0 1px 0 rgba(255, 255, 255, 0.6)' 
          : '0 40px 100px rgba(0, 0, 0, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.15)',
        border: isGroovelabKiosk 
          ? '1px solid rgba(255, 255, 255, 0.4)' 
          : '1px solid rgba(255, 255, 255, 0.12)',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        backdropFilter: 'blur(30px)',
        WebkitBackdropFilter: 'blur(30px)'
      }}>
        <div style={{ fontSize: '11px', fontWeight: 800, color: isGroovelabKiosk ? 'rgba(0, 0, 0, 0.6)' : 'rgba(255, 255, 255, 0.6)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <User size={14} style={{ color: isGroovelabKiosk ? '#78350f' : '#e6f4ea' }} /> Manueller Zugang über PIN / QR-Token
        </div>
        <form onSubmit={(e) => { e.preventDefault(); handlePinLogin(pinInput); }} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', gap: '10px' }}>
            <input
              type="text"
              value={pinInput}
              onChange={(e) => setPinInput(e.target.value)}
              placeholder="Ausweis ID..."
              style={{
                flex: 1,
                padding: '14px 18px',
                borderRadius: '16px',
                border: isGroovelabKiosk ? '1.5px solid #cbd5e1' : '1.5px solid rgba(255, 255, 255, 0.15)',
                fontSize: '14px',
                fontWeight: 700,
                outline: 'none',
                transition: 'all 0.2s',
                background: isGroovelabKiosk ? '#ffffff' : 'rgba(255, 255, 255, 0.05)',
                color: isGroovelabKiosk ? '#0f172a' : '#ffffff'
              }}
            />
            <button
              type="submit"
              disabled={loading || !pinInput.trim()}
              style={{
                padding: '14px 24px',
                borderRadius: '16px',
                border: 'none',
                background: isGroovelabKiosk ? '#eab308' : (schoolData?.primary_color || '#e6f4ea'),
                color: isGroovelabKiosk ? '#713f12' : (schoolData?.primary_color ? '#ffffff' : '#062413'),
                fontWeight: 800,
                fontSize: '14px',
                cursor: 'pointer',
                transition: 'all 0.2s',
                opacity: !pinInput.trim() ? 0.6 : 1
              }}
            >
              Login
            </button>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', marginTop: '4px' }}>
            <input 
              type="checkbox" 
              id="login-consent-checkbox" 
              checked={loginConsentAccepted} 
              onChange={(e) => setLoginConsentAccepted(e.target.checked)} 
              style={{ width: '16px', height: '16px', marginTop: '2px', cursor: 'pointer' }}
            />
            <label htmlFor="login-consent-checkbox" style={{ fontSize: '11px', color: isGroovelabKiosk ? 'rgba(0, 0, 0, 0.7)' : 'rgba(255, 255, 255, 0.7)', textAlign: 'left', cursor: 'pointer', lineHeight: '1.4' }}>
              Ich bin mit der <span style={{ textDecoration: 'underline', color: isGroovelabKiosk ? '#854d0e' : '#e6f4ea' }} onClick={(e) => { e.preventDefault(); e.stopPropagation(); alert("Unsere Datenschutzerklärung finden Sie unter der Datenschutz-Schaltfläche im Hauptmenü."); }}>Datenschutzerklärung</span> einverstanden.
            </label>
          </div>
        </form>
        <button onClick={() => setExpandedSection('none')} style={{ background: 'none', border: 'none', color: isGroovelabKiosk ? 'rgba(0, 0, 0, 0.4)' : 'rgba(255, 255, 255, 0.4)', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', marginTop: '12px', cursor: 'pointer', alignSelf: 'center' }}>
          Zurück
        </button>
      </div>
      )}

      {/* Eltern Onboarding & Aktivierung */}
      {expandedSection === 'parentOnboarding' && (
      <div style={{
        width: '95%',
        maxWidth: parentOnboardingStep === 'preferences' ? '850px' : '520px',
        background: '#ffffff',
        borderRadius: '32px',
        padding: '36px',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.15)',
        border: '1px solid #e2e8f0',
        display: 'flex',
        flexDirection: 'column',
        gap: '24px',
        boxSizing: 'border-box',
        color: '#1e293b',
        fontFamily: "'Inter', 'Outfit', sans-serif"
      }}>
        {/* Progress Bar & Steps */}
        <div style={{ display: 'flex', alignItems: 'center', borderBottom: '1px solid #f1f5f9', paddingBottom: '16px', width: '100%', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '12px', background: '#e6f4ea', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#34a853' }}>
              <Calendar size={20} />
            </div>
            <div style={{ textAlign: 'left' }}>
              <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#0f172a', display: 'block' }}>Stundenplan einrichten</span>
              <span style={{ fontSize: '0.68rem', color: '#64748b', display: 'block' }}>Campus-Groovelab</span>
            </div>
          </div>
          <span style={{ fontSize: '0.72rem', fontWeight: 850, background: '#f1f5f9', color: '#475569', padding: '5px 12px', borderRadius: '100px', fontFamily: 'Urbanist' }}>
            {parentOnboardingStep === 'verify' && 'Schritt 1 von 3'}
            {(parentOnboardingStep === 'setup-pin' || parentOnboardingStep === 'pin') && 'Schritt 2 von 3'}
            {parentOnboardingStep === 'preferences' && 'Schritt 3 von 3'}
            {parentOnboardingStep === 'success' && 'Fertig! 🎉'}
          </span>
        </div>

        {parentOnboardingError && (
          <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', padding: '12px 16px', borderRadius: '16px', color: '#991b1b', fontSize: '13px', fontWeight: 650, display: 'flex', alignItems: 'center', gap: '8px', textAlign: 'left' }}>
            <AlertCircle size={16} style={{ color: '#ef4444', flexShrink: 0 }} /> 
            <span>{parentOnboardingError}</span>
          </div>
        )}

        {parentOnboardingStep === 'verify' && (
          <form onSubmit={handleParentVerification} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ textAlign: 'left' }}>
              <h3 style={{ margin: '0 0 6px 0', fontSize: '1.15rem', fontWeight: 900, color: '#0f172a', fontFamily: 'Outfit' }}>
                Willkommen bei Campus-Groovelab!
              </h3>
              <p style={{ margin: 0, color: '#475569', fontSize: '0.82rem', lineHeight: '1.45' }}>
                Lass uns zuerst die Daten deines Kindes verifizieren, damit wir die Wunschzeiten richtig zuordnen können. Bitte gib die Daten exakt so ein, wie sie auf der Anmeldung stehen.
              </p>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', textAlign: 'left' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', color: '#475569', fontWeight: 800, textTransform: 'uppercase', marginBottom: '6px', letterSpacing: '0.02em' }}>Vorname des Kindes *</label>
                <input
                  type="text"
                  required
                  value={parentFirstName}
                  onChange={(e) => setParentFirstName(e.target.value)}
                  placeholder="z.B. Max"
                  style={{ width: '100%', boxSizing: 'border-box', padding: '12px 16px', borderRadius: '12px', border: '1.5px solid #cbd5e1', background: '#ffffff', color: '#0f172a', outline: 'none', fontSize: '14px', fontWeight: 700 }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', color: '#475569', fontWeight: 800, textTransform: 'uppercase', marginBottom: '6px', letterSpacing: '0.02em' }}>Nachname des Kindes *</label>
                <input
                  type="text"
                  required
                  value={parentLastName}
                  onChange={(e) => setParentLastName(e.target.value)}
                  placeholder="z.B. Mustermann"
                  style={{ width: '100%', boxSizing: 'border-box', padding: '12px 16px', borderRadius: '12px', border: '1.5px solid #cbd5e1', background: '#ffffff', color: '#0f172a', outline: 'none', fontSize: '14px', fontWeight: 700 }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', color: '#475569', fontWeight: 800, textTransform: 'uppercase', marginBottom: '6px', letterSpacing: '0.02em' }}>Instrument *</label>
                <select
                  required
                  value={parentInstrument}
                  onChange={(e) => setParentInstrument(e.target.value)}
                  style={{ width: '100%', boxSizing: 'border-box', padding: '12px 16px', borderRadius: '12px', border: '1.5px solid #cbd5e1', background: '#ffffff', color: '#0f172a', outline: 'none', fontSize: '14px', fontWeight: 700, cursor: 'pointer' }}
                >
                  <option value="">-- Instrument wählen --</option>
                  {availableInstruments.map(inst => (
                    <option key={inst} value={inst}>{inst}</option>
                  ))}
                  {availableInstruments.length === 0 && (
                    <>
                      <option value="ohne Zuweisung">ohne Zuweisung</option>
                      <option value="Klavier">Klavier</option>
                      <option value="E-Gitarre">E-Gitarre</option>
                      <option value="Akustikgitarre">Akustikgitarre</option>
                      <option value="Schlagzeug">Schlagzeug</option>
                      <option value="Bass">Bass</option>
                      <option value="Gesang">Gesang</option>
                      <option value="Keyboard">Keyboard</option>
                    </>
                  )}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', color: '#475569', fontWeight: 800, textTransform: 'uppercase', marginBottom: '6px', letterSpacing: '0.02em' }}>Geburtstagstag (Zahl 1-31) *</label>
                <input
                  type="number"
                  required
                  min={1}
                  max={31}
                  value={parentDayOfBirth}
                  onChange={(e) => setParentDayOfBirth(e.target.value)}
                  placeholder="Nur den Tag eintragen, z.B. 15"
                  style={{ width: '100%', boxSizing: 'border-box', padding: '12px 16px', borderRadius: '12px', border: '1.5px solid #cbd5e1', background: '#ffffff', color: '#0f172a', outline: 'none', fontSize: '14px', fontWeight: 700 }}
                />
                <span style={{ fontSize: '11px', color: '#64748b', marginTop: '6px', display: 'block', lineHeight: '1.3' }}>
                  🔒 Monat & Jahr werden aus Datenschutzgründen im System nicht erfasst.
                </span>
              </div>
            </div>

            <button
              type="submit"
              disabled={parentOnboardingLoading}
              style={{
                width: '100%', padding: '14px', borderRadius: '16px', border: 'none',
                background: '#34a853',
                color: '#ffffff',
                fontWeight: 800, fontSize: '14px', cursor: 'pointer', transition: 'all 0.2s', marginTop: '8px',
                boxShadow: '0 4px 12px rgba(52, 168, 83, 0.2)'
              }}
            >
              {parentOnboardingLoading ? 'Prüfe Daten...' : 'Schüler verifizieren & fortfahren'}
            </button>

            <button 
              type="button"
              onClick={() => setExpandedSection('none')} 
              style={{ background: 'none', border: 'none', color: '#64748b', fontSize: '11.5px', fontWeight: 800, textTransform: 'uppercase', cursor: 'pointer', alignSelf: 'center' }}
            >
              Abbrechen
            </button>
          </form>
        )}



        {parentOnboardingStep === 'setup-pin' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', textAlign: 'left' }}>
            <div>
              <h3 style={{ margin: '0 0 6px 0', fontSize: '1.15rem', fontWeight: 900, color: '#0f172a', fontFamily: 'Outfit' }}>
                Sicherheits-PIN einrichten
              </h3>
              <p style={{ margin: 0, color: '#475569', fontSize: '0.82rem', lineHeight: '1.45' }}>
                Bitte erstelle eine selbstgewählte 4-stellige PIN. Mit dieser PIN kannst du deinen Stundenplan später jederzeit anpassen oder einsehen.
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '10px', color: '#64748b', fontWeight: 700, marginBottom: '6px', textTransform: 'uppercase' }}>PIN eingeben *</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {[0, 1, 2, 3].map((idx) => (
                    <input
                      key={`setup-pin-${idx}`}
                      id={`setup-pin-${idx}`}
                      type="password"
                      maxLength={1}
                      pattern="[0-9]*"
                      inputMode="numeric"
                      value={newOnboardingPin[idx]}
                      onChange={(e) => {
                        const val = e.target.value.replace(/[^0-9]/g, '');
                        const nextPin = [...newOnboardingPin];
                        nextPin[idx] = val;
                        setNewOnboardingPin(nextPin);
                        if (val && idx < 3) {
                          const nextInput = document.getElementById(`setup-pin-${idx + 1}`);
                          if (nextInput) nextInput.focus();
                        }
                      }}
                      style={{
                        width: '48px',
                        height: '48px',
                        textAlign: 'center',
                        fontSize: '20px',
                        fontWeight: 800,
                        borderRadius: '12px',
                        border: '2px solid #cbd5e1',
                        background: '#ffffff'
                      }}
                    />
                  ))}
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '10px', color: '#64748b', fontWeight: 700, marginBottom: '6px', textTransform: 'uppercase' }}>PIN bestätigen *</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {[0, 1, 2, 3].map((idx) => (
                    <input
                      key={`setup-confirm-pin-${idx}`}
                      id={`setup-confirm-pin-${idx}`}
                      type="password"
                      maxLength={1}
                      pattern="[0-9]*"
                      inputMode="numeric"
                      value={newOnboardingPinConfirm[idx]}
                      onChange={(e) => {
                        const val = e.target.value.replace(/[^0-9]/g, '');
                        const nextPin = [...newOnboardingPinConfirm];
                        nextPin[idx] = val;
                        setNewOnboardingPinConfirm(nextPin);
                        if (val && idx < 3) {
                          const nextInput = document.getElementById(`setup-confirm-pin-${idx + 1}`);
                          if (nextInput) nextInput.focus();
                        }
                      }}
                      style={{
                        width: '48px',
                        height: '48px',
                        textAlign: 'center',
                        fontSize: '20px',
                        fontWeight: 800,
                        borderRadius: '12px',
                        border: '2px solid #cbd5e1',
                        background: '#ffffff'
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '8px' }}>
              <button
                type="button"
                onClick={() => {
                  const pinStr = newOnboardingPin.join('');
                  const confirmStr = newOnboardingPinConfirm.join('');
                  if (pinStr.length < 4 || confirmStr.length < 4) {
                    setParentOnboardingError('Bitte erstelle eine vollständige 4-stellige PIN und bestätige sie.');
                    return;
                  }
                  if (pinStr !== confirmStr) {
                    setParentOnboardingError('Die eingegebenen PINs stimmen nicht überein.');
                    return;
                  }
                  setParentOnboardingError(null);
                  setParentOnboardingStep('preferences');
                }}
                style={{
                  width: '100%', padding: '14px', borderRadius: '16px', border: 'none',
                  background: '#34a853',
                  color: '#ffffff',
                  fontWeight: 800, fontSize: '14px', cursor: 'pointer', transition: 'all 0.2s',
                  boxShadow: '0 4px 12px rgba(52, 168, 83, 0.2)'
                }}
              >
                PIN festlegen & Weiter zu Wunschzeiten
              </button>
            </div>
          </div>
        )}



        {parentOnboardingStep === 'pin' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', textAlign: 'left' }}>
            <div>
              <h3 style={{ margin: '0 0 6px 0', fontSize: '1.15rem', fontWeight: 900, color: '#0f172a', fontFamily: 'Outfit' }}>
                Sicherheits-PIN erforderlich
              </h3>
              <p style={{ margin: 0, color: '#475569', fontSize: '0.82rem', lineHeight: '1.45' }}>
                Dieses Schüler-Profil wurde bereits eingerichtet und mit einer Sicherheits-PIN geschützt. Bitte gib die PIN ein, um fortzufahren.
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', alignItems: 'center' }}>
              <div style={{ display: 'flex', gap: '10px' }}>
                {[0, 1, 2, 3].map((idx) => (
                  <input
                    key={`pin-input-${idx}`}
                    id={`pin-input-${idx}`}
                    type="password"
                    maxLength={1}
                    pattern="[0-9]*"
                    inputMode="numeric"
                    value={onboardingPin[idx]}
                    onChange={(e) => {
                      const val = e.target.value.replace(/[^0-9]/g, '');
                      const nextPin = [...onboardingPin];
                      nextPin[idx] = val;
                      setOnboardingPin(nextPin);
                      if (val && idx < 3) {
                        const nextInput = document.getElementById(`pin-input-${idx + 1}`);
                        if (nextInput) nextInput.focus();
                      }
                    }}
                    style={{
                      width: '54px',
                      height: '54px',
                      textAlign: 'center',
                      fontSize: '22px',
                      fontWeight: 800,
                      borderRadius: '14px',
                      border: '2px solid #cbd5e1',
                      background: '#ffffff',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
                    }}
                  />
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '8px' }}>
              <button
                type="button"
                onClick={handleVerifyPin}
                disabled={parentOnboardingLoading}
                style={{
                  width: '100%', padding: '14px', borderRadius: '16px', border: 'none',
                  background: '#34a853',
                  color: '#ffffff',
                  fontWeight: 800, fontSize: '14px', cursor: 'pointer', transition: 'all 0.2s',
                  boxShadow: '0 4px 12px rgba(52, 168, 83, 0.2)'
                }}
              >
                {parentOnboardingLoading ? 'Prüfe PIN...' : 'PIN bestätigen'}
              </button>

              {isResetAllowed ? (
                <button
                  type="button"
                  onClick={handleFreezeProfile}
                  disabled={parentOnboardingLoading}
                  style={{
                    width: '100%', padding: '10px', borderRadius: '16px', border: '1.5px solid #cbd5e1',
                    background: '#ffffff',
                    color: '#dc2626',
                    fontWeight: 700, fontSize: '12px', cursor: 'pointer', transition: 'all 0.2s'
                  }}
                >
                  PIN vergessen oder Konflikt melden
                </button>
              ) : (
                <div style={{
                  padding: '10px', borderRadius: '12px', background: '#f8fafc', border: '1px solid #e2e8f0',
                  color: '#64748b', fontSize: '11px', textAlign: 'center', lineHeight: '1.4'
                }}>
                  ℹ️ Eine PIN-Zurücksetzung ist nur bis zu 2 Wochen nach der Stundenplan-Zuteilung möglich. Bitte wende dich direkt an deine Musikschule.
                </div>
              )}

              <button
                type="button"
                onClick={() => setParentOnboardingStep('verify')}
                style={{ background: 'none', border: 'none', color: '#64748b', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', cursor: 'pointer', alignSelf: 'center', marginTop: '4px' }}
              >
                Zurück
              </button>
            </div>
          </div>
        )}

        {parentOnboardingStep === 'frozen' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', textAlign: 'left' }}>
            <div style={{
              width: '56px', height: '56px', borderRadius: '50%', background: '#fee2e2',
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444',
              alignSelf: 'center', boxShadow: '0 4px 12px rgba(239, 68, 68, 0.1)'
            }}>
              🔒
            </div>

            <div style={{ textAlign: 'center' }}>
              <h3 style={{ margin: '0 0 8px 0', fontSize: '1.2rem', fontWeight: 900, color: '#dc2626', fontFamily: 'Outfit' }}>
                Profil vorübergehend gesperrt
              </h3>
              <p style={{ margin: 0, color: '#475569', fontSize: '0.82rem', lineHeight: '1.5' }}>
                Der Konflikt wurde erfolgreich an das Sekretariat der Musikschule gemeldet. Aus Sicherheitsgründen wurde dieses Konto eingefroren und alle alten Logins entwertet.
              </p>
            </div>

            <div style={{
              background: '#f8fafc',
              border: '1.5px solid #e2e8f0',
              borderRadius: '16px',
              padding: '16px',
              fontSize: '0.8rem',
              color: '#334155',
              lineHeight: '1.45'
            }}>
              <strong>Wie geht es weiter?</strong>
              <ol style={{ margin: '8px 0 0 16px', padding: 0 }}>
                <li>Das Sekretariat prüft den Onboarding-Konflikt.</li>
                <li>Du erhältst einen personalisierten, kryptografischen Einmal-Link per E-Mail an deine registrierte E-Mail-Adresse.</li>
                <li>Über diesen Link kannst du dein Onboarding sicher abschließen und eine neue PIN vergeben.</li>
              </ol>
            </div>

            <button
              type="button"
              onClick={() => {
                setExpandedSection('none');
                setParentOnboardingStep('verify');
              }}
              style={{
                width: '100%', padding: '12px', borderRadius: '16px', border: 'none',
                background: '#475569',
                color: '#ffffff',
                fontWeight: 800, fontSize: '13px', cursor: 'pointer', transition: 'all 0.2s'
              }}
            >
              Schließen
            </button>
          </div>
        )}

        {parentOnboardingStep === 'preferences' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '100%' }}>
            {isAlreadyOnboarded && (
              <div style={{ background: '#fffbeb', border: '1px solid #fde68a', padding: '12px 16px', borderRadius: '16px', color: '#b45309', fontSize: '13px', fontWeight: 650, display: 'flex', alignItems: 'center', gap: '8px', textAlign: 'left' }}>
                <AlertCircle size={16} style={{ color: '#d97706', flexShrink: 0 }} /> 
                <span>Du hast deinen Stundenplan bereits eingerichtet. Wenn du fortfährst, werden deine bisherigen Wunschzeiten und Notizen überschrieben.</span>
              </div>
            )}
            
            {/* Sibling Tabs */}
            {parentChildren.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px', borderBottom: '1.5px solid #e2e8f0', paddingBottom: '12px', marginBottom: '4px' }}>
                {parentChildren.map((child, index) => (
                  <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <button
                      type="button"
                      onClick={() => setActiveParentChildIndex(index)}
                      style={{
                        padding: '8px 14px',
                        borderRadius: '12px',
                        border: activeParentChildIndex === index ? '1.5px solid #34a853' : '1.5px solid #e2e8f0',
                        background: activeParentChildIndex === index ? '#e6f4ea' : '#ffffff',
                        color: activeParentChildIndex === index ? '#34a853' : '#475569',
                        fontWeight: 800,
                        fontSize: '11.5px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      <Users size={12} />
                      {child.first_name} ({child.instrument})
                    </button>
                    {child.isNew && (
                      <button
                        type="button"
                        onClick={() => {
                          const filtered = parentChildren.filter((_, i) => i !== index);
                          setParentChildren(filtered);
                          setActiveParentChildIndex(0);
                        }}
                        style={{
                          padding: '6px 8px',
                          borderRadius: '10px',
                          border: '1.5px solid #fecdd3',
                          background: '#fff1f2',
                          color: '#e11d48',
                          fontSize: '11.5px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}
                
                {!showSiblingForm && (
                  <button
                    type="button"
                    onClick={() => setShowSiblingForm(true)}
                    style={{
                      padding: '8px 14px',
                      borderRadius: '12px',
                      border: '1.5px dashed #64748b',
                      background: '#ffffff',
                      color: '#64748b',
                      fontWeight: 800,
                      fontSize: '11.5px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    <Plus size={12} /> Geschwisterkind verknüpfen
                  </button>
                )}
              </div>
            )}

            {/* Sibling Form Inline */}
            {showSiblingForm && (
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '16px', borderRadius: '16px', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <h4 style={{ margin: 0, fontSize: '0.85rem', fontWeight: 800, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Users size={14} style={{ color: '#34a853' }} /> Geschwisterkind hinzufügen
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '10px', color: '#64748b', fontWeight: 700, marginBottom: '4px' }}>Vorname *</label>
                    <input
                      type="text"
                      value={sibFirstName}
                      onChange={e => setSibFirstName(e.target.value)}
                      placeholder="z.B. Jonas"
                      style={{ width: '100%', boxSizing: 'border-box', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px', background: '#fff' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '10px', color: '#64748b', fontWeight: 700, marginBottom: '4px' }}>Nachname *</label>
                    <input
                      type="text"
                      value={sibLastName}
                      onChange={e => setSibLastName(e.target.value)}
                      placeholder="Müller"
                      style={{ width: '100%', boxSizing: 'border-box', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px', background: '#fff' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '10px', color: '#64748b', fontWeight: 700, marginBottom: '4px' }}>Instrument *</label>
                    <select
                      value={sibInstrument}
                      onChange={e => setSibInstrument(e.target.value)}
                      style={{ width: '100%', boxSizing: 'border-box', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px', background: '#fff', cursor: 'pointer' }}
                    >
                      <option value="Gitarre">Gitarre</option>
                      <option value="Klavier">Klavier</option>
                      <option value="Schlagzeug">Schlagzeug</option>
                      <option value="Gesang">Gesang</option>
                      <option value="Geige">Geige</option>
                      <option value="Flöte">Flöte</option>
                      <option value="Trompete">Trompete</option>
                      <option value="Saxophon">Saxophon</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '10px', color: '#64748b', fontWeight: 700, marginBottom: '4px' }}>Geburtstag (Tag 1-31) (optional)</label>
                    <input
                      type="number"
                      min={1}
                      max={31}
                      value={sibBirthDate}
                      onChange={e => setSibBirthDate(e.target.value)}
                      placeholder="z.B. 24"
                      style={{ width: '100%', boxSizing: 'border-box', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px', background: '#fff' }}
                    />
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'end' }}>
                  <button
                    type="button"
                    onClick={() => setShowSiblingForm(false)}
                    style={{ padding: '6px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#fff', fontSize: '11px', cursor: 'pointer' }}
                  >
                    Abbrechen
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (!sibFirstName.trim() || !sibLastName.trim()) return;
                      const sourceSlots = parentChildren[0]?.selectedSlots || {};
                      const copiedSlots = { ...sourceSlots };
                      
                      const newSib: SiblingChild = {
                        first_name: sibFirstName.trim(),
                        last_name: sibLastName.trim(),
                        instrument: sibInstrument,
                        birth_date: sibBirthDate ? sibBirthDate : undefined,
                        selectedSlots: copiedSlots,
                        isNew: true
                      };
                      setParentChildren([...parentChildren, newSib]);
                      setActiveParentChildIndex(parentChildren.length);
                      setShowSiblingForm(false);
                      setSibFirstName('');
                      setSibBirthDate('');
                    }}
                    style={{ padding: '6px 12px', borderRadius: '8px', border: 'none', background: '#34a853', color: '#fff', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}
                  >
                    Hinzufügen
                  </button>
                </div>
              </div>
            )}

            {verifiedStudentId && (
              <StudentMobileScheduleWizard
                student={{
                  id: verifiedStudentId,
                  first_name: parentFirstName,
                  last_name: parentLastName,
                  instrument: parentInstrument
                }}
                onClose={() => setParentOnboardingStep('verify')}
                onPreferencesSaved={() => {
                  setParentOnboardingStep('success');
                }}
                activePlatform="campus"
              />
            )}
          </div>
        )}

        {parentOnboardingStep === 'success' && verifiedStudentDetails && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', alignItems: 'center' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#e6f4ea', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#34a853', boxShadow: '0 8px 16px rgba(52, 168, 83, 0.1)' }}>
              <Check size={28} strokeWidth={3} />
            </div>

            <div style={{ textTransform: 'none', textAlign: 'center' }}>
              <h3 style={{ margin: '0 0 4px 0', fontSize: '1.2rem', fontWeight: 900, color: '#0f172a', fontFamily: 'Outfit' }}>
                Stundenplan eingerichtet!
              </h3>
              <p style={{ margin: 0, color: '#64748b', fontSize: '0.8rem', lineHeight: '1.4' }}>
                Deine Terminwünsche wurden erfolgreich gespeichert. Die Musikschule meldet sich in Kürze mit dem finalen Stundenplan bei dir!
              </p>
            </div>

            {/* QR CODE DISPLAY CARD */}
            <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '20px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', boxSizing: 'border-box' }}>
              <span style={{ fontSize: '9px', color: '#64748b', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>Dein persönlicher Login-Code</span>
              <div style={{ background: '#ffffff', padding: '10px', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 6px 20px rgba(0,0,0,0.03)', border: '1px solid #f1f5f9' }}>
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=130x130&data=${encodeURIComponent(`${window.location.origin}/qr/${verifiedStudentDetails.qr_token || verifiedStudentDetails.id}`)}`}
                  alt="Student Login QR Code"
                  style={{ width: '130px', height: '130px', display: 'block' }}
                />
              </div>
              <p style={{ margin: '8px 0 0 0', fontSize: '10.5px', color: '#64748b', lineHeight: '1.3' }}>
                💡 Mach einen Screenshot von diesem Code. Er dient als Schülerausweis zum schnellen Einloggen in die App.
              </p>
            </div>

            <div style={{ width: '100%', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '12px', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: '6px', textAlign: 'left' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11.5px' }}>
                <span style={{ color: '#64748b', fontWeight: 700 }}>Schüler:</span>
                <strong style={{ color: '#0f172a', fontWeight: 800 }}>{verifiedStudentDetails.first_name} {verifiedStudentDetails.last_name}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11.5px' }}>
                <span style={{ color: '#64748b', fontWeight: 700 }}>Instrument:</span>
                <strong style={{ color: '#0f172a', fontWeight: 800 }}>{verifiedStudentDetails.instrument}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11.5px' }}>
                <span style={{ color: '#64748b', fontWeight: 700 }}>Ausweis-Nr:</span>
                <strong style={{ color: '#34a853', fontWeight: 800 }}>{verifiedStudentDetails.ausweis_nummer}</strong>
              </div>
            </div>

            {/* ACTION OPTIONS */}
            <div style={{ display: 'flex', flexDirection: 'row', gap: '8px', width: '100%' }}>
              <button
                onClick={downloadWalletPass}
                style={{
                  flex: 1, padding: '10px 12px', borderRadius: '12px', border: '1.5px solid #cbd5e1',
                  background: '#ffffff', color: '#475569', fontWeight: 850, fontSize: '12px',
                  cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
                }}
              >
                💳 Wallet
              </button>
              
              <button
                onClick={downloadParentQrCode}
                style={{
                  flex: 1, padding: '10px 12px', borderRadius: '12px', border: '1.5px solid #cbd5e1',
                  background: '#ffffff', color: '#475569', fontWeight: 850, fontSize: '12px',
                  cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
                }}
              >
                💾 Speichern
              </button>
            </div>

            {/* FINGERPRINT ACTIVATION */}
            {biometricsAvailable && (
              <div style={{
                width: '100%',
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '20px',
                padding: '12px',
                boxSizing: 'border-box',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                textAlign: 'left'
              }}>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <div style={{ background: '#e6f4ea', color: '#34a853', padding: '6px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Fingerprint size={18} />
                  </div>
                  <div>
                    <h4 style={{ margin: '0 0 2px 0', fontSize: '12.5px', fontWeight: 800, color: '#1e293b' }}>
                      Schneller Login per Fingerabdruck
                    </h4>
                    <p style={{ margin: 0, fontSize: '10.5px', color: '#64748b', lineHeight: '1.3' }}>
                      Entsperre die App beim nächsten Mal sofort per TouchID/FaceID auf diesem Gerät.
                    </p>
                  </div>
                </div>

                <div style={{ fontSize: '9.5px', color: '#64748b', background: '#f1f5f9', padding: '6px 10px', borderRadius: '8px', lineHeight: '1.3' }}>
                  <strong>🔒 100% Sicher:</strong> Dein Fingerabdruck wird niemals auf unseren Servern gespeichert. Dein Gerät verifiziert dich lokal.
                </div>

                {biometricsStatus === 'idle' && (
                  <button
                    onClick={handleRegisterBiometrics}
                    style={{
                      width: '100%', padding: '8px 12px', borderRadius: '10px', border: 'none',
                      background: '#34a853', color: '#ffffff', fontWeight: 800, fontSize: '11.5px',
                      cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
                    }}
                    onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#34a853'}
                    onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#34a853'}
                  >
                    Fingerabdruck-Login aktivieren
                  </button>
                )}

                {biometricsStatus === 'registering' && (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '11px', color: '#34a853', fontWeight: 700, padding: '6px' }}>
                    <RotateCw size={12} className="animate-spin" style={{ animation: 'spin 1s linear infinite' }} />
                    Warte auf Bestätigung des Geräts...
                  </div>
                )}

                {biometricsStatus === 'success' && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11.5px', color: '#34a853', fontWeight: 800, padding: '4px 0 0 0' }}>
                    <Check size={14} strokeWidth={3} />
                    Erfolgreich aktiviert!
                  </div>
                )}

                {biometricsStatus === 'error' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11.5px', color: '#ef4444', fontWeight: 800 }}>
                      <AlertCircle size={14} />
                      Einrichtung fehlgeschlagen
                    </div>
                    <span style={{ fontSize: '9.5px', color: '#ef4444' }}>{biometricsErrorMessage}</span>
                    <button
                      onClick={handleRegisterBiometrics}
                      style={{
                        width: '100%', padding: '6px 10px', borderRadius: '8px', border: '1px solid #ef4444',
                        background: 'transparent', color: '#ef4444', fontWeight: 800, fontSize: '10.5px',
                        cursor: 'pointer', transition: 'all 0.2s'
                      }}
                    >
                      Erneut versuchen
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* PWA INSTALLATION BANNER */}
            <div style={{
              width: '100%',
              background: '#f0f9f1',
              border: '1px solid rgba(52, 168, 83, 0.25)',
              borderRadius: '20px',
              padding: '12px',
              boxSizing: 'border-box',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              textAlign: 'left'
            }}>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <div style={{ background: '#e6f4ea', color: '#34a853', padding: '6px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Smartphone size={18} />
                </div>
                <div>
                  <h4 style={{ margin: '0 0 2px 0', fontSize: '12.5px', fontWeight: 800, color: '#1e293b' }}>
                    Als App auf dem Startbildschirm
                  </h4>
                  <p style={{ margin: 0, fontSize: '10.5px', color: '#64748b', lineHeight: '1.3' }}>
                    Installiere Groovelab für blitzschnellen Zugriff ohne Browser.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  const deferredPrompt = (window as any).deferredPrompt;
                  if (deferredPrompt) {
                    deferredPrompt.prompt();
                  } else {
                    alert("Tippe in deinem Browser-Menü auf 'Zum Startbildschirm hinzufügen' / 'Installieren', um die App auf deinem Gerät zu sichern.");
                  }
                }}
                style={{
                  width: '100%', padding: '8px 12px', borderRadius: '10px', border: 'none',
                  background: '#34a853', color: '#ffffff', fontWeight: 800, fontSize: '11px',
                  cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
                }}
                onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#34a853'}
                onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#34a853'}
              >
                App jetzt installieren
              </button>
            </div>

            <button
              onClick={() => onLogin(verifiedStudentDetails.id, false)}
              style={{
                width: '100%', padding: '14px', borderRadius: '16px', border: 'none',
                background: '#34a853',
                color: '#ffffff',
                fontWeight: 900, fontSize: '14px', cursor: 'pointer', transition: 'all 0.2s', 
                boxShadow: '0 4px 12px rgba(19, 115, 51, 0.2)'
              }}
              onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#34a853'}
              onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#34a853'}
            >
              Direkt zum Profil einloggen
            </button>
          </div>
        )}
      </div>
      )}



      {/* Geofence Diagnostic Panel (Localhost only) */}
      {isLocalhost && isGroovelabKiosk && geoDebug && (
        <div style={{ 
          marginTop: '24px', 
          padding: '24px', 
          background: 'rgba(15, 23, 42, 0.95)', 
          color: 'white', 
          borderRadius: '32px', 
          fontSize: '13px', 
          width: '100%',
          maxWidth: '420px',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255,255,255,0.1)',
          boxShadow: '0 20px 50px rgba(0,0,0,0.1)'
        }}>
          <div style={{ fontWeight: 900, marginBottom: '16px', color: '#eab308', display: 'flex', justifyContent: 'space-between', letterSpacing: '0.05em' }}>
            <span>DIAGNOSE: GEOFENCING</span>
            <span style={{ color: geoDebug.isWithinAnyRoom ? '#34a853' : '#ef4444' }}>{geoDebug.isWithinAnyRoom ? 'ERFOLGREICH' : 'FEHLGESCHLAGEN'}</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', opacity: 0.8 }}>
              <span>Deine Position:</span>
              <span style={{ fontWeight: 700 }}>{geoDebug.userPos && typeof geoDebug.userPos.lat === 'number' && typeof geoDebug.userPos.lng === 'number' ? `${geoDebug.userPos.lat.toFixed(4)}, ${geoDebug.userPos.lng.toFixed(4)}` : 'Wird gesucht...'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', opacity: 0.8 }}>
              <span>Ziel (Akademie):</span>
              <span style={{ fontWeight: 700 }}>{geoDebug.schoolCoords && typeof geoDebug.schoolCoords.lat === 'number' && typeof geoDebug.schoolCoords.lng === 'number' ? `${geoDebug.schoolCoords.lat.toFixed(4)}, ${geoDebug.schoolCoords.lng.toFixed(4)}` : 'Nicht gesetzt'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '8px' }}>
              <span>Berechnete Distanz:</span>
              <span style={{ fontWeight: 900, color: '#eab308' }}>{geoDebug.distToSchool !== null ? `${geoDebug.distToSchool}m` : '?'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '8px' }}>
              <span>Status Öffnungszeiten:</span>
              <span style={{ fontWeight: 900, color: geoDebug.withinHours ? '#34a853' : '#ef4444' }}>{geoDebug.withinHours ? 'GEÖFFNET' : 'GESCHLOSSEN'}</span>
            </div>
          </div>
          
          {(!geoDebug.isWithinAnyRoom || !geoDebug.withinHours) && (
            <button 
              onClick={() => {
                const uid = sessionStorage.getItem('groovelab_user_id');
                if (uid) {
                   supabase.from('users').select('*, schools(*)').eq('id', uid).single().then(({data}) => {
                     if (data) finalizeLogin(data, loginStationId, true);
                   });
                } else {
                  alert('Bitte erst einmal scannen, damit ich weiß, wer du bist!');
                }
              }}
              style={{ 
                width: '100%', 
                padding: '14px', 
                background: '#eab308', 
                color: '#0f172a', 
                border: 'none', 
                borderRadius: '16px', 
                fontWeight: 900, 
                fontSize: '12px',
                cursor: 'pointer',
                transition: 'transform 0.2s'
              }}
            >
              ENTWICKLER-OVERRIDE: LABOR-MODUS ERZWINGEN
            </button>
          )}
        </div>
      )}

      {/* Admin & Teacher Bypass Buttons for Localhost / Dev */}
      {import.meta.env.DEV && schoolData?.id && (
        <div style={{ marginTop: '24px', width: '100%', maxWidth: '360px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {/* Patrick Huber Bypass (Teacher) */}
          <button
            onClick={async () => {
              try {
                console.log('[Bypass] Attempting Patrick Huber (Lehrer) login for school:', schoolData.name, '(', schoolData.id, ')');
                sessionStorage.removeItem('groovelab_is_master_admin');

                if (schoolData?.groovelab_kiosk_token) {
                  localStorage.setItem('groovelab_kiosk_token', schoolData.groovelab_kiosk_token);
                }

                let { data: user } = await supabase
                  .from('users')
                  .select('id, role, school_id, first_name, last_name, qr_token')
                  .eq('school_id', schoolData.id)
                  .ilike('first_name', '%Patrick%')
                  .or('last_name.ilike.%H%,last_name.ilike.%Huber%')
                  .limit(1)
                  .maybeSingle();

                if (!user) {
                  const { data: globalPatrick } = await supabase
                    .from('users')
                    .select('id, role, school_id, first_name, last_name, qr_token')
                    .ilike('first_name', '%Patrick%')
                    .or('last_name.ilike.%H%,last_name.ilike.%Huber%')
                    .limit(1)
                    .maybeSingle();
                  user = globalPatrick;
                }

                if (!user) {
                  const { data: fallbackTeacher } = await supabase
                    .from('users')
                    .select('id, role, school_id, first_name, last_name, qr_token')
                    .eq('school_id', schoolData.id)
                    .eq('role', 'teacher')
                    .limit(1)
                    .maybeSingle();
                  user = fallbackTeacher;
                }

                if (user) {
                  await supabase.from('users').update({ role: 'teacher' }).eq('id', user.id);
                  localStorage.setItem('groovelab_active_workspace', 'teacher');
                  localStorage.setItem('groovelab_active_platform', 'campus');
                  localStorage.setItem('campus_active_tab', 'live');
                  sessionStorage.setItem('groovelab_user_id', user.id);
                  localStorage.setItem('groovelab_user_id', user.id);
                  sessionStorage.removeItem('groovelab_qr_token');
                  onLogin(user.id, true);
                } else {
                  alert(`Kein Lehrer-Profil für "${schoolData.name}" gefunden.`);
                }
              } catch (err: any) {
                console.error('[Bypass] Error logging in as Patrick Huber:', err);
                alert('Bypass Fehler: ' + (err?.message || err));
              }
            }}
            style={{
              background: '#064e3b',
              color: '#a7f3d0',
              border: '1px solid #059669',
              borderRadius: '12px',
              padding: '12px 16px',
              fontSize: '0.78rem',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
          >
            🔓 BYPASS: PATRICK HUBER (LEHRER - {schoolData.name})
          </button>

          {/* Schüler Bypass (Student) */}
          <button
            onClick={async () => {
              try {
                console.log('[Bypass] Attempting Schüler login for school:', schoolData.name, '(', schoolData.id, ')');
                sessionStorage.removeItem('groovelab_is_master_admin');

                if (schoolData?.groovelab_kiosk_token) {
                  localStorage.setItem('groovelab_kiosk_token', schoolData.groovelab_kiosk_token);
                }

                let { data: user } = await supabase
                  .from('users')
                  .select('id, role, school_id, first_name, last_name, qr_token')
                  .eq('school_id', schoolData.id)
                  .eq('role', 'student')
                  .limit(1)
                  .maybeSingle();

                if (!user) {
                  const { data: globalStudent } = await supabase
                    .from('users')
                    .select('id, role, school_id, first_name, last_name, qr_token')
                    .eq('role', 'student')
                    .limit(1)
                    .maybeSingle();
                  user = globalStudent;
                }

                if (user) {
                  localStorage.setItem('groovelab_active_workspace', 'student');
                  sessionStorage.setItem('groovelab_user_id', user.id);
                  localStorage.setItem('groovelab_user_id', user.id);
                  sessionStorage.removeItem('groovelab_qr_token');
                  onLogin(user.id, true);
                } else {
                  alert(`Kein Schüler-Profil für "${schoolData.name}" gefunden.`);
                }
              } catch (err: any) {
                console.error('[Bypass] Error logging in as Schüler:', err);
                alert('Bypass Fehler: ' + (err?.message || err));
              }
            }}
            style={{
              background: '#064e3b',
              color: '#a7f3d0',
              border: '1px solid #059669',
              borderRadius: '12px',
              padding: '12px 16px',
              fontSize: '0.78rem',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
          >
            🔓 BYPASS: SCHÜLER-LOGIN ({schoolData.name})
          </button>

          {/* Manuel Wagner Bypass (Verwaltung) */}
          <button
            onClick={async () => {
              try {
                console.log('[Bypass] Attempting Manuel Wagner (Verwaltung) login for school:', schoolData.name, '(', schoolData.id, ')');
                sessionStorage.removeItem('groovelab_is_master_admin');

                if (schoolData?.groovelab_kiosk_token) {
                  localStorage.setItem('groovelab_kiosk_token', schoolData.groovelab_kiosk_token);
                }

                let { data: user } = await supabase
                  .from('users')
                  .select('id, role, school_id, first_name, last_name, qr_token')
                  .eq('school_id', schoolData.id)
                  .ilike('first_name', '%Manuel%')
                  .or('last_name.ilike.%W%,last_name.ilike.%Wagner%')
                  .limit(1)
                  .maybeSingle();

                if (!user) {
                  const { data: globalManuel } = await supabase
                    .from('users')
                    .select('id, role, school_id, first_name, last_name, qr_token')
                    .ilike('first_name', '%Manuel%')
                    .or('last_name.ilike.%W%,last_name.ilike.%Wagner%')
                    .limit(1)
                    .maybeSingle();
                  user = globalManuel;
                }

                if (!user) {
                  const { data: adminUser } = await supabase
                    .from('users')
                    .select('id, role, school_id, first_name, last_name, qr_token')
                    .eq('school_id', schoolData.id)
                    .in('role', ['admin', 'secretary'])
                    .limit(1)
                    .maybeSingle();
                  user = adminUser;
                }

                if (user) {
                  await supabase.from('users').update({ role: 'admin' }).eq('id', user.id);
                  localStorage.setItem('groovelab_active_workspace', 'secretary');
                  localStorage.setItem('groovelab_active_platform', 'campus');
                  localStorage.setItem('campus_active_tab', 'briefing');
                  sessionStorage.setItem('groovelab_user_id', user.id);
                  localStorage.setItem('groovelab_user_id', user.id);
                  sessionStorage.removeItem('groovelab_qr_token');
                  onLogin(user.id, true);
                } else {
                  alert(`Kein Admin/Verwaltungs-Profil für "${schoolData.name}" gefunden.`);
                }
              } catch (err: any) {
                console.error('[Bypass] Error logging in as Manuel Wagner:', err);
                alert('Bypass Fehler: ' + (err?.message || err));
              }
            }}
            style={{
              background: '#451a03',
              color: '#fde68a',
              border: '1px solid #b45309',
              borderRadius: '12px',
              padding: '12px 16px',
              fontSize: '0.78rem',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
          >
            🔓 BYPASS: MANUEL WAGNER (VERWALTUNG - {schoolData.name})
          </button>

          {/* Master Admin / Master Dashboard Bypass */}
          <button
            onClick={async () => {
              try {
                const token = import.meta.env.VITE_BYPASS_ADMIN_TOKEN || 'admin-bypass-token';
                console.log('[Bypass] Attempting Master Admin login for school:', schoolData.name);
                sessionStorage.removeItem('groovelab_is_master_admin');

                // 1. Search for dedicated Master Admin user
                let { data: user } = await supabase
                  .from('users')
                  .select('id, role, is_master_admin, school_id, first_name, last_name')
                  .eq('is_master_admin', true)
                  .limit(1)
                  .maybeSingle();

                if (!user) {
                  // 2. Auto-provision dedicated Master Admin if missing
                  console.log('[Bypass] Auto-creating Master Admin profile...');
                  const masterId = '99999999-9999-9999-9999-999999999999';
                  const { data: createdMaster, error: createErr } = await supabase
                    .from('users')
                    .insert({
                      id: masterId,
                      school_id: schoolData.id,
                      first_name: 'Master',
                      last_name: 'Admin',
                      role: 'admin',
                      roles: ['admin'],
                      is_master_admin: true,
                      photo_url: '/campus_login_hero.png',
                      avatar_url: '/campus_login_hero.png',
                      is_campus_active: true,
                      is_groovelab_active: true,
                      qr_token: token
                    })
                    .select('id, role, is_master_admin, school_id, first_name, last_name')
                    .maybeSingle();

                  if (!createErr && createdMaster) {
                    user = createdMaster;
                  }
                }

                if (user) {
                  console.log('[Bypass] Master Admin logged in:', user.id);
                  sessionStorage.setItem('groovelab_user_id', user.id);
                  localStorage.setItem('groovelab_user_id', user.id);
                  sessionStorage.removeItem('groovelab_qr_token');
                  onLogin(user.id, true);
                } else {
                  alert('Kein Master-Admin-Benutzer in der Datenbank gefunden.');
                }
              } catch (err: any) {
                sessionStorage.removeItem('groovelab_qr_token');
                sessionStorage.removeItem('groovelab_is_master_admin');
                console.error('[Bypass] Runtime Error:', err);
                alert('Ein Fehler ist aufgetreten: ' + err.message);
              }
            }}
            style={{
              width: '100%',
              padding: '16px',
              background: 'rgba(254, 249, 195, 0.08)',
              border: '2px solid rgba(253, 224, 71, 0.25)',
              borderRadius: '24px',
              color: '#fef9c3',
              fontWeight: 800,
              fontSize: '13px',
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(234,179,8,0.1)',
              textTransform: 'uppercase',
              letterSpacing: '0.02em',
              backdropFilter: 'blur(10px)',
              WebkitBackdropFilter: 'blur(10px)',
              transition: 'all 0.2s'
            }}
            onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(254, 249, 195, 0.15)'; }}
            onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(244, 249, 195, 0.08)'; }}
          >
            🔓 BYPASS: ADMIN (MASTER ADMIN)
          </button>
        </div>
      )}



      {/* Legal Footer */}
      <div style={{ 
        marginTop: '20px', 
        display: 'flex', 
        gap: '16px', 
        fontSize: '11px', 
        fontWeight: 800, 
        color: '#34a853',
        textTransform: 'uppercase',
        letterSpacing: '0.05em'
      }}>
        <span 
          onClick={() => setShowPrivacy(true)} 
          style={{ cursor: 'pointer', transition: 'color 0.2s' }} 
          onMouseOver={(e) => { e.currentTarget.style.color = '#34a853'; }}
          onMouseOut={(e) => { e.currentTarget.style.color = '#34a853'; }}
        >
          Datenschutz
        </span>
        <span style={{ opacity: 0.3 }}>•</span>
        <span 
          onClick={() => setShowAgb(true)} 
          style={{ cursor: 'pointer', transition: 'color 0.2s' }} 
          onMouseOver={(e) => { e.currentTarget.style.color = '#34a853'; }}
          onMouseOut={(e) => { e.currentTarget.style.color = '#34a853'; }}
        >
          AGB
        </span>
        <span style={{ opacity: 0.3 }}>•</span>
        <span 
          onClick={() => setShowImpressum(true)} 
          style={{ cursor: 'pointer', transition: 'color 0.2s' }} 
          onMouseOver={(e) => { e.currentTarget.style.color = '#34a853'; }}
          onMouseOut={(e) => { e.currentTarget.style.color = '#34a853'; }}
        >
          Impressum
        </span>
      </div>

    </div> {/* Closing Right Login Panel */}

      {/* AGB Modal */}
      {showAgb && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.40)',
          backdropFilter: 'blur(16px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000,
          padding: '20px',
          animation: 'fadeIn 0.2s ease-out'
        }}>
          <div style={{
            background: 'white',
            borderRadius: '32px',
            boxShadow: '0 30px 80px rgba(15, 23, 42, 0.18)',
            border: '1px solid #f1f5f9',
            padding: '36px',
            maxWidth: '680px',
            width: '100%',
            maxHeight: '80vh',
            overflowY: 'auto',
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px'
          }}>
            <button 
              onClick={() => setShowAgb(false)} 
              style={{
                position: 'absolute',
                top: '24px',
                right: '24px',
                background: '#f1f5f9',
                border: 'none',
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: '#64748b',
                transition: 'all 0.2s'
              }}
            >
              <X size={20} />
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '16px', background: '#e6f4ea', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#34a853' }}>
                <FileText size={28} />
              </div>
              <div>
                <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 900, color: '#0f172a' }}>Allgemeine Geschäftsbedingungen</h2>
                <p style={{ margin: 0, fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Nutzungsbedingungen SaaS-Plattform „Campus-Groovelab“</p>
              </div>
            </div>

            <div style={{ 
              fontSize: '13px', 
              color: '#475569', 
              lineHeight: '1.6', 
              display: 'flex', 
              flexDirection: 'column', 
              gap: '16px',
              textAlign: 'left'
            }}>
              <div>
                <p style={{ margin: 0, fontWeight: 700 }}>Vertragspartner und Anbieter:</p>
                <p style={{ margin: '4px 0 0 0' }}>Patrick Huber (Einzelunternehmer), Karl-Fürstenberg-Str. 59, 79618 Rheinfelden, nachfolgend „Anbieter“</p>
                <p style={{ margin: '8px 0 0 0', fontSize: '12px', color: '#64748b' }}>
                  <strong>Geltungsbereich:</strong> Ausschließlich für den unternehmerischen Geschäftsverkehr (B2B)<br/>
                  <strong>Stand und Gültigkeit:</strong> August 2026
                </p>
              </div>

              <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '12px' }}>
                <h4 style={{ margin: '0 0 6px 0', fontSize: '14px', fontWeight: 800, color: '#1e293b' }}>📋 PRÄAMBEL</h4>
                <p style={{ margin: 0 }}>Der Anbieter betreibt und vertreibt die mandantenfähige, cloudbasierte Software-as-a-Service (SaaS)-Plattform „Campus-Groovelab“ (bestehend aus den Modulen „Campus“ und „GrooveLab“, nachfolgend einheitlich „Software“). Die Software dient als integriertes, digitales, jedoch rein komplementäres Zusatz- und Kommunikationssystem (Add-On) für Musikschulen zur Optimierung des Lehrbetriebs, der organisatorischen Infrastruktur sowie zur pädagogischen Lernbegleitung mittels Gamification-Elementen.</p>
                <p style={{ margin: '8px 0 0 0' }}>Die Software-Lizenz selbst wird dem Kunden dauerhaft zu 100 % kostenlos und lizenzgebührenfrei zur Verfügung gestellt. Der Kunde entrichtet das vertraglich vereinbarte Entgelt ausschließlich für den Server-Betrieb, die Service-Bereitstellung, das Hosting, die Härtung der Datenbank-Infrastruktur sowie für die administrativen Service-, Support- und Betriebsleistungen (nachfolgend „Server- & Servicegebühren“) durch den Anbieter.</p>
                <p style={{ margin: '8px 0 0 0' }}><strong>Souveränitäts-Versprechen (100 % Made & Hosted in Germany):</strong> Die technische Bereitstellung dieser Infrastruktur erfolgt über gehärtete Systeme auf in Deutschland befindlichen, ISO-27001-zertifizierten Servern. Der Anbieter garantiert, dass zu keinem Zeitpunkt US-amerikanische oder sonstige außereuropäische Cloud-Infrastrukturen (wie z. B. AWS, Microsoft Azure oder Google Cloud) für die Kern-Datenhaltung verwendet werden.</p>
              </div>

              <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '12px' }}>
                <h4 style={{ margin: '0 0 6px 0', fontSize: '14px', fontWeight: 800, color: '#1e293b' }}>§ 1 VERTRAGSGEGENSTAND, LEISTUNGSUMFANG & ÜBERGABEPUNKT</h4>
                <p style={{ margin: 0 }}><strong>1. Vertragsgegenstand:</strong> Gegenstand dieses Vertrages ist die dauerhaft kostenlose (lizenzgebührenfreie) Bereitstellung der Software zur Nutzung über das Internet im Wege des Software-as-a-Service (SaaS)-Modells sowie die Einräumung der entsprechenden Nutzungsrechte nach Maßgabe dieses Vertrages. Die vom Kunden zu entrichtende Vergütung versteht sich ausdrücklich und ausschließlich als Entgelt für den Server-Betrieb und die Service-Bereitstellung (Infrastruktur-Leistung) sowie für die vereinbarten laufenden Service-, Betriebs- und Wartungsleistungen des Anbieters. Das Vertragsverhältnis über die Server- und Servicebereitstellung qualifiziert sich rechtlich als gemischter Miet- und Dienstleistungsvertrag gemäß §§ 535 ff., 611 BGB.</p>
                <p style={{ margin: '8px 0 0 0' }}><strong>2. Leistungsumfang:</strong> Der genaue Funktionsumfang der Software sowie die Spezifikationen der Server-Infrastruktur und Serviceleistungen ergeben sich aus der zum Zeitpunkt des Vertragsabschlusses gültigen Produkt- und Leistungsbeschreibung. Schulungen, individueller Support vor Ort, Datenmigrationen oder kundenspezifische Programmierungen sind nicht geschuldet, es sei denn, sie wurden ausdrücklich als kostenpflichtige Zusatzleistung vereinbart.</p>
                <p style={{ margin: '8px 0 0 0' }}><strong>3. Übergabepunkt:</strong> Der Anbieter stellt dem Kunden die Software am Ausgang des vom Anbieter genutzten Rechenzentrums (Schnittstelle zum öffentlichen Internet, nachfolgend „Übergabepunkt“) zur Nutzung auf den bereitgestellten Servern bereit. Für die Netzanbindung des Kunden, die Bereitstellung geeigneter Endgeräte sowie die Beschaffung kompatibler Browser-Software ist ausschließlich der Kunde verantwortlich.</p>
                <p style={{ margin: '8px 0 0 0' }}><strong>4. Add-On-Status & Führendes System:</strong> Die Software versteht sich ausdrücklich als komplementäres Zusatz- und Kommunikationswerkzeug (Add-On) und ersetzt nicht das primäre Verwaltungs- und ERP-System des Kunden (wie z. B. iMikel, nachfolgend „führendes System“). Der Kunde bleibt uneingeschränkt verpflichtet, alle grundlegenden und rechtsverbindlichen Verwaltungsakte, die vertragliche Abrechnung, die Stammdatenpflege sowie die finale Stundenplan- und Raumbelegung eigenständig in seinem führenden System zu pflegen und zu verwalten. Die Software dient lediglich der operativen Erleichterung und Visualisierung im Alltag von Verwaltung, Lehrkräften und Endnutzern.</p>
              </div>

              <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '12px' }}>
                <h4 style={{ margin: '0 0 6px 0', fontSize: '14px', fontWeight: 800, color: '#1e293b' }}>§ 2 SPEZIFISCHE SCHNITTSTELLEN- & LEISTUNGSPATHEN</h4>
                <p style={{ margin: 0 }}><strong>1. iMikel-CSV-Schnittstelle & Import-Spezifikationen:</strong> Der Anbieter stellt dem Kunden im Rahmen seiner Serviceleistungen ein Import-Modul zur Einlesung von CSV-Stammdaten aus Altsystemen (z. B. iMikel) zur Verfügung. Die Datenerfassung erfolgt über ein dafür vorgesehenes Textfeld innerhalb der Benutzeroberfläche der Software, in welches der Kunde die Rohdaten mittels Kopieren und Einfügen (Copy-and-Paste) überträgt. Der Kunde ist verpflichtet, die Textdaten vorab auf Formatkompatibilität zu prüfen. Der Kunde trägt die alleinige Verantwortung dafür, dass die eingefügten Textdaten dem geforderten CSV-Format entsprechen sowie frei von manipulativen Inhalten oder schädlichen Skripten sind.</p>
                <p style={{ margin: '8px 0 0 0' }}><strong>Transaktionales Rollback-Verfahren:</strong> Das System arbeitet mit einer transaktionalen Absicherung. Tritt während der Verarbeitung des eingefügten CSV-Textes ein Daten- oder Formatfehler auf, wird die gesamte Import-Transaktion automatisch abgebrochen und der vorherige, konsistente Datenbankzustand wiederhergestellt (Rollback). Eine Haftung des Anbieters für Mehraufwände durch fehlerhaft formatierte Importdaten ist ausgeschlossen.</p>
                <p style={{ margin: '8px 0 0 0' }}><strong>2. Kalender-Kopplung & iCal-Schnittstelle:</strong> Die Software ermöglicht es Endnutzern, personalisierte, abonnierbare Kalender-Feeds (.ics) in externen Kalender-Anwendungen (z. B. Apple Calendar, Google Calendar) einzubinden. Um die Privatsphäre minderjähriger Schüler bei der Übertragung von iCal-Links über unverschlüsselte Kalender-Protokolle zu sichern, werden Schülernamen im exportierten Kalendertext automatisch pseudonymisiert (z. B. „Jonas M.“ statt „Jonas Müller“). Der Kunde wird darauf hingewiesen, dass iCal-Feeds auf dem Pull-Prinzip basieren. Die Synchronisations- und Aktualisierungsfrequenz wird ausschließlich durch das Endgerät bzw. den Kalender-Provider des Endnutzers bestimmt. Der Anbieter haftet nicht für verspätete oder fehlerhafte Darstellungen von Terminänderungen im Kalender des Endnutzers.</p>
              </div>

              <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '12px' }}>
                <h4 style={{ margin: '0 0 6px 0', fontSize: '14px', fontWeight: 800, color: '#1e293b' }}>§ 3 AUTHENTIFIZIERUNG, DIEBSTAHLSCHUTZ & COMPLIANCE</h4>
                <p style={{ margin: 0 }}><strong>1. Passwortlose QR-Code-Authentifizierung:</strong> Der Zugang für Endnutzer erfolgt passwortlos über eine eindeutige URL, die als scanbarer QR-Code verschlüsselt ist. Der Kunde verpflichtet sich, seine Lehrkräfte und Mitarbeiter im sorgsamen Umgang mit den QR-Codes zu schulen. Die QR-Codes dürfen ausschließlich den jeweils berechtigten Endnutzern persönlich oder durch Aufkleben auf das physische Noten-/Hausaufgabenheft zur Verfügung gestellt werden.</p>
                <p style={{ margin: '8px 0 0 0' }}><strong>2. Zweistufige Verifikations-Schranke (Anti-Theft Device-Pairing):</strong> Um unbefugten Zugriff auf personenbezogene Logistik- und Schülerdaten bei physischem Verlust des QR-Codes auszuschließen, erzwingt die Software beim Aufruf auf einem neuen, nicht registrierten Endgerät die Eingabe eines dem Endnutzer bekannten, schülerbezogenen Sicherheitsmerkmals (PIN) als einmaligen Freischalt-Code. Nach erfolgreicher Eingabe wird auf dem Endgerät ein kryptografischer Schlüssel zur permanenten Autorisierung hinterlegt (Device-Pairing), wodurch nachfolgende Scans ohne erneute Code-Eingabe ermöglicht werden. Gibt der Endnutzer dreimal hintereinander eine falsche PIN ein, wird das Benutzerkonto aus Sicherheitsgründen automatisch gesperrt; eine Entsperrung ist dann nur über die Verwaltung der Musikschule möglich. Der Kunde ist verpflichtet, seine Endnutzer darüber zu informieren, dass bei Verlust des physischen QR-Codes oder des registrierten Endgeräts unverzüglich eine Sperrung des Tokens über das Lehrer-Cockpit oder die Verwaltung zu veranlassen ist. Der Anbieter sperrt den betroffenen Token in Echtzeit nach Eingang der Sperraufforderung im System.</p>
              </div>

              <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '12px' }}>
                <h4 style={{ margin: '0 0 6px 0', fontSize: '14px', fontWeight: 800, color: '#1e293b' }}>§ 4 DATENSCHUTZ UND GEHEIMHALTUNG (DSGVO)</h4>
                <p style={{ margin: 0 }}><strong>1. Rollenverteilung:</strong> Die Parteien stimmen überein, dass der Kunde im Sinne des Art. 4 Nr. 7 DSGVO „Verantwortlicher“ für die Verarbeitung personenbezogener Daten der Endnutzer ist. Der Anbieter verarbeitet diese Daten ausschließlich im Auftrag und auf Weisung des Kunden als „Auftragsverarbeiter“ im Sinne des Art. 4 Nr. 8 DSGVO.</p>
                <p style={{ margin: '8px 0 0 0' }}><strong>2. AV-Vertrag:</strong> Die Einzelheiten der Datenverarbeitung werden in einer gesonderten Vereinbarung über die Auftragsverarbeitung (AVV) gemäß Art. 28 DSGVO geregelt, die bei Vertragsabschluss zwingend zu unterzeichnen ist.</p>
                <p style={{ margin: '8px 0 0 0' }}><strong>3. Schülerdaten-Fragment-Prinzip (Privacy by Design):</strong> Der Anbieter betreibt die Softwarearchitektur so, dass identifizierende Klarnamen der Schüler physisch isoliert auf dem deutschen Host-System verarbeitet werden. Systembenachrichtigungen (z. B. Push-Mitteilungen) werden verschlüsselt und fragmentiert übertragen, sodass Dritte zu keinem Zeitpunkt Einblick in vollständige Klarnamen oder Unterrichtsinhalte erhalten.</p>
                <p style={{ margin: '8px 0 0 0' }}><strong>4. Lokaler Kommunikations-Workflow (Zero-Mail-Infrastruktur):</strong> Da der Anbieter zum Schutz personenbezogener Daten auf die Einbindung externer E-Mail-Versanddienstleister verzichtet, erfolgt der Versand administrativer Korrespondenzen (z. B. Benachrichtigungen an Eltern) lokal über das E-Mail-Programm des Kunden via mailto:-Protokoll, wodurch der Anbieter vollständig von der datenschutzrechtlichen Haftung für den Mail-Transport befreit ist.</p>
                <p style={{ margin: '8px 0 0 0' }}><strong>5. Anti-CLOUD-Act-Garantie:</strong> Der Anbieter garantiert dem Kunden vertraglich, dass sämtliche personenbezogenen Daten ausschließlich in zertifizierten Rechenzentren auf dem Staatsgebiet der Bundesrepublik Deutschland gespeichert und verarbeitet werden. Da der Anbieter ein rein deutsches Unternehmen ohne außereuropäische Muttergesellschaften ist, unterliegt die Infrastruktur weder direkt noch indirekt den Zugriffsbefugnissen von Drittstaaten-Behörden (z. B. über den US-amerikanischen CLOUD Act).</p>
                <p style={{ margin: '8px 0 0 0' }}><strong>6. Ausschluss von Drittlandübermittlungen:</strong> Eine Übermittlung personenbezogener Daten in ein Drittland außerhalb der Europäischen Union (EU) bzw. des Europäischen Wirtschaftsraums (EWR) findet nicht statt. Der Einsatz von Subunternehmern mit Kooperationssitz oder Datenverarbeitung in einem Drittland ist für den Bereich der personenbezogenen Datenhaltung ausgeschlossen.</p>
              </div>

              <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '12px' }}>
                <h4 style={{ margin: '0 0 6px 0', fontSize: '14px', fontWeight: 800, color: '#1e293b' }}>§ 5 GEWÄHRLEISTUNG (MÄNGELHAFTUNG) & HAFTUNGSBEGRENZUNG</h4>
                <p style={{ margin: 0 }}><strong>1. Display-Down-Zwangstimer & Gerätesensorik:</strong> Der integrierte Übe-Timer nutzt die Lagesensoren der Endgeräte (DeviceOrientation API). Zur Vermeidung von Frustration und Drucksituationen für Kinder gewährt das System eine 10-sekündige Toleranzzeit (Grace Period), die erst nach Ablauf der Fokus-Minuten in der Verlängerungszeit greift. Eine Gewährleistung für die korrekte Funktion des Timers auf Endgeräten, deren physikalische Sensoren fehlerhaft kalibriert sind oder deren Betriebssystem die Sensorabfrage blockiert, ist ausgeschlossen.</p>
                <p style={{ margin: '8px 0 0 0' }}><strong>2. Gesetzliche Haftungsschranken:</strong> Der Anbieter haftet unbeschränkt für Schäden aus der Verletzung des Lebens, des Körpers oder der Gesundheit, die auf einer vorsätzlichen oder fahrlässigen Pflichtverletzung des Anbieters oder seiner Erfüllungsgehilfen beruhen. Für sonstige Schäden haftet der Anbieter nur bei Vorsatz oder grober Fahrlässigkeit. Bei einfacher Fahrlässigkeit haftet der Anbieter nur bei Verletzung einer wesentlichen Vertragspflicht (Kardinalpflicht). Die Haftung bei Verletzung einer Kardinalpflicht ist auf den vertragstypischen, bei Vertragsabschluss vorhersehbaren Schaden begrenzt. Die Haftung für entgangenen Gewinn, Betriebsunterbrechungsschäden oder sonstige mittelbare Schäden des Kunden ist ausgeschlossen.</p>
              </div>

              <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '12px' }}>
                <h4 style={{ margin: '0 0 6px 0', fontSize: '14px', fontWeight: 800, color: '#1e293b' }}>§ 6 VERFÜGBARKEIT & AUTOMATISIERTE SICHERHEITSSPERREN</h4>
                <p style={{ margin: 0 }}><strong>1. Systemverfügbarkeit:</strong> Der Anbieter garantiert eine Verfügbarkeit der Software und Server-Infrastruktur von 99,0 % im Jahresmittel am Übergabepunkt.</p>
                <p style={{ margin: '8px 0 0 0' }}><strong>2. Berechnungsgrundlage:</strong> Bei der Berechnung der Verfügbarkeit bleiben Zeiten außer Betracht, in denen die Software aufgrund von (a) angekündigten Wartungsarbeiten, (b) notwendigen unangekündigten Sicherheits-Updates zur Gefahrenabwehr, (c) höherer Gewalt oder (d) Störungen in der Netz-Infrastruktur des Kunden oder dessen Endnutzer nicht erreichbar ist.</p>
                <p style={{ margin: '8px 0 0 0' }}><strong>3. Automatisierte IP-Sperren (Rate-Limiting):</strong> Zur Abwehr von Cyber-Angriffen verfügt das System über ein automatisiertes Rate-Limiting. Bei zu vielen fehlgeschlagenen Authentifizierungsversuchen auf der /qr/:token-Route wird die anfragende IP-Adresse vollautomatisch temporär gesperrt. Derartige Sperren dienen der Datensicherheit, stellen keinen Mangel dar und begründen keinen Anspruch des Kunden auf Minderung oder Schadensersatz.</p>
                <p style={{ margin: '8px 0 0 0' }}><strong>4. Ausfall-Fallback & Aufrechterhaltung des Kernbetriebs:</strong> Da es sich bei der Software um ein rein komplementäres Zusatzsystem (Add-On) handelt, führt ein temporärer Ausfall der Software oder der Server-Infrastruktur zu keinerlei Stilllegung der betrieblichen Kernprozesse des Kunden. Für den Fall einer temporären Nichtverfügbarkeit ist der Kunde verpflichtet, seine bewährten, klassischen Kommunikations- und Organisationskanäle (z. B. telefonische Absprachen, manuelle Stundenplanerstellung, direkter E-Mail-Versand) eigenverantwortlich als Ausweichlösung fortzuführen.</p>
              </div>

              <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '12px' }}>
                <h4 style={{ margin: '0 0 6px 0', fontSize: '14px', fontWeight: 800, color: '#1e293b' }}>§ 7 GAMIFICATION-ELEMENTE & PÄDAGOGISCHE RECHTE</h4>
                <p style={{ margin: 0 }}><strong>1. Pädagogische Motivationselemente:</strong> Die Software enthält spielerische Motivationselemente (XP-Punkte, Aktivitäts-Ringe, Streak-Flammen und Reaktivierungs-Quests).</p>
                <p style={{ margin: '8px 0 0 0' }}><strong>2. Keine Gewährleistung auf Spielstände:</strong> Der Kunde und die Endnutzer haben keinen rechtlichen Anspruch auf die ununterbrochene Speicherung oder fehlerfreie Wiederherstellung von Spielständen, virtuellen Auszeichnungen, historischen Übe-Streaks oder statistischen Scores.</p>
                <p style={{ margin: '8px 0 0 0' }}><strong>3. Anpassungsrecht:</strong> Der Anbieter behält sich das Recht vor, die spielerischen Mechanismen, mathematischen Berechnungsformeln und grafischen Darstellungen der Gamification-Infrastruktur jederzeit zwecks pädagogischer Optimierung anzupassen.</p>
              </div>

              <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '12px' }}>
                <h4 style={{ margin: '0 0 6px 0', fontSize: '14px', fontWeight: 800, color: '#1e293b' }}>§ 8 NUTZUNGSRECHTE & LIZENZGEBÜHRENFREIHEIT</h4>
                <p style={{ margin: 0 }}><strong>1. Nutzungsrechte:</strong> Der Anbieter räumt dem Kunden für die Laufzeit dieses Vertrages ein einfaches, nicht übertragbares, nicht unterlizensierbares und auf die Anzahl der gebuchten Schüler limitiertes Nutzungsrecht an der Software ein.</p>
                <p style={{ margin: '8px 0 0 0' }}><strong>2. Lizenzgebührenfreiheit:</strong> Diese Einräumung des Nutzungsrechts erfolgt dauerhaft zu 100 % kostenlos und lizenzgebührenfrei. Das vom Kunden entrichtete Entgelt stellt zu keinem Zeitpunkt eine Lizenzgebühr für den Programmcode dar.</p>
                <p style={{ margin: '8px 0 0 0' }}><strong>3. Modifikationsverbot:</strong> Dem Kunden ist es untersagt, die Software zu kopieren, zu dekompilieren, zurückzuentwickeln (Reverse Engineering) oder den Programmcode in irgendeiner Weise zu modifizieren. Sämtliche Urheber- und Leistungsschutzrechte an der Software verbleiben beim Anbieter.</p>
              </div>

              <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '12px' }}>
                <h4 style={{ margin: '0 0 6px 0', fontSize: '14px', fontWeight: 800, color: '#1e293b' }}>§ 9 VERTRAGSLAUFZEIT, PREISE, ZAHLUNGSBEDINGUNGEN & KÜNDIGUNG</h4>
                <p style={{ margin: 0 }}><strong>1. Laufzeit gekoppelt an das Schuljahr:</strong> Das Vertragsverhältnis über die Server- & Servicebereitstellung ist fest an den Zyklus des Schuljahres (September bis August des Folgejahres) gebunden. Die Mindestlaufzeit beträgt ein volles Schuljahr (bzw. bei unterjährigem Einstieg die verbleibende Laufzeit bis zum nächsten 31. August).</p>
                <p style={{ margin: '8px 0 0 0' }}><strong>2. Automatische Verlängerung:</strong> Der Vertrag verlängert sich automatisch um ein weiteres Schuljahr (12 Monate bis zum 31. August des Folgejahres), sofern er nicht mit einer Frist von 1 Monat zum Schuljahresende (d. h. spätestens bis zum 31. Juli) gekündigt wird.</p>
                <p style={{ margin: '8px 0 0 0' }}><strong>3. Preise & Kleinunternehmerregelung:</strong> Alle angegebenen Server- & Servicegebühren sind Endpreise. Da der Anbieter als Kleinunternehmer agiert, wird gemäß § 19 UStG keine Umsatzsteuer berechnet oder ausgewiesen.</p>
                <p style={{ margin: '8px 0 0 0' }}><strong>4. Rechnungsstellung & Zahlungsfrist:</strong> Die Abrechnung der Server- & Servicegebühren erfolgt monatlich zum Monatsende. Rechnungen werden in elektronischer Form per E-Mail an die vom Kunden hinterlegte E-Mail-Adresse zugestellt. Der Rechnungsbetrag ist innerhalb von 14 Tagen nach Rechnungserhalt per manueller Banküberweisung auf das Geschäftskonto des Anbieters zu zahlen.</p>
                <p style={{ margin: '8px 0 0 0' }}><strong>5. Außerordentliche Kündigung:</strong> Das Recht zur außerordentlichen Kündigung aus wichtigem Grund (§ 543 BGB) bleibt unberührt. Ein wichtiger Grund für den Anbieter liegt insbesondere vor, wenn der Kunde mit der Zahlung der Server- & Servicegebühren für zwei aufeinanderfolgende Monate in Verzug gerät.</p>
              </div>

              <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '12px' }}>
                <h4 style={{ margin: '0 0 6px 0', fontSize: '14px', fontWeight: 800, color: '#1e293b' }}>§ 10 GERICHTSSTAND & SCHLUSSBESTIMMUNGEN</h4>
                <p style={{ margin: 0 }}><strong>1. Rechtswahl:</strong> Es gilt das Recht der Bundesrepublik Deutschland unter Ausschluss des UN-Kaufrechts.</p>
                <p style={{ margin: '8px 0 0 0' }}><strong>2. Gerichtsstand:</strong> Ausschließlicher Gerichtsstand für alle Streitigkeiten aus oder im Zusammenhang mit diesem Vertrag ist der Geschäftssitz des Anbieters (Rheinfelden).</p>
                <p style={{ margin: '8px 0 0 0' }}><strong>3. Salvatorische Klausel:</strong> Sollten einzelne Bestimmungen dieses Vertrages unwirksam oder undurchführbar sein oder werden, bleibt die Wirksamkeit der übrigen Bestimmungen davon unberührt. Die Parteien verpflichten sich, die unwirksame Bestimmung durch eine wirksame Regelung zu ersetzen, die dem wirtschaftlichen und rechtlichen Zweck der unwirksamen Bestimmung am nächsten kommt.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* B2C Nutzungsbedingungen (Student/Parent) Modal */}
      {showParentAgb && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.40)',
          backdropFilter: 'blur(16px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000,
          padding: '20px',
          animation: 'fadeIn 0.2s ease-out'
        }}>
          <div style={{
            background: 'white',
            borderRadius: '32px',
            boxShadow: '0 30px 80px rgba(15, 23, 42, 0.18)',
            border: '1px solid #f1f5f9',
            padding: '36px',
            maxWidth: '680px',
            width: '100%',
            maxHeight: '80vh',
            overflowY: 'auto',
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px'
          }}>
            <button 
              onClick={() => setShowParentAgb(false)} 
              style={{
                position: 'absolute',
                top: '24px',
                right: '24px',
                background: '#f1f5f9',
                border: 'none',
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: '#64748b',
                transition: 'all 0.2s'
              }}
            >
              <X size={20} />
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '16px', background: '#e6f4ea', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#34a853' }}>
                <FileText size={28} />
              </div>
              <div>
                <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 900, color: '#0f172a' }}>Nutzungsbedingungen</h2>
                <p style={{ margin: 0, fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Nutzungsbedingungen für Schüler & Eltern (B2C)</p>
              </div>
            </div>

            <div style={{ 
              fontSize: '13px', 
              color: '#475569', 
              lineHeight: '1.6', 
              display: 'flex', 
              flexDirection: 'column', 
              gap: '16px',
              textAlign: 'left'
            }}>
              <div>
                <p style={{ margin: 0, fontWeight: 700 }}>Vertragspartner und Anbieter:</p>
                <p style={{ margin: '4px 0 0 0' }}>Patrick Huber (Einzelunternehmer), Karl-Fürstenberg-Str. 59, 79618 Rheinfelden, nachfolgend „Anbieter“</p>
                <p style={{ margin: '8px 0 0 0', fontSize: '12px', color: '#64748b' }}>
                  <strong>Geltungsbereich:</strong> Für die private Nutzung durch Schüler und Eltern (B2C)<br/>
                  <strong>Stand und Gültigkeit:</strong> Juni 2026
                </p>
              </div>

              <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '12px' }}>
                <h4 style={{ margin: '0 0 6px 0', fontSize: '14px', fontWeight: 800, color: '#1e293b' }}>📋 PRÄAMBEL</h4>
                <p style={{ margin: 0 }}>Der Anbieter stellt eine Web-App namens „Campus-Groovelab“ zur Ergänzung und spielerischen Unterstützung des Musikunterrichts (mit Übe-Timer, XP-Punkten, Streaks etc.) bereit. Diese Bedingungen regeln die Nutzung der Plattform durch die Schüler bzw. deren Erziehungsberechtigte.</p>
              </div>

              <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '12px' }}>
                <h4 style={{ margin: '0 0 6px 0', fontSize: '14px', fontWeight: 800, color: '#1e293b' }}>§ 1 LEISTUNGSUMFANG & KOSTENFREIHEIT</h4>
                <p style={{ margin: 0 }}>Die Nutzung der App selbst ist für den Schüler bzw. die Eltern lizenzgebührenfrei. Die Bereitstellung erfolgt über das Internet im Wege eines Software-as-a-Service (SaaS)-Modells. Ein Rechtsanspruch auf die dauerhafte Bereitstellung bestimmter Zusatzfunktionen besteht nicht.</p>
              </div>

              <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '12px' }}>
                <h4 style={{ margin: '0 0 6px 0', fontSize: '14px', fontWeight: 800, color: '#1e293b' }}>§ 2 ABRECHNUNG ÜBER DIE MUSIKSCHULE</h4>
                <p style={{ margin: 0 }}>Soweit für die Aktivierung oder den Betrieb des Profils Gebühren fällig werden, werden diese direkt über die Kooperations-Musikschule nach den dort vereinbarten Abrechnungswegen (z.B. Barzahlung oder Einzug mit der monatlichen Unterrichtsgebühr) erhoben. Es entstehen durch diese Nutzungsbedingungen keine unmittelbaren Zahlungsansprüche des Anbieters gegen den Schüler oder die Eltern.</p>
              </div>

              <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '12px' }}>
                <h4 style={{ margin: '0 0 6px 0', fontSize: '14px', fontWeight: 800, color: '#1e293b' }}>§ 3 ZUGANGSSICHERHEIT & AUTOMATISCHE SPERRUNG</h4>
                <p style={{ margin: 0 }}><strong>1. Passwortloser Login:</strong> Der Zugang erfolgt passwortlos über einen individuellen QR-Code. Dieser QR-Code ist sorgfältig aufzubewahren und vor dem Zugriff durch unbefugte Dritte zu schützen.</p>
                <p style={{ margin: '8px 0 0 0' }}><strong>2. PIN-Sicherung & Auto-Sperre:</strong> Zum Schutz vor unbefugtem Zugriff bei Verlust des QR-Codes ist bei der Erstanmeldung auf einem neuen Gerät die Eingabe eines Sicherheitsmerkmals (Tag des Geburtstags als PIN) erforderlich. Wird dieses Merkmal dreimal hintereinander falsch eingegeben, sperrt das System den Zugang automatisch. Die Entsperrung kann über die Musikschule veranlasst werden.</p>
              </div>

              <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '12px' }}>
                <h4 style={{ margin: '0 0 6px 0', fontSize: '14px', fontWeight: 800, color: '#1e293b' }}>§ 4 DATENSCHUTZ</h4>
                <p style={{ margin: 0 }}>Der Schutz Ihrer Daten hat höchste Priorität. Es werden nur die für den Betrieb notwendigen Daten verarbeitet (Vorname, Nachname sowie der Tag des Geburtstags des Kindes). Vornamen werden zur Erhöhung der Sicherheit im System explizit verschlüsselt gespeichert. Die Datenhaltung erfolgt zu 100% auf zertifizierten Servern in Deutschland (Hetzner Online GmbH, Standort Falkenstein) unter strikter Einhaltung der DSGVO.</p>
              </div>

              <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '12px' }}>
                <h4 style={{ margin: '0 0 6px 0', fontSize: '14px', fontWeight: 800, color: '#1e293b' }}>§ 5 ÜBE-TIMER & RECHTE AN SPIELSTÄNDEN</h4>
                <p style={{ margin: 0 }}><strong>1. Übe-Timer:</strong> Der integrierte Übe-Timer nutzt die Lagesensoren deines Endgeräts. Um Druck zu vermeiden, gilt eine 10-sekündige Toleranzzeit (Grace Period), die erst nach Ablauf der Fokus-Minuten in der Verlängerungszeit greift.</p>
                <p style={{ margin: '8px 0 0 0' }}><strong>2. Gamification:</strong> Spielstände (XP, Streaks, Flammen) dienen rein der Motivation. Es besteht kein Rechtsanspruch auf das Bestehen oder die Wiederherstellung von Spielständen oder virtuellen Auszeichnungen.</p>
              </div>

              <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '12px' }}>
                <h4 style={{ margin: '0 0 6px 0', fontSize: '14px', fontWeight: 800, color: '#1e293b' }}>§ 6 HAFTUNGSBESCHRÄNKUNG</h4>
                <p style={{ margin: 0 }}>Der Anbieter haftet unbeschränkt für Schäden aus der Verletzung des Lebens, des Körpers oder der Gesundheit sowie bei Vorsatz und grober Fahrlässigkeit. Bei einfacher Fahrlässigkeit haftet der Anbieter nur bei Verletzung einer wesentlichen Vertragspflicht (Kardinalpflicht), wobei die Haftung auf den vertragstypischen, vorhersehbaren Schaden begrenzt ist.</p>
              </div>

              <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '12px' }}>
                <h4 style={{ margin: '0 0 6px 0', fontSize: '14px', fontWeight: 800, color: '#1e293b' }}>§ 7 RECHTSWAHL</h4>
                <p style={{ margin: 0 }}>Es gilt das Recht der Bundesrepublik Deutschland. Bei Verbrauchern gilt diese Rechtswahl nur insoweit, als nicht der gewährte Schutz durch zwingende Bestimmungen des Rechts des Staates, in dem der Verbraucher seinen gewöhnlichen Aufenthalt hat, entzogen wird.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Privacy Policy Modal */}
      {showPrivacy && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.40)',
          backdropFilter: 'blur(16px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000,
          padding: '20px',
          animation: 'fadeIn 0.2s ease-out'
        }}>
          <div style={{
            background: 'white',
            borderRadius: '32px',
            boxShadow: '0 30px 80px rgba(15, 23, 42, 0.18)',
            border: '1px solid #f1f5f9',
            maxWidth: '560px',
            width: '100%',
            maxHeight: '80vh',
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
          }}>
            <button 
              onClick={() => setShowPrivacy(false)} 
              style={{
                position: 'absolute',
                top: '24px',
                right: '24px',
                background: '#f1f5f9',
                border: 'none',
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: '#64748b',
                transition: 'all 0.2s',
                zIndex: 50
              }}
            >
              <X size={20} />
            </button>

            <div style={{
              overflowY: 'auto',
              padding: '36px',
              display: 'flex',
              flexDirection: 'column',
              gap: '20px'
            }}>

            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '16px', background: '#fef9c3', display: 'flex', alignItems: 'center', justifyItems: 'center', justifyContent: 'center', color: '#eab308' }}>
                <ShieldCheck size={28} />
              </div>
              <div>
                <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 900, color: '#0f172a' }}>Datenschutzerklärung</h2>
                <p style={{ margin: 0, fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>GrooveLab DSGVO Compliance</p>
              </div>
            </div>

            <div style={{ 
              fontSize: '13px', 
              color: '#475569', 
              lineHeight: '1.6', 
              display: 'flex', 
              flexDirection: 'column', 
              gap: '16px',
              textAlign: 'left'
            }}>
              <div>
                <h4 style={{ margin: '0 0 6px 0', fontSize: '14px', fontWeight: 800, color: '#1e293b' }}>1. Allgemeine Hinweise und Pflichtinformationen</h4>
                <p style={{ margin: 0 }}>Der Schutz Ihrer persönlichen Daten ist uns ein wichtiges Anliegen. GrooveLab speichert Daten zur Bereitstellung der Übungs- und Klassenzimmerplattform nach den Vorgaben der DSGVO. Verarbeitet werden der Vorname, Nachname sowie der Tag des Geburtstags des Kindes. Um ein Höchstmaß an Sicherheit zu gewährleisten, werden die Vornamen im System explizit verschlüsselt gespeichert.</p>
              </div>

              <div>
                <h4 style={{ margin: '0 0 6px 0', fontSize: '14px', fontWeight: 800, color: '#1e293b' }}>2. Kamera & QR-Scanner</h4>
                <p style={{ margin: 0 }}>Die Kamera deines Endgeräts wird ausschließlich lokal im Browser verwendet, um deinen GrooveLab-QR-Ausweis zu scannen. Es werden zu keinem Zeitpunkt Videostreams oder Bilder an Server übertragen oder dort gespeichert.</p>
              </div>

              <div>
                <h4 style={{ margin: '0 0 6px 0', fontSize: '14px', fontWeight: 800, color: '#1e293b' }}>3. Standortermittlung (Geofencing)</h4>
                <p style={{ margin: 0 }}>Das <strong>Campus-Modul</strong> greift zu keinem Zeitpunkt auf Geodaten zu. Lediglich für die Nutzung des <strong>GrooveLab-Moduls</strong> ist die temporäre Freigabe des Standorts (GPS) erforderlich, damit sich Schüler auf dem Live Lab Board der Musikschule einloggen können. Diese Standortdaten werden rein lokal im Browser berechnet, nicht an Server übertragen und dienen ausschließlich der Verifikation der Anwesenheit vor Ort. Ein kontinuierliches Bewegungsprofil wird nicht erstellt.</p>
              </div>

              <div>
                <h4 style={{ margin: '0 0 6px 0', fontSize: '14px', fontWeight: 800, color: '#1e293b' }}>4. Rechte der Betroffenen</h4>
                <p style={{ margin: 0 }}>Sie haben das Recht auf Auskunft, Berichtigung, Sperrung oder Löschung Ihrer Daten. Wenden Sie sich hierzu bitte an die Schulleitung Ihrer Musikakademie.</p>
              </div>

              <div>
                <h4 style={{ margin: '0 0 6px 0', fontSize: '14px', fontWeight: 800, color: '#1e293b' }}>5. Hosting & Datenbank-Infrastruktur</h4>
                <p style={{ margin: 0 }}>Unsere Anwendung wird zu 100% auf Servern in Deutschland (Hetzner Falkenstein) gehostet, um einen sicheren, performanten und datenschutzkonformen Betrieb zu gewährleisten. Sowohl das Web-Frontend als auch die Datenbankinfrastruktur werden über die <strong>Hetzner Online GmbH</strong> (Hetzner.com) am Standort Falkenstein betrieben. Mit diesem Dienstleister wurde ein gesetzeskonformer Vertrag zur Auftragsverarbeitung (AV-Vertrag nach Art. 28 DSGVO) geschlossen, um den Schutz Ihrer Daten zu jeder Zeit im Einklang mit der DSGVO zu gewährleisten.</p>
              </div>
            </div>
          </div>
          </div>
        </div>
      )}

      {/* Impressum Modal */}
      {showImpressum && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.40)',
          backdropFilter: 'blur(16px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000,
          padding: '20px',
          animation: 'fadeIn 0.2s ease-out'
        }}>
          <div style={{
            background: 'white',
            borderRadius: '32px',
            boxShadow: '0 30px 80px rgba(15, 23, 42, 0.18)',
            border: '1px solid #f1f5f9',
            maxWidth: '560px',
            width: '100%',
            maxHeight: '80vh',
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
          }}>
            <button 
              onClick={() => setShowImpressum(false)} 
              style={{
                position: 'absolute',
                top: '24px',
                right: '24px',
                background: '#f1f5f9',
                border: 'none',
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: '#64748b',
                transition: 'all 0.2s',
                zIndex: 50
              }}
            >
              <X size={20} />
            </button>

            <div style={{
              overflowY: 'auto',
              padding: '36px',
              display: 'flex',
              flexDirection: 'column',
              gap: '20px'
            }}>

            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '16px', background: '#fef9c3', display: 'flex', alignItems: 'center', justifyItems: 'center', justifyContent: 'center', color: '#eab308' }}>
                <FileText size={28} />
              </div>
              <div>
                <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 900, color: '#0f172a' }}>Impressum</h2>
                <p style={{ margin: 0, fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Gesetzliche Anbieterkennzeichnung</p>
              </div>
            </div>

            <div style={{ 
              fontSize: '13px', 
              color: '#475569', 
              lineHeight: '1.6', 
              display: 'flex', 
              flexDirection: 'column', 
              gap: '16px',
              textAlign: 'left'
            }}>
              <div>
                <h4 style={{ margin: '0 0 6px 0', fontSize: '14px', fontWeight: 800, color: '#1e293b' }}>Anbieter der Plattform & technischer Dienstleister</h4>
                <p style={{ margin: 0 }}>
                  Patrick Huber<br/>
                  Karl-Fürstenberg-Str. 59<br/>
                  79618 Rheinfelden
                </p>
                <p style={{ margin: '6px 0 0 0' }}>
                  E-Mail: <a href="mailto:patrick.huber@musaek.de" style={{ color: '#eab308', textDecoration: 'underline' }}>patrick.huber@musaek.de</a>
                </p>
              </div>

              <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '16px' }}>
                <h4 style={{ margin: '0 0 6px 0', fontSize: '14px', fontWeight: 800, color: '#1e293b' }}>Vertragspartner & inhaltlich Verantwortlicher</h4>
                {schoolData?.opening_hours?.impressum ? (
                  <div style={{ whiteSpace: 'pre-wrap' }}>
                    {schoolData.opening_hours.impressum}
                  </div>
                ) : (
                  <div>
                    <p style={{ margin: 0 }}>
                      <strong>{schoolData?.name || 'Die jeweilige Musikschule'}</strong><br/>
                      {schoolData?.street && <>{schoolData.street}<br/></>}
                      {schoolData?.zip_code || ''} {schoolData?.city || ''}
                    </p>
                  </div>
                )}
              </div>

              <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '16px', fontSize: '11px', color: '#64748b', fontStyle: 'italic' }}>
                <strong>Hinweis zur Verantwortung:</strong> Für die konkreten Lehrinhalte, Stundenplanungen, die Durchführung des Unterrichts sowie die Erhebung und Verarbeitung personenbezogener Schülerdaten innerhalb dieses Schul-Mandanten ist ausschließlich die oben genannte Musikschule als Ihr direkter Vertragspartner verantwortlich.
              </div>

              <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '16px' }}>
                <h4 style={{ margin: '0 0 6px 0', fontSize: '12px', fontWeight: 800, color: '#1e293b' }}>EU-Streitschlichtung / Verbraucherstreitbeilegung</h4>
                <p style={{ margin: 0, fontSize: '12px' }}>
                  Die Europäische Kommission stellt eine Plattform zur Online-Streitbeilegung (OS) bereit: <a href="https://ec.europa.eu/consumers/odr/" target="_blank" rel="noopener noreferrer" style={{ color: '#eab308', textDecoration: 'underline' }}>https://ec.europa.eu/consumers/odr/</a>.<br/>
                  Wir sind nicht bereit oder verpflichtet, an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen.
                </p>
              </div>
            </div>
          </div>
          </div>
        </div>
      )}

      {/* Permission Help Modal */}
      {showPermissionHelp && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(9, 9, 11, 0.70)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000,
          padding: '24px',
          animation: 'fadeIn 0.2s ease-out'
        }}>
          <div style={{
            background: 'rgba(24, 24, 27, 0.95)',
            borderRadius: '32px',
            boxShadow: '0 30px 80px rgba(0, 0, 0, 0.5)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            padding: '32px',
            maxWidth: '520px',
            width: '100%',
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
            boxSizing: 'border-box',
            color: '#ffffff'
          }}>
            <button 
              onClick={() => setShowPermissionHelp(false)} 
              style={{
                position: 'absolute',
                top: '24px',
                right: '24px',
                background: 'rgba(255, 255, 255, 0.06)',
                border: 'none',
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: '#ffffff',
                transition: 'all 0.2s'
              }}
              onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.12)'}
              onMouseOut={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)'}
            >
              <X size={18} />
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(52, 168, 83, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#e6f4ea' }}>
                <HelpCircle size={20} />
              </div>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 900, letterSpacing: '-0.02em', color: '#ffffff' }}>
                Berechtigungen dauerhaft erlauben
              </h3>
            </div>

            <p style={{ margin: 0, fontSize: '13px', color: '#a1a1aa', lineHeight: '1.5' }}>
              Aus Sicherheitsgründen schützt dein Browser den Zugriff auf Kamera und Standort. Du kannst diesen Zugriff dauerhaft freigeben, damit der Login beim nächsten Mal automatisch klappt:
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Safari / iOS */}
              {isIOS && isStandalone ? (
                <div style={{ background: 'rgba(239, 68, 68, 0.05)', padding: '16px', borderRadius: '18px', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                  <h4 style={{ margin: '0 0 8px 0', fontSize: '13px', fontWeight: 800, color: '#fca5a5' }}>
                     iPad / iPhone Home-Bildschirm App (PWA)
                  </h4>
                  <p style={{ margin: '0 0 10px 0', fontSize: '12px', color: '#e4e4e7', lineHeight: '1.4' }}>
                    Auf dem Home-Bildschirm blockiert Apple den Kamerazugriff nach einmaligem Ablehnen dauerhaft. So behebst du es:
                  </p>
                  <ol style={{ margin: 0, paddingLeft: '20px', fontSize: '12px', color: '#d4d4d8', lineHeight: '1.6' }}>
                    <li style={{ marginBottom: '4px' }}>Lösche diese App vom Home-Bildschirm (Symbol gedrückt halten &gt; Lesezeichen löschen).</li>
                    <li style={{ marginBottom: '4px' }}>Öffne <strong>Safari</strong> und rufe diese Website erneut auf.</li>
                    <li style={{ marginBottom: '4px' }}>Erlaube dort die Kamera über das <strong>„aA“</strong>-Symbol links in der Adressleiste &gt; Website-Einstellungen &gt; Kamera: <strong>Erlauben</strong>.</li>
                    <li>Tippe auf das Teilen-Symbol und wähle wieder <strong>„Zum Home-Bildschirm hinzufügen“</strong>.</li>
                  </ol>
                </div>
              ) : (
                <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '16px', borderRadius: '18px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                  <h4 style={{ margin: '0 0 8px 0', fontSize: '13px', fontWeight: 800, color: '#e6f4ea' }}>
                     Safari (iPhone, iPad, Mac)
                  </h4>
                  <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '12px', color: '#d4d4d8', lineHeight: '1.6' }}>
                    <li>Tippe in der Adressleiste links auf das <strong>„aA“</strong>-Symbol oder das Einstellungen-Symbol.</li>
                    <li>Wähle <strong>„Website-Einstellungen“</strong>.</li>
                    <li>Setze <strong>Kamera</strong> und <strong>Standort</strong> auf <strong>„Erlauben“</strong>.</li>
                  </ul>
                </div>
              )}

              {/* Google Chrome */}
              <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '16px', borderRadius: '18px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                <h4 style={{ margin: '0 0 8px 0', fontSize: '13px', fontWeight: 800, color: '#facc15' }}>
                  🌐 Google Chrome (Android, Mac, PC)
                </h4>
                <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '12px', color: '#d4d4d8', lineHeight: '1.6' }}>
                  <li>Klicke in der Adressleiste links auf das <strong>Schieberegler/Schloss-Symbol</strong> neben der Website-Adresse.</li>
                  <li>Aktiviere dort die Schalter für <strong>Kamera</strong> und <strong>Standort</strong> (auf <strong>„Zulassen“</strong> stellen).</li>
                </ul>
              </div>
            </div>

            <button
              onClick={() => setShowPermissionHelp(false)}
              style={{
                background: '#e6f4ea',
                color: '#062413',
                border: 'none',
                padding: '14px',
                borderRadius: '16px',
                fontWeight: 800,
                fontSize: '13px',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
              onMouseOut={(e) => e.currentTarget.style.transform = 'none'}
            >
              Verstanden
            </button>
          </div>
        </div>
      )}

      {/* Magic Link Modal */}
      {showMagicLinkModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(9, 9, 11, 0.70)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000,
          padding: '24px',
          animation: 'fadeIn 0.2s ease-out'
        }}>
          <div style={{
            background: 'rgba(24, 24, 27, 0.95)',
            borderRadius: '32px',
            boxShadow: '0 30px 80px rgba(0, 0, 0, 0.5)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            padding: '32px',
            maxWidth: '440px',
            width: '100%',
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
            boxSizing: 'border-box',
            color: '#ffffff'
          }}>
            <button 
              onClick={() => setShowMagicLinkModal(false)} 
              style={{
                position: 'absolute',
                top: '20px',
                right: '20px',
                background: 'none',
                border: 'none',
                color: 'rgba(255, 255, 255, 0.4)',
                cursor: 'pointer',
                fontSize: '18px',
                outline: 'none'
              }}
            >
              ✕
            </button>

            <h3 style={{ margin: 0, fontSize: '20px', fontWeight: 900, color: '#e6f4ea', letterSpacing: '-0.02em' }}>
              🔑 Magic Link anfordern
            </h3>

            {magicLinkMessage && (
              <div style={{
                background: magicLinkSuccess ? 'rgba(52, 168, 83, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                border: magicLinkSuccess ? '1px solid #34a853' : '1px solid #ef4444',
                padding: '12px 16px',
                borderRadius: '16px',
                color: magicLinkSuccess ? '#e6f4ea' : '#fca5a5',
                fontSize: '13px',
                fontWeight: 650
              }}>
                {magicLinkMessage}
              </div>
            )}

            {!magicLinkSuccess ? (
              <form onSubmit={handleMagicLinkRequest} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <p style={{ margin: 0, color: 'rgba(255,255,255,0.7)', fontSize: '13px', lineHeight: '1.5' }}>
                  Gib die registrierte E-Mail-Adresse ein. Wir senden dir einen temporären Link, um dich ohne QR-Code einzuloggen.
                </p>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: 'rgba(255,255,255,0.6)', fontWeight: 800, textTransform: 'uppercase', marginBottom: '6px' }}>E-Mail-Adresse *</label>
                  <input
                    type="email"
                    required
                    value={magicLinkEmail}
                    onChange={(e) => setMagicLinkEmail(e.target.value)}
                    placeholder="eltern@beispiel.de"
                    style={{ width: '100%', boxSizing: 'border-box', padding: '12px 16px', borderRadius: '12px', border: '1.5px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.05)', color: '#ffffff', outline: 'none', fontSize: '14px', fontWeight: 700 }}
                  />
                </div>
                <button
                  type="submit"
                  disabled={parentOnboardingLoading}
                  style={{
                    width: '100%', padding: '14px', borderRadius: '16px', border: 'none',
                    background: schoolData?.primary_color || '#e6f4ea',
                    color: schoolData?.primary_color ? '#ffffff' : '#062413',
                    fontWeight: 800, fontSize: '14px', cursor: 'pointer', transition: 'all 0.2s'
                  }}
                >
                  {parentOnboardingLoading ? 'Prüfe E-Mail...' : 'Link senden'}
                </button>
              </form>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <p style={{ margin: 0, color: 'rgba(255,255,255,0.7)', fontSize: '13px', lineHeight: '1.5' }}>
                  Bitte überprüfe dein E-Mail-Postfach. Wenn die Adresse im System hinterlegt ist, findest du dort in Kürze einen Link zum direkten Login.
                </p>
                <button
                  onClick={() => setShowMagicLinkModal(false)}
                  style={{
                    width: '100%', padding: '12px', borderRadius: '16px', border: 'none',
                    background: 'rgba(255,255,255,0.1)',
                    color: '#ffffff',
                    fontWeight: 800, fontSize: '13px', cursor: 'pointer', transition: 'all 0.2s'
                  }}
                >
                  Schließen
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Fullscreen Kiosk Scanner Modal */}
      {showKioskScanner && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.85)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000,
          padding: '20px',
          boxSizing: 'border-box',
          color: '#ffffff'
        }}>
          {/* Scanner Card */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.12)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            borderRadius: '40px',
            padding: '28px',
            maxWidth: '420px',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            boxShadow: '0 40px 100px rgba(0, 0, 0, 0.45)',
            boxSizing: 'border-box'
          }}>
            <div style={{ fontSize: '11px', fontWeight: 800, color: 'rgba(255, 255, 255, 0.7)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px', width: '100%', justifyContent: 'center' }}>
              <Tablet size={14} style={{ color: '#eab308' }} />
              Groovelab QR-Code scannen
            </div>

            {/* Camera Box */}
            <div style={{
              width: '100%',
              aspectRatio: '1/1',
              borderRadius: '32px',
              overflow: 'hidden',
              background: '#ffffff',
              position: 'relative',
              boxShadow: 'inset 0 3px 10px rgba(0, 0, 0, 0.06), 0 1px 3px rgba(0, 0, 0, 0.05), 0 16px 36px rgba(0, 0, 0, 0.07)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              padding: '4.5px',
              boxSizing: 'border-box'
            }}>
              <div style={{
                width: '100%',
                height: '100%',
                borderRadius: '26px',
                overflow: 'hidden',
                position: 'relative',
                background: '#0c0f12'
              }}>
                <div style={{
                  position: 'absolute',
                  inset: 0,
                  boxShadow: 'inset 0 5px 15px rgba(0, 0, 0, 0.4)',
                  borderRadius: '26px',
                  pointerEvents: 'none',
                  zIndex: 9
                }} />
                
                {isCameraActive && !cameraHasError ? (
                  <>
                    <CustomQRScanner
                      onScan={(val) => {
                        console.log('[KioskScanner] Extracted QR value:', val);
                        handleScan(val);
                        setShowKioskScanner(false);
                      }}
                      onError={(err: any) => {
                        console.error('[KioskScanner] Camera error:', err);
                        setCameraHasError(true);
                        const errMsg = err?.message || String(err || '');
                        if (!errMsg.toLowerCase().includes('abort') && !errMsg.toLowerCase().includes('aborted')) {
                          setError(`Kamera-Fehler: ${errMsg}`);
                        }
                      }}
                      paused={loading || !showKioskScanner}
                      facingMode={facingMode}
                    />

                    {/* Target Corners */}
                    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 10 }}>
                      <div style={{ position: 'absolute', top: '20px', left: '20px', width: '24px', height: '24px', borderTop: '3px solid #facc15', borderLeft: '3px solid #facc15', borderTopLeftRadius: '8px' }} />
                      <div style={{ position: 'absolute', top: '20px', right: '20px', width: '24px', height: '24px', borderTop: '3px solid #facc15', borderRight: '3px solid #facc15', borderTopRightRadius: '8px' }} />
                      <div style={{ position: 'absolute', bottom: '20px', left: '20px', width: '24px', height: '24px', borderBottom: '3px solid #facc15', borderLeft: '3px solid #facc15', borderBottomLeftRadius: '8px' }} />
                      <div style={{ position: 'absolute', bottom: '20px', right: '20px', width: '24px', height: '24px', borderBottom: '3px solid #facc15', borderRight: '3px solid #facc15', borderBottomRightRadius: '8px' }} />
                      <div style={{
                        position: 'absolute',
                        left: 0,
                        width: '100%',
                        height: '80px',
                        background: 'linear-gradient(180deg, rgba(250, 204, 21, 0) 0%, rgba(250, 204, 21, 0.08) 50%, rgba(250, 204, 21, 0) 100%)',
                        filter: 'blur(6px)',
                        animation: 'scanLaser 4s ease-in-out infinite'
                      }} />
                    </div>
                  </>
                ) : (
                  <div style={{
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '16px',
                    color: 'white',
                    padding: '24px',
                    textAlign: 'center',
                    boxSizing: 'border-box'
                  }}>
                    <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'rgba(255, 255, 255, 0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#facc15' }}>
                      {cameraHasError ? <CameraOff size={24} style={{ color: '#ef4444' }} /> : <RotateCw className="spin" size={24} />}
                    </div>
                    {cameraHasError ? (
                      <>
                        <div style={{ fontSize: '13px', fontWeight: 800, color: '#fca5a5' }}>
                          Kamerazugriff blockiert
                        </div>
                        <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginTop: '8px', lineHeight: '1.4', maxWidth: '240px' }}>
                          Bitte erteilen Sie der App Kameraberechtigungen oder verwenden Sie den PIN-Login.
                        </div>
                      </>
                    ) : (
                      <div style={{ fontSize: '13px', fontWeight: 800, color: '#e6f4ea' }}>
                        Kamera wird gestartet...
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Cancel Button */}
            <button
              type="button"
              onClick={() => setShowKioskScanner(false)}
              style={{
                background: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                color: '#ffffff',
                fontSize: '12px',
                fontWeight: 800,
                cursor: 'pointer',
                height: '38px',
                padding: '0 24px',
                borderRadius: '19px',
                marginTop: '24px',
                transition: 'all 0.2s',
                textTransform: 'uppercase',
                letterSpacing: '0.05em'
              }}
              onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)'}
              onMouseOut={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)'}
            >
              Abbrechen
            </button>
          </div>
        </div>
      )}

      {/* Hidden Master Admin Credentials Login Modal */}
      {showAdminModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.40)',
          backdropFilter: 'blur(16px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000,
          padding: '20px',
          animation: 'fadeIn 0.2s ease-out'
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '32px',
            boxShadow: '0 30px 80px rgba(15, 23, 42, 0.18)',
            border: '1px solid #f1f5f9',
            padding: '36px',
            maxWidth: '440px',
            width: '100%',
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            gap: '24px',
            boxSizing: 'border-box'
          }}>
            <button 
              onClick={() => {
                setShowAdminModal(false);
                setAdminUsernameInput('');
                setAdminPasswordInput('');
              }} 
              style={{
                position: 'absolute',
                top: '24px',
                right: '24px',
                background: '#f1f5f9',
                border: 'none',
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: '#64748b',
                transition: 'all 0.2s'
              }}
              
              
            >
              <X size={20} />
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '16px', background: '#fef9c3', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#eab308' }}>
                <ShieldCheck size={28} />
              </div>
              <div>
                <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 900, color: '#0f172a' }}>Master-Admin Login</h2>
                <p style={{ margin: 0, fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>GrooveLab Master Administration</p>
              </div>
            </div>

            <form onSubmit={handleAdminLogin} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: '#64748b', fontWeight: 700, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Benutzername
                </label>
                <input
                  type="text"
                  value={adminUsernameInput}
                  onChange={(e) => setAdminUsernameInput(e.target.value)}
                  placeholder="z.B. admin"
                  required
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    padding: '14px 16px',
                    borderRadius: '12px',
                    background: '#ffffff',
                    border: '1.5px solid #e2e8f0',
                    color: '#000000',
                    fontSize: '0.95rem',
                    fontWeight: 600,
                    outline: 'none',
                    transition: 'all 0.2s'
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = '#eab308';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = '#e2e8f0';
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: '#64748b', fontWeight: 700, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Passwort
                </label>
                <input
                  type="password"
                  value={adminPasswordInput}
                  onChange={(e) => setAdminPasswordInput(e.target.value)}
                  placeholder="••••••••"
                  required
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    padding: '14px 16px',
                    borderRadius: '12px',
                    background: '#ffffff',
                    border: '1.5px solid #e2e8f0',
                    color: '#000000',
                    fontSize: '0.95rem',
                    fontWeight: 600,
                    outline: 'none',
                    transition: 'all 0.2s'
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = '#eab308';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = '#e2e8f0';
                  }}
                />
              </div>

              {error && (
                <div style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#fca5a5', padding: '12px', borderRadius: '12px', fontSize: '12px', fontWeight: 700, textAlign: 'center' }}>
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={adminLoginLoading}
                style={{
                  width: '100%',
                  padding: '14px',
                  borderRadius: '14px',
                  background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
                  color: '#ffffff',
                  border: 'none',
                  fontSize: '0.95rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  boxShadow: '0 8px 24px rgba(15, 23, 42, 0.15)',
                  transition: 'all 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  marginTop: '10px'
                }}
                
                
              >
                {adminLoginLoading ? 'Verifiziere...' : 'Einloggen'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Teacher Check-in Choice Modal */}
      {showTeacherChoiceModal && pendingTeacherUser && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.40)',
          backdropFilter: 'blur(16px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000,
          padding: '20px',
          fontFamily: '"Outfit", "Inter", sans-serif',
          animation: 'fadeIn 0.2s ease-out'
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '32px',
            boxShadow: '0 30px 80px rgba(15, 23, 42, 0.18)',
            border: '1px solid #f1f5f9',
            padding: '36px',
            maxWidth: '460px',
            width: '100%',
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            gap: '24px',
            boxSizing: 'border-box',
            textAlign: 'center'
          }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
              <div style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #e6f4ea 0%, #e6f4ea 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#34a853'
              }}>
                <span style={{ fontSize: '28px' }}>👋</span>
              </div>
              <div>
                <h3 style={{ margin: '0 0 8px 0', fontSize: '1.4rem', fontWeight: 800, color: '#0f172a' }}>
                  Hallo {pendingTeacherUser.user.first_name}!
                </h3>
                <p style={{ margin: 0, fontSize: '0.95rem', color: '#64748b', lineHeight: '1.5' }}>
                  Möchtest du dich im GrooveLab anmelden?
                </p>
              </div>
            </div>

            <div style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '20px',
              padding: '16px 20px',
              fontSize: '0.85rem',
              color: '#475569',
              textAlign: 'left',
              lineHeight: '1.5',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px'
            }}>
              <div>
                🟢 <strong>Ja, anmelden:</strong> Du wirst im GrooveLab (Live Lab) eingecheckt und bist für alle sichtbar.
              </div>
              <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '8px' }}>
                ⚪ <strong>Nein, nur Ansicht:</strong> Du siehst alle Funktionen des Lehrerdashboards, wirst aber selbst im Live Lab nicht angezeigt.
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '4px' }}>
              <button
                onClick={() => confirmTeacherLogin(false)}
                style={{
                  width: '100%',
                  padding: '16px',
                  borderRadius: '16px',
                  background: 'linear-gradient(135deg, #34a853 0%, #34a853 100%)',
                  color: '#ffffff',
                  border: 'none',
                  fontSize: '1rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  boxShadow: '0 8px 20px rgba(52, 168, 83, 0.25)',
                  transition: 'all 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
                
                
              >
                Ja, im Live Lab anmelden
              </button>

              <button
                onClick={() => confirmTeacherLogin(true)}
                style={{
                  width: '100%',
                  padding: '16px',
                  borderRadius: '16px',
                  background: '#f1f5f9',
                  color: '#475569',
                  border: '1px solid #e2e8f0',
                  fontSize: '1rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
                
                
              >
                Nein, nur Ansicht (ohne Einchecken)
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity: 0; transform: scale(0.98); } to { opacity: 1; transform: scale(1); } }
      `}</style>
      {/* PIN Setup Modal */}
      {pinSetupUser && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.4)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000,
          padding: '20px',
          fontFamily: 'Inter, system-ui, sans-serif'
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '32px',
            padding: '32px',
            width: '100%',
            maxWidth: '360px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.15)',
            border: '1px solid #f1f5f9',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center'
          }}>
            <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: isGroovelabKiosk ? '#fef3c7' : '#e6f4ea', display: 'flex', alignItems: 'center', justifyContent: 'center', color: isGroovelabKiosk ? '#d97706' : '#34a853', marginBottom: '16px' }}>
              <Key size={28} />
            </div>
            
            <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900, color: '#0f172a' }}>Persönliche PIN einrichten</h3>
            <p style={{ margin: '8px 0 20px 0', fontSize: '0.82rem', color: '#64748b', fontWeight: 600, lineHeight: '1.4' }}>
              Erster Login für <strong>{pinSetupUser.first_name} {pinSetupUser.last_name}</strong> ({pinSetupUser.ausweis_nummer}).<br/>
              Bitte lege eine geheime 4-stellige PIN fest.
            </p>

            <div style={{ display: 'flex', gap: '16px', marginBottom: '12px' }}>
              {[0, 1, 2, 3].map((idx) => (
                <div key={idx} style={{
                  width: '18px',
                  height: '18px',
                  borderRadius: '50%',
                  border: '2px solid #cbd5e1',
                  background: pinSetupInput.length > idx ? '#cbd5e1' : 'transparent',
                  transition: 'all 0.15s ease'
                }} />
              ))}
            </div>

            {renderKeypad('setup')}

            <button
              onClick={async () => {
                if (pinSetupInput.length !== 4) return;
                setLoading(true);
                try {
                  const authQrToken = pinSetupUser?.qr_token || pinSetupUser?.ausweis_nummer || pinSetupUser?.id;
                  if (authQrToken) {
                    sessionStorage.setItem('groovelab_qr_token', authQrToken);
                  }
                  let userUpdatePayload: any = {
                    personal_pin: pinSetupInput,
                    parent_pin: pinSetupInput,
                    onboarding_pin: pinSetupInput,
                    is_pin_activated: true
                  };
                  let { error } = await supabase
                    .from('users')
                    .update(userUpdatePayload)
                    .eq('id', pinSetupUser.id);

                  if (error && error.message?.includes('onboarding_pin')) {
                    delete userUpdatePayload.onboarding_pin;
                    const fallbackRes = await supabase
                      .from('users')
                      .update(userUpdatePayload)
                      .eq('id', pinSetupUser.id);
                    error = fallbackRes.error;
                  }

                  try {
                    await supabase.from('students').update({
                      personal_pin: pinSetupInput,
                      parent_pin: pinSetupInput,
                      onboarding_pin: pinSetupInput,
                      is_pin_activated: true
                    }).eq('id', pinSetupUser.id);

                    await supabase.from('pending_students').update({
                      personal_pin: pinSetupInput,
                      parent_pin: pinSetupInput,
                      onboarding_pin: pinSetupInput,
                      is_pin_activated: true
                    }).eq('id', pinSetupUser.id);
                  } catch (e) {}

                  localStorage.setItem(`groovelab_user_pin_${pinSetupUser.id}`, pinSetupInput);

                  sessionStorage.removeItem('groovelab_qr_token');

                  if (error) throw error;
                  
                  const user = {
                    ...pinSetupUser,
                    personal_pin: pinSetupInput,
                    is_pin_activated: true
                  };
                  setPinSetupUser(null);
                  
                  const isTeacher = user.role?.toLowerCase() === 'teacher' || user.role?.toLowerCase() === 'admin';
                  if (isTeacher) {
                    if (user.is_observer) {
                      await finalizeLogin(user, loginStationId, false, true);
                    } else {
                      const isGroovelabScreen = isGroovelabKiosk;
                      if (isGroovelabScreen) {
                        await finalizeLogin(user, loginStationId, pinVerificationIsWithinRoom, false);
                      } else {
                        // Campus Login strictly bypasses GrooveLab presence check-in
                        await finalizeLogin(user, loginStationId, false, true);
                      }
                    }
                  } else {
                    await finalizeLogin(user, loginStationId, pinVerificationIsWithinRoom);
                  }
                } catch (err: any) {
                  alert('Fehler beim Einrichten der PIN: ' + err.message);
                  setLoading(false);
                }
              }}
              disabled={pinSetupInput.length !== 4 || loading}
              style={{
                width: '100%',
                padding: '14px',
                borderRadius: '16px',
                background: pinSetupInput.length === 4 ? (schoolData?.primary_color || '#eab308') : '#cbd5e1',
                color: '#0f172a',
                fontWeight: 800,
                border: 'none',
                marginTop: '24px',
                cursor: pinSetupInput.length === 4 ? 'pointer' : 'not-allowed',
                transition: 'all 0.2s'
              }}
            >
              PIN aktivieren &amp; Einloggen
            </button>
            
            <button
              onClick={() => {
                setPinSetupUser(null);
                setLoading(false);
              }}
              style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', marginTop: '16px', cursor: 'pointer' }}
            >
              Abbrechen
            </button>
          </div>
        </div>
      )}

      {/* PIN Verification Modal */}
      {pinVerificationUser && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.4)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000,
          padding: '20px',
          fontFamily: 'Inter, system-ui, sans-serif'
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '32px',
            padding: '32px',
            width: '100%',
            maxWidth: '360px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.15)',
            border: '1px solid #f1f5f9',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center'
          }}>
            <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: '#dbeafe', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563eb', marginBottom: '16px' }}>
              <Key size={28} />
            </div>
            
            <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900, color: '#0f172a' }}>Persönliche PIN eingeben</h3>
            <p style={{ margin: '8px 0 20px 0', fontSize: '0.82rem', color: '#64748b', fontWeight: 600, lineHeight: '1.4' }}>
              Login für <strong>{pinVerificationUser.first_name} {pinVerificationUser.last_name}</strong> ({pinVerificationUser.ausweis_nummer}).<br/>
              {pinVerificationUser.role === 'student' ? 'Bitte gib deinen Geburtstag (nur den Tag, z.B. 05) als PIN ein.' : 'Bitte gib deine 4-stellige PIN ein.'}
            </p>

            <div style={{ display: 'flex', gap: '16px', marginBottom: '12px' }}>
              {Array.from({ length: pinVerificationUser.role === 'student' ? 2 : 4 }).map((_, idx) => (
                <div key={idx} style={{
                  width: '18px',
                  height: '18px',
                  borderRadius: '50%',
                  border: '2px solid #cbd5e1',
                  background: pinVerificationInput.length > idx ? '#cbd5e1' : 'transparent',
                  transition: 'all 0.15s ease'
                }} />
              ))}
            </div>

            {renderKeypad('verify')}

            <button
              onClick={async () => {
                const dayOfBirthVal = Array.isArray(pinVerificationUser.activation_days) ? pinVerificationUser.activation_days[0]?.day_of_birth : pinVerificationUser.activation_days?.day_of_birth;
                const studentBirthDay = dayOfBirthVal ? String(dayOfBirthVal).padStart(2, '0') : '';
                const expectedLength = (pinVerificationUser.role === 'student' && studentBirthDay) ? 2 : 4;
                if (pinVerificationInput.length !== expectedLength) return;
                
                let isMatch = false;
                if (pinVerificationUser.role === 'student' && studentBirthDay) {
                  isMatch = parseInt(pinVerificationInput) === parseInt(studentBirthDay);
                } else {
                  const { data: pinOk, error: pinErr } = await supabase.rpc('verify_personal_pin', {
                    user_uuid: pinVerificationUser.id,
                    input_pin: pinVerificationInput
                  });
                  if (!pinErr && pinOk === true) {
                    isMatch = true;
                  }
                }

                if (isMatch) {
                  const user = pinVerificationUser;
                  setPinVerificationUser(null);
                  setPinVerificationAttempts(0);
                  
                  const isTeacher = user.role?.toLowerCase() === 'teacher' || user.role?.toLowerCase() === 'admin';
                  if (isTeacher) {
                    if (user.is_observer) {
                      await finalizeLogin(user, loginStationId, false, true);
                    } else {
                      const isGroovelabScreen = isGroovelabKiosk;
                      if (isGroovelabScreen) {
                        await finalizeLogin(user, loginStationId, pinVerificationIsWithinRoom, false);
                      } else {
                        // Campus Login strictly bypasses GrooveLab presence check-in
                        await finalizeLogin(user, loginStationId, false, true);
                      }
                    }
                  } else {
                    await finalizeLogin(user, loginStationId, pinVerificationIsWithinRoom);
                  }
                } else {
                  const newAttempts = pinVerificationAttempts + 1;
                  setPinVerificationAttempts(newAttempts);

                  if (pinVerificationUser.role === 'student' && newAttempts >= 3) {
                    try {
                      await supabase
                        .from('users')
                        .update({ is_campus_active: false, is_groovelab_active: false })
                        .eq('id', pinVerificationUser.id);
                      alert('Dieses Konto wurde nach 3 Fehlversuchen aus Sicherheitsgründen gesperrt. Bitte wende dich an die Musikschule.');
                    } catch (e) {
                      console.error(e);
                    }
                    setPinVerificationUser(null);
                  } else {
                    const limit = pinVerificationUser.role === 'student' ? 3 : 5;
                    const remaining = limit - newAttempts;
                    if (remaining <= 0) {
                      alert('Zu viele Fehlversuche. Bitte wende dich an deine Schule.');
                      setPinVerificationUser(null);
                    } else {
                      alert(`Die eingegebene PIN ist nicht korrekt. Noch ${remaining} Versuch${remaining === 1 ? '' : 'e'}.`);
                    }
                  }
                  setPinVerificationInput('');
                }
              }}
              disabled={pinVerificationInput.length !== (pinVerificationUser.role === 'student' ? 2 : 4)}
              style={{
                width: '100%',
                padding: '14px',
                borderRadius: '16px',
                background: pinVerificationInput.length === (pinVerificationUser.role === 'student' ? 2 : 4) ? (schoolData?.primary_color || '#eab308') : '#cbd5e1',
                color: '#0f172a',
                fontWeight: 800,
                border: 'none',
                marginTop: '24px',
                cursor: pinVerificationInput.length === (pinVerificationUser.role === 'student' ? 2 : 4) ? 'pointer' : 'not-allowed',
                transition: 'all 0.2s'
              }}
            >
              Verifizieren &amp; Einloggen
            </button>
            
            <button
              onClick={() => {
                setPinVerificationUser(null);
                setLoading(false);
              }}
              style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', marginTop: '16px', cursor: 'pointer' }}
            >
              Abbrechen
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
