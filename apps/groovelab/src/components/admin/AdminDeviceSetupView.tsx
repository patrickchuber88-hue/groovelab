import React, { useState, useEffect, useMemo, Suspense } from 'react';
import { supabase } from '../../lib/supabase';
import { HelpCenterModal } from '../help/HelpCenterModal';
import { FeedbackHubModal } from '../feedback/FeedbackHubModal';
import { logSecurityEvent } from '../../services/auditLogService';
import { downloadCsvFile } from '../../utils/csvHelper';
import { getStationColor } from '../../utils/adminColorHelpers';
import { maskLastName } from '../../utils/nameHelper';
import { 
  Tablet, Sliders, RefreshCw, Activity, Download, Check, Copy, X, 
  Lightbulb, Eye, EyeOff, Lock, Clock, ShieldCheck, Monitor, 
  AlertCircle, Sparkles, Unplug, BookOpen, AlertTriangle 
} from 'lucide-react';

export interface AdminDeviceSetupViewProps {
  rooms: any[];
  stations: any[];
  brandColor?: string;
  activeSessions: any[];
  students: any[];
  school: any;
  admin: any;
  kiosks: any[];
  onUpdate: () => void;
  onCleanupPlanning: () => void;
  onResetPlanning: () => void;
  activePlatform?: 'campus' | 'groovelab';
}

export function AdminDeviceSetupView({ 
  rooms, 
  stations, 
  brandColor = '#eab308', 
  activeSessions, 
  students, 
  school,
  admin,
  kiosks,
  onUpdate,
  onCleanupPlanning,
  onResetPlanning,
  activePlatform = 'groovelab'
}: AdminDeviceSetupViewProps) {
  const [activeGrooveSettingsModal, setActiveGrooveSettingsModal] = useState<'hours' | 'security' | 'devices' | 'analytics' | 'maintenance' | null>(null);
  const [selectedRoomId, setSelectedRoomId] = useState(() => rooms[0]?.id || '');
  const effectiveSchool = Array.isArray(school) ? school[0] : school;
  const isMobile = typeof window !== 'undefined' && (window.innerWidth <= 1024 || Boolean(typeof document !== 'undefined' && document.querySelector('.sim-viewport-mobile, .sim-viewport-portrait, .sim-viewport-tablet, .sim-viewport-landscape, .sim-viewport-iphone14, [class*="sim-viewport-mobile"], [class*="sim-viewport-tablet"]')));

  // Academy Setup state
  const [name, setName] = useState(effectiveSchool?.name || '');
  const [lat, setLat] = useState(effectiveSchool?.latitude?.toString() || '');
  const [lng, setLng] = useState(effectiveSchool?.longitude?.toString() || '');
  const [radius, setRadius] = useState(effectiveSchool?.geofence_radius_meters?.toString() || '100');
  const [hours, setHours] = useState<any>(effectiveSchool?.opening_hours || {
    monday: { start: '08:00', end: '20:00', active: true },
    tuesday: { start: '08:00', end: '20:00', active: true },
    wednesday: { start: '08:00', end: '20:00', active: true },
    thursday: { start: '08:00', end: '20:00', active: true },
    friday: { start: '08:00', end: '20:00', active: true },
    saturday: { start: '10:00', end: '16:00', active: false },
    sunday: { start: '10:00', end: '16:00', active: false }
  });
  const [initialConfig, setInitialConfig] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [copiedKioskLink, setCopiedKioskLink] = useState(false);
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);
  const [isHelpCenterOpen, setIsHelpCenterOpen] = useState(false);
  const [kioskPin, setKioskPin] = useState<string>(effectiveSchool?.groovelab_kiosk_pin || '1234');
  const [showKioskPin, setShowKioskPin] = useState(false);
  const [isSavingKioskPin, setIsSavingKioskPin] = useState(false);
  const [kioskPinSavedFeedback, setKioskPinSavedFeedback] = useState(false);

  useEffect(() => {
    if (effectiveSchool?.id) {
      const fetchPin = async () => {
        try {
          const { data, error } = await supabase.rpc('get_groovelab_kiosk_pin', { p_school_id: effectiveSchool.id });
          if (!error && data) {
            setKioskPin(data);
          } else if (effectiveSchool?.groovelab_kiosk_pin) {
            setKioskPin(effectiveSchool.groovelab_kiosk_pin);
          }
        } catch {
          if (effectiveSchool?.groovelab_kiosk_pin) {
            setKioskPin(effectiveSchool.groovelab_kiosk_pin);
          }
        }
      };
      fetchPin();
    }
  }, [effectiveSchool?.id]);

  const handleSaveKioskPin = async (customPin?: string) => {
    const pinToSave = (customPin !== undefined ? customPin : kioskPin).trim();
    if (!/^[0-9]{4}$/.test(pinToSave)) {
      alert('Der Terminal-PIN muss genau 4 Ziffern (0000-9999) enthalten.');
      return;
    }
    if (!effectiveSchool?.id) {
      alert('Fehler: Keine Schul-ID gefunden.');
      return;
    }
    setIsSavingKioskPin(true);
    try {
      const { error: rpcErr } = await supabase.rpc('set_groovelab_kiosk_pin', {
        p_school_id: effectiveSchool.id,
        p_pin: pinToSave
      });
      if (rpcErr) {
        const { error: updateErr } = await supabase
          .from('schools')
          .update({ groovelab_kiosk_pin: pinToSave })
          .eq('id', effectiveSchool.id);
        if (updateErr) throw updateErr;
      }
      setKioskPin(pinToSave);
      setKioskPinSavedFeedback(true);
      setTimeout(() => setKioskPinSavedFeedback(false), 2500);
      if (onUpdate) onUpdate();
    } catch (err: any) {
      alert('Fehler beim Speichern des Terminal-PINs: ' + (err.message || err));
    } finally {
      setIsSavingKioskPin(false);
    }
  };

  const handleGenerateRandomPin = () => {
    const newPin = Math.floor(1000 + Math.random() * 9000).toString();
    setKioskPin(newPin);
  };

  useEffect(() => {
    if (rooms.length > 0 && !selectedRoomId) {
      setSelectedRoomId(rooms[0].id);
    }
  }, [rooms, selectedRoomId]);

  useEffect(() => {
    if (effectiveSchool) {
      setName(effectiveSchool.name || '');
      const sLat = effectiveSchool.latitude?.toString() || '';
      const sLng = effectiveSchool.longitude?.toString() || '';
      const sRadius = effectiveSchool.geofence_radius_meters?.toString() || '100';
      const sHours = effectiveSchool.opening_hours || {
        monday: { start: '08:00', end: '20:00', active: true },
        tuesday: { start: '08:00', end: '20:00', active: true },
        wednesday: { start: '08:00', end: '20:00', active: true },
        thursday: { start: '08:00', end: '20:00', active: true },
        friday: { start: '08:00', end: '20:00', active: true },
        saturday: { start: '10:00', end: '16:00', active: false },
        sunday: { start: '10:00', end: '16:00', active: false }
      };

      setLat(sLat);
      setLng(sLng);
      setRadius(sRadius);
      setHours(sHours);
      setInitialConfig({
        hours: JSON.parse(JSON.stringify(sHours)),
        lat: sLat,
        lng: sLng,
        radius: sRadius
      });
    }
  }, [effectiveSchool]);

  const isSettingsDirty = useMemo(() => {
    if (!initialConfig) return false;
    return (
      JSON.stringify(hours) !== JSON.stringify(initialConfig.hours) ||
      lat !== initialConfig.lat ||
      lng !== initialConfig.lng ||
      radius !== initialConfig.radius
    );
  }, [initialConfig, hours, lat, lng, radius]);

  const days = [
    { id: 'monday', label: 'Montag' },
    { id: 'tuesday', label: 'Dienstag' },
    { id: 'wednesday', label: 'Mittwoch' },
    { id: 'thursday', label: 'Donnerstag' },
    { id: 'friday', label: 'Freitag' },
    { id: 'saturday', label: 'Samstag' },
    { id: 'sunday', label: 'Sonntag' }
  ];

  const handleSaveAcademy = async () => {
    if (!effectiveSchool?.id) {
      alert('Fehler: Keine Schul-ID gefunden.');
      return;
    }
    setIsSaving(true);
    const { error } = await supabase
      .from('schools')
      .update({ 
        name, 
        opening_hours: hours,
        latitude: lat ? Number(lat) : null,
        longitude: lng ? Number(lng) : null,
        geofence_radius_meters: radius ? Number(radius) : 100
      })
      .eq('id', effectiveSchool.id);
    
    setIsSaving(false);
    if (error) {
      alert('Fehler: ' + error.message);
    } else {
      setInitialConfig({
        hours: JSON.parse(JSON.stringify(hours)),
        lat,
        lng,
        radius
      });
      alert('GrooveLab-Einstellungen erfolgreich gespeichert! 🌟');
      onUpdate();
    }
  };

  const handleExportAllPresenceCSV = async () => {
    const schoolId = effectiveSchool?.id || admin?.school_id;
    if (!schoolId) {
      alert('Fehler: Keine Schul-ID gefunden.');
      return;
    }

    try {
      const { data: sessData, error } = await supabase
        .from('sessions')
        .select('*, users!inner(first_name, last_name, role, school_id), stations(name)')
        .eq('users.school_id', schoolId)
        .order('check_in_time', { ascending: false });

      if (error) {
        alert('Fehler beim Laden der Daten: ' + error.message);
        return;
      }

      if (!sessData || sessData.length === 0) {
        alert('Keine Anwesenheitsdaten zum Exportieren gefunden.');
        return;
      }

      const getCW = (date: Date) => {
        const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
        const dayNum = d.getUTCDay() || 7;
        d.setUTCDate(d.getUTCDate() + 4 - dayNum);
        const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
        const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
        return `KW ${weekNo} (${d.getUTCFullYear()})`;
      };

      const headers = ['Name', 'Rolle', 'Kalenderwoche', 'Datum', 'Station', 'Check-In', 'Check-Out', 'Dauer (Minuten)'];
      const rows = sessData.map((s: any) => {
        const u = s.users;
        const nameStr = `${u?.first_name || ''} ${u?.last_name || ''}`.trim();
        const roleStr = u?.role === 'student' ? 'Schüler' : u?.role === 'teacher' ? 'Lehrer' : u?.role || 'Unbekannt';
        const checkIn = new Date(s.check_in_time);
        const kw = getCW(checkIn);
        const datum = checkIn.toLocaleDateString('de-DE');
        const station = s.stations?.name || 'Unbekannt';
        const checkInTime = checkIn.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
        const checkOutTime = s.check_out_time ? new Date(s.check_out_time).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }) : 'Aktiv';
        
        let durationMins = '';
        if (s.check_out_time) {
          const diffMs = new Date(s.check_out_time).getTime() - checkIn.getTime();
          durationMins = String(Math.max(0, Math.floor(diffMs / 60000)));
        } else {
          durationMins = 'Aktiv';
        }

        return [nameStr, roleStr, kw, datum, station, checkInTime, checkOutTime, durationMins];
      });

      const fileName = `Anwesenheiten_Gesamt_${new Date().toISOString().slice(0, 10)}.csv`;
      downloadCsvFile(fileName, headers, rows, ';');

      logSecurityEvent({
        action: 'EXPORT_PRESENCE_CSV',
        schoolId,
        metadata: { rowCount: rows.length, fileName }
      });
    } catch (err: any) {
      alert('Export-Fehler: ' + err.message);
    }
  };

  const roomStations = stations.filter(s => s.room_id === selectedRoomId);
  const activeRoom = rooms.find(r => r.id === selectedRoomId) || rooms[0];
  const activeKiosk = activeRoom ? (kiosks || []).find(k => k.room_id === activeRoom.id && !k.station_id) : null;

  const getStationByNumber = (num: number) => {
    return roomStations.find(s => {
      const name = s.name || '';
      const lower = name.toLowerCase();
      return lower === `ipad ${num}` || lower === `ipad${num}`;
    });
  };

  const lehrerStation = roomStations.find(s => {
    const name = s.name || '';
    const lower = name.toLowerCase();
    return lower.includes('lehrer') || lower.includes('teacher');
  });

  const renderStationCell = (station: any, defaultName: string, isLarge = false) => {
    if (!station) {
      return (
        <div style={{
          background: '#f8fafc',
          border: '2px dashed #cbd5e1',
          borderRadius: '24px',
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100px',
          color: '#94a3b8',
          fontSize: '0.75rem',
          fontWeight: 800,
          boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)'
        }}>
          <div style={{ opacity: 0.6, marginBottom: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Tablet size={24} strokeWidth={2} aria-hidden="true" />
          </div>
          {defaultName} (nicht aktiv)
        </div>
      );
    }

    const activeSession = activeSessions.find(s => s.station_id === station.id);
    const isCurrentDevice = typeof window !== 'undefined' && localStorage.getItem('groovelab_station_id') === station.id;

    return (
      <div 
        onClick={async () => {
          if (isCurrentDevice) return;
          if (window.confirm(`Möchtest du dieses iPad fest für "${station.name}" konfigurieren?`)) {
            localStorage.setItem('groovelab_station_id', station.id);
            window.location.reload();
          }
        }}
        style={{
          background: isCurrentDevice 
            ? 'linear-gradient(135deg, #ffffff 0%, #fffbeb 100%)' 
            : 'white',
          border: isCurrentDevice 
            ? `3px solid ${brandColor}` 
            : '2px solid #f1f5f9',
          borderRadius: '24px',
          padding: '16px',
          minHeight: '110px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          cursor: isCurrentDevice ? 'default' : 'pointer',
          position: 'relative',
          boxShadow: isCurrentDevice ? `0 12px 24px -6px ${brandColor}30` : '0 4px 12px rgba(0,0,0,0.02)',
          transition: 'all 0.2s',
          outline: 'none'
        }}
        className={isCurrentDevice ? '' : 'hover-scale-mini'}
      >
        {isCurrentDevice && (
          <div style={{
            position: 'absolute',
            top: '-12px',
            right: '16px',
            background: `linear-gradient(135deg, ${brandColor} 0%, #f59e0b 100%)`,
            color: 'white',
            fontSize: '0.6rem',
            fontWeight: 1000,
            padding: '3px 12px',
            borderRadius: '20px',
            boxShadow: `0 4px 8px ${brandColor}40`,
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            whiteSpace: 'nowrap',
            letterSpacing: '0.05em'
          }}>
            <Sparkles size={11} strokeWidth={2.5} aria-hidden="true" />
            <span>DIESES IPAD</span>
            <Sparkles size={11} strokeWidth={2.5} aria-hidden="true" />
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{
               width: '32px',
               height: '32px',
               borderRadius: '10px',
               background: isCurrentDevice ? `${brandColor}15` : `${getStationColor(station.name, station.color)}15`,
               color: isCurrentDevice ? brandColor : getStationColor(station.name, station.color),
               display: 'flex',
               alignItems: 'center',
               justifyContent: 'center',
               fontSize: '1rem',
               transition: 'all 0.2s'
            }}>
              <Tablet size={16} />
            </div>
            <span style={{ fontWeight: 900, fontSize: '0.9rem', color: '#1e293b' }}>
              {station.name}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{
              fontSize: '0.65rem',
              fontWeight: 800,
              color: activeSession ? '#34a853' : '#64748b',
              background: activeSession ? '#e6f4ea' : '#f1f5f9',
              padding: '2px 8px',
              borderRadius: '12px'
            }}>
              {activeSession ? 'Besetzt' : 'Frei'}
            </span>
          </div>
        </div>

        <div style={{ 
          margin: '10px 0', 
          flex: 1, 
          display: 'flex', 
          flexDirection: 'column', 
          justifyContent: 'center', 
          background: activeSession ? '#f8fafc' : 'transparent',
          borderRadius: '16px',
          padding: activeSession ? '8px 12px' : '0 12px',
          border: activeSession ? '1px solid #f1f5f9' : 'none'
        }}>
          {activeSession ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                backgroundImage: `url(${activeSession.profiles?.photo_url || '/avatar_ghost.jpg'})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundColor: '#cbd5e1',
                border: '2px solid white',
                boxShadow: '0 2px 6px rgba(0,0,0,0.06)'
              }} />
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#334155', lineHeight: 1.2 }}>
                  {activeSession.profiles?.first_name} {maskLastName(activeSession.profiles?.last_name)}
                </div>
                <div style={{ fontSize: '0.65rem', color: '#94a3b8', fontWeight: 600 }}>
                  am Üben...
                </div>
              </div>
            </div>
          ) : (
            <span style={{ fontSize: '0.75rem', color: '#cbd5e1', fontWeight: 700, fontStyle: 'italic' }}>
              Zum Koppeln tippen
            </span>
          )}
        </div>

        <div style={{ width: '100%' }}>
          {isCurrentDevice ? (
            <button
              onClick={async (e) => {
                e.stopPropagation();
                if (window.confirm("Dieses iPad wirklich entkoppeln und in den Mobil-Modus versetzen?")) {
                  localStorage.removeItem('groovelab_station_id');
                  window.location.reload();
                }
              }}
              style={{
                width: '100%',
                padding: '8px',
                borderRadius: '12px',
                border: 'none',
                background: '#fee2e2',
                color: '#ef4444',
                fontSize: '0.75rem',
                fontWeight: 900,
                cursor: 'pointer',
                transition: 'all 0.15s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px'
              }}
            >
              <Unplug size={13} strokeWidth={2.4} aria-hidden="true" />
              <span>Kopplung aufheben</span>
            </button>
          ) : (
            <div style={{
              width: '100%',
              padding: '8px',
              borderRadius: '12px',
              background: '#f8fafc',
              border: '1.5px solid #e2e8f0',
              color: '#64748b',
              fontSize: '0.75rem',
              fontWeight: 800,
              textAlign: 'center',
              transition: 'all 0.15s'
            }}>
              Koppeln
            </div>
          )}
        </div>
      </div>
    );
  };

  const modules = [
    {
      id: 'hours',
      title: 'Betriebszeiten & Studio-Zeiten',
      subtitle: hours.enforce_hours !== false ? 'Strikte Öffnungszeiten aktiv' : 'Flexible Öffnungszeiten',
      badge: hours.enforce_hours !== false ? 'Strikte Zeiten' : 'Flexibel',
      gradient: 'linear-gradient(135deg, #eab308 0%, #ca8a04 100%)',
      shadowColor: 'rgba(234, 179, 8, 0.35)',
      icon: Clock
    },
    {
      id: 'security',
      title: 'Kiosk- & Terminal-Sicherheit',
      subtitle: 'Physische Hardware-Kopplung & PIN-Schutz',
      badge: 'Aktiv',
      gradient: 'linear-gradient(135deg, #facc15 0%, #d97706 100%)',
      shadowColor: 'rgba(250, 204, 21, 0.40)',
      icon: ShieldCheck
    },
    {
      id: 'devices',
      title: 'Kiosk-Geräte & Stations-Setup',
      subtitle: `${rooms.length} ${rooms.length === 1 ? 'Raum' : 'Räume'} • ${stations.length} Stationen`,
      badge: `${stations.length} iPads konfiguriert`,
      gradient: 'linear-gradient(135deg, #ca8a04 0%, #854d0e 100%)',
      shadowColor: 'rgba(202, 138, 4, 0.40)',
      icon: Monitor
    },
    {
      id: 'analytics',
      title: 'Anwesenheit & Protokolle',
      subtitle: 'Check-Ins & Probenhistorie (CSV)',
      badge: 'Export',
      gradient: 'linear-gradient(135deg, #eab308 0%, #a16207 100%)',
      shadowColor: 'rgba(234, 179, 8, 0.35)',
      icon: Activity
    },
    {
      id: 'maintenance',
      title: 'Systemwartung & Bereinigung',
      subtitle: 'Wochenplan bereinigen & Reset',
      badge: 'Wartung',
      gradient: 'linear-gradient(135deg, #eab308 0%, #854d0e 100%)',
      shadowColor: 'rgba(234, 179, 8, 0.35)',
      icon: AlertCircle
    },
    {
      id: 'feedback',
      title: 'Ideenschmiede',
      subtitle: 'Song-Wünsche & Feedback melden',
      badge: 'Mitgestalten',
      gradient: 'linear-gradient(135deg, #f59e0b 0%, #b45309 100%)',
      shadowColor: 'rgba(245, 158, 11, 0.35)',
      icon: Lightbulb
    }
  ];

  return (
    <div style={{ marginTop: '0px', display: 'flex', flexDirection: 'column', gap: '24px', width: '100%', boxSizing: 'border-box' }}>
      <div>
        <h2 style={{ fontSize: '1.8rem', fontWeight: 1000, color: '#0f172a', margin: 0, fontFamily: "'Plus Jakarta Sans', sans-serif", letterSpacing: '-0.02em', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '38px', height: '38px', borderRadius: '12px', background: '#fefce8', border: '1px solid #fef08a', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ca8a04' }}>
            <Sliders size={22} strokeWidth={2.4} />
          </div>
          <span>GrooveLab-Einstellungen</span>
        </h2>
        <p style={{ margin: '6px 0 0 0', fontSize: '0.9rem', color: '#64748b', fontWeight: 600, textAlign: 'left' }}>
          Konfiguriere Betriebszeiten, Geofencing &amp; Standort-Sicherheit, Kiosk-Proberäume und Systemwartung für dein Studio.
        </p>
      </div>

      {/* MODULAR COVER CARDS GRID */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(auto-fill, minmax(220px, 1fr))',
        gap: '18px',
        width: '100%'
      }}>
        {modules.map((module) => {
          const IconComp = module.icon;
          return (
            <div
              key={module.id}
              onClick={() => {
                if (module.id === 'feedback') {
                  setIsFeedbackModalOpen(true);
                } else {
                  setActiveGrooveSettingsModal(module.id as any);
                }
              }}
              style={{
                background: '#ffffff',
                border: '1.5px solid #e2e8f0',
                borderRadius: '20px',
                padding: '24px 16px 20px 16px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center',
                cursor: 'pointer',
                boxShadow: '0 2px 8px -2px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.02)',
                transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
                position: 'relative',
                overflow: 'hidden'
              }}
              className="hover-scale"
            >
              {/* Square Cover Icon Box */}
              <div style={{
                width: '64px',
                height: '64px',
                borderRadius: '16px',
                background: module.gradient,
                boxShadow: `0 8px 18px -3px ${module.shadowColor}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
                overflow: 'hidden',
                border: '1px solid rgba(255, 255, 255, 0.25)'
              }}>
                <IconComp size={30} color="#ffffff" strokeWidth={2.3} style={{ filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.25))' }} />
              </div>

              {/* Title & Subtitle */}
              <div style={{ marginTop: '14px', padding: '0 4px', width: '100%' }}>
                <div style={{ fontSize: '0.92rem', fontWeight: 850, color: '#0f172a', letterSpacing: '-0.02em', lineHeight: '1.2' }}>
                  {module.title}
                </div>
                <div style={{ fontSize: '0.72rem', fontWeight: 600, color: '#64748b', marginTop: '3px', lineHeight: '1.3', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {module.subtitle}
                </div>
              </div>

              {/* Status Badge */}
              {module.badge && (
                <span style={{
                  marginTop: '10px',
                  fontSize: '0.62rem',
                  fontWeight: 800,
                  color: '#ca8a04',
                  background: '#fefce8',
                  border: '1px solid #fef08a',
                  padding: '2px 8px',
                  borderRadius: '100px'
                }}>
                  {module.badge}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* PERSISTENT BOTTOM SAVE BAR (IF DIRTY) */}
      {isSettingsDirty && (
        <div style={{
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          alignItems: isMobile ? 'stretch' : 'center',
          justifyContent: 'space-between',
          gap: isMobile ? '10px' : '0',
          padding: isMobile ? '12px 16px' : '16px 32px',
          border: '1px solid #fef08a',
          background: '#fefce8',
          borderRadius: isMobile ? '16px' : '20px',
          boxSizing: 'border-box',
          width: '100%',
          boxShadow: '0 4px 16px rgba(234, 179, 8, 0.15)'
        }}>
          <span style={{ fontSize: '0.82rem', color: '#854d0e', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertTriangle size={16} strokeWidth={2.4} color="#854d0e" aria-hidden="true" style={{ flexShrink: 0 }} />
            <span>Ungespeicherte Änderungen an den GrooveLab-Einstellungen vorhanden.</span>
          </span>
          <button
            onClick={handleSaveAcademy}
            disabled={isSaving}
            style={{
              padding: '10px 24px',
              width: isMobile ? '100%' : 'auto',
              background: '#eab308',
              color: '#0f172a',
              border: 'none',
              borderRadius: '10px',
              fontWeight: 900,
              fontSize: '0.84rem',
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(234, 179, 8, 0.35)',
              transition: 'all 0.2s',
              opacity: isSaving ? 0.7 : 1
            }}
            className="hover-scale"
          >
            {isSaving ? 'Wird gespeichert...' : 'Einstellungen speichern'}
          </button>
        </div>
      )}

      {/* QUICK LINK: HANDBUCH & AKADEMIE */}
      <div style={{ 
        background: '#fefce8', 
        borderRadius: '20px', 
        padding: '18px 24px', 
        border: '1.5px solid #fef08a',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '38px', height: '38px', borderRadius: '12px', background: '#eab308', color: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <BookOpen size={20} />
          </div>
          <div>
            <h4 style={{ margin: 0, fontSize: '0.92rem', fontWeight: 900, color: '#713f12' }}>
              Leitfäden &amp; Akademie (Offizielles Handbuch)
            </h4>
            <p style={{ margin: '2px 0 0 0', fontSize: '0.75rem', color: '#854d0e' }}>
              Schritt-für-Schritt-Anleitungen für Schulleitung, Kollegium und Band-Coaches sowie FAQ.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setIsHelpCenterOpen(true)}
          style={{
            background: '#eab308',
            color: '#0f172a',
            border: 'none',
            padding: '9px 18px',
            borderRadius: '10px',
            fontWeight: 800,
            fontSize: '0.8rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: '0 4px 12px rgba(234, 179, 8, 0.25)',
            transition: 'all 0.15s'
          }}
          className="hover-scale"
        >
          <BookOpen size={14} /> Leitfäden öffnen
        </button>
      </div>

      {/* FOCUS MODALS FOR GROOVELAB SETTINGS */}
      {activeGrooveSettingsModal && (
        <div 
          role="dialog"
          aria-modal="true"
          aria-label="GrooveLab Einstellungen"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(15, 23, 42, 0.55)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            zIndex: 10000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            boxSizing: 'border-box'
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setActiveGrooveSettingsModal(null);
          }}
        >
          <div 
            style={{
              width: '100%',
              maxWidth: activeGrooveSettingsModal === 'devices' ? '920px' : activeGrooveSettingsModal === 'hours' ? '760px' : '620px',
              maxHeight: '90vh',
              background: '#ffffff',
              borderRadius: '24px',
              border: '1px solid rgba(255, 255, 255, 0.8)',
              boxShadow: '0 25px 60px -12px rgba(15, 23, 42, 0.35)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
            }}
            className="animate-scale-in"
          >
            {/* Modal Header */}
            <div style={{
              padding: '20px 24px',
              borderBottom: '1px solid #f1f5f9',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: '#f8fafc'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, #eab308 0%, #ca8a04 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 4px 12px rgba(234, 179, 8, 0.3)'
                }}>
                  {activeGrooveSettingsModal === 'hours' && <Clock size={22} color="#ffffff" />}
                  {activeGrooveSettingsModal === 'security' && <ShieldCheck size={22} color="#ffffff" />}
                  {activeGrooveSettingsModal === 'devices' && <Monitor size={22} color="#ffffff" />}
                  {activeGrooveSettingsModal === 'analytics' && <Activity size={22} color="#ffffff" />}
                  {activeGrooveSettingsModal === 'maintenance' && <AlertCircle size={22} color="#ffffff" />}
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 900, color: '#0f172a', fontFamily: 'Urbanist' }}>
                    {activeGrooveSettingsModal === 'hours' && 'Betriebszeiten & Studio-Zeiten'}
                    {activeGrooveSettingsModal === 'security' && 'Kiosk- & Terminal-Sicherheit'}
                    {activeGrooveSettingsModal === 'devices' && 'Kiosk-Geräte & Stations-Setup'}
                    {activeGrooveSettingsModal === 'analytics' && 'Anwesenheit & Check-In Protokolle'}
                    {activeGrooveSettingsModal === 'maintenance' && 'Systemwartung & Bereinigung'}
                  </h3>
                  <p style={{ margin: '2px 0 0 0', fontSize: '0.74rem', color: '#64748b', fontWeight: 500 }}>
                    {activeGrooveSettingsModal === 'hours' && 'Öffnungszeiten und Login-Regeln für das GrooveLab Studio.'}
                    {activeGrooveSettingsModal === 'security' && 'Physische Kiosk-Hardware-Kopplung und Terminal-Sicherheitsregeln konfigurieren.'}
                    {activeGrooveSettingsModal === 'devices' && 'Kiosk-iPads den GrooveLab-Stationen zuweisen und verwalten.'}
                    {activeGrooveSettingsModal === 'analytics' && 'Anwesenheits- und Probenprotokolle aller Band-Mitglieder herunterladen.'}
                    {activeGrooveSettingsModal === 'maintenance' && 'Scheduler-Datenleichen bereinigen und Semester-Resets vornehmen.'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setActiveGrooveSettingsModal(null)}
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  border: '1px solid #e2e8f0',
                  background: '#ffffff',
                  color: '#64748b',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.15s'
                }}
                className="hover-scale"
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '24px', overflowY: 'auto', maxHeight: 'calc(85vh - 140px)', textAlign: 'left' }}>
              
              {/* TAB 1: BETRIEBSZEITEN */}
              {activeGrooveSettingsModal === 'hours' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  {/* Mode Selector */}
                  <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '12px' }}>
                    <button 
                      type="button"
                      onClick={() => setHours({ ...hours, enforce_hours: true })}
                      style={{ 
                        padding: '14px',
                        borderRadius: '14px',
                        border: `2px solid ${hours.enforce_hours !== false ? '#eab308' : '#e2e8f0'}`,
                        background: hours.enforce_hours !== false ? '#fefce8' : '#ffffff',
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'all 0.15s'
                      }}
                      className="hover-scale"
                    >
                      <div style={{ fontWeight: 850, fontSize: '0.88rem', color: hours.enforce_hours !== false ? '#ca8a04' : '#1e293b', marginBottom: '3px' }}>Strikte Öffnungszeiten</div>
                      <div style={{ fontSize: '0.72rem', color: '#64748b', lineHeight: 1.35 }}>Login mit Geotracking NUR innerhalb der Öffnungszeiten erlaubt.</div>
                    </button>
                    <button 
                      type="button"
                      onClick={() => setHours({ ...hours, enforce_hours: false })}
                      style={{ 
                        padding: '14px',
                        borderRadius: '14px',
                        border: `2px solid ${hours.enforce_hours === false ? '#eab308' : '#e2e8f0'}`,
                        background: hours.enforce_hours === false ? '#fefce8' : '#ffffff',
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'all 0.15s'
                      }}
                      className="hover-scale"
                    >
                      <div style={{ fontWeight: 850, fontSize: '0.88rem', color: hours.enforce_hours === false ? '#ca8a04' : '#1e293b', marginBottom: '3px' }}>Flexible Öffnungszeiten</div>
                      <div style={{ fontSize: '0.72rem', color: '#64748b', lineHeight: 1.35 }}>Login mit Geotracking AUCH außerhalb der Zeiten erlaubt.</div>
                    </button>
                  </div>

                  {/* 7 Days Table */}
                  <div style={{ border: '1px solid #e2e8f0', borderRadius: '18px', overflow: 'hidden' }}>
                    <div style={{ padding: '12px 16px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', fontSize: '0.74rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>
                      Wochenübersicht (Mo – So)
                    </div>
                    {days.map((day, idx) => {
                      const isActive = hours[day.id]?.active !== false;
                      return (
                        <div
                          key={day.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '12px 16px',
                            background: idx % 2 === 0 ? '#ffffff' : '#f8fafc',
                            borderBottom: idx < days.length - 1 ? '1px solid #f1f5f9' : 'none',
                            opacity: isActive ? 1 : 0.6,
                            transition: 'opacity 0.2s',
                            gap: '12px'
                          }}
                        >
                          <div style={{ width: '110px', fontWeight: 800, color: '#1e293b', fontSize: '0.86rem', flexShrink: 0 }}>
                            {day.label}
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
                            <input
                              type="time"
                              value={hours[day.id]?.start || '08:00'}
                              disabled={!isActive}
                              onChange={e => setHours({...hours, [day.id]: {...(hours[day.id] || {}), active: isActive, start: e.target.value}})}
                              style={{
                                padding: '6px 10px',
                                borderRadius: '8px',
                                border: '1px solid #cbd5e1',
                                background: isActive ? '#ffffff' : '#f1f5f9',
                                fontWeight: 700,
                                fontSize: '0.84rem',
                                color: isActive ? '#1e293b' : '#94a3b8',
                                outline: 'none',
                                width: '90px'
                              }}
                            />
                            <span style={{ color: '#94a3b8', fontWeight: 600 }}>–</span>
                            <input
                              type="time"
                              value={hours[day.id]?.end || '20:00'}
                              disabled={!isActive}
                              onChange={e => setHours({...hours, [day.id]: {...(hours[day.id] || {}), active: isActive, end: e.target.value}})}
                              style={{
                                padding: '6px 10px',
                                borderRadius: '8px',
                                border: '1px solid #cbd5e1',
                                background: isActive ? '#ffffff' : '#f1f5f9',
                                fontWeight: 700,
                                fontSize: '0.84rem',
                                color: isActive ? '#1e293b' : '#94a3b8',
                                outline: 'none',
                                width: '90px'
                              }}
                            />
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                            <span style={{ fontSize: '0.68rem', fontWeight: 850, color: isActive ? '#15803d' : '#ef4444', minWidth: '38px', textAlign: 'right' }}>
                              {isActive ? 'OFFEN' : 'ZU'}
                            </span>
                            <button
                              type="button"
                              onClick={() => setHours({...hours, [day.id]: {...(hours[day.id] || {}), active: !isActive, start: hours[day.id]?.start || '08:00', end: hours[day.id]?.end || '20:00'}})}
                              className={`app-binary-switch ${isActive ? 'active' : ''}`}
                              style={{ backgroundColor: isActive ? '#eab308' : undefined, flexShrink: 0 }}
                            >
                              <div className="app-binary-switch-knob" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* TAB 2: KIOSK & TERMINAL SICHERHEIT */}
              {activeGrooveSettingsModal === 'security' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                  {/* Info Header Card */}
                  <div style={{ 
                    background: '#fefce8', 
                    border: '1px solid #fef08a', 
                    borderRadius: '16px', 
                    padding: '18px', 
                    display: 'flex', 
                    alignItems: 'flex-start', 
                    gap: '14px' 
                  }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#fef08a', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Tablet size={20} color="#854d0e" />
                    </div>
                    <div>
                      <h4 style={{ margin: '0 0 4px 0', fontSize: '0.9rem', fontWeight: 850, color: '#854d0e' }}>
                        Single Source of Hardware Truth
                      </h4>
                      <p style={{ margin: 0, fontSize: '0.75rem', color: '#a16207', lineHeight: 1.45 }}>
                        Im GrooveLab Studio sind Raum-iPads über ihren individuellen Kiosk-Setup QR-Code fest an eine Station (z. B. iPad 1, iPad 2) gekoppelt. Geolocating / GPS ist zu 100 % deaktiviert. Jeder Schüler-Login platziert den Schüler ohne Klicks direkt am richtigen Platz im Live Lab.
                      </p>
                    </div>
                  </div>

                  {/* Security Axioms Grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '12px' }}>
                    <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                        <Lock size={16} color="#ca8a04" />
                        <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#1e293b' }}>PIN-geschütztes Setup</span>
                      </div>
                      <p style={{ margin: 0, fontSize: '0.72rem', color: '#64748b', lineHeight: 1.4 }}>
                        Das Neuzuweisen oder Entkoppeln einer Kiosk-Station auf einem Raum-Tablet erfordert zwingend den 4-stelligen Kiosk-Einrichtungs-PIN der Musikschule.
                      </p>
                    </div>

                    <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                        <ShieldCheck size={16} color="#15803d" />
                        <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#1e293b' }}>Zero-Trust & DSGVO-Parität</span>
                      </div>
                      <p style={{ margin: 0, fontSize: '0.72rem', color: '#64748b', lineHeight: 1.4 }}>
                        Keine Erfassung von Standort- oder GPS-Koordinaten (§ 87 BetrVG / Art. 5 & 8 DSGVO). Schüler-Anwesenheit wird ausschließlich über die physische Station autorisiert.
                      </p>
                    </div>
                  </div>

                  {/* Quick Action Link to Devices */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '14px 18px' }}>
                    <div>
                      <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#0f172a', display: 'block' }}>Kiosk-Stationen & QR-Setup verwalten</span>
                      <span style={{ fontSize: '0.72rem', color: '#64748b' }}>Öffnet die Übersicht aller Kiosk-Kopplungs-Links und den Schul-PIN.</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveGrooveSettingsModal('devices')}
                      style={{
                        padding: '8px 14px',
                        borderRadius: '10px',
                        background: '#fefce8',
                        border: '1px solid #fef08a',
                        color: '#854d0e',
                        fontWeight: 850,
                        fontSize: '0.75rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                      className="hover-scale"
                    >
                      <Monitor size={14} /> Zu den Stationen
                    </button>
                  </div>
                </div>
              )}

              {/* TAB 3: KIOSK GERÄTE & STATIONS SETUP */}
              {activeGrooveSettingsModal === 'devices' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  {/* GrooveLab Terminal Setup PIN Card */}
                  <div style={{ 
                    background: '#fefce8', 
                    border: '1.5px solid #fef08a', 
                    borderRadius: '18px', 
                    padding: '20px', 
                    display: 'flex', 
                    flexDirection: 'column', 
                    gap: '14px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                      <div>
                        <h4 style={{ fontSize: '0.94rem', fontWeight: 900, color: '#854d0e', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <Lock size={18} color="#854d0e" /> GrooveLab Terminal-Einrichtungs-PIN (4 Ziffern)
                        </h4>
                        <p style={{ fontSize: '0.78rem', color: '#a16207', margin: '4px 0 0 0', fontWeight: 550, lineHeight: 1.4, maxWidth: '620px' }}>
                          Dieser 4-stellige PIN autorisiert neue Schüler-Terminals und iPads im Bandraum. Er schützt vor unbefugten Stations-Kopplungen durch Schüler von außerhalb. Bereits gekoppelte iPads bleiben bei einer PIN-Änderung unterbrechungsfrei aktiv.
                        </p>
                      </div>
                      {kioskPinSavedFeedback && (
                        <div style={{ background: '#dcfce7', border: '1px solid #86efac', color: '#166534', padding: '6px 12px', borderRadius: '10px', fontSize: '0.75rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Check size={14} /> PIN erfolgreich gespeichert!
                        </div>
                      )}
                    </div>

                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                        <input 
                          type={showKioskPin ? "text" : "password"}
                          maxLength={4}
                          aria-label="Vierstellige Kiosk-PIN"
                          value={kioskPin}
                          onChange={(e) => {
                            const val = e.target.value.replace(/\D/g, '').slice(0, 4);
                            setKioskPin(val);
                          }}
                          placeholder="1234"
                          style={{ 
                            width: '130px', 
                            padding: '10px 14px', 
                            borderRadius: '10px', 
                            border: '1.5px solid #fef08a', 
                            background: '#ffffff',
                            color: '#854d0e',
                            fontSize: '1.1rem',
                            fontWeight: 900,
                            letterSpacing: '0.3em',
                            textAlign: 'center',
                            fontFamily: 'monospace',
                            outline: 'none'
                          }} 
                        />
                        <button
                          type="button"
                          onClick={() => setShowKioskPin(!showKioskPin)}
                          aria-label={showKioskPin ? "PIN verbergen" : "PIN anzeigen"}
                          style={{
                            position: 'absolute',
                            right: '8px',
                            background: 'transparent',
                            border: 'none',
                            color: '#a16207',
                            cursor: 'pointer',
                            padding: '4px',
                            display: 'flex',
                            alignItems: 'center'
                          }}
                          title={showKioskPin ? "PIN verbergen" : "PIN anzeigen"}
                        >
                          {showKioskPin ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={handleGenerateRandomPin}
                        style={{
                          background: '#ffffff',
                          color: '#854d0e',
                          border: '1px solid #fef08a',
                          borderRadius: '10px',
                          padding: '10px 14px',
                          fontSize: '0.78rem',
                          fontWeight: 800,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          transition: 'all 0.15s'
                        }}
                        className="hover-scale"
                      >
                        <RefreshCw size={14} /> Neu auswürfeln
                      </button>

                      <button
                        type="button"
                        disabled={isSavingKioskPin || kioskPin.length !== 4}
                        onClick={() => handleSaveKioskPin()}
                        style={{
                          background: '#eab308',
                          color: '#0f172a',
                          border: 'none',
                          borderRadius: '10px',
                          padding: '10px 18px',
                          fontSize: '0.78rem',
                          fontWeight: 900,
                          cursor: isSavingKioskPin || kioskPin.length !== 4 ? 'not-allowed' : 'pointer',
                          opacity: isSavingKioskPin || kioskPin.length !== 4 ? 0.6 : 1,
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          boxShadow: '0 4px 10px rgba(234,179,8,0.2)',
                          transition: 'all 0.15s'
                        }}
                        className="hover-scale"
                      >
                        {isSavingKioskPin ? <RefreshCw size={14} className="animate-spin" /> : <Check size={14} />}
                        {isSavingKioskPin ? 'Speichern…' : 'PIN speichern'}
                      </button>
                    </div>
                  </div>

                  {/* GrooveLab Kiosk Device Onboarding Link section */}
                  {effectiveSchool?.groovelab_kiosk_token && (
                    <div style={{ 
                      background: '#fefce8', 
                      border: '1.5px solid #fef08a', 
                      borderRadius: '18px', 
                      padding: '18px', 
                      display: 'flex', 
                      flexDirection: 'column', 
                      gap: '10px'
                    }}>
                      <div>
                        <h4 style={{ fontSize: '0.92rem', fontWeight: 900, color: '#854d0e', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <Monitor size={18} /> GrooveLab Kiosk-Geräte Onboarding Link
                        </h4>
                        <p style={{ fontSize: '0.76rem', color: '#a16207', margin: '3px 0 0 0', fontWeight: 550, lineHeight: 1.4 }}>
                          Kopiere diesen Link und öffne ihn auf neuen Kiosk-iPads im Proberaum, um diese direkt als GrooveLab-Kiosk einzurichten.
                        </p>
                      </div>

                      <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                        <input 
                          type="text" 
                          readOnly 
                          value={`${window.location.origin}/device-onboarding/${effectiveSchool.groovelab_kiosk_token}`}
                          style={{ 
                            flex: 1, 
                            padding: '10px 14px', 
                            borderRadius: '10px', 
                            border: '1px solid #fef08a', 
                            background: '#ffffff',
                            color: '#854d0e',
                            fontSize: '0.78rem',
                            fontWeight: 700,
                            outline: 'none'
                          }} 
                        />
                        <button
                          onClick={() => {
                            const link = `${window.location.origin}/device-onboarding/${effectiveSchool.groovelab_kiosk_token}`;
                            navigator.clipboard.writeText(link);
                            setCopiedKioskLink(true);
                            setTimeout(() => setCopiedKioskLink(false), 2000);
                          }}
                          style={{
                            background: '#eab308',
                            color: '#0f172a',
                            border: 'none',
                            borderRadius: '10px',
                            padding: '10px 16px',
                            fontSize: '0.78rem',
                            fontWeight: 900,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            boxShadow: '0 4px 10px rgba(234,179,8,0.2)',
                            transition: 'all 0.15s'
                          }}
                          className="hover-scale"
                        >
                          {copiedKioskLink ? <Check size={14} /> : <Copy size={14} />}
                          {copiedKioskLink ? 'Kopiert!' : 'Kopieren'}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Room Selector Tab Bar */}
                  {rooms.length > 1 && (
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      {rooms.map(r => (
                        <button
                          key={r.id}
                          type="button"
                          onClick={() => setSelectedRoomId(r.id)}
                          style={{
                            padding: '8px 14px',
                            borderRadius: '10px',
                            border: 'none',
                            background: selectedRoomId === r.id ? '#eab308' : '#f1f5f9',
                            color: selectedRoomId === r.id ? '#0f172a' : '#64748b',
                            fontWeight: 800,
                            fontSize: '0.8rem',
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                          }}
                          className="hover-scale"
                        >
                          {r.name}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Seating Layout Grid */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(4, 1fr)',
                    gap: '12px',
                    background: '#f8fafc',
                    padding: '16px',
                    borderRadius: '20px',
                    border: '1px solid #e2e8f0',
                    width: '100%',
                    boxSizing: 'border-box'
                  }}>
                    {/* Row 1: iPads 3, 4, 5, 6 */}
                    {renderStationCell(getStationByNumber(3), 'iPad 3')}
                    {renderStationCell(getStationByNumber(4), 'iPad 4')}
                    {renderStationCell(getStationByNumber(5), 'iPad 5')}
                    {renderStationCell(getStationByNumber(6), 'iPad 6')}

                    {/* Row 2: iPad 2, Lehrer-iPad (spans 2 columns), iPad 7 */}
                    {renderStationCell(getStationByNumber(2), 'iPad 2')}
                    <div style={{ gridColumn: 'span 2' }}>
                      {renderStationCell(lehrerStation, 'Lehrer-iPad', true)}
                    </div>
                    {renderStationCell(getStationByNumber(7), 'iPad 7')}

                    {/* Mittelgang Divider */}
                    <div style={{
                      gridColumn: 'span 4',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '4px 0',
                      color: '#94a3b8',
                      fontSize: '0.7rem',
                      fontWeight: 800,
                      textTransform: 'uppercase',
                      letterSpacing: '0.25em',
                      borderTop: '1px dashed #e2e8f0',
                      borderBottom: '1px dashed #e2e8f0',
                      margin: '2px 0',
                      userSelect: 'none'
                    }}>
                      ↕ Mittelgang ↕
                    </div>

                    {/* Row 3: iPad 1, empty space (entrance), iPad 8 */}
                    {renderStationCell(getStationByNumber(1), 'iPad 1')}
                    <div style={{ gridColumn: 'span 2', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#cbd5e1', fontSize: '0.75rem', fontWeight: 600 }}>
                      Eingang
                    </div>
                    {renderStationCell(getStationByNumber(8), 'iPad 8')}
                  </div>
                </div>
              )}

              {/* TAB 4: ANWESENHEIT & PROTOKOLLE */}
              {activeGrooveSettingsModal === 'analytics' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                  <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '18px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <Activity size={22} color="#ca8a04" />
                      <div>
                        <strong style={{ fontSize: '0.92rem', color: '#0f172a', display: 'block' }}>Anwesenheitsdaten &amp; Check-In Export</strong>
                        <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                          Lade alle Anwesenheits- und Check-In-Protokolle von allen Coaches und Schülern dieser Musikschule als CSV-Datei herunter.
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleExportAllPresenceCSV}
                      style={{
                        width: 'fit-content',
                        background: '#eab308',
                        color: '#0f172a',
                        border: 'none',
                        padding: '12px 22px',
                        borderRadius: '12px',
                        fontWeight: 900,
                        fontSize: '0.84rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        boxShadow: '0 4px 12px rgba(234,179,8,0.25)',
                        marginTop: '6px'
                      }}
                      className="hover-scale"
                    >
                      <Download size={16} /> Alle Anwesenheiten exportieren (CSV)
                    </button>
                  </div>
                </div>
              )}

              {/* TAB 5: SYSTEMWARTUNG */}
              {activeGrooveSettingsModal === 'maintenance' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '16px', background: '#f8fafc', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                    <div style={{ fontWeight: 850, fontSize: '0.86rem', color: '#1e293b' }}>Wochenplan bereinigen</div>
                    <div style={{ fontSize: '0.74rem', color: '#64748b', lineHeight: 1.4 }}>Entfernt inaktive Daten und synchronisiert Rosteinträge, um Dateileichen aus der Scheduler-Tabelle zu entfernen.</div>
                    <button 
                      type="button"
                      onClick={onCleanupPlanning}
                      style={{ 
                        width: 'fit-content',
                        background: '#ffffff', 
                        border: '1.5px solid #fef08a', 
                        color: '#ca8a04', 
                        padding: '9px 16px', 
                        borderRadius: '10px', 
                        fontWeight: 800, 
                        fontSize: '0.8rem', 
                        cursor: 'pointer',
                        transition: 'all 0.15s'
                      }}
                      className="hover-scale"
                    >
                      Wochenplan bereinigen (Datenleichen entfernen)
                    </button>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '16px', background: '#f8fafc', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                    <div style={{ fontWeight: 850, fontSize: '0.86rem', color: '#1e293b' }}>Wochenplan komplett leeren</div>
                    <div style={{ fontSize: '0.74rem', color: '#64748b', lineHeight: 1.4 }}>Versetzt den Scheduler für alle Schüler in den Ausgangszustand und löscht alle eingetragenen Zeitslots. Dieser Schritt kann nicht rückgängig gemacht werden!</div>
                    <button 
                      type="button"
                      onClick={onResetPlanning}
                      style={{ 
                        width: 'fit-content',
                        background: '#ffffff', 
                        border: '1.5px solid #fecaca', 
                        color: '#ef4444', 
                        padding: '9px 16px', 
                        borderRadius: '10px', 
                        fontWeight: 800, 
                        fontSize: '0.8rem', 
                        cursor: 'pointer',
                        transition: 'all 0.15s'
                      }}
                      className="hover-scale"
                    >
                      Wochenplan komplett leeren
                    </button>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '16px', background: '#f8fafc', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                    <div style={{ fontWeight: 850, fontSize: '0.86rem', color: '#1e293b' }}>Übe-Statistiken zurücksetzen</div>
                    <div style={{ fontSize: '0.74rem', color: '#64748b', lineHeight: 1.4 }}>Setzt die aufgezeichneten Minuten und Übezeiten für alle Schülerprofile auf 0 zurück. Nützlich zum Beginn eines neuen Semesters.</div>
                    <button 
                      type="button"
                      onClick={async () => {
                        if (window.confirm("Möchtest du die Übe-Statistik (eingeloggte Minuten) wirklich für alle Schüler zurücksetzen?")) {
                          setIsSaving(true);
                          const updatedHours = {
                            ...hours,
                            [activePlatform === 'campus' ? 'campus_stats_reset_at' : 'groovelab_stats_reset_at']: new Date().toISOString()
                          };
                          const { error } = await supabase
                            .from('schools')
                            .update({ opening_hours: updatedHours })
                            .eq('id', school.id);
                          setIsSaving(false);
                          if (error) alert("Fehler: " + error.message);
                          else {
                            setHours(updatedHours);
                            alert("Statistiken erfolgreich zurückgesetzt!");
                            onUpdate();
                          }
                        }
                      }}
                      style={{ 
                        width: 'fit-content',
                        background: '#ffffff', 
                        border: '1.5px solid #fef08a', 
                        color: '#ca8a04', 
                        padding: '9px 16px', 
                        borderRadius: '10px', 
                        fontWeight: 800, 
                        fontSize: '0.8rem', 
                        cursor: 'pointer',
                        transition: 'all 0.15s'
                      }}
                      className="hover-scale"
                    >
                      Übe-Statistiken zurücksetzen
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div style={{
              padding: '16px 24px',
              borderTop: '1px solid #f1f5f9',
              background: '#f8fafc',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: '10px'
            }}>
              <button
                type="button"
                onClick={() => setActiveGrooveSettingsModal(null)}
                style={{
                  padding: '8px 18px',
                  borderRadius: '10px',
                  border: '1px solid #cbd5e1',
                  background: '#ffffff',
                  color: '#475569',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
                className="hover-scale"
              >
                Schließen
              </button>

              {(activeGrooveSettingsModal === 'hours' || activeGrooveSettingsModal === 'security') && (
                <button
                  type="button"
                  onClick={async () => {
                    await handleSaveAcademy();
                    setActiveGrooveSettingsModal(null);
                  }}
                  disabled={!isSettingsDirty || isSaving}
                  style={{
                    padding: '8px 20px',
                    borderRadius: '10px',
                    border: 'none',
                    background: isSettingsDirty ? '#eab308' : '#cbd5e1',
                    color: isSettingsDirty ? '#0f172a' : '#94a3b8',
                    fontSize: '0.82rem',
                    fontWeight: 900,
                    cursor: isSettingsDirty ? 'pointer' : 'default',
                    boxShadow: isSettingsDirty ? '0 4px 12px rgba(234,179,8,0.3)' : 'none'
                  }}
                  className={isSettingsDirty ? "hover-scale" : ""}
                >
                  {isSaving ? 'Speichern...' : 'Speichern'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Feedback & Ideenschmiede Modal */}
      {isFeedbackModalOpen && (
        <Suspense fallback={null}>
          <FeedbackHubModal
            isOpen={isFeedbackModalOpen}
            onClose={() => setIsFeedbackModalOpen(false)}
            userRole="admin"
            userId={admin?.id || admin?.userId || 'admin'}
            userName="Administrator"
            schoolId={effectiveSchool?.id || school?.id}
            schoolName={effectiveSchool?.name}
            activePlatform={activePlatform as any}
          />
        </Suspense>
      )}

      {/* Leitfäden & Akademie Modal */}
      {isHelpCenterOpen && (
        <Suspense fallback={null}>
          <HelpCenterModal
            isOpen={isHelpCenterOpen}
            onClose={() => setIsHelpCenterOpen(false)}
            userRole="admin"
            activePlatform={activePlatform as any}
            schoolName={effectiveSchool?.name || school?.name}
            initialBoardId="rooms"
            onOpenFeedbackHub={() => {
              setIsHelpCenterOpen(false);
              setIsFeedbackModalOpen(true);
            }}
          />
        </Suspense>
      )}
    </div>
  );
}

export const DeviceSetupScreen = AdminDeviceSetupView;
export default AdminDeviceSetupView;
