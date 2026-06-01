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
import QRCode from 'react-qr-code';

interface VerwaltungModuleProps {
  schoolId: string;
  schoolName: string;
  logoUrl: string;
  setLogoUrl: (url: string) => void;
  setSchoolName: (name: string) => void;
  students: any[];
  coaches: any[];
  campusTeachers: any[];
  bypassTeachers: any[];
  pendingSchedules: any[];
  limitsEnabled: boolean;
  setLimitsEnabled: (enabled: boolean) => void;
  userQuota: number;
  setUserQuota: (quota: number) => void;
  activeUserQuota: number;
  setActiveUserQuota: (quota: number) => void;
  pendingUserQuota: any;
  setPendingUserQuota: (quota: any) => void;
  activeSessions: any[];
  tickets: any[];
  schoolEquipment: any[];
  setSchoolEquipment: (eq: any[]) => void;
  equipmentFormName: string;
  setEquipmentFormName: (name: string) => void;
  editingEquipment: any;
  setEditingEquipment: (eq: any) => void;
  equipmentSaving: boolean;
  setEquipmentSaving: (saving: boolean) => void;
  fetchDashboardData: () => void;
  setManageTeacher: (teacher: any) => void;
  handleDeleteUser: (id: string) => void;
  handleResetTeacherPin: (id: string) => void;
  handleToggleLimitsEnabled: (enabled: boolean) => void;
  handleSaveEquipment: () => void;
  handleDeleteEquipment: (id: string) => void;
  openEquipmentEditor: (eq: any) => void;
  
  // Tab states and setters
  subTab: 'briefing' | 'employees' | 'linking' | 'licenses' | 'setup' | 'rooms' | 'equipment';
  setSubTab: (tab: any) => void;
}

export const VerwaltungModule: React.FC<VerwaltungModuleProps> = (props) => {
  // Local sub-states for room and equipment handling
  const [roomName, setRoomName] = useState('');
  const [editingRoom, setEditingRoom] = useState<any>(null);
  
  const isBadSaeckingen = props.schoolName.toLowerCase().includes('bad säckingen') || 
                          props.schoolName.toLowerCase().includes('bad saeckingen') || 
                          props.schoolName.toLowerCase().includes('bad sackingen') || 
                          props.schoolName.toLowerCase().includes('musäk');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ background: 'white', borderRadius: '24px', padding: '24px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.45rem', fontWeight: 900, color: '#ea4335', fontFamily: 'Urbanist' }}>
            🏫 Musikschul-Verwaltung &amp; Cockpit
          </h2>
          <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: '#64748b', fontWeight: 550 }}>
            Zentrale Administration, Lehrerkartei, Schul branding, Räume, Limits &amp; Sicherheits-Bypässe.
          </p>
        </div>
        
        {/* Module Sub-Navigation tabs */}
        <div style={{ display: 'flex', gap: '8px', background: '#f8fafc', padding: '4px', borderRadius: '14px', border: '1px solid #e2e8f0' }}>
          {([
            { id: 'briefing', label: 'Briefing' },
            { id: 'employees', label: 'Lehrerkartei' },
            { id: 'linking', label: 'Daten-Link' },
            { id: 'licenses', label: 'Quotas' },
            { id: 'setup', label: 'Identity & Limits' }
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
                  background: active ? '#ea4335' : 'transparent',
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
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800 }}>⚡ Administratives Briefing</h3>
            <p style={{ fontSize: '0.82rem', color: '#64748b' }}>
              Auslastung stabil. Aktuell {props.students.filter(s => s.is_active).length} Lizenzen aktiv erfasst.
            </p>
            {/* Standard KPI summary widgets */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' }}>
              <div style={{ background: 'white', padding: '20px', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase' }}>Aktive Nutzer</span>
                <strong style={{ display: 'block', fontSize: '1.8rem', color: '#0f172a', marginTop: '4px' }}>
                  {props.students.filter(s => s.is_active).length + props.coaches.length}
                </strong>
              </div>
              <div style={{ background: 'white', padding: '20px', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase' }}>Lehrkräfte</span>
                <strong style={{ display: 'block', fontSize: '1.8rem', color: '#ea4335', marginTop: '4px' }}>
                  {props.coaches.length}
                </strong>
              </div>
              <div style={{ background: 'white', padding: '20px', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase' }}>Auslastungs-Limits</span>
                <strong style={{ display: 'block', fontSize: '1.8rem', color: props.limitsEnabled ? '#22c55e' : '#64748b', marginTop: '4px' }}>
                  {props.limitsEnabled ? 'AKTIV' : 'BYPASS'}
                </strong>
              </div>
            </div>
          </div>
        )}

        {props.subTab === 'employees' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800 }}>👤 Lehrkräfte-Kartei ({props.coaches.length})</h3>
              <button 
                onClick={() => props.setManageTeacher({
                  id: 'NEW-' + Math.random(),
                  firstName: '',
                  lastName: '',
                  email: '',
                  instrument: '',
                  ausweisNummer: 'GL-' + Math.floor(1000 + Math.random() * 9000),
                  isCampusActive: true,
                  isGroovelabActive: false,
                  isActive: true,
                  role: 'teacher',
                  requiredEquipment: [],
                  contractEndsAt: null
                })}
                style={{
                  background: '#ea4335',
                  color: 'white',
                  border: 'none',
                  padding: '8px 16px',
                  borderRadius: '10px',
                  fontWeight: 800,
                  fontSize: '0.8rem',
                  cursor: 'pointer'
                }}
              >
                + Neue Lehrkraft
              </button>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
              {props.coaches.map(t => (
                <div 
                  key={t.id} 
                  onClick={() => props.setManageTeacher(t)}
                  style={{ background: 'white', padding: '20px', borderRadius: '16px', border: '1px solid #e2e8f0', cursor: 'pointer', transition: 'all 0.2s' }}
                >
                  <strong style={{ fontSize: '0.95rem', display: 'block' }}>{t.firstName || t.first_name} {t.lastName || t.last_name}</strong>
                  <span style={{ fontSize: '0.78rem', color: '#64748b', display: 'block', marginTop: '2px' }}>🎸 {t.instrument || 'Kein Hauptfach'}</span>
                  <div style={{ display: 'flex', gap: '6px', marginTop: '12px' }}>
                    {t.isCampusActive && <span style={{ background: '#e6f4ea', color: '#137333', fontSize: '0.62rem', fontWeight: 900, padding: '2px 8px', borderRadius: '20px' }}>CAMPUS</span>}
                    {t.isGroovelabActive && <span style={{ background: '#eff6ff', color: '#1d4ed8', fontSize: '0.62rem', fontWeight: 900, padding: '2px 8px', borderRadius: '20px' }}>GROOVELAB</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {props.subTab === 'linking' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800 }}>🔗 Datenabgleich &amp; Modul-Kopplung</h3>
            <p style={{ fontSize: '0.82rem', color: '#64748b' }}>
              Synchronisieren Sie hier Datenbestände, gleichen Sie Profile ab oder verknüpfen Sie unvollständige Datensätze.
            </p>
          </div>
        )}

        {props.subTab === 'licenses' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800 }}>💳 Lizenz quotas &amp; Abrechnung</h3>
            <p style={{ fontSize: '0.82rem', color: '#64748b' }}>
              Ihr aktuelles Benutzerlimit beträgt <strong>{props.userQuota} Schüler</strong>.
            </p>
          </div>
        )}

        {props.subTab === 'setup' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800 }}>🎨 Branding, Identity &amp; Limits</h3>
            <p style={{ fontSize: '0.82rem', color: '#64748b' }}>
              Definieren Sie hier Ihre Corporate Identity, laden Sie Logos hoch oder verändern Sie Systemprüfungen.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
