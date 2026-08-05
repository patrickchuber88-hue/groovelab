import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { UserPlus, Lock, X, ArrowLeft, Eye, EyeOff } from 'lucide-react';

interface ProfileSelectorProps {
  onLoginSuccess: (userId: string) => void;
  onShowStandardLogin: () => void;
}

export const ProfileSelector: React.FC<ProfileSelectorProps> = ({ onLoginSuccess, onShowStandardLogin }) => {
  const [profiles, setProfiles] = useState<any[]>([]);
  const [selectedProfile, setSelectedProfile] = useState<any | null>(null);
  const [pinInput, setPinInput] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [attempts, setAttempts] = useState<number>(0);
  const [showPin, setShowPin] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = JSON.parse(localStorage.getItem('groovelab_local_profiles') || '[]');
      setProfiles(stored);
    }
  }, []);

  const handleProfileSelect = async (profile: any) => {
    const urlParams = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
    const activePlatform = urlParams.get('platform') || localStorage.getItem('groovelab_active_platform') || 'campus';
    const isCampusPlatform = activePlatform === 'campus';

    if (profile.role === 'student') {
      setLoading(true);
      setError(null);
      try {
        // Log in student immediately (Netflix 1-click mode)
        sessionStorage.setItem('groovelab_user_id', profile.id);
        sessionStorage.setItem('groovelab_location_mode', 'home');
        localStorage.setItem('groovelab_active_platform', isCampusPlatform ? 'campus' : (profile.is_campus_active ? 'campus' : 'groovelab'));

        // Update local cache registry
        const registry = JSON.parse(localStorage.getItem('groovelab_local_profiles') || '[]');
        const idx = registry.findIndex((p: any) => p.id === profile.id);
        if (idx !== -1) {
          registry[idx] = {
            ...registry[idx],
            first_name: profile.first_name,
            last_name: profile.last_name,
            photo_url: profile.photo_url
          };
          localStorage.setItem('groovelab_local_profiles', JSON.stringify(registry));
        }

        onLoginSuccess(profile.id);
      } catch (err: any) {
        console.error('[ProfileSelector] Student direct login error:', err);
        setError(err.message || 'Verbindung zum Server fehlgeschlagen.');
      } finally {
        setLoading(false);
      }
      return;
    }

    setSelectedProfile(profile);
    setPinInput('');
    setError(null);
    setAttempts(0);
  };

  const handleKeyPress = (num: string) => {
    if (loading) return;
    setError(null);
    const limit = selectedProfile?.role === 'student' ? 2 : 4;
    if (pinInput.length < limit) {
      setPinInput(prev => prev + num);
    }
  };

  const handleBackspace = () => {
    if (loading) return;
    setPinInput(prev => prev.slice(0, -1));
  };

  const handleClear = () => {
    if (loading) return;
    setPinInput('');
  };

  // Submit and verify PIN
  const handleVerify = async () => {
    if (!selectedProfile || loading) return;
    const limit = selectedProfile.role === 'student' ? 2 : 4;
    if (pinInput.length !== limit) {
      setError(selectedProfile.role === 'student' ? 'Bitte gib deinen Geburtstag (2 Ziffern) ein.' : 'Bitte gib deine 4-stellige PIN ein.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // 1. Fetch fresh user row with birthday data
      const { data: user, error: userErr } = await supabase
        .from('users')
        .select('*, activation_days(day_of_birth)')
        .eq('id', selectedProfile.id)
        .maybeSingle();

      if (userErr) throw userErr;
      if (!user) {
        throw new Error('Profil existiert nicht mehr.');
      }

      let isMatch = false;
      const cleanInput = pinInput.trim();
      const userPin = String(user.personal_pin || user.parent_pin || user.onboarding_pin || '').trim();
      const cachedPin = localStorage.getItem(`groovelab_user_pin_${user.id}`);

      if (userPin && (userPin === cleanInput || userPin.padStart(4, '0') === cleanInput)) {
        isMatch = true;
      } else if (cachedPin && cachedPin.trim() === cleanInput) {
        isMatch = true;
      } else {
        const { data: pinOk, error: pinErr } = await supabase.rpc('verify_personal_pin', {
          user_uuid: user.id,
          input_pin: cleanInput
        });
        if (!pinErr && pinOk === true) {
          isMatch = true;
        } else if (user.role === 'student') {
          const dayOfBirthVal = Array.isArray(user.activation_days) ? user.activation_days[0]?.day_of_birth : user.activation_days?.day_of_birth;
          const studentBirthDay = dayOfBirthVal || user.day_of_birth;
          if (studentBirthDay && parseInt(cleanInput) === parseInt(String(studentBirthDay))) {
            isMatch = true;
          }
        }
      }

      if (isMatch) {
        // Login success!
        sessionStorage.setItem('groovelab_user_id', user.id);
        sessionStorage.setItem('groovelab_location_mode', 'home');
        
        // Update cached active platform to student's allowed modules
        const nextPlat = user.role === 'student' 
          ? (user.is_campus_active ? 'campus' : 'groovelab') 
          : 'campus';
        localStorage.setItem('groovelab_active_platform', nextPlat);

        // Update local cache
        const registry = JSON.parse(localStorage.getItem('groovelab_local_profiles') || '[]');
        const idx = registry.findIndex((p: any) => p.id === user.id);
        if (idx !== -1) {
          registry[idx] = {
            ...registry[idx],
            first_name: user.first_name,
            last_name: user.last_name,
            photo_url: user.photo_url
          };
          localStorage.setItem('groovelab_local_profiles', JSON.stringify(registry));
        }

        onLoginSuccess(user.id);
      } else {
        const newAttempts = attempts + 1;
        setAttempts(newAttempts);
        setPinInput('');
        
        if (user.role === 'student' && newAttempts >= 3) {
          // Freeze student profile on multiple failures
          await supabase
            .from('users')
            .update({ is_pin_activated: false })
            .eq('id', user.id);

          setError('Profil gesperrt. Bitte wende dich an deine Musikschule.');
          setSelectedProfile(null);
        } else {
          setError(`Falsche PIN. (${newAttempts}/${user.role === 'student' ? '3' : '5'} Versuche)`);
        }
      }
    } catch (err: any) {
      console.error('[ProfileSelector] Auth error:', err);
      setError(err.message || 'Verbindung zum Server fehlgeschlagen.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const limit = selectedProfile?.role === 'student' ? 2 : 4;
    if (selectedProfile && pinInput.length === limit) {
      handleVerify();
    }
  }, [pinInput, selectedProfile]);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#09090b', color: '#ffffff', fontFamily: 'system-ui, sans-serif', padding: '24px', boxSizing: 'border-box' }}>
      
      {!selectedProfile ? (
        /* ============ PROFILE SELECTOR VIEW ============ */
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '40px', maxWidth: '800px', width: '100%', animation: 'fadeIn 0.4s ease' }}>
          
          <div style={{ textAlign: 'center' }}>
            <h1 style={{ fontSize: '2.25rem', fontWeight: 900, letterSpacing: '-0.03em', marginBottom: '8px' }}>Wer lernt heute?</h1>
            <p style={{ color: '#71717a', fontSize: '0.9rem', fontWeight: 500 }}>Wähle dein Profil aus, um fortzufahren</p>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '24px', justifyContent: 'center', width: '100%' }}>
            {profiles.map((profile) => (
              <div 
                key={profile.id}
                onClick={() => handleProfileSelect(profile)}
                style={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  alignItems: 'center', 
                  gap: '12px', 
                  cursor: 'pointer',
                  width: '120px'
                }}
                className="group"
              >
                <div style={{ 
                  width: '110px', 
                  height: '110px', 
                  borderRadius: '28px', 
                  overflow: 'hidden', 
                  border: '3px solid transparent', 
                  boxShadow: '0 10px 25px rgba(0,0,0,0.3)',
                  transition: 'all 0.2s ease',
                  background: '#18181b',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
                onMouseOver={e => {
                  e.currentTarget.style.borderColor = profile.role === 'student' ? '#eab308' : '#ea4335';
                  e.currentTarget.style.transform = 'scale(1.05)';
                }}
                onMouseOut={e => {
                  e.currentTarget.style.borderColor = 'transparent';
                  e.currentTarget.style.transform = 'scale(1)';
                }}
                >
                  <img 
                    src={profile.photo_url || '/avatar_ghost.jpg'} 
                    alt={profile.first_name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                </div>
                <span style={{ fontSize: '0.9rem', fontWeight: 800, color: '#a1a1aa', textAlign: 'center' }}>
                  {profile.first_name}
                </span>
              </div>
            ))}

            {/* Add Profile / Standard Login Button */}
            <div 
              onClick={onShowStandardLogin}
              style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center', 
                gap: '12px', 
                cursor: 'pointer',
                width: '120px'
              }}
            >
              <div 
                style={{ 
                  width: '110px', 
                  height: '110px', 
                  borderRadius: '28px', 
                  border: '2px dashed #3f3f46', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  color: '#71717a',
                  transition: 'all 0.2s ease'
                }}
                onMouseOver={e => {
                  e.currentTarget.style.borderColor = '#ffffff';
                  e.currentTarget.style.color = '#ffffff';
                  e.currentTarget.style.transform = 'scale(1.05)';
                }}
                onMouseOut={e => {
                  e.currentTarget.style.borderColor = '#3f3f46';
                  e.currentTarget.style.color = '#71717a';
                  e.currentTarget.style.transform = 'scale(1)';
                }}
              >
                <UserPlus size={36} />
              </div>
              <span style={{ fontSize: '0.9rem', fontWeight: 800, color: '#71717a' }}>Hinzufügen</span>
            </div>
          </div>

        </div>
      ) : (
        /* ============ PIN UNLOCK VIEWS ============ */
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '28px', maxWidth: '340px', width: '100%', animation: 'fadeIn 0.3s ease' }}>
          
          <button 
            onClick={() => setSelectedProfile(null)}
            style={{ 
              alignSelf: 'flex-start',
              background: 'none', 
              border: 'none', 
              color: '#a1a1aa', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '6px', 
              fontSize: '0.85rem', 
              fontWeight: 700, 
              cursor: 'pointer',
              padding: '0'
            }}
          >
            <ArrowLeft size={16} /> Zurück
          </button>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', textAlign: 'center' }}>
            <div style={{ width: '80px', height: '80px', borderRadius: '20px', overflow: 'hidden', border: `3px solid ${selectedProfile.role === 'student' ? '#eab308' : '#ea4335'}` }}>
              <img src={selectedProfile.photo_url || '/avatar_ghost.jpg'} alt={selectedProfile.first_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 900, margin: '0' }}>Hi {selectedProfile.first_name}!</h2>
            <p style={{ fontSize: '0.8rem', color: '#a1a1aa', lineHeight: 1.4, margin: '0 8px' }}>
              {selectedProfile.role === 'student' 
                ? 'Bitte gib deinen Geburtstag (nur den Tag, z.B. 05 oder 23) als PIN ein.' 
                : 'Bitte gib deine 4-stellige PIN ein.'}
            </p>
          </div>

          {/* Dots Indicator */}
          <div style={{ display: 'flex', gap: '12px', margin: '8px 0' }}>
            {Array.from({ length: selectedProfile.role === 'student' ? 2 : 4 }).map((_, idx) => (
              <div 
                key={idx}
                style={{ 
                  width: '18px', 
                  height: '18px', 
                  borderRadius: '50%', 
                  background: pinInput.length > idx ? (selectedProfile.role === 'student' ? '#eab308' : '#ea4335') : '#27272a',
                  border: '2px solid #3f3f46',
                  transition: 'all 0.15s ease'
                }}
              />
            ))}
          </div>

          {error && (
            <p style={{ color: '#f87171', fontSize: '0.78rem', fontWeight: 700, margin: '0', textAlign: 'center' }}>{error}</p>
          )}

          {/* Custom Touch Pad Keyboard */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', width: '100%' }}>
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(num => (
              <button 
                key={num}
                onClick={() => handleKeyPress(num)}
                style={{ 
                  height: '56px', 
                  borderRadius: '16px', 
                  background: '#18181b', 
                  border: '1.5px solid #27272a', 
                  color: '#ffffff', 
                  fontSize: '1.25rem', 
                  fontWeight: 900, 
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  outline: 'none'
                }}
                className="hover-scale active-scale"
              >
                {num}
              </button>
            ))}
            <button 
              onClick={handleClear}
              style={{ 
                height: '56px', 
                borderRadius: '16px', 
                background: '#18181b', 
                border: 'none', 
                color: '#71717a', 
                fontSize: '0.8rem', 
                fontWeight: 800, 
                cursor: 'pointer' 
              }}
            >
              C
            </button>
            <button 
              onClick={() => handleKeyPress('0')}
              style={{ 
                height: '56px', 
                borderRadius: '16px', 
                background: '#18181b', 
                border: '1.5px solid #27272a', 
                color: '#ffffff', 
                fontSize: '1.25rem', 
                fontWeight: 900, 
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              className="hover-scale"
            >
              0
            </button>
            <button 
              onClick={handleBackspace}
              style={{ 
                height: '56px', 
                borderRadius: '16px', 
                background: '#18181b', 
                border: 'none', 
                color: '#71717a', 
                fontSize: '0.85rem', 
                fontWeight: 800, 
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              ⌫
            </button>
          </div>

        </div>
      )}

    </div>
  );
};
