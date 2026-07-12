import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { 
  ShieldAlert, CheckCircle, Users, Settings, Bell, 
  UserCheck, RefreshCw, Key, ChevronRight, ChevronDown, UserX, LogOut,
  Copy, Check, Link as LinkIcon, Monitor, Sliders,
  Coffee, Sparkles, Clock, ClipboardList, Upload, Plus,
  Trash2, Shield, Calendar, BookOpen, Music, CheckSquare, XSquare,
  LayoutDashboard, Award, UserPlus, GraduationCap, ZoomIn, ZoomOut, ChevronLeft, X, AlertCircle, MoreVertical,
  School, User, DoorOpen, Tag, Wrench, BarChart2, Edit3
} from 'lucide-react';

interface GrooveLabModuleProps {
  schoolId: string;
  students: any[];
  coaches: any[];
  activeSessions: any[];
  liveSearchQuery: string;
  setLiveSearchQuery: (query: string) => void;
  fetchDashboardData: () => void;
  setSelectedStudentForDetail: (student: any) => void;
  
  // Tab states and setters
  subTab: 'briefing' | 'live' | 'students' | 'coaches' | 'kiosk' | 'status';
  setSubTab: (tab: any) => void;
}

export const GrooveLabModule: React.FC<GrooveLabModuleProps> = (props) => {
  // Filter students: ONLY show active GrooveLab students
  const groovelabStudentsOnly = props.students.filter((s: any) => {
    return s.is_groovelab_active === true;
  });

  const filteredStudents = groovelabStudentsOnly.filter((s: any) => {
    const q = props.liveSearchQuery.trim().toLowerCase();
    if (!q) return true;
    const name = `${s.first_name || ''} ${s.last_name || ''}`.toLowerCase();
    const nick = (s.nickname || '').toLowerCase();
    return name.includes(q) || nick.includes(q);
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ background: 'white', borderRadius: '24px', padding: '24px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.45rem', fontWeight: 900, color: '#fbc02d', fontFamily: 'Urbanist' }}>
            🎸 GrooveLab Gamified Band &amp; Practice
          </h2>
          <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: '#64748b', fontWeight: 550 }}>
            Echtzeit Session-Monitoring, Band-Proben, Gamification XP und GrooveLab aktive Schüler.
          </p>
        </div>
        
        {/* Module Sub-Navigation tabs */}
        <div style={{ display: 'flex', gap: '8px', background: '#f8fafc', padding: '4px', borderRadius: '14px', border: '1px solid #e2e8f0' }}>
          {([
            { id: 'briefing', label: 'Briefing' },
            { id: 'live', label: 'Live Lab' },
            { id: 'students', label: 'Schülerliste' },
            { id: 'coaches', label: 'Coaches' }
          ] as const).map((t) => {
            const active = props.subTab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => props.setSubTab(t.id)}
                style={{
                  padding: '8px 16px',
                  borderRadius: '10px',
                  border: 'none',
                  background: active ? '#fbbc05' : 'transparent',
                  color: active ? '#1e293b' : '#64748b',
                  fontSize: '0.78rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* RENDER THE SELECTED SUBTAB */}
      <div style={{ background: '#f8fafc', borderRadius: '24px', padding: '24px', border: '1.5px solid #f1f5f9' }}>
        {props.subTab === 'briefing' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800 }}>⚡ GrooveLab Dashboard</h3>
            <p style={{ fontSize: '0.82rem', color: '#64748b' }}>
              Gamifizierte Musikakademie. Aktuell haben <strong>{groovelabStudentsOnly.length} Schüler</strong> Zugang zum GrooveLab-Modul.
            </p>
          </div>
        )}

        {props.subTab === 'live' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800 }}>🟢 Live Lab Session Monitor</h3>
            <p style={{ fontSize: '0.82rem', color: '#64748b' }}>
              {props.activeSessions.length} Schüler sind aktuell live an den Übeplätzen angemeldet.
            </p>
          </div>
        )}

        {props.subTab === 'students' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800 }}>👥 GrooveLab Schüler ({groovelabStudentsOnly.length})</h3>
              
              {/* Search bar */}
              <input 
                type="text" 
                placeholder="Schüler suchen..." 
                value={props.liveSearchQuery}
                onChange={(e) => props.setLiveSearchQuery(e.target.value)}
                style={{
                  padding: '8px 14px',
                  borderRadius: '10px',
                  border: '1.5px solid #cbd5e1',
                  outline: 'none',
                  fontSize: '0.82rem',
                  width: '240px'
                }}
              />
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
              {filteredStudents.map((student: any) => {
                const isOnline = props.activeSessions.some(sess => sess.user_id === student.id);
                return (
                  <div 
                    key={student.id} 
                    onClick={() => props.setSelectedStudentForDetail(student)}
                    style={{ background: 'white', padding: '20px', borderRadius: '16px', border: '1px solid #e2e8f0', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px' }}
                  >
                    <div style={{ position: 'relative' }}>
                      <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#fffbeb', color: '#b45309', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900 }}>
                        {student.first_name?.[0]}
                      </div>
                      <div style={{ position: 'absolute', bottom: -2, right: -2, width: '10px', height: '10px', borderRadius: '50%', background: isOnline ? '#34a853' : '#cbd5e1', border: '2px solid white' }} />
                    </div>
                    <div>
                      <strong style={{ fontSize: '0.92rem', display: 'block' }}>{student.first_name} {student.last_name}</strong>
                      <span style={{ fontSize: '0.78rem', color: '#64748b' }}>🎸 {student.instrument || 'Gitarre'}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {props.subTab === 'coaches' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800 }}>👥 GrooveLab Coaches &amp; Lehrer</h3>
            <p style={{ fontSize: '0.82rem', color: '#64748b' }}>
              Lehrkräfte mit aktiver Berechtigung zur Band-Betreuung.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
