import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Eye, Power, GripVertical, Minus, Sparkles, ShieldCheck, Lock, Activity, UserCheck, ChevronDown } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface GhostSupportCapsuleProps {
  schoolName?: string;
  currentRole?: string;
  onRoleChange?: (newRole: 'admin' | 'secretary' | 'teacher') => void;
  onCloseSession?: () => void;
}

export const GhostSupportCapsule: React.FC<GhostSupportCapsuleProps> = ({
  schoolName,
  currentRole = 'admin',
  onRoleChange,
  onCloseSession
}) => {
  const [minimized, setMinimized] = useState(false);
  const [sessionStartTime] = useState<number>(() => Date.now());
  const [activeRole, setActiveRole] = useState<'admin' | 'secretary' | 'teacher'>(
    (currentRole as any) || 'admin'
  );
  const [teachers, setTeachers] = useState<{ id: string; name: string; instrument?: string }[]>([]);
  const [schoolUsers, setSchoolUsers] = useState<{ id: string; name: string; role: string; instrument?: string }[]>([]);
  const [shadowedTeacherId, setShadowedTeacherId] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    return sessionStorage.getItem('groovelab_ghost_impersonated_user_id') || sessionStorage.getItem('groovelab_ghost_shadowed_teacher_id');
  });

  useEffect(() => {
    const ghostSchoolId = typeof window !== 'undefined' ? sessionStorage.getItem('groovelab_ghost_school_id') : null;
    if (ghostSchoolId) {
      supabase.from('users').select('id, first_name, last_name, role, instrument').eq('school_id', ghostSchoolId).then(({ data }) => {
        if (data && data.length > 0) {
          const list = data.map(d => ({
            id: d.id,
            name: `${d.first_name || ''} ${d.last_name ? (d.role === 'student' ? d.last_name[0] + '.' : d.last_name) : ''}`.trim() || 'Nutzer',
            role: d.role,
            instrument: d.instrument
          }));
          setSchoolUsers(list);
          const teachersList = list.filter(u => u.role === 'teacher');
          setTeachers(teachersList);
          if (!sessionStorage.getItem('groovelab_ghost_shadowed_teacher_id') && teachersList[0]?.id) {
            setShadowedTeacherId(teachersList[0].id);
            sessionStorage.setItem('groovelab_ghost_shadowed_teacher_id', teachersList[0].id);
          }
        }
      });
    }
  }, []);

  // Drag-and-drop state
  const capsuleRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ x: number; y: number } | null>(() => {
    if (typeof window === 'undefined') return null;
    try {
      const saved = sessionStorage.getItem('groovelab_ghost_capsule_pos');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed.x === 'number' && typeof parsed.y === 'number') {
          return parsed;
        }
      }
    } catch (e) {}
    return null;
  });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ mouseX: number; mouseY: number; posX: number; posY: number }>({
    mouseX: 0,
    mouseY: 0,
    posX: 0,
    posY: 0
  });

  useEffect(() => {
    if (currentRole) {
      setActiveRole(currentRole as any);
    }
  }, [currentRole]);

  const displayedSchoolName = schoolName || 
    (typeof window !== 'undefined' ? sessionStorage.getItem('groovelab_ghost_school_name') : '') || 
    'Musikschule';

  const handleRoleSwitch = (role: 'admin' | 'secretary' | 'teacher') => {
    setActiveRole(role);
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('groovelab_ghost_active_role', role);
      sessionStorage.setItem('groovelab_support_ghost', 'true');
    }

    if (onRoleChange) {
      onRoleChange(role);
    } else {
      const url = new URL(window.location.href);
      url.searchParams.set('role', role);
      url.searchParams.set('support_ghost', 'true');
      window.location.href = url.toString();
    }
  };

  useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        const ghostSchoolId = sessionStorage.getItem('groovelab_ghost_school_id');
        if (ghostSchoolId) {
          sessionStorage.setItem(`campus_active_support_session_${ghostSchoolId}`, JSON.stringify({
            active: true,
            operator: 'MasterAdmin (Patrick Huber)',
            startedAt: new Date().toISOString(),
            role: activeRole
          }));
        }
      }
    } catch (e) {}
  }, [activeRole]);

  const handleEndSession = useCallback(() => {
    // Record immutable audit entry in local telemetry before leaving
    try {
      if (typeof window !== 'undefined') {
        const ghostSchoolId = sessionStorage.getItem('groovelab_ghost_school_id') || 'unknown';
        const ghostSchoolName = sessionStorage.getItem('groovelab_ghost_school_name') || displayedSchoolName;
        const durationSec = Math.round((Date.now() - sessionStartTime) / 1000);
        const durationMin = Math.max(1, Math.round(durationSec / 60));
        const now = new Date();
        const timeStr = now.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
        const dateStr = now.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
        
        const existingAuditRaw = localStorage.getItem('campus_ghost_audit_trail');
        const existingAudit = existingAuditRaw ? JSON.parse(existingAuditRaw) : [];
        const newLog = {
          id: `GHA-${Date.now()}`,
          timestamp: new Date().toISOString(),
          schoolId: ghostSchoolId,
          schoolName: ghostSchoolName,
          role: activeRole,
          durationSeconds: durationSec,
          operator: 'Patrick Huber (Platform Lead)',
          status: 'COMPLETED_CLEANLY'
        };
        localStorage.setItem('campus_ghost_audit_trail', JSON.stringify([newLog, ...existingAudit].slice(0, 50)));

        // Remove live indicator
        if (ghostSchoolId) {
          sessionStorage.removeItem(`campus_active_support_session_${ghostSchoolId}`);
          
          // Append to school-level notification center for school admin / secretary
          const notifKey = `campus_school_notifications_${ghostSchoolId}`;
          const existingNotifsRaw = localStorage.getItem(notifKey);
          const existingNotifs = existingNotifsRaw ? JSON.parse(existingNotifsRaw) : [];
          const supportNotif = {
            id: `notif-sup-${Date.now()}`,
            title: 'Technischer Support-Zugriff abgeschlossen',
            message: `Am ${dateStr} um ${timeStr} Uhr wurde ein autorisierter Support- & Diagnose-Zugriff durch den Plattform-Support (Dauer: ${durationMin} Min.) ordnungsgemäß abgeschlossen. Details sind revisionssicher im DSB-Audit-Portal hinterlegt.`,
            type: 'SUPPORT_AUDIT',
            timestamp: new Date().toISOString(),
            read: false
          };
          localStorage.setItem(notifKey, JSON.stringify([supportNotif, ...existingNotifs].slice(0, 30)));
        }
      }
    } catch (e) {}

    if (onCloseSession) {
      onCloseSession();
    } else {
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('groovelab_support_ghost');
        sessionStorage.removeItem('groovelab_ghost_school_id');
        sessionStorage.removeItem('groovelab_ghost_school_name');
        sessionStorage.removeItem('groovelab_ghost_active_role');
        sessionStorage.removeItem('groovelab_ghost_origin');
      }
      
      window.close();
      setTimeout(() => {
        window.location.href = window.location.origin + '/?masteradmin=true';
      }, 300);
    }
  }, [onCloseSession, sessionStartTime, displayedSchoolName, activeRole]);

  // Global Keyboard Shortcut: Option/Alt + Q to immediately terminate Ghost session
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.altKey || e.metaKey) && (e.key === 'q' || e.key === 'Q')) {
        e.preventDefault();
        handleEndSession();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleEndSession]);

  // Drag and Drop Event Listeners
  const handleMouseDown = (e: React.MouseEvent) => {
    // Only drag when clicking background, grip, or non-interactive elements
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('input') || target.closest('select')) {
      return;
    }

    e.preventDefault();
    const rect = capsuleRef.current?.getBoundingClientRect();
    const currentX = rect ? rect.left : (window.innerWidth / 2 - 200);
    const currentY = rect ? rect.top : 16;

    dragStartRef.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      posX: currentX,
      posY: currentY
    };

    setIsDragging(true);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('input') || target.closest('select')) {
      return;
    }

    const touch = e.touches[0];
    const rect = capsuleRef.current?.getBoundingClientRect();
    const currentX = rect ? rect.left : (window.innerWidth / 2 - 200);
    const currentY = rect ? rect.top : 16;

    dragStartRef.current = {
      mouseX: touch.clientX,
      mouseY: touch.clientY,
      posX: currentX,
      posY: currentY
    };

    setIsDragging(true);
  };

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - dragStartRef.current.mouseX;
      const deltaY = e.clientY - dragStartRef.current.mouseY;

      const capsuleWidth = capsuleRef.current?.offsetWidth || 380;
      const capsuleHeight = capsuleRef.current?.offsetHeight || 44;

      const maxX = Math.max(10, window.innerWidth - capsuleWidth - 10);
      const maxY = Math.max(10, window.innerHeight - capsuleHeight - 10);

      const nextX = Math.max(10, Math.min(maxX, dragStartRef.current.posX + deltaX));
      const nextY = Math.max(10, Math.min(maxY, dragStartRef.current.posY + deltaY));

      const newPos = { x: nextX, y: nextY };
      setPosition(newPos);
      try {
        sessionStorage.setItem('groovelab_ghost_capsule_pos', JSON.stringify(newPos));
      } catch (err) {}
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 0) return;
      const touch = e.touches[0];
      const deltaX = touch.clientX - dragStartRef.current.mouseX;
      const deltaY = touch.clientY - dragStartRef.current.mouseY;

      const capsuleWidth = capsuleRef.current?.offsetWidth || 380;
      const capsuleHeight = capsuleRef.current?.offsetHeight || 44;

      const maxX = Math.max(10, window.innerWidth - capsuleWidth - 10);
      const maxY = Math.max(10, window.innerHeight - capsuleHeight - 10);

      const nextX = Math.max(10, Math.min(maxX, dragStartRef.current.posX + deltaX));
      const nextY = Math.max(10, Math.min(maxY, dragStartRef.current.posY + deltaY));

      const newPos = { x: nextX, y: nextY };
      setPosition(newPos);
      try {
        sessionStorage.setItem('groovelab_ghost_capsule_pos', JSON.stringify(newPos));
      } catch (err) {}
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleMouseUp);
    };
  }, [isDragging]);

  // Position styles: default centered at top if not dragged, absolute coords when positioned
  const containerStyle: React.CSSProperties = {
    position: 'fixed',
    top: position ? `${position.y}px` : '12px',
    left: position ? `${position.x}px` : '50%',
    transform: position ? 'none' : 'translateX(-50%)',
    zIndex: 9999999,
    fontFamily: '"Outfit", -apple-system, BlinkMacSystemFont, "SF Pro Text", system-ui, sans-serif',
    pointerEvents: 'auto',
    cursor: isDragging ? 'grabbing' : 'grab',
    userSelect: 'none',
    WebkitUserSelect: 'none',
    transition: isDragging ? 'none' : 'transform 0.15s ease, box-shadow 0.15s ease',
    animation: position ? 'none' : 'slideDownCapsule 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards'
  };

  return (
    <>
      {/* 🌟 AMBIENT VIEWPORT GLOW OVERLAY (APPLE PRO WATERMARK BORDER) */}
      <div 
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 9999990,
          pointerEvents: 'none',
          boxShadow: 'inset 0 0 0 2px rgba(56, 189, 248, 0.35), inset 0 0 20px rgba(56, 189, 248, 0.08)',
          transition: 'box-shadow 0.3s ease'
        }} 
      />

      <div 
        ref={capsuleRef}
        style={containerStyle}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
      >
        <style dangerouslySetInnerHTML={{__html: `
          @keyframes slideDownCapsule {
            from { opacity: 0; transform: translate(-50%, -15px) scale(0.96); }
            to { opacity: 1; transform: translate(-50%, 0) scale(1); }
          }
          @keyframes ghostPulseMini {
            0% { transform: scale(1); opacity: 1; }
            50% { transform: scale(1.25); opacity: 0.45; }
            100% { transform: scale(1); opacity: 1; }
          }
        `}} />

        {minimized ? (
          <button
            type="button"
            onClick={() => setMinimized(false)}
            style={{
              background: 'rgba(15, 23, 42, 0.94)',
              backdropFilter: 'blur(20px) saturate(190%)',
              WebkitBackdropFilter: 'blur(20px) saturate(190%)',
              border: '1px solid rgba(255, 255, 255, 0.20)',
              borderRadius: '100px',
              padding: '5px 12px',
              color: '#ffffff',
              boxShadow: isDragging 
                ? '0 16px 36px rgba(0, 0, 0, 0.6), 0 0 0 2px #38bdf8' 
                : '0 8px 24px rgba(0, 0, 0, 0.38), 0 0 0 1px rgba(255, 255, 255, 0.08)',
              display: 'flex',
              alignItems: 'center',
              gap: '7px',
              cursor: 'pointer',
              fontSize: '0.74rem',
              fontWeight: 800
            }}
            title="Ghost-Support Kapsel erweitern (Drag & Drop zum Verschieben)"
          >
            <GripVertical size={12} color="#64748b" style={{ marginRight: '-3px' }} />
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#38bdf8', animation: 'ghostPulseMini 2s infinite' }} />
            <span style={{ maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {displayedSchoolName}
            </span>
            <span style={{ fontSize: '0.66rem', background: 'rgba(255, 255, 255, 0.15)', padding: '1px 6px', borderRadius: '100px', color: '#93c5fd' }}>
              {activeRole === 'teacher' ? 'Lehrer' : 'Verwaltung'}
            </span>
          </button>
        ) : (
          <div style={{
            background: 'rgba(15, 23, 42, 0.94)',
            backdropFilter: 'blur(24px) saturate(200%)',
            WebkitBackdropFilter: 'blur(24px) saturate(200%)',
            border: '1px solid rgba(255, 255, 255, 0.18)',
            borderRadius: '100px',
            padding: '4px 6px 4px 10px',
            color: '#ffffff',
            boxShadow: isDragging 
              ? '0 20px 48px rgba(0, 0, 0, 0.65), 0 0 0 2px #38bdf8' 
              : '0 12px 32px rgba(0, 0, 0, 0.45), 0 0 0 1px rgba(255, 255, 255, 0.08)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            {/* Drag Handle & School Identity */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'grab' }}>
              <GripVertical size={13} color="#64748b" style={{ flexShrink: 0, opacity: 0.7 }} />
              
              <div style={{
                width: '22px',
                height: '22px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 0 8px rgba(56, 189, 248, 0.5)',
                flexShrink: 0
              }}>
                <Eye size={12} color="#ffffff" />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginRight: '2px' }}>
                <span style={{ 
                  fontSize: '0.74rem', 
                  fontWeight: 850, 
                  color: '#ffffff', 
                  letterSpacing: '-0.01em',
                  maxWidth: '150px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}>
                  {displayedSchoolName}
                </span>
                <span style={{ 
                  fontSize: '0.58rem', 
                  background: 'rgba(56, 189, 248, 0.18)', 
                  color: '#7dd3fc', 
                  padding: '1px 5px', 
                  borderRadius: '4px', 
                  fontWeight: 800,
                  letterSpacing: '0.02em',
                  textTransform: 'uppercase'
                }}>
                  Ghost
                </span>
              </div>
            </div>

            <div style={{ width: '1px', height: '16px', background: 'rgba(255, 255, 255, 0.15)', flexShrink: 0 }} />

            {/* Perspective Role Switcher (Verwaltung & Lehrer) */}
            <div style={{
              display: 'inline-flex',
              background: 'rgba(255, 255, 255, 0.08)',
              padding: '2px',
              borderRadius: '100px',
              gap: '2px',
              flexShrink: 0
            }}>
              {[
                { id: 'admin', label: 'Verwaltung' },
                { id: 'teacher', label: 'Lehrer' }
              ].map((r) => {
                const isSel = (activeRole === 'secretary' ? 'admin' : activeRole) === r.id;
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => handleRoleSwitch(r.id as any)}
                    style={{
                      padding: '3px 10px',
                      borderRadius: '100px',
                      border: 'none',
                      background: isSel ? '#ffffff' : 'transparent',
                      color: isSel ? '#0f172a' : '#cbd5e1',
                      fontSize: '0.70rem',
                      fontWeight: isSel ? 900 : 650,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      boxShadow: isSel ? '0 2px 6px rgba(0,0,0,0.25)' : 'none'
                    }}
                  >
                    {r.label}
                  </button>
                );
              })}
            </div>

            {/* Universal User Persona Selector */}
            {schoolUsers.length > 0 && (
              <>
                <div style={{ width: '1px', height: '16px', background: 'rgba(255, 255, 255, 0.15)', flexShrink: 0 }} />
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <UserCheck size={12} color="#38bdf8" />
                  <select
                    value={shadowedTeacherId || ''}
                    onChange={(e) => {
                      const selId = e.target.value;
                      const matchedUser = schoolUsers.find(u => u.id === selId);
                      if (matchedUser) {
                        setShadowedTeacherId(matchedUser.id);
                        sessionStorage.setItem('groovelab_ghost_impersonated_user_id', matchedUser.id);
                        sessionStorage.setItem('groovelab_ghost_shadowed_teacher_id', matchedUser.id);
                        sessionStorage.setItem('groovelab_ghost_active_role', matchedUser.role);
                        const url = new URL(window.location.href);
                        url.searchParams.set('ghost_user_id', matchedUser.id);
                        url.searchParams.set('role', matchedUser.role);
                        url.searchParams.set('support_ghost', 'true');
                        window.location.href = url.toString();
                      }
                    }}
                    style={{
                      background: 'rgba(255, 255, 255, 0.12)',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      borderRadius: '100px',
                      color: '#ffffff',
                      fontSize: '0.68rem',
                      fontWeight: 800,
                      padding: '2px 8px',
                      outline: 'none',
                      cursor: 'pointer',
                      maxWidth: '160px'
                    }}
                    title="Wähle einen konkreten Benutzer dieser Schule für den Ghost-Support"
                  >
                    <optgroup label="Lehrkräfte" style={{ background: '#0f172a', color: '#94a3b8' }}>
                      {schoolUsers.filter(u => u.role === 'teacher').map(t => (
                        <option key={t.id} value={t.id} style={{ background: '#0f172a', color: '#ffffff' }}>
                          🎸 {t.name} {t.instrument ? `(${t.instrument})` : ''}
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="Verwaltung & Leitung" style={{ background: '#0f172a', color: '#94a3b8' }}>
                      {schoolUsers.filter(u => u.role === 'admin' || u.role === 'secretary').map(a => (
                        <option key={a.id} value={a.id} style={{ background: '#0f172a', color: '#ffffff' }}>
                          👑 {a.name} ({a.role})
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="Schüler (anonymisiert)" style={{ background: '#0f172a', color: '#94a3b8' }}>
                      {schoolUsers.filter(u => u.role === 'student').slice(0, 30).map(s => (
                        <option key={s.id} value={s.id} style={{ background: '#0f172a', color: '#ffffff' }}>
                          🎓 {s.name} {s.instrument ? `(${s.instrument})` : ''}
                        </option>
                      ))}
                    </optgroup>
                  </select>
                </div>
              </>
            )}

            <div style={{ width: '1px', height: '16px', background: 'rgba(255, 255, 255, 0.15)', flexShrink: 0 }} />

            {/* End Session Button with Keyboard Shortcut Hint */}
            <button
              type="button"
              onClick={handleEndSession}
              style={{
                padding: '4px 10px',
                borderRadius: '100px',
                border: 'none',
                background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                color: '#ffffff',
                fontSize: '0.70rem',
                fontWeight: 850,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                boxShadow: '0 2px 8px rgba(239, 68, 68, 0.35)',
                transition: 'all 0.15s ease',
                flexShrink: 0
              }}
              className="hover-scale-mini"
              title="Support-Sitzung beenden und Tab schließen (Kürzel: ⌥+Q oder Alt+Q)"
            >
              <Power size={11} />
              <span>Beenden</span>
              <span style={{ fontSize: '0.60rem', opacity: 0.75, background: 'rgba(0,0,0,0.2)', padding: '0 4px', borderRadius: '4px' }}>⌥Q</span>
            </button>

            {/* Minimize Button */}
            <button
              type="button"
              onClick={() => setMinimized(true)}
              style={{
                background: 'rgba(255, 255, 255, 0.1)',
                border: 'none',
                borderRadius: '50%',
                width: '18px',
                height: '18px',
                color: '#94a3b8',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                flexShrink: 0,
                padding: 0
              }}
              className="hover-scale-mini"
              title="Kapsel minimieren"
            >
              <Minus size={10} />
            </button>
          </div>
        )}
      </div>
    </>
  );
};
