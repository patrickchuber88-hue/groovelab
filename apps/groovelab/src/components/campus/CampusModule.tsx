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

interface CampusModuleProps {
  schoolId: string;
  schoolName: string;
  students: any[];
  coaches: any[];
  campusTeachers: any[];
  bypassTeachers: any[];
  pendingSchedules: any[];
  fetchDashboardData: () => void;
  setSelectedStudentForDetail: (student: any) => void;
  
  // Tab states and setters
  subTab: 'briefing' | 'onboarding' | 'students' | 'schedules' | 'status';
  setSubTab: (tab: any) => void;
}

export const CampusModule: React.FC<CampusModuleProps> = (props) => {
  const [searchQuery, setSearchQuery] = useState('');
  // Filter students: ONLY show active Campus students
  const campusStudentsOnly = props.students.filter((s: any) => {
    return s.is_campus_active;
  });

  const filteredStudents = campusStudentsOnly.filter((s: any) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    const firstName = (s.first_name || '').toLowerCase();
    const lastName = (s.last_name || '').toLowerCase();
    const nickname = (s.nickname || '').toLowerCase();
    return firstName.includes(q) || lastName.includes(q) || nickname.includes(q);
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ background: 'white', borderRadius: '24px', padding: '24px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.45rem', fontWeight: 900, color: '#34a853', fontFamily: 'Urbanist' }}>
            🎓 Campus Stundenplan &amp; Verwaltung
          </h2>
          <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: '#64748b', fontWeight: 550 }}>
            Akademische Raumbelegung, Onboarding, Stundenpläne und campus aktive Schülerkartei.
          </p>
        </div>
        
        {/* Module Sub-Navigation tabs */}
        <div style={{ display: 'flex', gap: '8px', background: '#f8fafc', padding: '4px', borderRadius: '14px', border: '1px solid #e2e8f0' }}>
          {([
            { id: 'briefing', label: 'Briefing' },
            { id: 'onboarding', label: 'CSV Onboarding' },
            { id: 'students', label: 'Schülerliste' },
            { id: 'schedules', label: 'Wochenpläne' }
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
                  background: active ? '#34a853' : 'transparent',
                  color: active ? 'white' : '#64748b',
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
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800 }}>⚡ Campus Dashboard</h3>
            <p style={{ fontSize: '0.82rem', color: '#64748b' }}>
              Aktuell sind {campusStudentsOnly.length} Schüler auf dem Campus registriert. {props.pendingSchedules.length} Wochenpläne warten auf Freigabe.
            </p>
          </div>
        )}

        {props.subTab === 'onboarding' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800 }}>📂 Sammel-Onboarding via CSV</h3>
            <p style={{ fontSize: '0.82rem', color: '#64748b' }}>
              Importieren Sie Schüler und weisen Sie diese direkt Lehrkräften zu.
            </p>
          </div>
        )}

        {props.subTab === 'students' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800 }}>👥 Schülerliste (Campus Aktiv: {campusStudentsOnly.length})</h3>
              
              {/* Search bar */}
              <input 
                type="text" 
                placeholder="Schüler suchen..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
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
              {filteredStudents.map((student: any) => (
                <div 
                  key={student.id} 
                  onClick={() => props.setSelectedStudentForDetail(student)}
                  style={{ background: 'white', padding: '20px', borderRadius: '16px', border: '1px solid #e2e8f0', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px' }}
                >
                  <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#e6f4ea', color: '#34a853', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900 }}>
                    {student.first_name?.[0]}
                  </div>
                  <div>
                    <strong style={{ fontSize: '0.92rem', display: 'block' }}>{student.first_name} {student.last_name}</strong>
                    <span style={{ fontSize: '0.78rem', color: '#64748b' }}>🎸 {student.instrument || 'Gitarre'}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {props.subTab === 'schedules' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800 }}>📅 Wochenpläne &amp; Unterrichtsräume</h3>
            <p style={{ fontSize: '0.82rem', color: '#64748b' }}>
              Konfigurieren Sie hier die wöchentlichen Unterrichtsstunden und Raumzuweisungen für Lehrkräfte.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
