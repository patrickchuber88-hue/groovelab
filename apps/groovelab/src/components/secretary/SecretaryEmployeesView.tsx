import React from 'react';
import {
  Eye, EyeOff, FileText, GraduationCap, Plus, Search,
  ShieldAlert, Sliders, Trash2, UserCheck, Users
} from 'lucide-react';

export interface SecretaryEmployeesViewProps {
  employees: any[];
  setEmployees: React.Dispatch<React.SetStateAction<any[]>>;
  currentUserProfile: any;
  userId?: string;
  revealedPins: Record<string, boolean>;
  setRevealedPins: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  employeeFirstName: string;
  setEmployeeFirstName: React.Dispatch<React.SetStateAction<string>>;
  employeeLastName: string;
  setEmployeeLastName: React.Dispatch<React.SetStateAction<string>>;
  employeeSearchQuery: string;
  setEmployeeSearchQuery: React.Dispatch<React.SetStateAction<string>>;
  employeeStatusTab: any;
  setEmployeeStatusTab: any;
  employeeFilterRole: string;
  setEmployeeFilterRole: React.Dispatch<React.SetStateAction<string>>;
  isEmployeeCsvExpanded: boolean;
  setIsEmployeeCsvExpanded: React.Dispatch<React.SetStateAction<boolean>>;
  employeeCsvText: string;
  setEmployeeCsvText: React.Dispatch<React.SetStateAction<string>>;
  showAddEmployeeModal: boolean;
  setShowAddEmployeeModal: React.Dispatch<React.SetStateAction<boolean>>;
  dragHoveredEmployeeRole: string | null;
  setDragHoveredEmployeeRole: React.Dispatch<React.SetStateAction<string | null>>;
  employeeFilterRoleFocused: boolean;
  setEmployeeFilterRoleFocused: React.Dispatch<React.SetStateAction<boolean>>;
  employeeStatusTabFocused: boolean;
  setEmployeeStatusTabFocused: React.Dispatch<React.SetStateAction<boolean>>;
  employeeSearchFocused: boolean;
  setEmployeeSearchFocused: React.Dispatch<React.SetStateAction<boolean>>;
  getAlphabeticalColor: (name: string) => { avatarBg: string; avatarColor: string };
  handleCreateEmployee: (e: React.FormEvent) => Promise<void> | void;
  handleDeleteUser: (id: string) => Promise<void> | void;
  handleImportEmployees: () => Promise<void> | void;
  handleToggleRole: (emp: any, roleToToggle: 'admin' | 'secretary' | 'teacher') => Promise<void> | void;
  handleUpdateEmployeeRole: (employeeId: string, newRole: string) => Promise<void> | void;
}

export const SecretaryEmployeesView: React.FC<SecretaryEmployeesViewProps> = ({
  employees,
  setEmployees,
  currentUserProfile,
  userId,
  revealedPins,
  setRevealedPins,
  employeeFirstName,
  setEmployeeFirstName,
  employeeLastName,
  setEmployeeLastName,
  employeeSearchQuery,
  setEmployeeSearchQuery,
  employeeStatusTab,
  setEmployeeStatusTab,
  employeeFilterRole,
  setEmployeeFilterRole,
  isEmployeeCsvExpanded,
  setIsEmployeeCsvExpanded,
  employeeCsvText,
  setEmployeeCsvText,
  showAddEmployeeModal,
  setShowAddEmployeeModal,
  dragHoveredEmployeeRole,
  setDragHoveredEmployeeRole,
  employeeFilterRoleFocused,
  setEmployeeFilterRoleFocused,
  employeeStatusTabFocused,
  setEmployeeStatusTabFocused,
  employeeSearchFocused,
  setEmployeeSearchFocused,
  getAlphabeticalColor,
  handleCreateEmployee,
  handleDeleteUser,
  handleImportEmployees,
  handleToggleRole,
  handleUpdateEmployeeRole,
}) => {
          const filteredEmployees = employees.filter(emp => {
            const firstName = (emp.first_name || '').toLowerCase();
            const lastName = (emp.last_name || '').toLowerCase();
            const email = (emp.email || '').toLowerCase();
            const query = employeeSearchQuery.toLowerCase().trim();
            
            const matchesSearch = !query || firstName.includes(query) || lastName.includes(query) || email.includes(query);
            const matchesRole = employeeFilterRole === 'All' || 
              (emp.roles && emp.roles.includes(employeeFilterRole)) || 
              emp.role === employeeFilterRole;
            
            const isActive = emp.is_active ?? true;
            const matchesStatus = employeeStatusTab === 'all' ||
              (employeeStatusTab === 'active' && isActive) ||
              (employeeStatusTab === 'inactive' && !isActive);
              
            return matchesSearch && matchesRole && matchesStatus;
          });

          const adminCount = employees.filter(e => e.role === 'admin' || (e.roles && e.roles.includes('admin'))).length;
          const secretaryCount = employees.filter(e => e.role === 'secretary' || (e.roles && e.roles.includes('secretary'))).length;
          const teacherCount = employees.filter(e => e.role === 'teacher' || (e.roles && e.roles.includes('teacher'))).length;

          return (
            <div className="campus-grid">
              
              {/* Left Content Pane (Main Board Content) */}
              <div style={{ flex: '1', display: 'flex', flexDirection: 'column', gap: '24px', width: '100%', minWidth: 0 }}>
                
                {/* 1. EMPLOYEE BOARD HEADER CARD */}
                <div className="google-card" style={{
                  width: '100%',
                  display: 'flex', 
                  flexDirection: 'column', 
                  gap: '24px', 
                  padding: '24px',
                  borderRadius: '24px',
                  border: '1.5px solid #cbd5e1',
                  background: '#ffffff',
                  boxShadow: '0 10px 25px -5px rgba(0,0,0,0.01)',
                  minWidth: 0
                }}>
                  {/* TITLE BLOCK & ACTIONS */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <Users size={22} style={{ color: '#0f172a' }} />
                      <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900, color: '#0f172a', fontFamily: 'Urbanist' }}>
                        Mitarbeiterverwaltung ({employees.length})
                      </h3>
                    </div>
                    
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        type="button"
                        aria-label="Sammel-Onboarding CSV ein- oder ausklappen"
                        onClick={() => setIsEmployeeCsvExpanded(!isEmployeeCsvExpanded)}
                        style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: '6px', 
                          borderRadius: '12px', 
                          padding: '8px 16px', 
                          fontSize: '0.8rem', 
                          fontWeight: 800,
                          background: isEmployeeCsvExpanded ? '#fce8e6' : '#ffffff',
                          color: isEmployeeCsvExpanded ? '#ea4335' : '#475569',
                          border: isEmployeeCsvExpanded ? '1.5px solid #ea4335' : '1.5px solid #cbd5e1',
                          cursor: 'pointer',
                          fontFamily: 'Urbanist',
                          boxShadow: isEmployeeCsvExpanded ? '0 4px 10px rgba(234,67,53,0.15)' : 'none',
                          transition: 'all 0.2s'
                        }}
                      >
                        <FileText size={15} style={{ color: isEmployeeCsvExpanded ? '#ea4335' : '#475569' }} />
                        Sammel-Onboarding (CSV) {isEmployeeCsvExpanded ? '▲' : '▼'}
                      </button>

                      <button
                        type="button"
                        aria-label="Neuen Mitarbeiter anlegen"
                        onClick={() => setShowAddEmployeeModal(true)}
                        style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: '6px', 
                          borderRadius: '12px', 
                          padding: '8px 16px', 
                          fontSize: '0.8rem', 
                          fontWeight: 800,
                          background: '#ea4335',
                          color: '#ffffff',
                          border: 'none',
                          cursor: 'pointer',
                          fontFamily: 'Urbanist',
                          boxShadow: '0 4px 10px rgba(234,67,53,0.15)',
                          transition: 'all 0.2s'
                        }}
                      >
                        <Plus size={15} />
                        Mitarbeiter anlegen
                      </button>
                    </div>
                  </div>

                  {/* Collapsible CSV Box */}
                  {isEmployeeCsvExpanded && (
                    <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '16px', border: '1px dashed #cbd5e1', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                        <strong style={{ fontSize: '0.88rem', color: '#0f172a', fontWeight: 900, fontFamily: 'Urbanist' }}>
                          Sammel-Onboarding (Mitarbeiter)
                        </strong>
                        <span style={{ fontSize: '0.72rem', color: '#64748b', fontFamily: 'Inter' }}>
                          Format pro Zeile: <code>Vorname; Nachname; E-Mail; Spitzname (optional); Rolle (admin/secretary)</code>
                        </span>
                      </div>

                      {employeeFilterRole && employeeFilterRole !== 'All' && (() => {
                        const roleName = employeeFilterRole === 'admin' ? 'Admin' : (employeeFilterRole === 'teacher' ? 'Lehrer' : 'Verwaltung');
                        const { avatarBg: instAvatarBg, avatarColor: instAvatarColor } = getAlphabeticalColor(roleName);

                        return (
                          <div style={{
                            background: 'rgba(234, 67, 53, 0.03)',
                            border: '1.5px solid rgba(234, 67, 53, 0.12)',
                            borderRadius: '16px',
                            padding: '12px 16px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '16px',
                            marginTop: '2px',
                            marginBottom: '2px',
                            flexWrap: 'wrap',
                            transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', flex: 1 }}>
                              <span style={{ fontSize: '0.68rem', color: '#ea4335', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: 'Urbanist' }}>
                                ⚡ Smart Auto-Zuweisung:
                              </span>

                              <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                background: '#ffffff',
                                border: '1.5px solid #cbd5e1',
                                padding: '4px 10px 4px 6px',
                                borderRadius: '100px',
                                boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
                              }}>
                                <div style={{
                                  width: '24px',
                                  height: '24px',
                                  borderRadius: '50%',
                                  background: instAvatarBg,
                                  color: instAvatarColor,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontSize: '0.65rem',
                                  fontWeight: 900,
                                  fontFamily: 'Urbanist'
                                }}>
                                  {roleName[0]?.toUpperCase()}
                                </div>
                                <span style={{ fontSize: '0.74rem', fontWeight: 800, color: '#0f172a', fontFamily: 'Urbanist' }}>
                                  {roleName}
                                </span>
                                <span style={{ fontSize: '0.6rem', fontWeight: 900, background: '#f1f5f9', color: '#64748b', padding: '1px 6px', borderRadius: '6px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                  Rolle
                                </span>
                              </div>
                            </div>
                            
                            <span style={{ fontSize: '0.65rem', color: '#ea4335', fontWeight: 900, background: '#fce8e6', padding: '4px 10px', borderRadius: '8px', letterSpacing: '0.02em', textTransform: 'uppercase', fontFamily: 'Urbanist' }}>
                              Rolle wird automatisch verknüpft!
                            </span>
                          </div>
                        );
                      })()}

                      <textarea
                        value={employeeCsvText}
                        onChange={(e) => setEmployeeCsvText(e.target.value)}
                        placeholder={
                          employeeFilterRole && employeeFilterRole !== 'All'
                            ? "Markus; Weber; markus@schule.de; Webbi\nAnna; Becker; anna@schule.de"
                            : "Markus; Weber; markus@schule.de; Webbi; admin\nAnna; Becker; anna@schule.de; ; secretary"
                        }
                        style={{
                          width: '100%',
                          height: '100px',
                          borderRadius: '10px',
                          border: '1px solid #cbd5e1',
                          padding: '10px',
                          fontSize: '0.78rem',
                          fontFamily: 'monospace',
                          outline: 'none',
                          resize: 'vertical'
                        }}
                      />
                      <button
                        type="button"
                        aria-label="Mitarbeiter jetzt importieren"
                        onClick={handleImportEmployees}
                        className="google-btn-primary"
                        style={{ background: '#ea4335', color: '#ffffff', border: 'none', padding: '8px 16px', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 800, alignSelf: 'flex-start', cursor: 'pointer' }}
                      >
                        Mitarbeiter importieren
                      </button>
                    </div>
                  )}

                  {/* FILTERS ROW */}
                  <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
                    <div style={{ position: 'relative', flex: 1.5, minWidth: '240px' }}>
                      <input
                        type="text"
                        aria-label="Mitarbeiter nach Name oder E-Mail suchen"
                        value={employeeSearchQuery}
                        onChange={(e) => setEmployeeSearchQuery(e.target.value)}
                        onFocus={() => setEmployeeSearchFocused(true)}
                        onBlur={() => setEmployeeSearchFocused(false)}
                        placeholder="Mitarbeiter nach Name oder E-Mail suchen..."
                        style={{
                          width: '100%',
                          padding: '10px 16px 10px 38px',
                          borderRadius: '14px',
                          border: employeeSearchFocused ? '1.5px solid #ea4335' : '1.5px solid #cbd5e1',
                          fontSize: '0.85rem',
                          fontFamily: 'Urbanist',
                          fontWeight: 600,
                          outline: 'none',
                          background: '#ffffff',
                          transition: 'border-color 0.2s'
                        }}
                      />
                      <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', display: 'flex', alignItems: 'center' }}>
                        <Search size={15} style={{ color: '#94a3b8' }} />
                      </span>
                    </div>

                    <div style={{ position: 'relative' }}>
                      <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', display: 'flex', alignItems: 'center', pointerEvents: 'none' }}>
                        <Users size={15} style={{ color: '#94a3b8' }} />
                      </span>
                      <select
                        value={employeeFilterRole}
                        onChange={(e) => setEmployeeFilterRole(e.target.value)}
                        onFocus={() => setEmployeeFilterRoleFocused(true)}
                        onBlur={() => setEmployeeFilterRoleFocused(false)}
                        style={{
                          padding: '10px 16px 10px 38px',
                          borderRadius: '14px',
                          border: employeeFilterRoleFocused ? '1.5px solid #ea4335' : '1.5px solid #cbd5e1',
                          fontSize: '0.85rem',
                          fontFamily: 'Urbanist',
                          fontWeight: 600,
                          outline: 'none',
                          background: 'white',
                          cursor: 'pointer',
                          transition: 'border-color 0.2s'
                        }}
                      >
                        <option value="All">Alle Rollen</option>
                        <option value="admin">Administrator</option>
                        <option value="secretary">Verwaltung</option>
                      </select>
                    </div>

                    <div style={{ position: 'relative' }}>
                      <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', display: 'flex', alignItems: 'center', pointerEvents: 'none' }}>
                        <Sliders size={15} style={{ color: '#94a3b8' }} />
                      </span>
                      <select
                        value={employeeStatusTab}
                        onChange={(e) => setEmployeeStatusTab(e.target.value as any)}
                        onFocus={() => setEmployeeStatusTabFocused(true)}
                        onBlur={() => setEmployeeStatusTabFocused(false)}
                        style={{
                          padding: '10px 16px 10px 38px',
                          borderRadius: '14px',
                          border: employeeStatusTabFocused ? '1.5px solid #ea4335' : '1.5px solid #cbd5e1',
                          fontSize: '0.85rem',
                          fontFamily: 'Urbanist',
                          fontWeight: 600,
                          outline: 'none',
                          background: 'white',
                          cursor: 'pointer',
                          transition: 'border-color 0.2s'
                        }}
                      >
                        <option value="all">Alle</option>
                        <option value="active">Aktiv</option>
                        <option value="inactive">Inaktiv</option>
                      </select>
                    </div>
                  </div>

                  {/* DYNAMIC EMPLOYEE LIST */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', overflowX: 'auto', width: '100%' }}>
                    {filteredEmployees.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                        Keine Mitarbeiter gefunden. Lege ein neues Profil an oder passe deine Filter an.
                      </div>
                    ) : (
                      filteredEmployees.map((emp: any) => {
                        const empName = `${emp.first_name || ''} ${emp.last_name || ''}`.trim();
                        const { avatarBg, avatarColor } = getAlphabeticalColor(empName);
                        const roleLabel = emp.role === 'admin' ? 'Admin' : 'Verwaltung';
                        const isActive = emp.is_active ?? true;
                        const currentRoles = Array.isArray(emp.roles) ? emp.roles : [emp.role || ''];
                        const isAdminOrSecretary = currentRoles.includes('admin') || currentRoles.includes('secretary') || emp.role === 'admin' || emp.role === 'secretary';

                        return (
                          <div
                            key={emp.id}
                            draggable={true}
                            onDragStart={(e) => {
                              e.dataTransfer.setData("employeeId", emp.id);
                            }}
                            style={{
                              display: 'grid',
                              gridTemplateColumns: '240px 270px 80px 120px 120px',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '12px 20px',
                              borderRadius: '16px',
                              border: '1px solid #f1f5f9',
                              background: '#ffffff',
                              boxShadow: '0 1px 2px rgba(0, 0, 0, 0.01)',
                              transition: 'all 0.25s ease',
                              minWidth: '850px',
                              gap: '12px',
                              boxSizing: 'border-box'
                            }}
                            className="hover-scale"
                          >
                            {/* Avatar & Name Info */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', minWidth: 0 }}>
                              {isAdminOrSecretary ? (
                                <img
                                  src="/campus_login_hero.png"
                                  alt={empName}
                                  style={{
                                    width: '42px',
                                    height: '42px',
                                    borderRadius: '50%',
                                    objectFit: 'cover',
                                    flexShrink: 0
                                  }}
                                />
                              ) : (
                                <div style={{
                                  width: '42px',
                                  height: '42px',
                                  borderRadius: '50%',
                                  background: avatarBg,
                                  color: avatarColor,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontWeight: 800,
                                  fontSize: '0.88rem',
                                  fontFamily: 'Urbanist',
                                  flexShrink: 0
                                }}>
                                  {(emp.first_name?.[0] || 'M')}{(emp.last_name?.[0] || 'W')}
                                </div>
                              )}
                              <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                                <span style={{ fontSize: '0.92rem', fontWeight: 800, color: '#1d1d1f', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                  {empName}
                                </span>
                                <span style={{ fontSize: '0.74rem', color: emp.email ? '#86868b' : '#9ca3af', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                  {emp.email || 'Keine E-Mail hinterlegt'}
                                </span>
                              </div>
                            </div>

                            {/* Role Buttons (Admin, Verwaltung, Lehrer) */}
                            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                              {(() => {
                                const currentRoles = Array.isArray(emp.roles) && emp.roles.length > 0 ? emp.roles : [emp.role];
                                const hasAdmin = currentRoles.includes('admin') || emp.role === 'admin';
                                const hasSecretary = currentRoles.includes('secretary') || emp.role === 'secretary';
                                const hasTeacher = currentRoles.includes('teacher') || emp.role === 'teacher';

                                return (
                                  <>
                                    {/* Admin Button */}
                                    <button
                                      type="button"
                                      aria-label={`Admin-Rolle für ${emp.first_name} ${emp.last_name} ${hasAdmin ? 'entfernen' : 'hinzufügen'}`}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleToggleRole(emp, 'admin');
                                      }}
                                      style={{
                                        padding: '4px 8px',
                                        borderRadius: '10px',
                                        background: hasAdmin ? '#fce8e6' : '#ffffff',
                                        color: hasAdmin ? '#ea4335' : '#475569',
                                        border: hasAdmin ? '1.5px solid #ea4335' : '1.5px dashed #cbd5e1',
                                        fontSize: '0.7rem',
                                        fontWeight: 700,
                                        minWidth: '75px',
                                        textAlign: 'center',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s ease',
                                        boxSizing: 'border-box'
                                      }}
                                      title={hasAdmin ? "Admin-Rolle entfernen" : "Admin-Rolle hinzufügen"}
                                    >
                                      {hasAdmin ? 'Admin' : '+ Admin'}
                                    </button>

                                    {/* Verwaltung Button */}
                                    <button
                                      type="button"
                                      aria-label={`Verwaltungs-Rolle für ${emp.first_name} ${emp.last_name} ${hasSecretary ? 'entfernen' : 'hinzufügen'}`}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleToggleRole(emp, 'secretary');
                                      }}
                                      style={{
                                        padding: '4px 8px',
                                        borderRadius: '10px',
                                        background: hasSecretary ? '#f1f5f9' : '#ffffff',
                                        color: hasSecretary ? '#334155' : '#475569',
                                        border: hasSecretary ? '1.5px solid #334155' : '1.5px dashed #cbd5e1',
                                        fontSize: '0.7rem',
                                        fontWeight: 700,
                                        minWidth: '85px',
                                        textAlign: 'center',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s ease',
                                        boxSizing: 'border-box'
                                      }}
                                      title={hasSecretary ? "Verwaltungs-Rolle entfernen" : "Verwaltungs-Rolle hinzufügen"}
                                    >
                                      {hasSecretary ? 'Verwaltung' : '+ Verwaltung'}
                                    </button>

                                    {/* Lehrer Button */}
                                    <button
                                      type="button"
                                      aria-label={`Lehrkraft-Rolle für ${emp.first_name} ${emp.last_name} ${hasTeacher ? 'entfernen' : 'hinzufügen'}`}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleToggleRole(emp, 'teacher');
                                      }}
                                      style={{
                                        padding: '4px 8px',
                                        borderRadius: '10px',
                                        background: hasTeacher ? '#e6f4ea' : '#ffffff',
                                        color: hasTeacher ? '#34a853' : '#475569',
                                        border: hasTeacher ? '1.5px solid #34a853' : '1.5px dashed #cbd5e1',
                                        fontSize: '0.7rem',
                                        fontWeight: 700,
                                        minWidth: '75px',
                                        textAlign: 'center',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s ease',
                                        boxSizing: 'border-box'
                                      }}
                                      title={hasTeacher ? "Lehrer-Rolle entfernen" : "Lehrer-Rolle hinzufügen"}
                                    >
                                      {hasTeacher ? 'Lehrer' : '+ Lehrer'}
                                    </button>
                                  </>
                                );
                              })()}
                            </div>

                            {/* Status Badge */}
                            <div style={{ display: 'flex', justifyContent: 'center' }}>
                              <span style={{
                                padding: '5px 12px',
                                borderRadius: '10px',
                                background: isActive ? '#e6f4ea' : '#f5f5f7',
                                color: isActive ? '#34a853' : '#86868b',
                                fontSize: '0.74rem',
                                fontWeight: 700,
                                minWidth: '55px',
                                textAlign: 'center'
                              }}>
                                {isActive ? 'Aktiv' : 'Inaktiv'}
                              </span>
                            </div>

                            {/* Monospace PIN */}
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                              <span style={{ fontSize: '0.58rem', color: '#475569', textTransform: 'uppercase', fontWeight: 800 }}>Mitarbeiter-PIN</span>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                                <strong style={{ fontSize: '0.88rem', fontFamily: 'monospace', color: '#4b5563' }}>
                                  {emp.ausweis_nummer 
                                    ? (revealedPins[emp.id] ? emp.ausweis_nummer : '••••') 
                                    : 'Keine'}
                                </strong>
                                {emp.ausweis_nummer && (
                                  <button
                                    type="button"
                                    aria-label={revealedPins[emp.id] ? `PIN für ${emp.first_name} ${emp.last_name} verbergen` : `PIN für ${emp.first_name} ${emp.last_name} anzeigen`}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setRevealedPins(prev => ({ ...prev, [emp.id]: !prev[emp.id] }));
                                    }}
                                    style={{ background: 'transparent', border: 'none', padding: '2px', cursor: 'pointer', display: 'flex', alignItems: 'center', color: '#64748b' }}
                                    title={revealedPins[emp.id] ? 'PIN verbergen' : 'PIN anzeigen'}
                                  >
                                    {revealedPins[emp.id] ? <EyeOff size={14} /> : <Eye size={14} />}
                                  </button>
                                )}
                              </div>
                            </div>

                            {/* Action Buttons */}
                            <div style={{ display: 'flex', gap: '14px', alignItems: 'center', justifyContent: 'flex-end' }}>
                              <button
                                type="button"
                                aria-label={`Mitarbeiter-Pass für ${emp.first_name} ${emp.last_name} per E-Mail teilen`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (emp.ausweis_nummer) {
                                    // Copy to clipboard as backup
                                    navigator.clipboard.writeText(emp.ausweis_nummer);
                                    
                                    // Construct mail components
                                    const emailRecipient = emp.email || '';
                                    const subject = encodeURIComponent('Dein Campus-Mitarbeiterzugang 🎓');
                                    const body = encodeURIComponent(
                                      `Hallo ${emp.first_name || 'Mitarbeiter(in)'},\n\n` +
                                      `willkommen im Campus-Team!\n\n` +
                                      `Dein persönlicher Mitarbeiter-PIN für die Anmeldung und Profilverknüpfung lautet:\n` +
                                      `👉 ${emp.ausweis_nummer}\n\n` +
                                      `(Die PIN wurde soeben auch in deine Zwischenablage kopiert)\n\n` +
                                      `Damit kannst du dich auf dem Campus-Portal anmelden oder dein Profil verknüpfen.\n\n` +
                                      `Viele Grüße,\n` +
                                      `Musikschule Bad Säckingen`
                                    );
                                    
                                    window.location.href = `mailto:${emailRecipient}?subject=${subject}&body=${body}`;
                                  } else {
                                    alert('Keine PIN vorhanden.');
                                  }
                                }}
                                style={{
                                  background: 'transparent',
                                  border: 'none',
                                  color: '#ea4335',
                                  fontSize: '0.8rem',
                                  fontWeight: 700,
                                  cursor: 'pointer',
                                  fontFamily: 'Urbanist'
                                }}
                              >
                                Pass teilen
                              </button>
                              {emp.id !== userId && (currentUserProfile?.role === 'admin' || emp.role !== 'admin') ? (
                                <button
                                  type="button"
                                  aria-label={`Mitarbeiter ${emp.first_name} ${emp.last_name} löschen`}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteUser(emp.id);
                                  }}
                                  style={{
                                    background: 'transparent',
                                    border: 'none',
                                    color: '#ea4335',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    cursor: 'pointer',
                                    padding: '2px 6px',
                                    width: '28px',
                                    height: '28px',
                                    boxSizing: 'border-box'
                                  }}
                                >
                                  <Trash2 size={16} />
                                </button>
                              ) : (
                                <div style={{ width: '28px', height: '28px' }} />
                              )}
                            </div>

                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Manual Add Employee Modal */}
                  {showAddEmployeeModal && (
                    <div 
                      role="dialog"
                      aria-modal="true"
                      aria-labelledby="add-employee-modal-title"
                      onClick={(e) => {
                        if (e.target === e.currentTarget) setShowAddEmployeeModal(false);
                      }}
                      style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(15,23,42,0.3)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}
                    >
                      <div style={{ background: '#ffffff', borderRadius: '24px', maxWidth: '520px', width: '100%', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', display: 'flex', flexDirection: 'column' }}>
                        {/* Modal Header */}
                        <div style={{ padding: '24px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <h3 id="add-employee-modal-title" style={{ margin: 0, fontSize: '1.15rem', fontWeight: 900, color: '#0f172a', fontFamily: 'Urbanist' }}>
                            ➕ Neuen Mitarbeiter hinzufügen
                          </h3>
                          <button 
                            type="button"
                            onClick={() => setShowAddEmployeeModal(false)}
                            aria-label="Dialog schließen"
                            style={{ border: 'none', background: 'transparent', fontSize: '1.2rem', cursor: 'pointer', color: '#64748b' }}
                          >
                            ✕
                          </button>
                        </div>

                        {/* Modal Body */}
                        <form onSubmit={handleCreateEmployee}>
                          <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#475569' }}>Vorname *</label>
                                <input
                                  type="text"
                                  required
                                  aria-label="Vorname"
                                  value={employeeFirstName}
                                  onChange={(e) => setEmployeeFirstName(e.target.value)}
                                  placeholder="z.B. Clara"
                                  style={{ padding: '10px 14px', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '0.85rem', outline: 'none' }}
                                />
                              </div>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#475569' }}>Nachname *</label>
                                <input
                                  type="text"
                                  required
                                  aria-label="Nachname"
                                  value={employeeLastName}
                                  onChange={(e) => {
                                    setEmployeeLastName(e.target.value);
                                  }}
                                  placeholder="z.B. Schumann"
                                  style={{ padding: '10px 14px', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '0.85rem', outline: 'none' }}
                                />
                              </div>
                            </div>
                            
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                              <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#475569' }}>Rolle *</label>
                              <select
                                name="employeeRoleSelect"
                                aria-label="Rolle auswählen"
                                defaultValue="secretary"
                                style={{ padding: '10px 14px', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '0.85rem', outline: 'none', background: 'white' }}
                              >
                                <option value="secretary">Verwaltung</option>
                                <option value="admin">Administrator</option>
                              </select>
                            </div>
                          </div>

                          {/* Modal Footer */}
                          <div style={{ padding: '16px 24px', background: '#f8fafc', borderTop: '1px solid #f1f5f9', borderRadius: '0 0 24px 24px', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                            <button
                              type="button"
                              onClick={() => setShowAddEmployeeModal(false)}
                              aria-label="Abbrechen"
                              style={{ background: 'transparent', border: 'none', color: '#64748b', fontWeight: 800, cursor: 'pointer', fontSize: '0.82rem' }}
                            >
                              Abbrechen
                            </button>
                            <button
                              type="submit"
                              className="google-btn-primary"
                              aria-label="Mitarbeiter anlegen"
                              style={{ background: '#dc2626', color: '#ffffff', border: 'none', borderRadius: '12px', padding: '10px 20px', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer' }}
                            >
                              Mitarbeiter anlegen
                            </button>
                          </div>
                        </form>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Sidebar Pane */}
              <div style={{ width: '340px', display: 'flex', flexDirection: 'column', gap: '24px', flexShrink: 0 }}>
                
                <div className="google-card" style={{ 
                  padding: '24px', 
                  borderRadius: '24px', 
                  border: '1.5px solid #cbd5e1', 
                  background: '#ffffff',
                  boxShadow: '0 10px 25px -5px rgba(0,0,0,0.01)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '20px'
                }}>
                  {/* Header */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <ShieldAlert size={20} style={{ color: '#0f172a' }} />
                      <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 900, color: '#0f172a', fontFamily: 'Urbanist' }}>
                        Rollen &amp; Berechtigungen
                      </h4>
                    </div>
                    <p style={{ margin: 0, fontSize: '0.74rem', color: '#64748b', lineHeight: '1.45', fontFamily: 'Inter' }}>
                      Klicke auf eine Rolle, um die Ansicht zu filtern, oder ziehe einen Mitarbeiter hierher, um seine Rolle direkt anzupassen.
                    </p>
                  </div>

                  {/* Role List */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    
                    {/* "Alle Rollen anzeigen" Row */}
                    {(() => {
                      const isActive = employeeFilterRole === 'All';
                      const isHovered = dragHoveredEmployeeRole === 'All';
                      return (
                        <div
                          role="button"
                          tabIndex={0}
                          aria-label="Filter: Alle Rollen anzeigen"
                          onClick={() => setEmployeeFilterRole('All')}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              setEmployeeFilterRole('All');
                            }
                          }}
                          onDragOver={(e) => {
                            e.preventDefault();
                            setDragHoveredEmployeeRole('All');
                          }}
                          onDragLeave={() => setDragHoveredEmployeeRole(null)}
                          onDrop={(e) => {
                            const empId = e.dataTransfer.getData("employeeId");
                            // Dropping on "All" doesn't change role, or default to secretary
                            setDragHoveredEmployeeRole(null);
                          }}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '12px 16px',
                            borderRadius: '16px',
                            border: isHovered 
                              ? '2px dashed #dc2626' 
                              : isActive 
                                ? '1.5px solid #dc2626' 
                                : '1.5px solid #cbd5e1',
                            background: isHovered 
                              ? '#fef2f2' 
                              : isActive 
                                ? '#fef2f2' 
                                : '#ffffff',
                            cursor: 'pointer',
                            transform: isHovered ? 'scale(1.02)' : 'scale(1)',
                            transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                            boxShadow: isActive ? '0 4px 12px rgba(220,38,38,0.06)' : 'none'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{
                              width: '36px',
                              height: '36px',
                              borderRadius: '50%',
                              background: '#f1f5f9',
                              color: '#475569',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0
                            }}>
                              <Users size={18} />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                              <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0f172a', fontFamily: 'Urbanist' }}>
                                Alle Rollen anzeigen
                              </span>
                              <span style={{ fontSize: '0.68rem', color: '#64748b', fontFamily: 'Inter' }}>
                                Gesamtübersicht
                              </span>
                            </div>
                          </div>
                          
                          <span style={{
                            padding: '4px 10px',
                            borderRadius: '10px',
                            background: isActive ? '#fee2e2' : '#f1f5f9',
                            color: isActive ? '#dc2626' : '#64748b',
                            fontSize: '0.68rem',
                            fontWeight: 800,
                            fontFamily: 'Urbanist',
                            whiteSpace: 'nowrap'
                          }}>
                            {employees.length} Mitarbeiter
                          </span>
                        </div>
                      );
                    })()}

                    {/* Admin Role Drop Row */}
                    {(() => {
                      const isActive = employeeFilterRole === 'admin';
                      const isHovered = dragHoveredEmployeeRole === 'admin';
                      return (
                        <div
                          role="button"
                          tabIndex={0}
                          aria-label="Filter: Administratoren"
                          onClick={() => setEmployeeFilterRole('admin')}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              setEmployeeFilterRole('admin');
                            }
                          }}
                          onDragOver={(e) => {
                            e.preventDefault();
                            setDragHoveredEmployeeRole('admin');
                          }}
                          onDragLeave={() => setDragHoveredEmployeeRole(null)}
                          onDrop={(e) => {
                            const empId = e.dataTransfer.getData("employeeId");
                            if (empId) {
                              handleUpdateEmployeeRole(empId, 'admin');
                            }
                            setDragHoveredEmployeeRole(null);
                          }}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '12px 16px',
                            borderRadius: '16px',
                            border: isHovered 
                              ? '2px dashed #dc2626' 
                              : isActive 
                                ? '1.5px solid #dc2626' 
                                : '1.5px solid #cbd5e1',
                            background: isHovered 
                              ? '#fef2f2' 
                              : isActive 
                                ? '#fef2f2' 
                                : '#ffffff',
                            cursor: 'pointer',
                            transform: isHovered ? 'scale(1.02)' : 'scale(1)',
                            transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                            boxShadow: isActive ? '0 4px 12px rgba(220,38,38,0.06)' : 'none'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{
                              width: '36px',
                              height: '36px',
                              borderRadius: '50%',
                              background: '#fce8e6',
                              color: '#ea4335',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0
                            }}>
                              <UserCheck size={18} />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                              <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0f172a', fontFamily: 'Urbanist' }}>
                                Administratoren
                              </span>
                              <span style={{ fontSize: '0.68rem', color: '#64748b', fontFamily: 'Inter' }}>
                                Volle Systemrechte
                              </span>
                            </div>
                          </div>
                          
                          <span style={{
                            padding: '4px 10px',
                            borderRadius: '10px',
                            background: isActive ? '#fee2e2' : '#f1f5f9',
                            color: isActive ? '#dc2626' : '#64748b',
                            fontSize: '0.68rem',
                            fontWeight: 800,
                            fontFamily: 'Urbanist',
                            whiteSpace: 'nowrap'
                          }}>
                            {adminCount} Admin
                          </span>
                        </div>
                      );
                    })()}

                    {/* Teacher/Lehrer Role Drop Row */}
                    {(() => {
                      const isActive = employeeFilterRole === 'teacher';
                      const isHovered = dragHoveredEmployeeRole === 'teacher';
                      return (
                        <div
                          role="button"
                          tabIndex={0}
                          aria-label="Filter: Lehrer"
                          onClick={() => setEmployeeFilterRole('teacher')}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              setEmployeeFilterRole('teacher');
                            }
                          }}
                          onDragOver={(e) => {
                            e.preventDefault();
                            setDragHoveredEmployeeRole('teacher');
                          }}
                          onDragLeave={() => setDragHoveredEmployeeRole(null)}
                          onDrop={(e) => {
                            const empId = e.dataTransfer.getData("employeeId");
                            if (empId) {
                              handleUpdateEmployeeRole(empId, 'teacher');
                            }
                            setDragHoveredEmployeeRole(null);
                          }}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '12px 16px',
                            borderRadius: '16px',
                            border: isHovered 
                              ? '2px dashed #dc2626' 
                              : isActive 
                                ? '1.5px solid #dc2626' 
                                : '1.5px solid #cbd5e1',
                            background: isHovered 
                              ? '#fef2f2' 
                              : isActive 
                                ? '#fef2f2' 
                                : '#ffffff',
                            cursor: 'pointer',
                            transform: isHovered ? 'scale(1.02)' : 'scale(1)',
                            transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                            boxShadow: isActive ? '0 4px 12px rgba(220,38,38,0.06)' : 'none'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{
                              width: '36px',
                              height: '36px',
                              borderRadius: '50%',
                              background: '#e6f4ea',
                              color: '#34a853',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0
                            }}>
                              <GraduationCap size={18} />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                              <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0f172a', fontFamily: 'Urbanist' }}>
                                Lehrer
                              </span>
                              <span style={{ fontSize: '0.68rem', color: '#64748b', fontFamily: 'Inter' }}>
                                Musiklehrer & Coaches
                              </span>
                            </div>
                          </div>
                          
                          <span style={{
                            padding: '4px 10px',
                            borderRadius: '10px',
                            background: isActive ? '#fee2e2' : '#f1f5f9',
                            color: isActive ? '#dc2626' : '#64748b',
                            fontSize: '0.68rem',
                            fontWeight: 800,
                            fontFamily: 'Urbanist',
                            whiteSpace: 'nowrap'
                          }}>
                            {teacherCount} Lehrer
                          </span>
                        </div>
                      );
                    })()}

                    {/* Secretary/Verwaltung Role Drop Row */}
                    {(() => {
                      const isActive = employeeFilterRole === 'secretary';
                      const isHovered = dragHoveredEmployeeRole === 'secretary';
                      return (
                        <div
                          role="button"
                          tabIndex={0}
                          aria-label="Filter: Verwaltung"
                          onClick={() => setEmployeeFilterRole('secretary')}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              setEmployeeFilterRole('secretary');
                            }
                          }}
                          onDragOver={(e) => {
                            e.preventDefault();
                            setDragHoveredEmployeeRole('secretary');
                          }}
                          onDragLeave={() => setDragHoveredEmployeeRole(null)}
                          onDrop={(e) => {
                            const empId = e.dataTransfer.getData("employeeId");
                            if (empId) {
                              handleUpdateEmployeeRole(empId, 'secretary');
                            }
                            setDragHoveredEmployeeRole(null);
                          }}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '12px 16px',
                            borderRadius: '16px',
                            border: isHovered 
                              ? '2px dashed #dc2626' 
                              : isActive 
                                ? '1.5px solid #dc2626' 
                                : '1.5px solid #cbd5e1',
                            background: isHovered 
                              ? '#fef2f2' 
                              : isActive 
                                ? '#fef2f2' 
                                : '#ffffff',
                            cursor: 'pointer',
                            transform: isHovered ? 'scale(1.02)' : 'scale(1)',
                            transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                            boxShadow: isActive ? '0 4px 12px rgba(220,38,38,0.06)' : 'none'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{
                              width: '36px',
                              height: '36px',
                              borderRadius: '50%',
                              background: '#e2e8f0',
                              color: '#334155',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0
                            }}>
                              <UserCheck size={18} />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                              <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0f172a', fontFamily: 'Urbanist' }}>
                                Verwaltung
                              </span>
                              <span style={{ fontSize: '0.68rem', color: '#64748b', fontFamily: 'Inter' }}>
                                Schulsekretariat
                              </span>
                            </div>
                          </div>
                          
                          <span style={{
                            padding: '4px 10px',
                            borderRadius: '10px',
                            background: isActive ? '#fee2e2' : '#f1f5f9',
                            color: isActive ? '#dc2626' : '#64748b',
                            fontSize: '0.68rem',
                            fontWeight: 800,
                            fontFamily: 'Urbanist',
                            whiteSpace: 'nowrap'
                          }}>
                            {secretaryCount} Verwaltung
                          </span>
                        </div>
                      );
                    })()}

                  </div>
                </div>

              </div>

            </div>
          );

};
