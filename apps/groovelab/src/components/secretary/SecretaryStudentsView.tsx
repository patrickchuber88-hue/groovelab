import React, { useMemo } from 'react';
import {
  Check, CheckSquare, Eye, EyeOff, FileText, GraduationCap,
  HeartHandshake, Link as LinkIcon, MoreVertical, Music, Plus,
  Search, Sparkles, Trash2, Upload, UserCheck, Users, X, Zap
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { getParentOnboardingUrl } from '../../utils/tenantUrlHelper';
import { maskLastName } from '../../utils/nameHelper';

export const INSTRUMENT_TAGS = ['Schlagzeug', 'Piano', 'Gitarre', 'Gesang', 'Geige', 'Querflöte', 'Saxophon', 'Bass', 'Keyboard', 'Trompete'];

export interface SecretaryStudentsViewProps {
  students: any[];
  campusTeachers: any[];
  bypassTeachers: any[];
  coaches: any[];
  currentSchoolProfile: any;
  schoolId: string;
  schoolName: string;
  windowWidth: number;
  hasCampusSub: boolean;
  hasGroovelabSub: boolean;
  studentBillingOption: string;
  isBillingBooked: boolean;
  billingPayer: string;
  isImportingStudentsBatch: boolean;
  setIsImportingStudentsBatch: React.Dispatch<React.SetStateAction<boolean>>;
  filteredStudents: any[];
  studentSearchQuery: string;
  setStudentSearchQuery: React.Dispatch<React.SetStateAction<string>>;
  studentFilterInstrument: string;
  setStudentFilterInstrument: React.Dispatch<React.SetStateAction<string>>;
  studentFilterTeacher: string;
  setStudentFilterTeacher: React.Dispatch<React.SetStateAction<string>>;
  studentFilterStatus: any;
  setStudentFilterStatus: any;
  isStudentCsvExpanded: boolean;
  setIsStudentCsvExpanded: React.Dispatch<React.SetStateAction<boolean>>;
  studentCsvText: string;
  setStudentCsvText: React.Dispatch<React.SetStateAction<string>>;
  studentCurrentPage: number;
  setStudentCurrentPage: React.Dispatch<React.SetStateAction<number>>;
  studentPageSize: number;
  setStudentPageSize: React.Dispatch<React.SetStateAction<number>>;
  selectedStudentIds: string[];
  setSelectedStudentIds: React.Dispatch<React.SetStateAction<string[]>>;
  showAddStudentModal: boolean;
  setShowAddStudentModal: React.Dispatch<React.SetStateAction<boolean>>;
  showBulkImportModal: boolean;
  setShowBulkImportModal: React.Dispatch<React.SetStateAction<boolean>>;
  showGuidanceModal: boolean;
  setShowGuidanceModal: React.Dispatch<React.SetStateAction<boolean>>;
  showParentInfoSheetModal: boolean;
  setShowParentInfoSheetModal: React.Dispatch<React.SetStateAction<boolean>>;
  showBulkDeleteModal: boolean;
  setShowBulkDeleteModal: React.Dispatch<React.SetStateAction<boolean>>;
  bulkDeletePin: string;
  setBulkDeletePin: React.Dispatch<React.SetStateAction<string>>;
  bulkDeleteStep: any;
  setBulkDeleteStep: any;
  guidanceInitialTab: any;
  setGuidanceInitialTab: any;
  newStudentFirstName: string;
  setNewStudentFirstName: React.Dispatch<React.SetStateAction<string>>;
  newStudentLastName: string;
  setNewStudentLastName: React.Dispatch<React.SetStateAction<string>>;
  newStudentNickname: string;
  setNewStudentNickname: React.Dispatch<React.SetStateAction<string>>;
  newStudentInstrument: string;
  setNewStudentInstrument: React.Dispatch<React.SetStateAction<string>>;
  newStudentDuration: number;
  setNewStudentDuration: React.Dispatch<React.SetStateAction<number>>;
  newStudentTeacherId: string;
  setNewStudentTeacherId: React.Dispatch<React.SetStateAction<string>>;
  newStudentIsAppUser: boolean;
  setNewStudentIsAppUser: React.Dispatch<React.SetStateAction<boolean>>;
  newStudentIsCampusActive: boolean;
  setNewStudentIsCampusActive: React.Dispatch<React.SetStateAction<boolean>>;
  newStudentIsGroovelabActive: boolean;
  setNewStudentIsGroovelabActive: React.Dispatch<React.SetStateAction<boolean>>;
  selectedStudentForDetail: any;
  setSelectedStudentForDetail: (s: any) => void;
  activeContextMenu: any;
  setActiveContextMenu: React.Dispatch<React.SetStateAction<any>>;
  copiedStudentId: string | null;
  setCopiedStudentId: React.Dispatch<React.SetStateAction<string | null>>;
  showRealNames: boolean;
  toggleRealNames: () => void;
  fetchDashboardData: () => Promise<void> | void;
  handleBatchImportStudents: () => Promise<void> | void;
  handleCreateStudentCampus: (e: React.FormEvent) => Promise<void> | void;
  handleDeleteStudentCampus: (studentId: string, name: string, instrument?: string, teacherId?: string, isCampusActive?: boolean, isGroovelabActive?: boolean) => void;
  handleUpdateStudentTeacher: (studentId: string, teacherId: string | null) => Promise<void> | void;
  handleToggleStudentModule?: (student: any, moduleType: 'campus' | 'groovelab') => Promise<void> | void;
  getAlphabeticalColor: (name: string) => { avatarBg: string; avatarColor: string };
}

export const SecretaryStudentsView: React.FC<SecretaryStudentsViewProps> = ({
  students,
  campusTeachers,
  bypassTeachers,
  coaches,
  currentSchoolProfile,
  schoolId,
  schoolName,
  windowWidth,
  hasCampusSub,
  hasGroovelabSub,
  studentBillingOption,
  isBillingBooked,
  billingPayer,
  isImportingStudentsBatch,
  setIsImportingStudentsBatch,
  filteredStudents,
  studentSearchQuery,
  setStudentSearchQuery,
  studentFilterInstrument,
  setStudentFilterInstrument,
  studentFilterTeacher,
  setStudentFilterTeacher,
  studentFilterStatus,
  setStudentFilterStatus,
  isStudentCsvExpanded,
  setIsStudentCsvExpanded,
  studentCsvText,
  setStudentCsvText,
  studentCurrentPage,
  setStudentCurrentPage,
  studentPageSize,
  setStudentPageSize,
  selectedStudentIds,
  setSelectedStudentIds,
  showAddStudentModal,
  setShowAddStudentModal,
  showBulkImportModal,
  setShowBulkImportModal,
  showGuidanceModal,
  setShowGuidanceModal,
  showParentInfoSheetModal,
  setShowParentInfoSheetModal,
  showBulkDeleteModal,
  setShowBulkDeleteModal,
  bulkDeletePin,
  setBulkDeletePin,
  bulkDeleteStep,
  setBulkDeleteStep,
  guidanceInitialTab,
  setGuidanceInitialTab,
  newStudentFirstName,
  setNewStudentFirstName,
  newStudentLastName,
  setNewStudentLastName,
  newStudentNickname,
  setNewStudentNickname,
  newStudentInstrument,
  setNewStudentInstrument,
  newStudentDuration,
  setNewStudentDuration,
  newStudentTeacherId,
  setNewStudentTeacherId,
  newStudentIsAppUser,
  setNewStudentIsAppUser,
  newStudentIsCampusActive,
  setNewStudentIsCampusActive,
  newStudentIsGroovelabActive,
  setNewStudentIsGroovelabActive,
  selectedStudentForDetail,
  setSelectedStudentForDetail,
  activeContextMenu,
  setActiveContextMenu,
  copiedStudentId,
  setCopiedStudentId,
  showRealNames,
  toggleRealNames,
  fetchDashboardData,
  handleBatchImportStudents,
  handleCreateStudentCampus,
  handleDeleteStudentCampus,
  handleUpdateStudentTeacher,
  handleToggleStudentModule,
  getAlphabeticalColor,
}) => {


    // Show all students belonging to the school
    const campusStudentsOnly = students;

    const uniqueInstruments = Array.from(new Set(campusStudentsOnly.map(s => s.instrument || 'Nicht festgelegt')));
    const allUniqueTeachers = [...campusTeachers, ...bypassTeachers, ...coaches].reduce((acc: any[], t: any) => {
      if (!acc.some(existing => existing.id === t.id)) {
        acc.push(t);
      }
      return acc;
    }, []);

    // Memoized filteredStudents is used directly from outer component scope

    // Pagination calculation
    const totalCount = filteredStudents.length;
    const totalPages = Math.ceil(totalCount / studentPageSize) || 1;
    const safeCurrentPage = Math.min(studentCurrentPage, totalPages);
    const startIndex = (safeCurrentPage - 1) * studentPageSize;
    const paginatedStudents = filteredStudents.slice(startIndex, startIndex + studentPageSize);

    const totalStudents = campusStudentsOnly.length;
    const activeCampusCount = campusStudentsOnly.filter(s => s.is_campus_active).length;
    const activeGroovelabCount = campusStudentsOnly.filter(s => s.is_groovelab_active).length;
    const hardshipEarnedSlots = Math.floor(activeCampusCount / 20);
    const hardshipUsedSlots = campusStudentsOnly.filter(s => s.is_campus_active && s.exempt_from_direct_billing).length;

    const campusActiveLoggedIn = campusStudentsOnly.filter(s => s.is_campus_active && !s.isPendingOnboarding).length;
    const campusPendingCount = campusStudentsOnly.filter(s => s.is_campus_active && s.isPendingOnboarding).length;
    const groovelabActiveLoggedIn = campusStudentsOnly.filter(s => s.is_groovelab_active && !s.isPendingOnboarding).length;
    const groovelabPendingCount = campusStudentsOnly.filter(s => s.is_groovelab_active && s.isPendingOnboarding).length;

    // Helper for beautiful pastel background based on student name (A-Z alphabetical color)
    const getAvatarGradient = (name: string) => getAlphabeticalColor(name).avatarBg;
    const getAvatarTextColor = (name: string) => getAlphabeticalColor(name).avatarColor;

    return (
      <>
        <style>{`
          @keyframes pulseCircle {
            0% { transform: scale(1); opacity: 0.6; }
            50% { transform: scale(1.35); opacity: 1; filter: drop-shadow(0 0 2px rgba(217, 119, 6, 0.9)); }
            100% { transform: scale(1); opacity: 0.6; }
          }
          .pulse-open-circle {
            display: inline-block;
            animation: pulseCircle 1.8s infinite ease-in-out;
            font-weight: 900;
          }
        `}</style>
        <div className="google-card" style={{ 
          width: '100%',
          display: 'flex', 
          flexDirection: 'column', 
          gap: '6px', 
          padding: '10px 14px',
          borderRadius: '16px',
          border: '1.5px solid #cbd5e1',
          background: '#ffffff',
          boxShadow: '0 4px 16px -2px rgba(0,0,0,0.02)',
          minWidth: 0
        }}>
            {/* TITLE BLOCK WITH INTEGRATED INLINE STAT BADGES */}
            <div className="schueler-header-wrap" style={{ display: 'flex', flexDirection: windowWidth < 768 ? 'column' : 'row', alignItems: windowWidth < 768 ? 'stretch' : 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px', width: '100%' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <Users size={18} style={{ color: '#0f172a' }} />
                <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 900, color: '#0f172a', fontFamily: 'Urbanist' }}>
                  Schülerboard ({totalStudents})
                </h3>

                {/* Inline Compact Stat Badges */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginLeft: '4px' }}>
                  <span style={{ 
                    background: 'linear-gradient(135deg, #e0e7ff 0%, #c7d2fe 100%)', 
                    color: '#3730a3', 
                    padding: '2px 8px', 
                    borderRadius: '100px', 
                    fontSize: '0.68rem', 
                    fontWeight: 800, 
                    fontFamily: 'Urbanist',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '3px'
                  }}>
                    <Users size={10} />
                    {totalStudents} Reg.
                  </span>

                  <span style={{ 
                    background: 'linear-gradient(135deg, #e6f4ea 0%, #ceebd6 100%)', 
                    color: '#137333', 
                    padding: '2px 8px', 
                    borderRadius: '100px', 
                    fontSize: '0.68rem', 
                    fontWeight: 800, 
                    fontFamily: 'Urbanist',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '3px'
                  }} title={`Campus-Nutzer: ${campusActiveLoggedIn} aktiv angemeldet (●), ${campusPendingCount} Einladung ausstehend (○)`}>
                    <UserCheck size={10} />
                    {activeCampusCount} Campus ({totalStudents > 0 ? Math.round((activeCampusCount / totalStudents) * 100) : 0}% • {campusActiveLoggedIn}●{campusPendingCount > 0 ? ` ${campusPendingCount}○` : ''})
                  </span>

                  <span style={{ 
                    background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)', 
                    color: '#b45309', 
                    padding: '2px 8px', 
                    borderRadius: '100px', 
                    fontSize: '0.68rem', 
                    fontWeight: 800, 
                    fontFamily: 'Urbanist',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '3px'
                  }} title={`GrooveLab-Nutzer: ${groovelabActiveLoggedIn} aktiv angemeldet (●), ${groovelabPendingCount} Einladung ausstehend (○)`}>
                    <Music size={10} />
                    {activeGroovelabCount} GrooveLab ({totalStudents > 0 ? Math.round((activeGroovelabCount / totalStudents) * 100) : 0}% • {groovelabActiveLoggedIn}●{groovelabPendingCount > 0 ? ` ${groovelabPendingCount}○` : ''})
                  </span>

                  <span style={{ 
                    background: 'linear-gradient(135deg, #f3e8ff 0%, #e9d5ff 100%)', 
                    color: '#6b21a8', 
                    padding: '2px 8px', 
                    borderRadius: '100px', 
                    fontSize: '0.68rem', 
                    fontWeight: 800, 
                    fontFamily: 'Urbanist',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '3px'
                  }} title={`1 freier Härtefall-Slot pro 20 Campus-Aktivierungen (${hardshipUsedSlots} von ${hardshipEarnedSlots} belegt)`}>
                    <HeartHandshake size={10} />
                    Härtefälle: {hardshipUsedSlots}/{hardshipEarnedSlots}
                  </span>
                </div>
              </div>
              
              <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                <button
                  type="button"
                  aria-label="Eltern-Onboarding Link kopieren"
                  onClick={() => {
                    const onboardingUrl = getParentOnboardingUrl(
                      schoolName || currentSchoolProfile?.name || 'Stadtmusikschule',
                      currentSchoolProfile?.subdomain
                    );
                    navigator.clipboard.writeText(onboardingUrl);
                    setCopiedStudentId('general-onboarding');
                    setTimeout(() => setCopiedStudentId(null), 2000);
                  }}
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '4px', 
                    borderRadius: '8px', 
                    padding: '4px 10px', 
                    fontSize: '0.72rem', 
                    fontWeight: 800, 
                    background: copiedStudentId === 'general-onboarding' ? '#e6f4ea' : '#ffffff',
                    border: copiedStudentId === 'general-onboarding' ? '1px solid #e6f4ea' : '1px solid #cbd5e1',
                    color: copiedStudentId === 'general-onboarding' ? '#34a853' : '#0f172a',
                    cursor: 'pointer',
                    fontFamily: 'Urbanist',
                    transition: 'all 0.2s'
                  }}
                  title="Eltern-Onboarding Link kopieren"
                >
                  {copiedStudentId === 'general-onboarding' ? <Check size={12} /> : <LinkIcon size={12} />}
                  {copiedStudentId === 'general-onboarding' ? 'Kopiert!' : 'Onboarding-Link'}
                </button>

                <button
                  type="button"
                  aria-label="Smarter CSV und Excel Import"
                  onClick={() => setShowBulkImportModal(true)}
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '4px', 
                    borderRadius: '8px', 
                    padding: '4px 10px', 
                    fontSize: '0.72rem', 
                    fontWeight: 800,
                    background: '#ffffff',
                    border: '1.5px solid #a7f3d0',
                    color: '#065f46',
                    cursor: 'pointer',
                    fontFamily: 'Urbanist',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                    transition: 'all 0.2s'
                  }}
                  className="hover-scale-mini"
                  title="Smarter 1-Klick Schüler- &amp; Lehrer-Import aus Excel/CSV mit automatischer DSGVO-Maskierung"
                >
                  <Upload size={12} color="#059669" />
                  <span>Smarter CSV/Excel Import</span>
                </button>

                <button
                  type="button"
                  aria-label="Druckfertiges Eltern-Infoblatt als PDF öffnen"
                  onClick={() => setShowParentInfoSheetModal(true)}
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '5px', 
                    borderRadius: '8px', 
                    padding: '4px 10px', 
                    fontSize: '0.72rem', 
                    fontWeight: 800,
                    background: '#ffffff',
                    border: '1.5px solid #cbd5e1',
                    color: '#0f172a',
                    cursor: 'pointer',
                    fontFamily: 'Urbanist',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                    transition: 'all 0.2s'
                  }}
                  className="hover-scale-mini"
                  title="Druckfertiges 1-Seiter Eltern-Infoblatt mit Schullogo &amp; QR-Code als PDF herunterladen oder drucken"
                >
                  <FileText size={12} color="#059669" />
                  <span>Eltern-Infoblatt (PDF)</span>
                </button>

                {/* Sammel-Onboarding (Text/CSV) Toggle Button */}
                <button
                  type="button"
                  aria-label="Sammel-Onboarding Textfeld ein- oder ausklappen"
                  onClick={() => setIsStudentCsvExpanded(!isStudentCsvExpanded)}
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '5px', 
                    borderRadius: '8px', 
                    padding: '4px 10px', 
                    fontSize: '0.72rem', 
                    fontWeight: 800,
                    background: isStudentCsvExpanded ? '#e6f4ea' : '#ffffff',
                    border: isStudentCsvExpanded ? '1.5px solid #34a853' : '1px solid #cbd5e1',
                    color: isStudentCsvExpanded ? '#34a853' : '#334155',
                    cursor: 'pointer',
                    fontFamily: 'Urbanist',
                    transition: 'all 0.2s'
                  }}
                  className="hover-scale-mini"
                  title="Schnellerfassung per Textfeld für mehrere Schüler auf einmal"
                >
                  <FileText size={12} color={isStudentCsvExpanded ? '#34a853' : '#64748b'} />
                  <span>Sammel-Onboarding (Text) {isStudentCsvExpanded ? '▲' : '▼'}</span>
                </button>

                {/* Interaktives In-App Leitfaden & Eltern-Info Modal */}
                <button
                  type="button"
                  aria-label="Interaktiven Leitfaden und Eltern-Info öffnen"
                  onClick={() => {
                    setGuidanceInitialTab('teacher');
                    setShowGuidanceModal(true);
                  }}
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '5px', 
                    borderRadius: '8px', 
                    padding: '4px 10px', 
                    fontSize: '0.72rem', 
                    fontWeight: 800,
                    background: '#f8fafc',
                    border: '1px solid #cbd5e1',
                    color: '#334155',
                    cursor: 'pointer',
                    fontFamily: 'Urbanist',
                    transition: 'all 0.2s'
                  }}
                  className="hover-scale-mini"
                  title="Interaktives Infocenter für Lehrkräfte &amp; Eltern öffnen (inkl. Textvorlagen &amp; Druck-Export)"
                >
                  <Sparkles size={12} color="#0284c7" />
                  <span>💡 Leitfaden &amp; Eltern-Info</span>
                </button>

                <button
                  type="button"
                  aria-label="Neuen Schüler anlegen"
                  onClick={() => setShowAddStudentModal(true)}
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '4px', 
                    borderRadius: '8px', 
                    padding: '4px 10px', 
                    fontSize: '0.72rem', 
                    fontWeight: 800,
                    background: '#34a853',
                    color: '#ffffff',
                    border: 'none',
                    cursor: 'pointer',
                    fontFamily: 'Urbanist',
                    boxShadow: '0 2px 6px rgba(52, 168, 83,0.15)',
                    transition: 'all 0.2s'
                  }}
                >
                  ➕ Schüler anlegen
                </button>
              </div>
            </div>

            {/* Collapsible Student CSV/Text Onboarding Box */}
            {isStudentCsvExpanded && (() => {
              const selectedTeacherObj = studentFilterTeacher && studentFilterTeacher !== 'All' && studentFilterTeacher !== 'none'
                ? allUniqueTeachers.find((t: any) => t.id === studentFilterTeacher)
                : null;
              const selectedTeacherName = selectedTeacherObj
                ? `${selectedTeacherObj.firstName || selectedTeacherObj.first_name || ''} ${selectedTeacherObj.lastName || selectedTeacherObj.last_name || ''}`.trim()
                : '';
              const selectedTeacherInitials = selectedTeacherObj
                ? `${selectedTeacherObj.firstName?.[0] || selectedTeacherObj.first_name?.[0] || ''}${selectedTeacherObj.lastName?.[0] || selectedTeacherObj.last_name?.[0] || ''}`.toUpperCase() || 'L'
                : '';

              return (
                <div style={{
                  background: '#f8fafc',
                  padding: '16px',
                  borderRadius: '16px',
                  border: '1.5px dashed #34a853',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                  boxShadow: '0 4px 16px rgba(52,168,83,0.06)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: '#e6f4ea', color: '#34a853', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <FileText size={16} />
                      </div>
                      <div>
                        <strong style={{ fontSize: '0.88rem', color: '#0f172a', fontWeight: 900, fontFamily: 'Urbanist' }}>
                          Sammel-Onboarding (Schüler)
                        </strong>
                        <span style={{ display: 'block', fontSize: '0.7rem', color: '#64748b', fontFamily: 'Inter' }}>
                          Format pro Zeile: <code>Vorname; Nachname; Instrument (optional); Dauer (optional)</code> oder <code>Vorname Nachname</code>
                        </span>
                      </div>
                    </div>
                    <span style={{ fontSize: '0.68rem', color: '#15803d', fontWeight: 800, background: '#ecfdf5', padding: '3px 8px', borderRadius: '100px', border: '1px solid #a7f3d0' }}>
                      DSGVO-Anonymisiert
                    </span>
                  </div>

                  {/* Smart Auto-Zuweisung Pill if a teacher is selected in sidebar */}
                  {selectedTeacherObj && (
                    <div style={{
                      background: 'rgba(52, 168, 83, 0.04)',
                      border: '1.5px solid rgba(52, 168, 83, 0.18)',
                      borderRadius: '14px',
                      padding: '10px 14px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      flexWrap: 'wrap'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', flex: 1 }}>
                        <span style={{ fontSize: '0.68rem', color: '#34a853', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: 'Urbanist' }}>
                          <Zap size={14} style={{ marginRight: '4px', verticalAlign: 'middle', fill: '#34a853' }} /> Smart Auto-Zuweisung:
                        </span>

                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          background: '#ffffff',
                          border: '1.5px solid #cbd5e1',
                          padding: '3px 10px 3px 6px',
                          borderRadius: '100px',
                          boxShadow: '0 2px 6px rgba(0,0,0,0.02)'
                        }}>
                          <div style={{
                            width: '22px',
                            height: '22px',
                            borderRadius: '50%',
                            background: getAvatarGradient(selectedTeacherName),
                            color: getAvatarTextColor(selectedTeacherName),
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '0.62rem',
                            fontWeight: 900,
                            fontFamily: 'Urbanist'
                          }}>
                            {selectedTeacherInitials}
                          </div>
                          <span style={{ fontSize: '0.74rem', fontWeight: 800, color: '#0f172a', fontFamily: 'Urbanist' }}>
                            {selectedTeacherName}
                          </span>
                        </div>
                      </div>

                      <span style={{ fontSize: '0.65rem', color: '#34a853', fontWeight: 900, background: '#e6f4ea', padding: '3px 8px', borderRadius: '6px', textTransform: 'uppercase', fontFamily: 'Urbanist' }}>
                        Alle Schüler werden direkt dieser Lehrkraft zugewiesen!
                      </span>
                    </div>
                  )}

                  <textarea
                    aria-label="CSV oder Liste von Schülern für Batch-Import"
                    value={studentCsvText}
                    onChange={(e) => setStudentCsvText(e.target.value)}
                    placeholder={
                      selectedTeacherObj
                        ? "Max Mustermann\nErika Musterfrau; 45\nLeon Schmidt; Gitarre; 30"
                        : "Max Mustermann; Klavier; 30\nErika Musterfrau; Gesang; 45\nLeon Schmidt; Gitarre"
                    }
                    style={{
                      width: '100%',
                      boxSizing: 'border-box',
                      height: '110px',
                      borderRadius: '10px',
                      border: '1.5px solid #cbd5e1',
                      padding: '10px 12px',
                      fontSize: '0.78rem',
                      fontFamily: 'monospace',
                      outline: 'none',
                      resize: 'vertical',
                      background: '#ffffff',
                      lineHeight: '1.5'
                    }}
                  />

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                    <span style={{ fontSize: '0.7rem', color: '#64748b' }}>
                      Tipp: Mehrere Zeilen direkt aus Excel, Word oder Notizen kopieren und hier einfügen.
                    </span>
                    <button
                      type="button"
                      aria-label="Schüler jetzt importieren"
                      onClick={handleBatchImportStudents}
                      disabled={isImportingStudentsBatch || !studentCsvText.trim()}
                      className="hover-scale"
                      style={{
                        background: '#34a853',
                        color: '#ffffff',
                        border: 'none',
                        padding: '8px 18px',
                        borderRadius: '10px',
                        fontSize: '0.78rem',
                        fontWeight: 800,
                        cursor: isImportingStudentsBatch || !studentCsvText.trim() ? 'not-allowed' : 'pointer',
                        opacity: isImportingStudentsBatch || !studentCsvText.trim() ? 0.6 : 1,
                        boxShadow: '0 2px 8px rgba(52, 168, 83, 0.25)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      <Plus size={14} /> {isImportingStudentsBatch ? 'Erstelle Profile...' : 'Schüler jetzt importieren'}
                    </button>
                  </div>
                </div>
              );
            })()}

            {/* FILTER & SEARCH (Apple-like Control Bar) */}
            <div style={{ 
              display: 'flex', 
              gap: '6px', 
              background: 'rgba(248, 250, 252, 0.9)', 
              padding: '6px 10px', 
              borderRadius: '12px',
              border: '1px solid rgba(226, 232, 240, 0.9)',
              flexWrap: 'wrap',
              alignItems: 'center',
              width: '100%',
              boxSizing: 'border-box'
            }}>
              {/* Search Field */}
              <div style={{ flex: '1.2', minWidth: '150px', position: 'relative' }}>
                <Search size={13} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
                <input 
                  type="text" 
                  aria-label="Schüler suchen"
                  placeholder="Schüler suchen..." 
                  value={studentSearchQuery}
                  onChange={(e) => {
                    setStudentSearchQuery(e.target.value);
                    setStudentCurrentPage(1);
                  }}
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    height: '30px',
                    padding: '0 26px 0 28px',
                    borderRadius: '8px',
                    border: '1px solid rgba(203, 213, 225, 0.8)',
                    fontSize: '0.76rem',
                    outline: 'none',
                    background: '#ffffff',
                    color: '#0f172a',
                    fontWeight: 700,
                    fontFamily: 'Urbanist, -apple-system, sans-serif'
                  }}
                />
                {studentSearchQuery && (
                  <button
                    type="button"
                    aria-label="Suchbegriff löschen"
                    onClick={() => {
                      setStudentSearchQuery('');
                      setStudentCurrentPage(1);
                    }}
                    style={{
                      position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)',
                      background: '#cbd5e1', border: 'none', borderRadius: '50%', width: '14px', height: '14px',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'white', padding: 0
                    }}
                  >
                    <X size={10} />
                  </button>
                )}
              </div>

              {/* Instrument Select */}
              <div style={{ flex: '0.8', minWidth: '110px' }}>
                <select 
                  aria-label="Nach Instrument filtern"
                  value={studentFilterInstrument}
                  onChange={(e) => {
                    setStudentFilterInstrument(e.target.value);
                    setStudentCurrentPage(1);
                  }}
                  style={{ 
                    width: '100%', height: '30px', padding: '0 8px', borderRadius: '8px', 
                    border: '1px solid rgba(203, 213, 225, 0.8)', fontSize: '0.76rem', outline: 'none', 
                    background: '#ffffff', color: '#334155', fontWeight: 700, fontFamily: 'Urbanist, -apple-system, sans-serif',
                    cursor: 'pointer' 
                  }}
                >
                  <option value="All">Alle Instrumente</option>
                  {uniqueInstruments.map(inst => (
                    <option key={inst} value={inst}>{inst}</option>
                  ))}
                </select>
              </div>

              {/* Teacher Select */}
              <div style={{ flex: '0.9', minWidth: '110px' }}>
                <select 
                  aria-label="Nach Lehrkraft filtern"
                  value={studentFilterTeacher}
                  onChange={(e) => {
                    setStudentFilterTeacher(e.target.value);
                    setStudentCurrentPage(1);
                  }}
                  style={{ 
                    width: '100%', height: '30px', padding: '0 8px', borderRadius: '8px', 
                    border: '1px solid rgba(203, 213, 225, 0.8)', fontSize: '0.76rem', outline: 'none', 
                    background: '#ffffff', color: '#334155', fontWeight: 700, fontFamily: 'Urbanist, -apple-system, sans-serif',
                    cursor: 'pointer' 
                  }}
                >
                  <option value="All">Alle Lehrer</option>
                  <option value="none">Allgemein (kein Lehrer)</option>
                  {allUniqueTeachers.map(t => (
                    <option key={t.id} value={t.id}>{`${t.firstName || t.first_name || ''} ${t.lastName || t.last_name || ''}`.trim()}</option>
                  ))}
                </select>
              </div>

              {/* Status/Tariff Select */}
              <div style={{ flex: '0.7', minWidth: '100px' }}>
                <select
                  aria-label="Nach Status filtern"
                  value={studentFilterStatus}
                  onChange={(e) => {
                    setStudentFilterStatus(e.target.value as any);
                    setStudentCurrentPage(1);
                  }}
                  style={{ 
                    width: '100%', height: '30px', padding: '0 8px', borderRadius: '8px', 
                    border: '1px solid rgba(203, 213, 225, 0.8)', fontSize: '0.76rem', outline: 'none', 
                    background: '#ffffff', color: '#334155', fontWeight: 700, fontFamily: 'Urbanist, -apple-system, sans-serif',
                    cursor: 'pointer' 
                  }}
                >
                  <option value="all">Alle Tarife</option>
                  <option value="campus">Campus Aktiv</option>
                  <option value="groovelab">GrooveLab Aktiv</option>
                </select>
              </div>

              {/* Action Controls Group */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'nowrap' }}>
                {/* Select All Filtered Button */}
                <button
                  type="button"
                  aria-label={filteredStudents.length > 0 && filteredStudents.map((s: any) => s.id).every((id: string) => selectedStudentIds.includes(id)) ? 'Auswahl aller gefilterten Schüler aufheben' : 'Alle gefilterten Schüler auswählen'}
                  onClick={() => {
                    const filteredIds = filteredStudents.map((s: any) => s.id);
                    const allSelected = filteredIds.length > 0 && filteredIds.every((id: string) => selectedStudentIds.includes(id));
                    if (allSelected) {
                      setSelectedStudentIds(prev => prev.filter((id: string) => !filteredIds.includes(id)));
                    } else {
                      setSelectedStudentIds(prev => Array.from(new Set([...prev, ...filteredIds])));
                    }
                  }}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '4px',
                    borderRadius: '8px',
                    padding: '0 10px',
                    fontSize: '0.76rem',
                    fontWeight: 700,
                    background: '#ffffff',
                    border: '1px solid #cbd5e1',
                    color: '#334155',
                    cursor: 'pointer',
                    fontFamily: 'Urbanist, -apple-system, sans-serif',
                    height: '30px',
                    whiteSpace: 'nowrap'
                  }}
                  title="Alle gefilterten Schüler auswählen oder abwählen"
                >
                  <CheckSquare size={13} style={{ color: '#475569' }} />
                  <span>
                    {filteredStudents.length > 0 && filteredStudents.map((s: any) => s.id).every((id: string) => selectedStudentIds.includes(id))
                      ? 'Auswahl abwählen'
                      : 'Alle auswählen'}
                  </span>
                </button>

                {/* 👁️ Global Eye toggle */}
                <button
                  type="button"
                  aria-label={showRealNames ? "Klarnamen anzeigen" : "Nachnamen maskieren (Datenschutz)"}
                  onClick={() => toggleRealNames()}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '4px',
                    borderRadius: '8px',
                    padding: '0 10px',
                    fontSize: '0.76rem',
                    fontWeight: 700,
                    background: showRealNames ? '#ffffff' : '#fef3c7',
                    border: showRealNames ? '1px solid #cbd5e1' : '1px solid #fcd34d',
                    color: showRealNames ? '#475569' : '#b45309',
                    cursor: 'pointer',
                    fontFamily: 'Urbanist, -apple-system, sans-serif',
                    height: '30px',
                    whiteSpace: 'nowrap'
                  }}
                  title={showRealNames ? "Klarnamen (vollständige Nachnamen) anzeigen" : "Nachnamen wieder maskieren (Datenschutz)"}
                >
                  {showRealNames ? <Eye size={13} /> : <EyeOff size={13} />}
                  <span>{showRealNames ? "Klarnamen" : "DSGVO-Modus"}</span>
                </button>

                {/* Bulk Action Buttons */}
                {selectedStudentIds.length > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {/* Bulk Campus Button */}
                    <button
                      type="button"
                      aria-label={`Campus-Modul für ${selectedStudentIds.length} Schüler verwalten`}
                      onClick={async () => {
                        const choice = window.prompt(
                          `Campus-Modul für die ${selectedStudentIds.length} ausgewählten Schüler:\n\nTippe "1" zum AKTIVIEREN\nTippe "2" zum DEAKTIVIEREN\n(oder Abbrechen)`,
                          '1'
                        );
                        if (!choice || (choice !== '1' && choice !== '2')) return;
                        const activate = choice === '1';
                        const actionText = activate ? 'aktivieren' : 'deaktivieren';

                        if (!window.confirm(`Möchtest du das Campus-Modul für alle ${selectedStudentIds.length} ausgewählten Schüler wirklich ${actionText}?`)) {
                          return;
                        }

                        try {
                          const { data: existingUsers } = await supabase.from('users').select('id').in('id', selectedStudentIds);
                          const existingIds = new Set((existingUsers || []).map(u => u.id));

                          if (existingIds.size > 0) {
                            const { error: updateErr } = await supabase
                              .from('users')
                              .update({ is_campus_active: activate })
                              .in('id', Array.from(existingIds));
                            if (updateErr) throw updateErr;
                          }

                          const missingIds = selectedStudentIds.filter(id => !existingIds.has(id));
                          if (missingIds.length > 0) {
                            const missingStudents = students.filter(s => missingIds.includes(s.id));
                            const newUsers = missingStudents.map(s => ({
                              id: s.id,
                              school_id: s.school_id || schoolId,
                              role: 'student',
                              first_name: s.first_name || 'Schüler',
                              last_name: s.last_name || '',
                              instrument: s.instrument || 'Musiker',
                              teacher_id: s.teacher_id || null,
                              lesson_duration: s.lesson_duration || 30,
                              is_campus_active: activate,
                              is_groovelab_active: false,
                              is_active: false,
                              status: 'offen'
                            }));
                            const { error: insertErr } = await supabase.from('users').insert(newUsers);
                            if (insertErr) throw insertErr;
                          }

                          fetchDashboardData();
                          alert(`Campus-Modul für ${selectedStudentIds.length} Schüler ${activate ? 'aktiviert' : 'deaktiviert'}.`);
                        } catch (err: any) {
                          alert("Fehler beim Verarbeiten: " + err.message);
                        }
                      }}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '4px',
                        borderRadius: '8px',
                        padding: '0 10px',
                        fontSize: '0.76rem',
                        fontWeight: 800,
                        background: '#e6f4ea',
                        color: '#137333',
                        border: '1.5px solid #34a853',
                        cursor: 'pointer',
                        fontFamily: 'Urbanist, -apple-system, sans-serif',
                        height: '30px',
                        whiteSpace: 'nowrap'
                      }}
                      className="hover-scale"
                    >
                      <GraduationCap size={13} color="#34a853" />
                      <span>Campus ({selectedStudentIds.length})</span>
                    </button>

                    {/* Bulk GrooveLab Button */}
                    <button
                      type="button"
                      aria-label={`GrooveLab-Modul für ${selectedStudentIds.length} Schüler verwalten`}
                      onClick={async () => {
                        const choice = window.prompt(
                          `GrooveLab-Modul für die ${selectedStudentIds.length} ausgewählten Schüler:\n\nTippe "1" zum AKTIVIEREN\nTippe "2" zum DEAKTIVIEREN\n(oder Abbrechen)`,
                          '1'
                        );
                        if (!choice || (choice !== '1' && choice !== '2')) return;
                        const activate = choice === '1';
                        const actionText = activate ? 'aktivieren' : 'deaktivieren';

                        if (!window.confirm(`Möchtest du das GrooveLab-Modul für alle ${selectedStudentIds.length} ausgewählten Schüler wirklich ${actionText}?`)) {
                          return;
                        }

                        try {
                          const { data: existingUsers } = await supabase.from('users').select('id').in('id', selectedStudentIds);
                          const existingIds = new Set((existingUsers || []).map(u => u.id));

                          if (existingIds.size > 0) {
                            const updatePayload: any = { is_groovelab_active: activate };
                            if (activate) {
                              updatePayload.is_active = true;
                              updatePayload.is_app_user = true;
                              updatePayload.status = 'aktiv';
                            }
                            const { error: updateErr } = await supabase
                              .from('users')
                              .update(updatePayload)
                              .in('id', Array.from(existingIds));
                            if (updateErr) throw updateErr;
                          }

                          const missingIds = selectedStudentIds.filter(id => !existingIds.has(id));
                          if (missingIds.length > 0) {
                            const missingStudents = students.filter(s => missingIds.includes(s.id));
                            const newUsers = missingStudents.map(s => ({
                              id: s.id,
                              school_id: s.school_id || schoolId,
                              role: 'student',
                              first_name: s.first_name || 'Schüler',
                              last_name: s.last_name || '',
                              instrument: s.instrument || 'Musiker',
                              teacher_id: s.teacher_id || null,
                              lesson_duration: s.lesson_duration || 30,
                              is_campus_active: false,
                              is_groovelab_active: activate,
                              is_active: activate ? true : false,
                              is_app_user: activate ? true : false,
                              status: activate ? 'aktiv' : 'offen'
                            }));
                            const { error: insertErr } = await supabase.from('users').insert(newUsers);
                            if (insertErr) throw insertErr;
                          }

                          fetchDashboardData();
                          alert(`GrooveLab-Modul für ${selectedStudentIds.length} Schüler ${activate ? 'aktiviert' : 'deaktiviert'}.`);
                        } catch (err: any) {
                          alert("Fehler beim Verarbeiten: " + err.message);
                        }
                      }}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '4px',
                        borderRadius: '8px',
                        padding: '0 10px',
                        fontSize: '0.76rem',
                        fontWeight: 800,
                        background: '#fef3c7',
                        color: '#b45309',
                        border: '1.5px solid #eab308',
                        cursor: 'pointer',
                        fontFamily: 'Urbanist, -apple-system, sans-serif',
                        height: '30px',
                        whiteSpace: 'nowrap'
                      }}
                      className="hover-scale"
                    >
                      <Music size={13} color="#d97706" />
                      <span>GrooveLab ({selectedStudentIds.length})</span>
                    </button>

                    {/* Bulk Delete Action Button */}
                    <button
                      type="button"
                      aria-label={`Ausgewählte ${selectedStudentIds.length} Schüler löschen`}
                      onClick={() => {
                        setBulkDeleteStep(1);
                        setBulkDeletePin('');
                        setShowBulkDeleteModal(true);
                      }}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '4px',
                        borderRadius: '8px',
                        padding: '0 12px',
                        fontSize: '0.76rem',
                        fontWeight: 800,
                        background: 'linear-gradient(135deg, #ff3b30 0%, #dc2626 100%)',
                        color: '#ffffff',
                        border: 'none',
                        cursor: 'pointer',
                        height: '30px'
                      }}
                      title="Ausgewählte Schüler löschen"
                    >
                      <Trash2 size={13} color="#ffffff" />
                      <span>Löschen ({selectedStudentIds.length})</span>
                    </button>
                  </div>
                )}
              </div>
            </div>

               {/* TABLE HEADER ROW */}
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '12px', 
              padding: '6px 12px', 
              background: '#f8fafc', 
              borderRadius: '8px', 
              border: '1px solid #e2e8f0',
              fontSize: '0.72rem',
              fontWeight: 800,
              color: '#64748b',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              width: '100%',
              boxSizing: 'border-box',
              marginBottom: '6px'
            }}>
              <div style={{ flex: '0 0 20px', display: 'flex', justifyContent: 'center' }}>
                <input 
                  type="checkbox"
                  aria-label="Alle Schüler der aktuellen Ansicht auswählen"
                  checked={filteredStudents.length > 0 && filteredStudents.every((s: any) => selectedStudentIds.includes(s.id))}
                  onChange={(e) => {
                    const filteredIds = filteredStudents.map((s: any) => s.id);
                    if (e.target.checked) {
                      setSelectedStudentIds(prev => Array.from(new Set([...prev, ...filteredIds])));
                    } else {
                      setSelectedStudentIds(prev => prev.filter((id: string) => !filteredIds.includes(id)));
                    }
                  }}
                  style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: '#ea4335' }}
                />
              </div>
              <div style={{ flex: '1.6' }}>Schülername</div>
              <div style={{ flex: '1.1' }}>Instrument</div>
              <div style={{ flex: '1.2' }}>Lehrer</div>
              <div style={{ flex: '0.7' }}>Dauer</div>
              <div style={{ flex: '1.6' }}>Module & Zugänge</div>
              <div style={{ flex: '0 0 76px', textAlign: 'right' }}>Aktionen</div>
            </div>

            {/* LIST ROW VIEW CONTAINER (SPACIOUS 100% WIDTH - NO OVERLAPS) */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', overflowX: 'hidden', overflowY: 'auto', maxHeight: 'calc(100vh - 260px)', paddingRight: '2px', width: '100%' }}>
              {paginatedStudents.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '30px 14px', color: '#64748b', fontSize: '0.86rem', fontWeight: 700, width: '100%' }}>
                  Keine Schüler mit diesen Filtereinstellungen gefunden.
                </div>
              ) : (
                paginatedStudents.map((student: any) => {
                  const isSelected = selectedStudentIds.includes(student.id);
                  return (
                    <div 
                      key={student.id} 
                      draggable={true}
                      onDragStart={(e) => {
                        e.dataTransfer.setData("studentId", student.id);
                        e.dataTransfer.setData("text/plain", student.id);
                        e.dataTransfer.effectAllowed = "move";
                      }}
                      style={{ 
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        padding: '8px 12px',
                        borderRadius: '12px',
                        background: isSelected ? '#fef2f2' : '#ffffff',
                        border: isSelected ? '1.5px solid #fca5a5' : '1px solid #e2e8f0',
                        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.02)',
                        width: '100%',
                        boxSizing: 'border-box',
                        cursor: 'grab',
                        userSelect: 'none',
                        WebkitUserSelect: 'none',
                        transition: 'all 0.15s ease',
                        minHeight: '48px'
                      }}
                      className="student-drag-card virtual-row"
                    >
                      {/* Checkbox for Bulk Selection */}
                      <div 
                        onClick={(e) => e.stopPropagation()}
                        style={{ flex: '0 0 20px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      >
                        <input 
                          type="checkbox"
                          aria-label={`Schüler ${student.first_name} ${student.last_name} auswählen`}
                          checked={isSelected}
                          onChange={(e) => {
                            e.stopPropagation();
                            if (e.target.checked) {
                              setSelectedStudentIds(prev => [...prev, student.id]);
                            } else {
                              setSelectedStudentIds(prev => prev.filter(id => id !== student.id));
                            }
                          }}
                          style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: '#ea4335' }}
                        />
                      </div>

                      {/* Avatar & Name */}
                      <div 
                        role="button"
                        tabIndex={0}
                        aria-label={`Schülerdetails für ${student.first_name} ${maskLastName(student.last_name, showRealNames)} öffnen`}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            setSelectedStudentForDetail(student);
                          }
                        }}
                        onClick={() => setSelectedStudentForDetail(student)}
                        style={{ 
                          flex: '1.6', 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: '10px', 
                          minWidth: 0,
                          cursor: 'pointer'
                        }}
                        className="student-name-hover"
                      >
                        <div style={{
                          width: '34px',
                          height: '34px',
                          borderRadius: '50%',
                          background: getAvatarGradient(`${student.first_name || ''} ${student.last_name || ''}`),
                          color: getAvatarTextColor(`${student.first_name || ''} ${student.last_name || ''}`),
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '0.85rem',
                          fontWeight: 800,
                          flexShrink: 0
                        }}>
                          {(student.first_name?.[0] || '') + (student.last_name?.[0] || '')}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0, overflow: 'hidden' }}>
                          <span 
                            style={{ 
                              fontSize: '0.92rem', 
                              fontWeight: 800, 
                              color: '#0f172a', 
                              whiteSpace: 'nowrap', 
                              overflow: 'hidden', 
                              textOverflow: 'ellipsis'
                            }}
                            className="student-title-text"
                          >
                            {student.first_name} {maskLastName(student.last_name, showRealNames)}
                          </span>
                          {student.nickname && (
                            <span style={{ fontSize: '0.74rem', color: '#64748b', fontStyle: 'italic', whiteSpace: 'nowrap' }}>
                              „{student.nickname}“
                            </span>
                          )}
                          {student.is_campus_active && student.exempt_from_direct_billing && (
                            <span style={{ 
                              fontSize: '0.64rem', 
                              fontWeight: 800, 
                              color: '#6b21a8', 
                              background: '#f3e8ff', 
                              border: '1px solid #c084fc', 
                              padding: '1px 6px', 
                              borderRadius: '100px', 
                              whiteSpace: 'nowrap',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '2px'
                            }} title="Beitragsfrei befreit via Härtefall-Slot">
                              🎁 Härtefall
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Instrument Badge */}
                      <div style={{ flex: '1.1', minWidth: 0 }}>
                        <span style={{ 
                          display: 'block',
                          padding: '4px 8px', 
                          borderRadius: '8px', 
                          background: '#f8fafc', 
                          color: '#334155', 
                          fontSize: '0.82rem', 
                          fontWeight: 700,
                          textAlign: 'center',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          boxSizing: 'border-box',
                          border: '1px solid #e2e8f0'
                        }}>
                          {(() => {
                            if (!student.teacher_id) {
                              return 'Musiker';
                            }
                            const rawInst = student.instrument;
                            if (rawInst && rawInst !== 'Musiker' && rawInst !== 'Nicht festgelegt' && rawInst !== 'Instrument') {
                              return rawInst;
                            }
                            const teacherObj = allUniqueTeachers.find((t: any) => t.id === student.teacher_id);
                            return teacherObj?.instrument || 'Musiker';
                          })()}
                        </span>
                      </div>

                      {/* Teacher Select */}
                      <div style={{ flex: '1.2', minWidth: 0 }}>
                        <select
                          aria-label={`Lehrkraft für ${student.first_name} ${student.last_name}`}
                          value={student.teacher_id || ''}
                          onChange={(e) => {
                            handleUpdateStudentTeacher(student.id, e.target.value || null);
                          }}
                          style={{ 
                            width: '100%', 
                            padding: '4px 8px', 
                            height: '32px', 
                            borderRadius: '8px', 
                            fontSize: '0.82rem', 
                            fontWeight: 700, 
                            color: '#0f172a',
                            background: '#f8fafc',
                            border: '1px solid #cbd5e1',
                            outline: 'none',
                            cursor: 'pointer',
                            WebkitAppearance: 'none'
                          }}
                        >
                          <option value="">Ohne Zuweisung</option>
                          {allUniqueTeachers.map((t: any) => (
                            <option key={t.id} value={t.id}>{`${t.firstName || t.first_name || ''} ${t.lastName || t.last_name || ''}`.trim()}</option>
                          ))}
                        </select>
                      </div>

                      {/* Duration Select */}
                      <div style={{ flex: '0.7', minWidth: 0 }}>
                        <select
                          aria-label={`Unterrichtsdauer für ${student.first_name} ${student.last_name}`}
                          value={student.lesson_duration || 30}
                          onChange={async (e) => {
                            const newDur = parseInt(e.target.value);
                            try {
                              const { data: existingUser } = await supabase.from('users').select('id').eq('id', student.id).maybeSingle();
                              if (!existingUser) {
                                await supabase.from('users').insert({
                                  id: student.id,
                                  school_id: student.school_id || schoolId,
                                  role: 'student',
                                  first_name: student.first_name || 'Schüler',
                                  last_name: student.last_name || '',
                                  instrument: student.instrument || 'Musiker',
                                  teacher_id: student.teacher_id || null,
                                  lesson_duration: newDur,
                                  is_campus_active: !!student.is_campus_active,
                                  is_groovelab_active: !!student.is_groovelab_active,
                                  is_active: false
                                });
                              } else {
                                await supabase.from('users').update({ lesson_duration: newDur }).eq('id', student.id);
                              }
                              try {
                                await supabase.from('students').update({ lesson_duration: newDur }).eq('id', student.id);
                              } catch (e) {}
                              fetchDashboardData();
                            } catch (err: any) {
                              console.warn('duration update warning:', err);
                              fetchDashboardData();
                            }
                          }}
                          style={{ 
                            width: '100%', 
                            padding: '4px 6px', 
                            height: '32px', 
                            borderRadius: '8px', 
                            fontSize: '0.82rem', 
                            fontWeight: 700, 
                            color: '#0f172a',
                            background: '#f8fafc',
                            border: '1px solid #cbd5e1',
                            outline: 'none',
                            cursor: 'pointer',
                            WebkitAppearance: 'none'
                          }}
                        >
                          <option value={30}>30 Min</option>
                          <option value={45}>45 Min</option>
                          <option value={60}>60 Min</option>
                          <option value={90}>90 Min</option>
                        </select>
                      </div>

                      {/* Integrated Module Chips (Campus & GrooveLab) */}
                      <div style={{ flex: '1.6', display: 'flex', gap: '6px', minWidth: 0, flexShrink: 0 }}>
                        {/* Campus Chip with Direct 1-Click Toggle */}
                        <button
                          type="button"
                          aria-label={`Campus-Modul für ${student.first_name} ${student.last_name} ${student.is_campus_active ? 'deaktivieren' : 'aktivieren'}`}
                          onClick={() => {
                            if (handleToggleStudentModule) {
                              handleToggleStudentModule(student, 'campus');
                            }
                          }}
                          style={{
                            flex: 1,
                            padding: '4px 6px',
                            height: '32px',
                            borderRadius: '8px',
                            border: student.is_campus_active 
                              ? (student.exempt_from_direct_billing ? '1px solid #c084fc' : (student.isPendingOnboarding ? '1.5px dashed #34a853' : '1px solid #34a853')) 
                              : '1px solid #e2e8f0',
                            fontSize: '0.78rem',
                            fontWeight: 800,
                            cursor: (!isBillingBooked || hasCampusSub) ? 'pointer' : 'not-allowed',
                            background: student.is_campus_active 
                              ? (student.exempt_from_direct_billing ? 'linear-gradient(135deg, #f3e8ff 0%, #e9d5ff 100%)' : (student.isPendingOnboarding ? '#e6f4ea' : '#34a853')) 
                              : '#f8fafc',
                            color: student.is_campus_active 
                              ? (student.exempt_from_direct_billing ? '#6b21a8' : (student.isPendingOnboarding ? '#137333' : '#ffffff')) 
                              : '#64748b',
                            opacity: (!isBillingBooked || hasCampusSub) ? 1 : 0.45,
                            whiteSpace: 'nowrap',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '4px',
                            transition: 'all 0.15s ease'
                          }}
                          title={
                            student.is_campus_active 
                              ? (student.exempt_from_direct_billing 
                                  ? "Campus aktiv (Härtefall - von Musikschule übernommen: 0,49 €/Mo.)" 
                                  : (student.isPendingOnboarding 
                                      ? "Campus gebucht (Einladung offen - PIN noch nicht eingelöst)" 
                                      : "Campus aktiv (Klick zum Deaktivieren)")) 
                              : (billingPayer === 'student' 
                                  ? "Campus nicht aktiv (Klick zum Aktivieren)" 
                                  : "Campus nicht gebucht (Klick zum Aktivieren)")
                          }
                        >
                          <span>
                            {student.is_campus_active 
                              ? (student.exempt_from_direct_billing 
                                  ? <HeartHandshake size={13} style={{ color: '#6b21a8' }} /> 
                                  : (student.isPendingOnboarding 
                                      ? <span className="pulse-open-circle">○</span> 
                                      : '●')) 
                              : '+'}
                          </span>
                          <span>Campus</span>
                        </button>

                        {/* GrooveLab Chip with Direct 1-Click Toggle */}
                        <button
                          type="button"
                          aria-label={`GrooveLab-Modul für ${student.first_name} ${student.last_name} ${student.is_groovelab_active ? 'deaktivieren' : 'aktivieren'}`}
                          onClick={() => {
                            if (handleToggleStudentModule) {
                              handleToggleStudentModule(student, 'groovelab');
                            }
                          }}
                          style={{
                            flex: 1,
                            padding: '4px 6px',
                            height: '32px',
                            borderRadius: '8px',
                            border: student.is_groovelab_active 
                              ? (student.isPendingOnboarding ? '1.5px dashed #eab308' : '1px solid #eab308') 
                              : '1px solid #e2e8f0',
                            fontSize: '0.78rem',
                            fontWeight: 800,
                            cursor: (!isBillingBooked || hasGroovelabSub) ? 'pointer' : 'not-allowed',
                            whiteSpace: 'nowrap',
                            background: student.is_groovelab_active 
                              ? (student.isPendingOnboarding ? '#fefce8' : '#eab308') 
                              : '#f8fafc',
                            color: student.is_groovelab_active 
                              ? (student.isPendingOnboarding ? '#a16207' : '#0f172a') 
                              : '#64748b',
                            opacity: (!isBillingBooked || hasGroovelabSub) ? 1 : 0.45,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '4px',
                            transition: 'all 0.15s ease'
                          }}
                          title={
                            student.is_groovelab_active 
                              ? (student.isPendingOnboarding 
                                  ? "GrooveLab gebucht (Einladung offen - PIN noch nicht eingelöst)" 
                                  : "GrooveLab aktiv (Band- & Song-Modul • Klick zum Deaktivieren)") 
                              : "GrooveLab nicht gebucht (Klick zum Aktivieren)"
                          }
                        >
                          <span>
                            {student.is_groovelab_active 
                              ? (student.isPendingOnboarding 
                                  ? <span className="pulse-open-circle">○</span> 
                                  : '●') 
                              : '+'}
                          </span>
                          <span>GrooveLab</span>
                        </button>
                      </div>

                      {/* Aktionen Column (Direct Delete + 3-Dots Menu) */}
                      <div style={{ flex: '0 0 76px', display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'flex-end', flexShrink: 0 }}>
                        {/* Direct Red Delete Button */}
                        <button
                          type="button"
                          aria-label={`Schüler ${student.first_name} ${student.last_name} löschen`}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteStudentCampus(
                              student.id, 
                              `${student.first_name || ''} ${student.last_name || ''}`.trim(),
                              student.instrument,
                              student.teacher_id,
                              student.is_campus_active,
                              student.is_groovelab_active
                            );
                          }}
                          style={{
                            background: '#fef2f2',
                            border: '1px solid #fca5a5',
                            borderRadius: '8px',
                            width: '32px',
                            height: '32px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            color: '#dc2626',
                            transition: 'all 0.15s ease',
                            flexShrink: 0
                          }}
                          className="hover-scale"
                          title="Schüler löschen"
                        >
                          <Trash2 size={15} color="#dc2626" />
                        </button>

                        {/* ⋮ 3-Dots Options Menu Button */}
                        <button
                          type="button"
                          aria-label={`Weitere Optionen für ${student.first_name} ${student.last_name}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (activeContextMenu?.student?.id === student.id) {
                              setActiveContextMenu(null);
                            } else {
                              const rect = e.currentTarget.getBoundingClientRect();
                              setActiveContextMenu({
                                student: student,
                                top: rect.bottom + 6,
                                right: Math.max(12, window.innerWidth - rect.right)
                              });
                            }
                          }}
                          style={{
                            background: activeContextMenu?.student?.id === student.id ? '#e2e8f0' : '#f1f5f9',
                            border: '1px solid #cbd5e1',
                            borderRadius: '8px',
                            width: '32px',
                            height: '32px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            color: '#475569',
                            transition: 'all 0.15s ease',
                            flexShrink: 0
                          }}
                          className="hover-scale"
                          title="Weitere Aktionen (PIN, Geburtstag)"
                        >
                          <MoreVertical size={16} />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* PAGINATION CONTROLS */}
            {totalPages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', borderTop: '1px solid #e2e8f0', paddingTop: '12px' }}>
                <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700 }}>
                  Zeige {startIndex + 1} bis {Math.min(startIndex + studentPageSize, totalCount)} von {totalCount} gefilterten Schülern (Seite {safeCurrentPage} von {totalPages})
                </span>

                <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                  <button 
                    type="button"
                    aria-label="Erste Seite"
                    onClick={() => setStudentCurrentPage(1)}
                    disabled={safeCurrentPage === 1}
                    style={{ 
                      padding: '5px 8px', 
                      borderRadius: '6px', 
                      border: '1px solid #cbd5e1', 
                      background: '#ffffff', 
                      fontSize: '0.7rem', 
                      fontWeight: 800, 
                      cursor: safeCurrentPage === 1 ? 'not-allowed' : 'pointer',
                      opacity: safeCurrentPage === 1 ? 0.5 : 1
                    }}
                  >
                    ⏪
                  </button>
                  <button 
                    type="button"
                    aria-label="Vorherige Seite"
                    onClick={() => setStudentCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={safeCurrentPage === 1}
                    style={{ 
                      padding: '5px 8px', 
                      borderRadius: '6px', 
                      border: '1px solid #cbd5e1', 
                      background: '#ffffff', 
                      fontSize: '0.7rem', 
                      fontWeight: 800, 
                      cursor: safeCurrentPage === 1 ? 'not-allowed' : 'pointer',
                      opacity: safeCurrentPage === 1 ? 0.5 : 1
                    }}
                  >
                    ◀ Zurück
                  </button>

                  <span style={{ fontSize: '0.72rem', color: '#0f172a', fontWeight: 800, padding: '0 8px' }}>
                    {safeCurrentPage} / {totalPages}
                  </span>

                  <button 
                    type="button"
                    aria-label="Nächste Seite"
                    onClick={() => setStudentCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={safeCurrentPage === totalPages}
                    style={{ 
                      padding: '5px 8px', 
                      borderRadius: '6px', 
                      border: '1px solid #cbd5e1', 
                      background: '#ffffff', 
                      fontSize: '0.7rem', 
                      fontWeight: 800, 
                      cursor: safeCurrentPage === totalPages ? 'not-allowed' : 'pointer',
                      opacity: safeCurrentPage === totalPages ? 0.5 : 1
                    }}
                  >
                    Vor ▶
                  </button>

                  <button 
                    type="button"
                    aria-label="Letzte Seite"
                    onClick={() => setStudentCurrentPage(totalPages)}
                    disabled={safeCurrentPage === totalPages}
                    style={{ 
                      padding: '5px 8px', 
                      borderRadius: '6px', 
                      border: '1px solid #cbd5e1', 
                      background: '#ffffff', 
                      fontSize: '0.7rem', 
                      fontWeight: 800, 
                      cursor: safeCurrentPage === totalPages ? 'not-allowed' : 'pointer',
                      opacity: safeCurrentPage === totalPages ? 0.5 : 1
                    }}
                  >
                    ⏩
                  </button>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700 }}>Einträge pro Seite:</span>
                  <select
                    aria-label="Einträge pro Seite auswählen"
                    value={studentPageSize}
                    onChange={(e) => {
                      setStudentPageSize(parseInt(e.target.value));
                      setStudentCurrentPage(1);
                    }}
                    style={{ padding: '3px 6px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.72rem', fontWeight: 800 }}
                  >
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                    <option value={200}>200</option>
                  </select>
                </div>
              </div>
            )}
          </div>



        {/* MANAGE STUDENT MODAL */}
        {showAddStudentModal && (
          <div 
            role="dialog"
            aria-modal="true"
            aria-labelledby="manage-student-modal-title"
            onClick={(e) => {
              if (e.target === e.currentTarget) setShowAddStudentModal(false);
            }}
            style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(15,23,42,0.3)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}
          >
            <div style={{ background: '#ffffff', borderRadius: '24px', maxWidth: '520px', width: '100%', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', animation: 'modalFadeIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)', display: 'flex', flexDirection: 'column' }}>
              
              {/* Modal Header */}
              <div style={{ padding: '24px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 id="manage-student-modal-title" style={{ margin: 0, fontSize: '1.15rem', fontWeight: 900, color: '#0f172a', fontFamily: 'Urbanist' }}>
                  ➕ Neuen Schüler anlegen
                </h3>
                <button 
                  type="button"
                  aria-label="Dialog schließen"
                  onClick={() => setShowAddStudentModal(false)}
                  style={{ border: 'none', background: 'transparent', fontSize: '1.2rem', cursor: 'pointer', color: '#64748b' }}
                >
                  ✕
                </button>
              </div>

              {/* Modal Body */}
              <form onSubmit={handleCreateStudentCampus} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto', maxHeight: '75vh' }}>
                
                {/* Form fields */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#475569' }}>Vorname *</label>
                    <input 
                      type="text" 
                      required
                      value={newStudentFirstName}
                      onChange={(e) => setNewStudentFirstName(e.target.value)}
                      placeholder="z.B. Max"
                      style={{ padding: '10px 14px', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '0.85rem', outline: 'none' }}
                    />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#475569' }}>Nachname *</label>
                    <input 
                      type="text" 
                      required
                      value={newStudentLastName}
                      onChange={(e) => setNewStudentLastName(e.target.value)}
                      placeholder="z.B. Mustermann"
                      style={{ padding: '10px 14px', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '0.85rem', outline: 'none' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#475569' }}>Spitzname / Rufname (optional)</label>
                  <input 
                    type="text" 
                    value={newStudentNickname}
                    onChange={(e) => setNewStudentNickname(e.target.value)}
                    placeholder="z.B. Mäxi"
                    style={{ padding: '10px 14px', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '0.85rem', outline: 'none' }}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#475569' }}>Instrumente *</label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', maxHeight: '180px', overflowY: 'auto', padding: '10px 14px', border: '1px solid #cbd5e1', borderRadius: '12px' }}>
                      {INSTRUMENT_TAGS.map((tag) => {
                        const checked = newStudentInstrument.split(',').map(s => s.trim()).includes(tag);
                        return (
                          <label key={tag} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: '#334155', cursor: 'pointer' }}>
                            <input
                              type="checkbox"
                              aria-label={`Instrument ${tag}`}
                              checked={checked}
                              onChange={(e) => {
                                const currentChecked = newStudentInstrument ? newStudentInstrument.split(',').map(s => s.trim()).filter(Boolean) : [];
                                let nextChecked: string[];
                                if (e.target.checked) {
                                  nextChecked = [...currentChecked, tag];
                                } else {
                                  nextChecked = currentChecked.filter(s => s !== tag);
                                }
                                setNewStudentInstrument(nextChecked.join(', '));
                              }}
                              style={{ accentColor: '#ea4335', width: '16px', height: '16px', cursor: 'pointer' }}
                            />
                            {tag}
                          </label>
                        );
                      })}
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#475569' }}>Unterrichtsdauer</label>
                    <select
                      aria-label="Unterrichtsdauer"
                      value={newStudentDuration}
                      onChange={(e) => setNewStudentDuration(parseInt(e.target.value))}
                      style={{ padding: '10px 14px', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '0.85rem', outline: 'none', background: 'white' }}
                    >
                      <option value={30}>30 Min (Standard)</option>
                      <option value={45}>45 Min</option>
                      <option value={60}>60 Min</option>
                      <option value={90}>90 Min</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#475569' }}>Zugeordneter Hauptlehrer</label>
                    <select
                      aria-label="Zugeordneter Hauptlehrer"
                      value={newStudentTeacherId}
                      onChange={(e) => setNewStudentTeacherId(e.target.value)}
                      style={{ padding: '10px 14px', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '0.85rem', outline: 'none', background: 'white' }}
                    >
                      <option value="">Allgemein</option>
                      {allUniqueTeachers.map((t: any) => (
                        <option key={t.id} value={t.id}>{t.firstName || t.first_name} {t.lastName || t.last_name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Status Toggles */}
                <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <strong style={{ display: 'block', fontSize: '0.82rem', color: '#1e293b' }}>Campus Modul aktiv</strong>
                      <span style={{ fontSize: '0.68rem', color: '#64748b' }}>Aktiviert die Teilnahme an den Campus-Stundenplänen.</span>
                    </div>
                    <input 
                      type="checkbox" 
                      aria-label="Campus Modul aktiv"
                      checked={newStudentIsCampusActive}
                      onChange={(e) => setNewStudentIsCampusActive(e.target.checked)}
                      style={{ accentColor: '#34a853', width: '18px', height: '18px' }}
                    />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #f1f5f9', paddingTop: '8px' }}>
                    <div>
                      <strong style={{ display: 'block', fontSize: '0.82rem', color: '#1e293b' }}>GrooveLab Modul aktiv</strong>
                      <span style={{ fontSize: '0.68rem', color: '#64748b' }}>Erlaubt dem Schüler die Nutzung der GrooveLab-App.</span>
                    </div>
                    <input 
                      type="checkbox" 
                      aria-label="GrooveLab Modul aktiv"
                      checked={newStudentIsGroovelabActive}
                      onChange={(e) => setNewStudentIsGroovelabActive(e.target.checked)}
                      style={{ accentColor: '#ea4335', width: '18px', height: '18px' }}
                    />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #f1f5f9', paddingTop: '8px' }}>
                    <div>
                      <strong style={{ display: 'block', fontSize: '0.82rem', color: '#1e293b' }}>Direkter App-Nutzer (Tablet PIN)</strong>
                      <span style={{ fontSize: '0.68rem', color: '#64748b' }}>Erstellt direkt einen App-PIN. Sonst wird ein Eltern-Link generiert.</span>
                    </div>
                    <input 
                      type="checkbox" 
                      aria-label="Direkter App-Nutzer (Tablet PIN)"
                      checked={newStudentIsAppUser}
                      onChange={(e) => setNewStudentIsAppUser(e.target.checked)}
                      style={{ accentColor: '#2563eb', width: '18px', height: '18px' }}
                    />
                  </div>
                </div>

                {/* Submit button */}
                <button
                  type="submit"
                  className="google-btn-primary"
                  style={{ background: '#34a853', color: '#ffffff', border: 'none', borderRadius: '12px', padding: '8px', fontSize: '0.85rem', fontWeight: 800, cursor: 'pointer', marginTop: '8px' }}
                >
                  Schüler anlegen
                </button>
              </form>
            </div>
          </div>
        )}
      </>
    );

};
