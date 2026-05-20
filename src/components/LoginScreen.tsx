import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Music, Tablet, ShieldCheck, FileText, X, Check } from 'lucide-react';
import { Scanner } from '@yudiel/react-qr-scanner';
import { getDistanceFromLatLonInM } from '../utils/geo';

interface LoginScreenProps {
  onLogin: (userId: string, isHome?: boolean) => void;
  kioskStationId?: string | null;
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

export function LoginScreen({ onLogin, kioskStationId }: LoginScreenProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showImpressum, setShowImpressum] = useState(false);
  
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
        .from('users')
        .select('*')
        .eq('is_master_admin', true)
        .eq('master_admin_username', adminUsernameInput.trim())
        .eq('master_admin_password', adminPasswordInput.trim())
        .maybeSingle();

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
  
  const [schoolName, setSchoolName] = useState<string>('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [registeredUser, setRegisteredUser] = useState<any>(null);
  const [loadingSchool, setLoadingSchool] = useState(false);
  const [signingUp, setSigningUp] = useState(false);

  useEffect(() => {
    async function loadSchoolName() {
      if (!inviteSchoolId) return;
      try {
        setLoadingSchool(true);
        const { data, error } = await supabase.from('schools').select('name').eq('id', inviteSchoolId).maybeSingle();
        if (error) throw error;
        if (data) setSchoolName(data.name);
      } catch (err) {
        console.error("Error loading invite school name:", err);
      } finally {
        setLoadingSchool(false);
      }
    }
    loadSchoolName();
  }, [inviteSchoolId]);

  const [userPos, setUserPos] = useState<{lat: number, lng: number} | null>(null);
  
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setUserPos({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        (err) => console.warn('[Login] Initial geo fetch failed:', err),
        { enableHighAccuracy: true, maximumAge: 30000 }
      );
    }
  }, []);

  let effectiveStationId = kioskStationId || localStorage.getItem('groovelab_station_id');
  if (effectiveStationId === 'skip') effectiveStationId = null;

  const finalizeLogin = async (user: any, stationId: string | null, isWithinAnyRoom: boolean, hidePresence = false) => {
    try {
      setLoading(true);
      const schoolData = Array.isArray(user.schools) ? user.schools[0] : user.schools;
      const isMaster = user.is_master_admin === true;
      if (schoolData?.is_paused && !isMaster) {
        alert("Diese Schule ist vorübergehend pausiert/deaktiviert. Login derzeit nicht möglich.");
        setLoading(false);
        return;
      }
      const now = new Date().toISOString();
      const isTeacher = user.role?.toLowerCase() === 'teacher' || user.role?.toLowerCase() === 'admin';
      
      if (isTeacher) {
        if (hidePresence) {
          sessionStorage.setItem('groovelab_teacher_hide_presence', 'true');
        } else {
          sessionStorage.setItem('groovelab_teacher_hide_presence', 'false');
        }
      }
      
      let finalStationId = null;
      let isHome = false;

      // 1. Determine finalStationId and lookup teacher station if needed
      if (isTeacher) {
        const { data: tStation } = await supabase.from('stations').select('id').eq('name', 'Lehrer iPad').maybeSingle();
        finalStationId = tStation?.id || null;
      } else {
        if (stationId) {
          const { data: curStation } = await supabase.from('stations').select('name').eq('id', stationId).maybeSingle();
          const stationName = curStation?.name?.toLowerCase() || '';
          if (stationName.includes('lehrer') || stationName.includes('teacher')) {
            console.log(`[Login] Student tried to log in on teacher station. Forcing Home mode.`);
            alert("Hinweis: Schüler können sich nicht am Lehrer-iPad einloggen. Du wirst automatisch im Home-Modus angemeldet.");
            isHome = true;
            finalStationId = null;
          } else {
            finalStationId = stationId;
          }
        } else {
          finalStationId = null;
        }
      }

      // Geofence check
      if (!isWithinAnyRoom || (isTeacher && hidePresence)) {
        console.log(`[Login] Outside geofence or hiding presence. Forcing Home mode.`);
        isHome = true;
        finalStationId = null;
      }

      // 1.5 Check opening hours for sessions (Students only)
      const openingHours = schoolData?.opening_hours;
      const withinHours = isWithinOpeningHours(openingHours);
      const enforceHours = openingHours?.enforce_hours !== false; // Default to true if not set
      
      if (!isTeacher && enforceHours && !withinHours) {
        console.log(`[Login] Outside opening hours (STRICT). Forcing Home mode.`);
        isHome = true;
        finalStationId = null;
      } else if (!isTeacher && !withinHours) {
        console.log(`[Login] Outside opening hours but in FLEXIBLE mode. Lab login allowed if geofence matches.`);
      }


      console.log(`[Login] Final Station ID: ${finalStationId}, isHome: ${isHome}, withinHours: ${withinHours}`);

      // 2. Session Management (Only for Academy/Lab sessions)
      // 2. Global Cleanup: Always terminate any existing active sessions for THIS USER
      await supabase.from('sessions').update({ check_out_time: now }).eq('user_id', user.id).is('check_out_time', null);

      if (!isHome) {
        // 3. Station Cleanup: If using a station, ensure it's free.
        // We only terminate other sessions if the station is NOT the teacher iPad (i.e. user is not a teacher).
        if (finalStationId && !isTeacher) {
          await supabase.from('sessions').update({ check_out_time: now }).eq('station_id', finalStationId).is('check_out_time', null);
        }
        
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

      sessionStorage.setItem('groovelab_user_id', user.id);
      setLoading(false);
      
      onLogin(user.id, isHome);
    } catch (err: any) {
      console.error('[Login] Finalize error:', err.message);
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
          const { data: rooms } = await supabase.from('rooms').select('*').eq('school_id', schoolId);
          setPrefetchedRooms(rooms);
          console.log(`[Login] Pre-fetched ${rooms?.length} rooms for school: ${schoolId}`);
        }
      } catch (e) {
        console.warn('[Login] Pre-fetch failed', e);
      }
    }
    prefetch();
  }, [effectiveStationId]);

  const handleScan = async (qrToken: string) => {
    if (loading) return;
    setLoading(true);
    setError(null);

    // 0. Force kill camera immediately upon scan
    try {
      document.querySelectorAll('video').forEach(video => {
        const stream = video.srcObject as MediaStream;
        if (stream) {
          stream.getTracks().forEach(track => track.stop());
          video.srcObject = null;
        }
      });
      
      // Secondary fallback to kill any global media streams
      navigator.mediaDevices.getUserMedia({ video: true })
        .then(stream => {
           stream.getTracks().forEach(t => t.stop());
        }).catch(e => { /* Ignore */ });
    } catch (e) {
      console.warn("Could not kill camera", e);
    }

    try {
      console.log('[Login] Starting scan for token:', qrToken);

      // 1. User finden
      const { data: user, error: userErr } = await supabase
        .from('users')
        .select('*, schools(*)')
        .eq('qr_token', qrToken)
        .single();

      if (userErr || !user) throw new Error('Nutzer nicht gefunden.');

      // Early exit if the user scanned is the Master Admin
      if (user.is_master_admin) {
        console.log('[Login] Master Admin QR token scanned! Logging in directly.');
        finalizeLogin(user, null, true);
        return;
      }

      const schoolData = Array.isArray(user.schools) ? user.schools[0] : user.schools;
      
      // Ensure school_id is available for room lookups even if not directly on the user object
      if (!user.school_id && schoolData?.id) {
        user.school_id = schoolData.id;
      }

      // 2. Geofence Check (Simpel & Stabil)
      let isWithinAnyRoom = false;
      
      // KIOSK BYPASS: If we are scanning on a configured iPad station, we inherently know it's in the room!
      if (effectiveStationId) {
        console.log('[Login] Kiosk mode detected. Bypassing GPS check entirely for lightning fast login.');
        isWithinAnyRoom = true;
      } else {
        let finalUserPos = userPos;
        
        try {
          if (!finalUserPos) {
            console.log('[Login] No pre-fetched position, attempting quick fetch...');
            finalUserPos = await new Promise<{lat: number, lng: number} | null>((resolve) => {
              navigator.geolocation.getCurrentPosition(
                (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
                () => resolve(null),
                { enableHighAccuracy: true, timeout: 3000, maximumAge: 60000 }
              );
            });
          }

          if (finalUserPos) {
            console.log(`[Geofence] User position: ${finalUserPos.lat}, ${finalUserPos.lng}`);
            // 1. Check Rooms (Multi-Point)
            const { data: rooms } = await supabase.from('rooms').select('*').eq('school_id', user.school_id);
            if (rooms) {
              for (const room of rooms) {
                const points = Array.isArray(room.geofence_points) ? room.geofence_points : [];
                const allCoords = [...points];
                if (room.latitude && room.longitude) allCoords.push({ lat: room.latitude, lng: room.longitude });
                
                for (const pt of allCoords) {
                  if (pt && pt.lat && pt.lng) {
                    const dist = getDistanceFromLatLonInM(finalUserPos.lat, finalUserPos.lng, Number(pt.lat), Number(pt.lng));
                    console.log(`[Geofence] Room "${room.name}" Point: ${Math.round(dist)}m away`);
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
            if (!isWithinAnyRoom && schoolData?.latitude && schoolData?.longitude) {
              const distToSchool = getDistanceFromLatLonInM(
                finalUserPos.lat, finalUserPos.lng, 
                Number(schoolData.latitude), Number(schoolData.longitude)
              );
              const radius = schoolData.geofence_radius_meters || 150;
              console.log(`[Geofence] School fallback: ${Math.round(distToSchool)}m away (Radius: ${radius}m)`);
              if (distToSchool < radius) {
                isWithinAnyRoom = true;
              }
            }
          } else {
            console.warn('[Geofence] No user position available (Permission denied or timeout)');
          }
        } catch (geoErr) {
          console.warn('[Login] Geolocation failed.', geoErr);
        }
      }

      console.log(`[Login] Scan successful. Geofence match: ${isWithinAnyRoom}`);
      
      const isTeacher = user.role?.toLowerCase() === 'teacher' || user.role?.toLowerCase() === 'admin';
      if (isTeacher) {
        setPendingTeacherUser({ user, isWithinAnyRoom });
        setShowTeacherChoiceModal(true);
        setLoading(false);
        return;
      }

      // Automatically finalize based on geofence detection
      await finalizeLogin(user, effectiveStationId, isWithinAnyRoom);
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
    await finalizeLogin(user, effectiveStationId, isWithinAnyRoom, hidePresence);
  };

  const [geoDebug, setGeoDebug] = useState<any>(null);
  const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

  // Intercept and render coach self-onboarding if invite parameters are in URL
  if (inviteSchoolId) {
    if (registeredUser) {
      return (
        <div style={{
          position: 'fixed', inset: 0, backgroundColor: '#0f172a',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          padding: '20px', fontFamily: '"Outfit", "Inter", sans-serif', zIndex: 9999, color: '#f8fafc'
        }}>
          <div style={{
            width: '100%', maxWidth: '440px', background: 'rgba(255, 255, 255, 0.03)',
            backdropFilter: 'blur(16px)', borderRadius: '32px', padding: '32px',
            border: '1px solid rgba(255, 255, 255, 0.08)', display: 'flex', flexDirection: 'column',
            alignItems: 'center', boxShadow: '0 40px 100px rgba(0, 0, 0, 0.4)', boxSizing: 'border-box'
          }}>
            <div style={{
              width: '60px', height: '60px', borderRadius: '50%', background: '#22c55e20',
              display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px'
            }}>
              <Check size={32} color="#22c55e" />
            </div>
            <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#22c55e', margin: '0 0 10px 0', textAlign: 'center' }}>
              Registrierung erfolgreich!
            </h1>
            <p style={{ color: '#94a3b8', fontSize: '13px', textAlign: 'center', lineHeight: '1.5', margin: '0 0 24px 0' }}>
              Dein GrooveLab Coach-Ausweis wurde erstellt. Mache einen <strong>Screenshot</strong> oder drucke diesen QR-Code aus, um dich ab sofort einzuloggen.
            </p>
            
            <div style={{
              background: 'white', padding: '16px', borderRadius: '24px',
              boxShadow: '0 10px 30px rgba(0,0,0,0.2)', marginBottom: '24px',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <img 
                src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${registeredUser.qr_token}`} 
                alt="GrooveLab QR Code" 
                style={{ width: '200px', height: '200px' }}
              />
            </div>

            <div style={{
              width: '100%', padding: '16px', background: 'rgba(255, 255, 255, 0.02)',
              borderRadius: '16px', border: '1px solid rgba(255,255,255,0.06)',
              marginBottom: '24px', boxSizing: 'border-box'
            }}>
              <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: '4px' }}>Name</div>
              <div style={{ fontSize: '1rem', fontWeight: 700, color: 'white' }}>{registeredUser.first_name} {registeredUser.last_name}</div>
              
              <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '12px', marginBottom: '4px' }}>Schule</div>
              <div style={{ fontSize: '1rem', fontWeight: 700, color: '#eab308' }}>{schoolName || 'GrooveLab Academy'}</div>
            </div>

            <button
              onClick={() => onLogin(registeredUser.id, true)}
              style={{
                width: '100%', padding: '14px 20px', borderRadius: '16px',
                background: 'linear-gradient(135deg, #eab308 0%, #ca8a04 100%)',
                border: 'none', color: '#0f172a', fontWeight: 800, fontSize: '0.95rem',
                cursor: 'pointer', boxShadow: '0 8px 24px rgba(234, 179, 8, 0.25)',
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
        position: 'fixed', inset: 0, backgroundColor: '#0f172a',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        padding: '20px', fontFamily: '"Outfit", "Inter", sans-serif', zIndex: 9999, color: '#f8fafc'
      }}>
        <div style={{
          width: '100%', maxWidth: '440px', background: 'rgba(255, 255, 255, 0.03)',
          backdropFilter: 'blur(16px)', borderRadius: '32px', padding: '32px',
          border: '1px solid rgba(255, 255, 255, 0.08)', display: 'flex', flexDirection: 'column',
          boxShadow: '0 40px 100px rgba(0, 0, 0, 0.4)', boxSizing: 'border-box'
        }}>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
            <div style={{
              background: '#eab308', padding: '8px', borderRadius: '12px',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <Music size={24} color="#0f172a" />
            </div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800 }}>GrooveLab Einladung</div>
          </div>

          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, margin: '0 0 8px 0', letterSpacing: '-0.02em' }}>
            Registriere dich als Coach
          </h2>
          <p style={{ color: '#94a3b8', fontSize: '0.85rem', margin: '0 0 24px 0', lineHeight: '1.5' }}>
            Du wurdest eingeladen, als Coach für die Schule <strong style={{ color: '#eab308' }}>{loadingSchool ? 'wird geladen...' : (schoolName || 'GrooveLab Academy')}</strong> beizutreten.
          </p>

          <form onSubmit={async (e) => {
            e.preventDefault();
            if (!firstName.trim() || !lastName.trim()) return;
            try {
              setSigningUp(true);
              const newQrToken = crypto.randomUUID();
              const newUserId = crypto.randomUUID();
              
              const { data, error } = await supabase
                .from('users')
                .insert({
                  id: newUserId,
                  school_id: inviteSchoolId,
                  role: 'teacher',
                  first_name: firstName,
                  last_name: lastName,
                  qr_token: newQrToken
                })
                .select()
                .single();

              if (error) throw error;
              setRegisteredUser(data);
            } catch (err: any) {
              console.error("Error signing up coach:", err);
              alert("Fehler bei der Registrierung: " + err.message);
            } finally {
              setSigningUp(false);
            }
          }} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', color: '#94a3b8', fontWeight: 600, marginBottom: '6px' }}>Vorname *</label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="z.B. Patrick"
                required
                style={{
                  width: '100%', boxSizing: 'border-box', padding: '12px 14px', borderRadius: '10px',
                  background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)',
                  color: 'white', fontSize: '0.9rem', outline: 'none'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', color: '#94a3b8', fontWeight: 600, marginBottom: '6px' }}>Nachname *</label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="z.B. Huber"
                required
                style={{
                  width: '100%', boxSizing: 'border-box', padding: '12px 14px', borderRadius: '10px',
                  background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)',
                  color: 'white', fontSize: '0.9rem', outline: 'none'
                }}
              />
            </div>

            <button
              type="submit"
              disabled={signingUp}
              style={{
                marginTop: '8px', padding: '14px', borderRadius: '12px',
                background: 'linear-gradient(135deg, #eab308 0%, #ca8a04 100%)',
                border: 'none', color: '#0f172a', fontWeight: 800, fontSize: '0.9rem',
                cursor: 'pointer', boxShadow: '0 8px 20px rgba(234, 179, 8, 0.2)',
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

  return (
    <div style={{ 
      position: 'fixed',
      inset: 0,
      backgroundColor: '#ffffff', 
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      fontFamily: 'Inter, system-ui, sans-serif',
      zIndex: 9999
    }}>
      
      <div className="loading-pulse" style={{
        width: '80px',
        height: '80px',
        background: '#f8fafc',
        borderRadius: '24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: '24px',
        boxShadow: '0 10px 30px rgba(0, 0, 0, 0.05)',
        border: '1px solid #e2e8f0'
      }}>
        <Music size={40} color="#eab308" />
      </div>

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
          fontWeight: 1000, 
          color: '#0f172a', 
          marginBottom: '8px', 
          margin: 0, 
          letterSpacing: '-0.02em',
          cursor: 'default',
          userSelect: 'none'
        }}
      >
        GrooveLab
      </h1>
      <p style={{ color: '#64748b', textAlign: 'center', fontSize: '14px', marginBottom: '48px', maxWidth: '300px', lineHeight: '1.5', fontWeight: 600 }}>
        Halte deinen Ausweis vor die Kamera,<br/>um dich einzuloggen.
      </p>

      <div style={{
        width: '100%',
        maxWidth: '400px',
        background: '#ffffff',
        borderRadius: '56px',
        padding: '32px',
        boxShadow: '0 40px 100px rgba(15, 23, 42, 0.08)',
        border: '1px solid #f1f5f9',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        position: 'relative'
      }}>
        <div style={{
          width: '100%',
          aspectRatio: '1/1',
          borderRadius: '40px',
          overflow: 'hidden',
          background: '#000',
          position: 'relative',
          boxShadow: '0 0 0 4px rgba(0,0,0,0.02)'
        }}>
          <Scanner
            key="groovelab-final-scanner"
            onScan={(result) => {
              const val = result?.[0]?.rawValue;
              if (val) handleScan(val);
            }}
            paused={loading}
            components={{ finder: true }}
            styles={{
              container: { width: '100%', height: '100%' },
              video: { width: '100%', height: '100%', objectFit: 'cover' }
            }}
            constraints={{ facingMode: 'user' }}
          />
          {loading && (
            <div style={{
              position: 'absolute',
              inset: 0,
              background: 'rgba(255,255,255,0.8)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 10,
              backdropFilter: 'blur(10px)'
            }}>
              <div style={{ width: '40px', height: '40px', border: '4px solid #eab308', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
            </div>
          )}
        </div>

        {error && (
          <div style={{ marginTop: '24px', background: '#fef2f2', border: '1px solid #fee2e2', color: '#ef4444', padding: '16px', borderRadius: '20px', fontSize: '13px', fontWeight: 800, textAlign: 'center', width: '100%' }}>
            {error}
          </div>
        )}


      </div>

      {/* Geofence Diagnostic Panel (Localhost only) */}
      {isLocalhost && geoDebug && (
        <div style={{ 
          marginTop: '24px', 
          padding: '24px', 
          background: 'rgba(15, 23, 42, 0.95)', 
          color: 'white', 
          borderRadius: '32px', 
          fontSize: '13px', 
          width: '100%',
          maxWidth: '400px',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255,255,255,0.1)',
          boxShadow: '0 20px 50px rgba(0,0,0,0.1)'
        }}>
          <div style={{ fontWeight: 900, marginBottom: '16px', color: '#eab308', display: 'flex', justifyContent: 'space-between', letterSpacing: '0.05em' }}>
            <span>DIAGNOSE: GEOFENCING</span>
            <span style={{ color: geoDebug.isWithinAnyRoom ? '#10b981' : '#ef4444' }}>{geoDebug.isWithinAnyRoom ? 'ERFOLGREICH' : 'FEHLGESCHLAGEN'}</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', opacity: 0.8 }}>
              <span>Deine Position:</span>
              <span style={{ fontWeight: 700 }}>{geoDebug.userPos ? `${geoDebug.userPos.lat.toFixed(4)}, ${geoDebug.userPos.lng.toFixed(4)}` : 'Wird gesucht...'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', opacity: 0.8 }}>
              <span>Ziel (Akademie):</span>
              <span style={{ fontWeight: 700 }}>{geoDebug.schoolCoords ? `${geoDebug.schoolCoords.lat.toFixed(4)}, ${geoDebug.schoolCoords.lng.toFixed(4)}` : 'Nicht gesetzt'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '8px' }}>
              <span>Berechnete Distanz:</span>
              <span style={{ fontWeight: 900, color: '#eab308' }}>{geoDebug.distToSchool !== null ? `${geoDebug.distToSchool}m` : '?'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '8px' }}>
              <span>Status Öffnungszeiten:</span>
              <span style={{ fontWeight: 900, color: geoDebug.withinHours ? '#10b981' : '#ef4444' }}>{geoDebug.withinHours ? 'GEÖFFNET' : 'GESCHLOSSEN'}</span>
            </div>
          </div>
          
          {(!geoDebug.isWithinAnyRoom || !geoDebug.withinHours) && (
            <button 
              onClick={() => {
                const uid = sessionStorage.getItem('groovelab_user_id');
                if (uid) {
                   supabase.from('users').select('*, schools(*)').eq('id', uid).single().then(({data}) => {
                     if (data) finalizeLogin(data, effectiveStationId, true);
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

      {/* Admin Bypass for Localhost */}
      {import.meta.env.DEV && (
        <div style={{ marginTop: '24px', width: '100%', maxWidth: '360px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <button
            onClick={async () => {
              try {
                console.log('[Bypass] Attempting Admin login...');
                const { data: user, error } = await supabase
                  .from('users')
                  .select('id, role')
                  .eq('qr_token', '7b8e1a2c-4d5f-6a7b-8c9d-0e1f2a3b4c5d')
                  .maybeSingle();

                if (error) {
                  console.error('[Bypass] Supabase Error:', error);
                  alert('Datenbank-Fehler: ' + error.message);
                  return;
                }

                if (user) {
                  console.log('[Bypass] User found, logging in:', user.id);
                  onLogin(user.id, true);
                } else {
                  console.warn('[Bypass] No user found with this token.');
                  alert('Admin-Nutzer wurde in der Datenbank nicht gefunden.');
                }
              } catch (err: any) {
                console.error('[Bypass] Runtime Error:', err);
                alert('Ein Fehler ist aufgetreten: ' + err.message);
              }
            }}
            style={{
              width: '100%',
              padding: '16px',
              background: '#fef9c3',
              border: '2px solid #fde047',
              borderRadius: '24px',
              color: '#854d0e',
              fontWeight: 800,
              fontSize: '13px',
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(234,179,8,0.15)',
              textTransform: 'uppercase',
              letterSpacing: '0.02em'
            }}
          >
            🔓 ADMIN BYPASS (LOCAL ONLY)
          </button>
          
        </div>
      )}

      <div style={{ marginTop: '24px', width: '100%', maxWidth: '360px', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '0 10px' }}>
        {effectiveStationId ? (
          <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#94a3b8', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              <Tablet size={14} />
              Kiosk Modus aktiv
            </div>
            <button 
              onClick={() => {
                localStorage.removeItem('groovelab_station_id');
                window.location.reload();
              }}
              style={{ background: 'none', border: 'none', color: '#f87171', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', cursor: 'pointer' }}
            >
              Beenden
            </button>
          </div>
        ) : (
          <button 
            onClick={() => {
              localStorage.removeItem('groovelab_station_id');
              window.location.reload();
            }}
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '12px', 
              background: '#ffffff', 
              border: '1px solid #e2e8f0', 
              padding: '12px 24px', 
              borderRadius: '20px', 
              color: '#64748b', 
              fontSize: '12px', 
              fontWeight: 800, 
              textTransform: 'uppercase', 
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(0,0,0,0.02)',
              transition: 'all 0.2s'
            }}
          >
            <Tablet size={16} />
            Kiosk Modus aktivieren
          </button>
        )}
      </div>

      {/* Legal Footer */}
      <div style={{ 
        marginTop: '32px', 
        display: 'flex', 
        gap: '24px', 
        fontSize: '11px', 
        fontWeight: 800, 
        color: '#94a3b8',
        textTransform: 'uppercase',
        letterSpacing: '0.05em'
      }}>
        <span 
          onClick={() => setShowPrivacy(true)} 
          style={{ cursor: 'pointer', transition: 'color 0.2s' }} 
          onMouseEnter={e => e.currentTarget.style.color = '#eab308'} 
          onMouseLeave={e => e.currentTarget.style.color = '#94a3b8'}
        >
          Datenschutz
        </span>
        <span style={{ opacity: 0.5 }}>•</span>
        <span 
          onClick={() => setShowImpressum(true)} 
          style={{ cursor: 'pointer', transition: 'color 0.2s' }} 
          onMouseEnter={e => e.currentTarget.style.color = '#eab308'} 
          onMouseLeave={e => e.currentTarget.style.color = '#94a3b8'}
        >
          Impressum
        </span>
      </div>

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
            padding: '36px',
            maxWidth: '560px',
            width: '100%',
            maxHeight: '80vh',
            overflowY: 'auto',
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px'
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
                transition: 'all 0.2s'
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.05)'; e.currentTarget.style.background = '#e2e8f0'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.background = '#f1f5f9'; }}
            >
              <X size={20} />
            </button>

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
                <p style={{ margin: 0 }}>Der Schutz Ihrer persönlichen Daten ist uns ein wichtiges Anliegen. GrooveLab speichert Daten zur Bereitstellung der Übungs- und Klassenzimmerplattform nach den Vorgaben der DSGVO. Zur Einhaltung der Datenminimierung werden Nachnamen von Schülern standardmäßig anonymisiert (nur die Initiale wird gespeichert, z.B. Max M.).</p>
              </div>

              <div>
                <h4 style={{ margin: '0 0 6px 0', fontSize: '14px', fontWeight: 800, color: '#1e293b' }}>2. Kamera & QR-Scanner</h4>
                <p style={{ margin: 0 }}>Die Kamera deines Endgeräts wird ausschließlich lokal im Browser verwendet, um deinen GrooveLab-QR-Ausweis zu scannen. Es werden zu keinem Zeitpunkt Videostreams oder Bilder an Server übertragen oder dort gespeichert.</p>
              </div>

              <div>
                <h4 style={{ margin: '0 0 6px 0', fontSize: '14px', fontWeight: 800, color: '#1e293b' }}>3. Standortermittlung (Geofencing)</h4>
                <p style={{ margin: 0 }}>GrooveLab prüft beim Einloggen kurz deinen Gerätestandort (GPS), um sicherzustellen, dass du dich im GrooveLab-Raum der Musikschule befindest. Diese Standortdaten werden rein lokal in deinem Browser berechnet und nicht an Server übertragen. In der Datenbank wird lediglich ein Bestätigungswert (Erfolgreich/Fehlgeschlagen) für deine aktive Session hinterlegt. Ein kontinuierliches Bewegungsprofil wird nicht erstellt.</p>
              </div>

              <div>
                <h4 style={{ margin: '0 0 6px 0', fontSize: '14px', fontWeight: 800, color: '#1e293b' }}>4. Rechte der Betroffenen</h4>
                <p style={{ margin: 0 }}>Sie haben das Recht auf Auskunft, Berichtigung, Sperrung oder Löschung Ihrer Daten. Wenden Sie sich hierzu bitte an die Schulleitung Ihrer Musikakademie.</p>
              </div>

              <div>
                <h4 style={{ margin: '0 0 6px 0', fontSize: '14px', fontWeight: 800, color: '#1e293b' }}>5. Hosting & Datenbank-Infrastruktur</h4>
                <p style={{ margin: 0 }}>Unsere Anwendung wird auf Servern externer Dienstleister gehostet, um einen sicheren und performanten Betrieb zu gewährleisten. Das Frontend wird über <strong>Vercel</strong> (Vercel Inc.) bereitgestellt, und die Datenbankinfrastruktur läuft über <strong>Supabase</strong> (Supabase Inc.). Mit beiden Dienstleistern wurden die gesetzlich vorgeschriebenen Verträge zur Auftragsverarbeitung (AV-Vertrag nach Art. 28 DSGVO) geschlossen, um den Schutz der Daten zu jeder Zeit zu gewährleisten.</p>
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
            padding: '36px',
            maxWidth: '560px',
            width: '100%',
            maxHeight: '80vh',
            overflowY: 'auto',
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px'
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
                transition: 'all 0.2s'
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.05)'; e.currentTarget.style.background = '#e2e8f0'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.background = '#f1f5f9'; }}
            >
              <X size={20} />
            </button>

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
                <h4 style={{ margin: '0 0 6px 0', fontSize: '14px', fontWeight: 800, color: '#1e293b' }}>Angaben gemäß § 5 TMG</h4>
                <p style={{ margin: 0 }}>
                  Manuel Wagner<br/>
                  Friedrichstr. 33<br/>
                  79713 Bad Säckingen
                </p>
              </div>

              <div>
                <h4 style={{ margin: '0 0 6px 0', fontSize: '14px', fontWeight: 800, color: '#1e293b' }}>Kontakt</h4>
                <p style={{ margin: 0 }}>
                  Mo-Fr: 08-15 Uhr<br/>
                  Telefon: 07761 – 2416<br/>
                  E-Mail: info@musaek.de
                </p>
              </div>

              <div>
                <h4 style={{ margin: '0 0 6px 0', fontSize: '14px', fontWeight: 800, color: '#1e293b' }}>EU-Streitschlichtung</h4>
                <p style={{ margin: 0 }}>
                  Die Europäische Kommission stellt eine Plattform zur Online-Streitbeilegung (OS) bereit: <a href="https://ec.europa.eu/consumers/odr/" target="_blank" rel="noopener noreferrer" style={{ color: '#eab308', textDecoration: 'underline' }}>https://ec.europa.eu/consumers/odr/</a>.<br/>
                  Unsere E-Mail-Adresse finden Sie oben im Impressum.
                </p>
              </div>

              <div>
                <h4 style={{ margin: '0 0 6px 0', fontSize: '14px', fontWeight: 800, color: '#1e293b' }}>Verbraucherstreitbeilegung / Universalschlichtungsstelle</h4>
                <p style={{ margin: 0 }}>
                  Wir sind nicht bereit oder verpflichtet, an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen.
                </p>
              </div>
            </div>
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
              onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.05)'; e.currentTarget.style.background = '#e2e8f0'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.background = '#f1f5f9'; }}
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
                    color: '#1e293b',
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
                    color: '#1e293b',
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
                <div style={{ background: '#fef2f2', border: '1px solid #fee2e2', color: '#ef4444', padding: '12px', borderRadius: '12px', fontSize: '12px', fontWeight: 700, textAlign: 'center' }}>
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
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-1px)';
                  e.currentTarget.style.boxShadow = '0 12px 28px rgba(15, 23, 42, 0.25)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'none';
                  e.currentTarget.style.boxShadow = '0 8px 24px rgba(15, 23, 42, 0.15)';
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
                background: 'linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#16a34a'
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
                  background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
                  color: '#ffffff',
                  border: 'none',
                  fontSize: '1rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  boxShadow: '0 8px 20px rgba(22, 163, 74, 0.25)',
                  transition: 'all 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-1px)';
                  e.currentTarget.style.boxShadow = '0 12px 24px rgba(22, 163, 74, 0.35)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'none';
                  e.currentTarget.style.boxShadow = '0 8px 20px rgba(22, 163, 74, 0.25)';
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
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#e2e8f0';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#f1f5f9';
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
    </div>
  );
}
