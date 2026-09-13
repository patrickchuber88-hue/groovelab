import React from 'react';
import {
  BookOpen, Calendar, CalendarX, Check, CheckCircle, ChevronRight,
  ClipboardList, Clock, DoorOpen, HardDrive, Music, ShieldAlert,
  UserCheck, Wrench
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { UpdateAnnouncementHero } from '../common/UpdateAnnouncementHero';
import { getDynamicAnnualPrice } from './licenses/licenseUtils';
import { formatCleanNoteContent } from '../notes/notesConstants';
import { notesService } from '../../services/notesService';
import { formatTeacherFullName } from '../../utils/nameHelper';

export interface SecretaryBriefingViewProps {
  currentSchoolProfile: any;
  setCurrentSchoolProfile: React.Dispatch<React.SetStateAction<any>>;
  currentUserProfile: any;
  userId?: string;
  schoolId: string;
  schoolNumericId: string | number;
  activeTab: string;
  setActiveTab: (tab: any) => void;
  secretarySubTab: string;
  setSecretarySubTab: (tab: any) => void;
  campusSubTab: string;
  setCampusSubTab: (tab: any) => void;
  schedulesRoomsViewMode: string;
  setSchedulesRoomsViewMode: (mode: any) => void;
  expandedSidebarTeacherId: string | null;
  setExpandedSidebarTeacherId: (id: any) => void;
  selectedFilterTeacherId: string | null;
  setSelectedFilterTeacherId: (id: any) => void;
  pendingBookings: any[];
  setPendingBookings?: React.Dispatch<React.SetStateAction<any[]>>;
  roomIssues: any[];
  setRoomIssues: React.Dispatch<React.SetStateAction<any[]>>;
  rooms: any[];
  students: any[];
  campusTeachers: any[];
  bypassTeachers: any[];
  coaches: any[];
  matrixAllocations: any[];
  pendingSchedules: any[];
  userMap: Record<string, any>;
  roomMap: Record<string, any>;
  isAvvSigned: boolean;
  setShowAvvModal?: (show: boolean) => void;
  showLogbookModal: boolean;
  setShowLogbookModal: (show: boolean) => void;
  showStorageManagerModal: boolean;
  setShowStorageManagerModal: (show: boolean) => void;
  dismissedInvoiceAlert: boolean;
  setDismissedInvoiceAlert: (dismissed: boolean) => void;
  studentBillingOption: string;
  isBillingBooked: boolean;
  bookedExtraUsers: number;
  extraBillingOption: string;
  selectedStorageAddonGb: number;
  setSelectedStorageAddonGb: React.Dispatch<React.SetStateAction<number>>;
  selectedInvoice: any;
  setSelectedInvoice: (inv: any) => void;
  contractStartDate: string | null;
  simulatedToday: string;
  studentLevyMonthly_global: number;
  extraLevyMonthly_global: number;
  studentSharePreview_global: number;
  schoolShareBookedExtra_global: number;
  currentTotalB2B_global: number;
  mixedTotal_global: number;
  fetchLogbookBookings: () => Promise<void> | void;
  handleConfirmBooking: (id: string) => Promise<void> | void;
  handleRejectBooking: (id: string) => Promise<void> | void;
  getEffectiveStorageUsedBytes: (profile: any) => number;
  roomsSubView?: 'overview' | 'plan' | 'settings';
  setRoomsSubView?: (view: 'overview' | 'plan' | 'settings') => void;
  roomSearchQuery?: string;
  setRoomSearchQuery?: React.Dispatch<React.SetStateAction<string>>;
}

export const SecretaryBriefingView: React.FC<SecretaryBriefingViewProps> = ({
  currentSchoolProfile,
  setCurrentSchoolProfile,
  currentUserProfile,
  userId,
  schoolId,
  schoolNumericId,
  activeTab,
  setActiveTab,
  secretarySubTab,
  setSecretarySubTab,
  campusSubTab,
  setCampusSubTab,
  schedulesRoomsViewMode,
  setSchedulesRoomsViewMode,
  expandedSidebarTeacherId,
  setExpandedSidebarTeacherId,
  selectedFilterTeacherId,
  setSelectedFilterTeacherId,
  pendingBookings,
  setPendingBookings,
  roomIssues,
  setRoomIssues,
  rooms,
  students,
  campusTeachers,
  bypassTeachers,
  coaches,
  matrixAllocations,
  pendingSchedules,
  userMap,
  roomMap,
  isAvvSigned,
  setShowAvvModal,
  showLogbookModal,
  setShowLogbookModal,
  showStorageManagerModal,
  setShowStorageManagerModal,
  dismissedInvoiceAlert,
  setDismissedInvoiceAlert,
  studentBillingOption,
  isBillingBooked,
  bookedExtraUsers,
  extraBillingOption,
  selectedStorageAddonGb,
  setSelectedStorageAddonGb,
  selectedInvoice,
  setSelectedInvoice,
  contractStartDate,
  simulatedToday,
  studentLevyMonthly_global,
  extraLevyMonthly_global,
  studentSharePreview_global,
  schoolShareBookedExtra_global,
  currentTotalB2B_global,
  mixedTotal_global,
  fetchLogbookBookings,
  handleConfirmBooking,
  handleRejectBooking,
  getEffectiveStorageUsedBytes,
  roomsSubView,
  setRoomsSubView,
  roomSearchQuery,
  setRoomSearchQuery,
}) => {
            const todayDayNum = new Date().getDay() === 0 ? 7 : new Date().getDay();
            const todayDateStr = new Date().toISOString().split('T')[0];

            // 1. Raumauslastung Heute
            const todayAllocations = matrixAllocations.filter(p => p.dayOfWeek === todayDayNum && p.roomId);
            const totalSlotsCount = rooms.length * 8; // standard 8 slots per room per day
            const roomOccupancyRate = totalSlotsCount > 0 ? Math.round((todayAllocations.length / totalSlotsCount) * 100) : 0;

            // 2. Heutige Abwesenheiten
            const activeSickTeachers = [...campusTeachers, ...bypassTeachers, ...coaches].filter(t => {
              if (!t.sick_until) return false;
              return t.sick_until.substring(0, 10) >= todayDateStr;
            }).reduce((acc: any[], current) => {
              if (!acc.some(item => item.id === current.id)) {
                acc.push(current);
              }
              return acc;
            }, []);

            // 3. Schüler-Aktivierungsquote
            const totalStudentsCount = students.length;
            const activeStudentsCount = students.filter(s => s.is_pin_activated).length;
            const activationRate = totalStudentsCount > 0 ? Math.round((activeStudentsCount / totalStudentsCount) * 100) : 0;

            // 4. Systemische Termin-Konflikte (Overlap checkers - Refined & Human-Friendly)
            const scheduleConflicts = (() => {
              interface ScheduleConflictItem {
                id: string;
                title?: string;
                type: 'room' | 'teacher';
                dayOfWeek: number;
                dayLabel: string;
                startTime: string;
                endTime: string;
                summarySentence: string;
                teacherId: string;
                teacherNameA: string;
                teacherNameB?: string;
                studentsA: string;
                studentsB: string;
                roomId?: string;
                roomNameA?: string;
                roomNameB?: string;
                timeA: string;
                timeB: string;
              }

              const getStudentNames = (block: any) => {
                if (!block || !Array.isArray(block.slots) || block.slots.length === 0) {
                  return '';
                }
                const names = block.slots
                  .map((s: any) => s.student_name || (s.student_id ? (userMap[s.student_id] || '') : ''))
                  .filter((n: string) => n && n !== 'Pause');
                return names.length > 0 ? names.join(', ') : '';
              };

              const getTeacherName = (block: any) => {
                if (!block || block.teacherId === 'groovelab' || block.id?.startsWith('groovelab_')) return '';
                return block.teacherName || (block.teacherId ? (userMap[block.teacherId] || '') : '') || '';
              };

              const isRealBlock = (block: any) => {
                if (!block) return false;
                if (block.teacherId === 'groovelab' || block.id?.startsWith('groovelab_')) return false;
                const students = getStudentNames(block);
                return students.length > 0;
              };

              const list: ScheduleConflictItem[] = [];
              
              // Room conflicts
              const byRoomDay: Record<string, any[]> = {};
              matrixAllocations
                .filter(p => p.roomId && isRealBlock(p))
                .forEach(p => {
                  const k = `${p.roomId}_${p.dayOfWeek}`;
                  if (!byRoomDay[k]) byRoomDay[k] = [];
                  byRoomDay[k].push(p);
                });

              Object.entries(byRoomDay).forEach(([k, group]) => {
                if (group.length > 1) {
                  group.forEach((p, i) => {
                    group.forEach((q, j) => {
                      if (i < j && p.startTime < q.endTime && q.startTime < p.endTime) {
                        const roomName = roomMap[p.roomId] || 'Raum';
                        const days = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'];
                        const dayLabel = days[p.dayOfWeek - 1] || 'Wochentag';
                        const teacherA = getTeacherName(p) || 'Lehrkraft A';
                        const teacherB = getTeacherName(q) || 'Lehrkraft B';
                        const studsA = getStudentNames(p) || 'Schüler';
                        const studsB = getStudentNames(q) || 'Schüler';

                        list.push({
                          id: `room_${p.id}_${q.id}`,
                          type: 'room',
                          dayOfWeek: p.dayOfWeek,
                          dayLabel,
                          startTime: p.startTime < q.startTime ? p.startTime : q.startTime,
                          endTime: p.endTime > q.endTime ? p.endTime : q.endTime,
                          summarySentence: `Der Raum "${roomName}" ist am ${dayLabel} um ${p.startTime} Uhr doppelt belegt.`,
                          teacherId: p.teacherId,
                          teacherNameA: teacherA,
                          teacherNameB: teacherB,
                          studentsA: studsA,
                          studentsB: studsB,
                          roomId: p.roomId,
                          roomNameA: roomName,
                          roomNameB: roomName,
                          timeA: `${p.startTime}-${p.endTime}`,
                          timeB: `${q.startTime}-${q.endTime}`
                        });
                      }
                    });
                  });
                }
              });

              // Teacher conflicts
              const byTeacherDay: Record<string, any[]> = {};
              matrixAllocations
                .filter(p => isRealBlock(p))
                .forEach(p => {
                  if (p.teacherId && p.teacherId !== 'groovelab') {
                    const k = `${p.teacherId}_${p.dayOfWeek}`;
                    if (!byTeacherDay[k]) byTeacherDay[k] = [];
                    byTeacherDay[k].push(p);
                  }
                });

              Object.entries(byTeacherDay).forEach(([k, group]) => {
                if (group.length > 1) {
                  group.forEach((p, i) => {
                    group.forEach((q, j) => {
                      if (i < j && p.startTime < q.endTime && q.startTime < p.endTime) {
                        const teacherName = getTeacherName(p) || 'Lehrkraft';
                        const days = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'];
                        const dayLabel = days[p.dayOfWeek - 1] || 'Wochentag';
                        const studsA = getStudentNames(p) || 'Schüler';
                        const studsB = getStudentNames(q) || 'Schüler';
                        const rNameA = p.roomId ? (roomMap[p.roomId] || 'Raum') : 'Ohne Raumzuweisung';
                        const rNameB = q.roomId ? (roomMap[q.roomId] || 'Raum') : 'Ohne Raumzuweisung';

                        list.push({
                          id: `teacher_${p.id}_${q.id}`,
                          type: 'teacher',
                          dayOfWeek: p.dayOfWeek,
                          dayLabel,
                          startTime: p.startTime < q.startTime ? p.startTime : q.startTime,
                          endTime: p.endTime > q.endTime ? p.endTime : q.endTime,
                          summarySentence: `${teacherName} ist am ${dayLabel} um ${p.startTime} Uhr zeitgleich an 2 Terminen gebucht.`,
                          teacherId: p.teacherId,
                          teacherNameA: teacherName,
                          studentsA: studsA,
                          studentsB: studsB,
                          roomId: p.roomId,
                          roomNameA: rNameA,
                          roomNameB: rNameB,
                          timeA: `${p.startTime}-${p.endTime}`,
                          timeB: `${q.startTime}-${q.endTime}`
                        });
                      }
                    });
                  });
                }
              });
              
              return list;
            })();

            return (
              <div 
                role="tabpanel"
                id="secretary-briefing-tabpanel"
                aria-label="Sekretariat Briefing Übersicht"
                tabIndex={0}
                style={{ display: 'grid', gridTemplateColumns: typeof window !== 'undefined' && window.innerWidth < 1024 ? '1fr' : '1fr 360px', gap: '24px', alignItems: 'start' }}
              >
                
                {/* LEFT COLUMN: MAIN CONTENT AREA */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                  {/* Community Update & Helden-Moment Hero */}
                  <UpdateAnnouncementHero userId={userId} activePlatform={activeTab} />


                  {/* ⏳ Active Audio-Tresor Termination & Grace Period Monitor */}
                  {(() => {
                    const termStatus = currentSchoolProfile?.storage_termination_status;
                    const termDeadline = currentSchoolProfile?.storage_termination_deadline;
                    if (termStatus !== 'active_grace_period') return null;

                    const deadlineDate = termDeadline ? new Date(termDeadline) : new Date();
                    const now = new Date();
                    const diffDays = Math.max(0, Math.ceil((deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
                    const deadlineStr = deadlineDate.toLocaleDateString('de-DE', { day: 'numeric', month: 'long', year: 'numeric' });

                    // Count how many students have downloaded backup
                    let downloadedCount = 0;
                    for (let i = 0; i < localStorage.length; i++) {
                      const k = localStorage.key(i);
                      if (k && k.startsWith('campus_storage_backup_downloaded_') && localStorage.getItem(k) === 'true') {
                        downloadedCount++;
                      }
                    }
                    const totalStudents = students.length || 1;
                    const backupPct = Math.min(100, Math.round((downloadedCount / totalStudents) * 100));

                    return (
                      <div style={{
                        background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
                        border: '1.5px solid #86efac',
                        borderRadius: '24px',
                        padding: '20px 24px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '16px',
                        boxShadow: '0 10px 25px -5px rgba(34, 197, 94, 0.12)'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                          <div style={{
                            background: '#dcfce7',
                            borderRadius: '16px',
                            padding: '12px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            border: '1px solid #86efac'
                          }}>
                            <span style={{ fontSize: '1.5rem' }}>⏳</span>
                          </div>
                          <div>
                            <strong style={{ display: 'block', fontSize: '1rem', color: '#14532d', marginBottom: '4px' }}>
                              Audio-Tresor Kündigung aktiv • Stichtag: {deadlineStr} ({diffDays === 0 ? 'Heute!' : `noch ${diffDays} Tage`})
                            </strong>
                            <span style={{ fontSize: '0.84rem', color: '#166534', lineHeight: '1.4' }}>
                              {downloadedCount} von {totalStudents} Schülern haben ihre Aufnahmen bereits als ZIP gesichert ({backupPct}%).
                              Am Stichtag wird der Cloud-Speicher geleert und dein Tarif automatisch auf Standard (0,00 €) umgestellt.
                            </span>
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            type="button"
                            aria-label="Kündigung des Audio-Tresors abbrechen"
                            onClick={async () => {
                              if (confirm("Möchtest du die Kündigung abbrechen und den Audio-Tresor aktiv behalten?")) {
                                try {
                                  await supabase.from('schools').update({ storage_termination_status: 'cancelled', storage_termination_deadline: null }).eq('id', schoolId);
                                  const overridesStr = localStorage.getItem('groovelab_school_overrides') || '{}';
                                  const overrides = JSON.parse(overridesStr);
                                  if (overrides[schoolId]) {
                                    delete overrides[schoolId].storage_termination_status;
                                    delete overrides[schoolId].storage_termination_deadline;
                                    localStorage.setItem('groovelab_school_overrides', JSON.stringify(overrides));
                                  }
                                  setCurrentSchoolProfile((prev: any) => prev ? { ...prev, storage_termination_status: null, storage_termination_deadline: null } : prev);
                                  window.dispatchEvent(new Event('groovelab_school_updated'));
                                } catch (e) {}
                              }
                            }}
                            style={{
                              background: '#ffffff',
                              color: '#475569',
                              border: '1.5px solid #cbd5e1',
                              borderRadius: '12px',
                              padding: '9px 14px',
                              fontWeight: 800,
                              fontSize: '0.78rem',
                              cursor: 'pointer'
                            }}
                          >
                            Kündigung abbrechen
                          </button>
                          <button
                            type="button"
                            aria-label="Kündigung jetzt sofort ausführen und Cloud-Speicher leeren"
                            onClick={async () => {
                              if (confirm(`Möchtest du den Stichtag jetzt sofort ausführen? Der Cloud-Speicher wird geleert und dein Paket auf Standard (0,00 €) umgestellt.`)) {
                                try {
                                  await supabase.from('schools').update({
                                    storage_used_bytes: 0,
                                    storage_addon_gb: 0,
                                    storage_addon_monthly_fee: 0,
                                    storage_addon_status: 'active',
                                    storage_termination_status: 'completed'
                                  }).eq('id', schoolId);

                                  const overridesStr = localStorage.getItem('groovelab_school_overrides') || '{}';
                                  const overrides = JSON.parse(overridesStr);
                                  overrides[schoolId] = {
                                    ...(overrides[schoolId] || {}),
                                    storage_used_bytes: 0,
                                    storage_addon_gb: 0,
                                    storage_addon_monthly_fee: 0,
                                    storage_addon_status: 'active',
                                    storage_termination_status: 'completed'
                                  };
                                  localStorage.setItem('groovelab_school_overrides', JSON.stringify(overrides));
                                  localStorage.setItem('groovelab_storage_addon_active', 'false');
                                  localStorage.setItem('campus_storage_addon_active', 'false');
                                  localStorage.setItem('groovelab_storage_addon_gb', '0');
                                  localStorage.setItem('campus_storage_addon_gb', '0');

                                  setCurrentSchoolProfile((prev: any) => prev ? {
                                    ...prev,
                                    storage_used_bytes: 0,
                                    storage_addon_gb: 0,
                                    storage_addon_monthly_fee: 0,
                                    storage_addon_status: 'active',
                                    storage_termination_status: 'completed'
                                  } : prev);

                                  window.dispatchEvent(new Event('groovelab_school_updated'));
                                  alert("✅ Audio-Tresor erfolgreich bereinigt. Tarif wurde auf 0,00 € (Standard 1 GB) umgestellt.");
                                } catch (e: any) {
                                  alert("Fehler: " + e.message);
                                }
                              }
                            }}
                            style={{
                              background: '#16a34a',
                              color: '#ffffff',
                              border: 'none',
                              borderRadius: '12px',
                              padding: '9px 16px',
                              fontWeight: 800,
                              fontSize: '0.78rem',
                              cursor: 'pointer',
                              boxShadow: '0 4px 12px rgba(22, 163, 74, 0.25)'
                            }}
                          >
                            Stichtag jetzt ausführen (0,00 €)
                          </button>
                        </div>
                      </div>
                    );
                  })()}

                  {/* 🎙️ Enterprise Audio-Tresor Storage Proactive Capacity Monitor (85% & 95% Thresholds) */}
                  {(() => {
                    const activeAddonGb = Number(currentSchoolProfile?.storage_addon_gb || 0);
                    const baseGb = 1.0;
                    const currentTotalCapGb = baseGb + activeAddonGb;
                    const usedBytes = getEffectiveStorageUsedBytes(currentSchoolProfile);
                    const usedGb = usedBytes / (1024 * 1024 * 1024);
                    const usedMb = usedBytes / (1024 * 1024);
                    const usagePct = currentTotalCapGb > 0 ? (usedGb / currentTotalCapGb) * 100 : 0;
                    
                    if (usagePct < 80) return null;

                    const isFull = usagePct >= 100;
                    const isCritical = usagePct >= 95;
                    const formattedUsed = usedBytes > 0 && usedGb < 1.0 
                      ? `${usedMb.toFixed(1).replace('.', ',')} MB` 
                      : `${usedGb.toFixed(2).replace('.', ',')} GB`;
                    const nextTierGb = activeAddonGb < 10 ? 10 : activeAddonGb < 25 ? 25 : activeAddonGb < 50 ? 50 : activeAddonGb < 100 ? 100 : 250;

                    return (
                      <div style={{
                        background: isFull 
                          ? 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)' 
                          : isCritical 
                            ? 'linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%)' 
                            : 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)',
                        border: isFull ? '1.5px solid #f87171' : isCritical ? '1.5px solid #fdba74' : '1.5px solid #fde68a',
                        borderRadius: '24px',
                        padding: '20px 24px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '16px',
                        boxShadow: isFull 
                          ? '0 10px 25px -5px rgba(239, 68, 68, 0.16)' 
                          : '0 10px 25px -5px rgba(245, 158, 11, 0.10)'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                          <div style={{
                            background: isFull ? '#fee2e2' : isCritical ? '#ffedd5' : '#fef3c7',
                            borderRadius: '16px',
                            padding: '12px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            border: isFull ? '1px solid #fca5a5' : isCritical ? '1px solid #fed7aa' : '1px solid #fcd34d'
                          }}>
                            <HardDrive size={24} style={{ color: isFull ? '#dc2626' : isCritical ? '#ea580c' : '#d97706' }} />
                          </div>
                          <div>
                            <strong style={{ display: 'block', fontSize: '1rem', color: isFull ? '#991b1b' : isCritical ? '#9a3412' : '#92400e', marginBottom: '4px' }}>
                              {isFull
                                ? `🚨 Audio-Tresor voll: 100% Speicher belegt (${formattedUsed} von ${currentTotalCapGb} GB)`
                                : isCritical 
                                  ? `⚠️ Kritische Speicherauslastung: Audio-Tresor zu ${Math.round(usagePct)}% belegt!`
                                  : `⚠️ Speicher-Vorwarnung: Audio-Tresor zu ${Math.round(usagePct)}% belegt`
                              }
                            </strong>
                            <span style={{ fontSize: '0.84rem', color: isFull ? '#7f1d1d' : isCritical ? '#7c2d12' : '#78350f', lineHeight: '1.4' }}>
                              {formattedUsed} von {currentTotalCapGb} GB belegt. {isFull
                                ? 'Neue Audioaufnahmen sind vorübergehend pausiert. Alle bestehenden Aufnahmen bleiben 100% geschützt und abspielbar.'
                                : isCritical 
                                  ? 'Der Kulanz-Puffer ist aktiv. Bitte erweitere jetzt dein Speichervolumen, um Unterbrechungen im Unterricht zu vermeiden.' 
                                  : 'Erweitere rechtzeitig dein Speichervolumen, damit Schüler und Lehrkräfte weiterhin nahtlos in Studio-Qualität aufnehmen können.'
                              }
                            </span>
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                          <button
                            type="button"
                            aria-label={`Audio-Tresor Speichervolumen auf +${nextTierGb} GB erweitern`}
                            onClick={() => {
                              setSelectedStorageAddonGb(nextTierGb);
                              setShowStorageManagerModal(true);
                            }}
                            style={{
                              background: isFull ? '#dc2626' : isCritical ? '#ea580c' : '#d97706',
                              color: '#ffffff',
                              border: 'none',
                              borderRadius: '12px',
                              padding: '10px 18px',
                              fontWeight: 800,
                              fontSize: '0.84rem',
                              cursor: 'pointer',
                              whiteSpace: 'nowrap',
                              boxShadow: isFull ? '0 4px 12px rgba(220, 38, 38, 0.25)' : '0 4px 12px rgba(217, 119, 6, 0.25)',
                              transition: 'transform 0.15s, background-color 0.15s'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.background = isFull ? '#b91c1c' : isCritical ? '#c2410c' : '#b45309'}
                            onMouseLeave={(e) => e.currentTarget.style.background = isFull ? '#dc2626' : isCritical ? '#ea580c' : '#d97706'}
                          >
                            {isFull ? `🚀 Auf +${nextTierGb} GB erweitern` : `Auf +${nextTierGb} GB erweitern`}
                          </button>
                        </div>
                      </div>
                    );
                  })()}

                  {/* AVV Warning Banner */}
                  {!isAvvSigned && (
                    <div style={{
                      background: 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)',
                      border: '1px solid #fecaca',
                      borderRadius: '24px',
                      padding: '20px 24px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '16px',
                      boxShadow: '0 10px 25px -5px rgba(239, 68, 68, 0.08)'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <div style={{
                          background: '#fee2e2',
                          borderRadius: '16px',
                          padding: '12px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          border: '1px solid #fca5a5'
                        }}>
                          <ShieldAlert size={24} style={{ color: '#dc2626' }} />
                        </div>
                        <div>
                          <strong style={{ display: 'block', fontSize: '1rem', color: '#991b1b', marginBottom: '4px' }}>
                            AV-Vertrag (Schul-Vereinbarung) ausstehend!
                          </strong>
                          <span style={{ fontSize: '0.84rem', color: '#7f1d1d', lineHeight: '1.4' }}>
                            Dein gesetzlich vorgeschriebener Auftragsverarbeitungsvertrag (AVV) nach Art. 28 DSGVO ist noch nicht digital unterzeichnet. Bitte hole dies umgehend nach, um den rechtssicheren Schulbetrieb zu gewährleisten.
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        aria-label="Auftragsverarbeitungsvertrag (AVV) jetzt unterzeichnen"
                        onClick={() => { if (setShowAvvModal) setShowAvvModal(true); }}
                        style={{
                          background: '#dc2626',
                          color: '#ffffff',
                          border: 'none',
                          borderRadius: '12px',
                          padding: '10px 20px',
                          fontSize: '0.84rem',
                          fontWeight: 800,
                          cursor: 'pointer',
                          whiteSpace: 'nowrap',
                          boxShadow: '0 4px 12px rgba(220, 38, 38, 0.2)',
                          transition: 'transform 0.15s, background-color 0.15s'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = '#b91c1c'}
                        onMouseLeave={(e) => e.currentTarget.style.background = '#dc2626'}
                      >
                        Jetzt unterzeichnen
                      </button>
                    </div>
                  )}

                  {(() => {
                    if (!isBillingBooked || dismissedInvoiceAlert) return null;
                    
                    const today = simulatedToday ? new Date(simulatedToday + 'T23:59:59') : new Date();
                    const y = today.getFullYear();
                    const m = today.getMonth() + 1;
                    const lastDay = new Date(y, m, 0).getDate();
                    const creationTime = new Date(y, m - 1, lastDay, 23, 58, 0);
                    
                    // Show only if the current date is the last day of the month or later (invoice finalized)
                    const isFinalized = today.getTime() >= creationTime.getTime();
                    if (!isFinalized) return null;

                    const monthStr = m < 10 ? `0${m}` : `${m}`;
                    const yearShort = String(y).slice(-2);
                    const currentInvoiceId = `RE-${schoolNumericId}-${yearShort}${monthStr}-01`;
                    
                    const deMonths = [
                      '', 'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 
                      'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'
                    ];
                    const monthName = deMonths[m];
                    const invoiceDateStr = `${lastDay}. ${monthName} ${y}`;
                    
                    const dueDateObj = new Date(y, m - 1, lastDay);
                    dueDateObj.setDate(dueDateObj.getDate() + 14);
                    const dueDay = dueDateObj.getDate();
                    const dueMonthName = deMonths[dueDateObj.getMonth() + 1];
                    const dueYear = dueDateObj.getFullYear();
                    const dueDateStr = `${dueDay}. ${dueMonthName} ${dueYear}`;

                    return (
                      <div style={{
                        background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
                        border: '1px solid #bfdbfe',
                        borderRadius: '24px',
                        padding: '20px 24px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '16px',
                        boxShadow: '0 10px 25px -5px rgba(59, 130, 246, 0.1)'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1 }}>
                          <div style={{ background: '#3b82f6', color: '#ffffff', width: '38px', height: '38px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem' }}>📧</div>
                          <div>
                            <h4 style={{ margin: 0, fontSize: '0.96rem', fontWeight: 900, color: '#1e3a8a', fontFamily: 'Urbanist' }}>
                              Monatsrechnung ${currentInvoiceId} versendet
                            </h4>
                            <p style={{ margin: '4px 0 0 0', fontSize: '0.76rem', color: '#1e40af', lineHeight: '1.4', fontWeight: 500 }}>
                              Die Rechnung für den Leistungszeitraum ${monthName} ${y} über <strong>{mixedTotal_global.toFixed(2).replace('.', ',')} €</strong> wurde am ${invoiceDateStr} per E-Mail an <strong>{currentUserProfile?.email || 'buchhaltung@musikschule.de'}</strong> gesendet.
                            </p>
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <button
                            type="button"
                            aria-label={`Rechnung ${currentInvoiceId} einsehen`}
                            onClick={() => {
                              setSecretarySubTab('licenses');
                              const isAnnualBilling = studentBillingOption === 'option1' || studentBillingOption === 'option3_2' || studentBillingOption === 'debit' || studentBillingOption === 'cash' || studentBillingOption === 'both';
                              const annualPricePerStudent = (studentBillingOption === 'option1' || studentBillingOption === 'debit' || studentBillingOption === 'cash' || studentBillingOption === 'both') ? getDynamicAnnualPrice(contractStartDate, false) : studentBillingOption === 'option3_2' ? getDynamicAnnualPrice(contractStartDate, true) : 0;
                              const einmalzahlungTotal = isAnnualBilling ? students.length * annualPricePerStudent : 0;
                              
                              const isExtraAnnualBilling = extraBillingOption === 'option1' || extraBillingOption === 'option3_2';
                              const extraAnnualPrice = extraBillingOption === 'option1' ? getDynamicAnnualPrice(contractStartDate, false) : extraBillingOption === 'option3_2' ? getDynamicAnnualPrice(contractStartDate, true) : 0;
                              const extraEinmalzahlungTotal = isExtraAnnualBilling ? bookedExtraUsers * extraAnnualPrice : 0;

                              const totalB2BWithEinmalzahlung = currentTotalB2B_global + einmalzahlungTotal + extraEinmalzahlungTotal;
                              setSelectedInvoice({
                                id: currentInvoiceId,
                                year: String(y),
                                date: invoiceDateStr,
                                dueDateStr: dueDateStr,
                                isCurrentMonth: true,
                                b2b: totalB2BWithEinmalzahlung,
                                amount: totalB2BWithEinmalzahlung,
                                schoolStudentCost: studentSharePreview_global,
                                schoolStudentLevy: studentLevyMonthly_global,
                                schoolExtraCost: schoolShareBookedExtra_global,
                                extraLevyMonthly: extraLevyMonthly_global,
                                extraEinmalzahlung: extraEinmalzahlungTotal,
                                b2c: 0,
                                einmalzahlung: einmalzahlungTotal,
                                status: 'Bezahlt',
                                paid: true
                              });
                            }}
                            style={{
                              background: '#ffffff',
                              color: '#2563eb',
                              border: '1px solid #bfdbfe',
                              borderRadius: '10px',
                              padding: '8px 16px',
                              fontSize: '0.74rem',
                              fontWeight: 800,
                              cursor: 'pointer',
                              transition: 'all 0.2s'
                            }}
                          >
                            Rechnung einsehen
                          </button>
                          <button
                            type="button"
                            aria-label="Rechnungs-Benachrichtigung schließen"
                            onClick={() => {
                              setDismissedInvoiceAlert(true);
                              localStorage.setItem(`dismissedInvoiceAlert_${schoolId}`, 'true');
                            }}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: '#1e40af',
                              cursor: 'pointer',
                              fontSize: '1rem',
                              padding: '4px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    );
                  })()}
                  
                  {/* 4 GAMIFIED CARD METRICS ROW (KPIs) */}
                  <div id="tour-secretary-kpis" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                    
                    {/* Card 1: Raumauslastung (Blue Gradient) */}
                    <div style={{
                      position: 'relative', overflow: 'hidden',
                      background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)', color: 'white',
                      borderRadius: '20px', boxShadow: '0 10px 25px -5px rgba(99, 102, 241, 0.3)',
                      display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '80px',
                      padding: '16px', boxSizing: 'border-box',
                      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                      border: '1px solid rgba(255, 255, 255, 0.1)'
                    }} className="hover-scale">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', width: '100%' }}>
                        <span style={{ fontSize: '0.65rem', fontWeight: 800, opacity: 0.85, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Raumauslastung Heute</span>
                        <div style={{ background: 'rgba(255, 255, 255, 0.15)', padding: '5px', borderRadius: '8px' }}>
                          <DoorOpen size={13} color="white" />
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginTop: '8px' }}>
                        <span style={{ fontSize: '1.5rem', fontWeight: 950, fontFamily: "'Plus Jakarta Sans', sans-serif", letterSpacing: '-0.02em' }}>{roomOccupancyRate}</span>
                        <span style={{ fontSize: '0.7rem', fontWeight: 800, opacity: 0.9 }}>% ({todayAllocations.length} Slots)</span>
                      </div>
                    </div>

                    {/* Card 2: Aktivierungsquote (Emerald Gradient) */}
                    <div style={{
                      position: 'relative', overflow: 'hidden',
                      background: 'linear-gradient(135deg, #34a853 0%, #34a853 100%)', color: 'white',
                      borderRadius: '20px', boxShadow: '0 10px 25px -5px rgba(52, 168, 83, 0.3)',
                      display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '80px',
                      padding: '16px', boxSizing: 'border-box',
                      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                      border: '1px solid rgba(255, 255, 255, 0.1)'
                    }} className="hover-scale">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', width: '100%' }}>
                        <span style={{ fontSize: '0.65rem', fontWeight: 800, opacity: 0.85, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Schüler-Aktivierung</span>
                        <div style={{ background: 'rgba(255, 255, 255, 0.15)', padding: '5px', borderRadius: '8px' }}>
                          <UserCheck size={13} color="white" />
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginTop: '8px' }}>
                        <span style={{ fontSize: '1.5rem', fontWeight: 950, fontFamily: "'Plus Jakarta Sans', sans-serif", letterSpacing: '-0.02em' }}>{activationRate}</span>
                        <span style={{ fontSize: '0.7rem', fontWeight: 800, opacity: 0.9 }}>% ({activeStudentsCount} / {totalStudentsCount})</span>
                      </div>
                    </div>

                    {/* Card 3: Konflikte (Amber/Orange Gradient) */}
                    <div style={{
                      position: 'relative', overflow: 'hidden',
                      background: 'linear-gradient(135deg, #facc15 0%, #eab308 100%)', color: '#0f172a',
                      borderRadius: '20px', boxShadow: '0 10px 25px -5px rgba(234, 179, 8, 0.35)',
                      display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '80px',
                      padding: '16px', boxSizing: 'border-box',
                      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                      border: '1px solid rgba(0, 0, 0, 0.08)'
                    }} className="hover-scale">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', width: '100%' }}>
                        <span style={{ fontSize: '0.65rem', fontWeight: 800, color: '#1e293b', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Terminkonflikte</span>
                        <div style={{ background: 'rgba(0, 0, 0, 0.08)', padding: '5px', borderRadius: '8px' }}>
                          <ShieldAlert size={13} color="#0f172a" />
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginTop: '8px' }}>
                        <span style={{ fontSize: '1.5rem', fontWeight: 950, fontFamily: "'Plus Jakarta Sans', sans-serif", letterSpacing: '-0.02em', color: '#0f172a' }}>
                          {scheduleConflicts.length}
                        </span>
                        <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#1e293b' }}>
                          {scheduleConflicts.length === 0 ? 'System-Prüfung stabil' : 'Konflikte gefunden'}
                        </span>
                      </div>
                    </div>

                    {/* Card 4: Ausfälle Heute (Red Gradient) */}
                    <div style={{
                      position: 'relative', overflow: 'hidden',
                      background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)', color: 'white',
                      borderRadius: '20px', boxShadow: '0 10px 25px -5px rgba(239, 68, 68, 0.3)',
                      display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '80px',
                      padding: '16px', boxSizing: 'border-box',
                      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                      border: '1px solid rgba(255, 255, 255, 0.1)'
                    }} className="hover-scale">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', width: '100%' }}>
                        <span style={{ fontSize: '0.65rem', fontWeight: 800, opacity: 0.85, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Ausfälle Heute</span>
                        <div style={{ background: 'rgba(255, 255, 255, 0.15)', padding: '5px', borderRadius: '8px' }}>
                          <CalendarX size={13} color="white" />
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginTop: '8px' }}>
                        <span style={{ fontSize: '1.5rem', fontWeight: 950, fontFamily: "'Plus Jakarta Sans', sans-serif", letterSpacing: '-0.02em' }}>
                          {activeSickTeachers.length}
                        </span>
                        <span style={{ fontSize: '0.7rem', fontWeight: 800, opacity: 0.9 }}>
                          {activeSickTeachers.length === 0 ? 'Kein Ausfallbedarf' : (activeSickTeachers.length === 1 ? 'Ausfall gemeldet' : 'Ausfälle gemeldet')}
                        </span>
                      </div>
                    </div>

                  </div>

                  {/* WIDGET: Vorläufige Raumbuchungen */}
                  <div id="tour-secretary-bookings" style={{
                    background: '#ffffff',
                    borderRadius: '24px',
                    padding: '24px',
                    boxShadow: '0 8px 32px rgba(15, 23, 42, 0.04)',
                    border: '1px solid rgba(0, 0, 0, 0.05)'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', gap: '10px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ background: '#fff7ed', color: '#ea580c', width: '32px', height: '32px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <DoorOpen size={16} />
                        </div>
                        <div>
                          <h3 style={{ margin: 0, fontSize: '0.96rem', fontWeight: 800, color: '#1e293b', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                            Vorläufige Raumbuchungen der Lehrkräfte
                          </h3>
                          <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>
                            Freigabe erforderlich ({pendingBookings.length})
                          </span>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <button
                          type="button"
                          aria-label="Direkt zum Räume-Board wechseln"
                          onClick={() => {
                            if (setRoomsSubView) setRoomsSubView('plan');
                            if (setRoomSearchQuery) setRoomSearchQuery('');
                            setActiveTab('secretary');
                            setSecretarySubTab('rooms');
                          }}
                          style={{
                            background: '#ea4335',
                            border: 'none',
                            color: '#ffffff',
                            padding: '6px 14px',
                            borderRadius: '9999px',
                            fontSize: '0.78rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                            letterSpacing: '-0.01em',
                            fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif',
                            boxShadow: '0 2px 6px rgba(234, 67, 53, 0.2)'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = '#d93025';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = '#ea4335';
                          }}
                        >
                          <DoorOpen size={13} style={{ color: '#ffffff' }} />
                          <span>Räume-Board</span>
                        </button>
                        <button
                          type="button"
                          aria-label="Logbuch der Raumbuchungen öffnen"
                          onClick={() => {
                            fetchLogbookBookings();
                            setShowLogbookModal(true);
                          }}
                          style={{
                            background: '#f2f2f7', // Apple neutral gray
                            border: 'none',
                            color: '#1c1c1e', // Apple primary dark text
                            padding: '6px 14px',
                            borderRadius: '9999px',
                            fontSize: '0.78rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                            letterSpacing: '-0.01em',
                            fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = '#e5e5ea';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = '#f2f2f7';
                          }}
                        >
                          <BookOpen size={13} style={{ color: '#1c1c1e' }} />
                          <span>Logbuch öffnen</span>
                        </button>
                      </div>
                    </div>

                    {pendingBookings.length === 0 ? (
                      <div style={{
                        background: 'rgba(52, 168, 83, 0.04)',
                        border: '1px solid rgba(52, 168, 83, 0.1)',
                        color: '#34a853',
                        borderRadius: '16px',
                        padding: '16px 20px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px'
                      }}>
                        <CheckCircle size={20} color="#34a853" />
                        <div>
                          <strong style={{ display: 'block', fontSize: '0.85rem', fontWeight: 800 }}>Keine ausstehenden Raumbuchungen</strong>
                          <span style={{ fontSize: '0.74rem', opacity: 0.9 }}>Aktuell gibt es keine vorläufigen Raumbuchungen von Lehrkräften, die bestätigt werden müssen.</span>
                        </div>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {pendingBookings.map((b) => {
                          const dateObj = new Date(b.date);
                          const dateFormatted = dateObj.toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' });
                          const teacherName = b.profiles ? `${b.profiles.first_name || ''} ${b.profiles.last_name || ''}`.trim() : 'Lehrkraft';
                          const roomName = b.rooms ? b.rooms.name : 'Unbekannter Raum';

                          return (
                            <div key={b.id} style={{
                              background: '#fefefe',
                              border: '1px solid #e2e8f0',
                              borderRadius: '16px',
                              padding: '14px 18px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              gap: '16px',
                              boxShadow: '0 2px 4px rgba(0,0,0,0.01)'
                            }}>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: 0 }}>
                                <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#1e293b' }}>
                                  {roomName} &bull; {b.title || 'Unterricht'}
                                </span>
                                <span style={{ fontSize: '0.74rem', fontWeight: 600, color: '#64748b' }}>
                                  Datum: <strong style={{ color: '#0f172a' }}>{dateFormatted}</strong> ({b.start_time} - {b.end_time} Uhr)
                                </span>
                                <span style={{ fontSize: '0.70rem', color: '#475569' }}>
                                  Gebucht von: <strong style={{ color: '#475569' }}>{teacherName}</strong>
                                </span>
                              </div>
                              <div style={{ display: 'flex', gap: '8px', flexShrink: 0, alignItems: 'center' }}>
                                <button
                                  type="button"
                                  aria-label={`Buchung für ${roomName} am ${dateFormatted} im Räume-Board ansehen`}
                                  onClick={() => {
                                    if (setRoomSearchQuery) setRoomSearchQuery(b.rooms?.name || roomName);
                                    if (setRoomsSubView) setRoomsSubView('plan');
                                    setActiveTab('secretary');
                                    setSecretarySubTab('rooms');
                                  }}
                                  style={{
                                    background: '#f8fafc',
                                    color: '#0f172a',
                                    border: '1px solid #cbd5e1',
                                    borderRadius: '8px',
                                    padding: '6px 12px',
                                    fontSize: '0.74rem',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    transition: 'all 0.15s ease',
                                    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.03)'
                                  }}
                                  onMouseEnter={(e) => {
                                    e.currentTarget.style.background = '#f1f5f9';
                                    e.currentTarget.style.borderColor = '#94a3b8';
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.background = '#f8fafc';
                                    e.currentTarget.style.borderColor = '#cbd5e1';
                                  }}
                                >
                                  <DoorOpen size={13} style={{ color: '#ea4335' }} />
                                  <span>Im Räume-Board ansehen</span>
                                </button>
                                <button
                                  type="button"
                                  aria-label={`Raumbuchung für ${roomName} am ${dateFormatted} freigeben`}
                                  onClick={() => handleConfirmBooking(b.id)}
                                  style={{
                                    background: '#34a853',
                                    color: '#ffffff',
                                    border: 'none',
                                    borderRadius: '8px',
                                    padding: '6px 12px',
                                    fontSize: '0.74rem',
                                    fontWeight: 800,
                                    cursor: 'pointer',
                                    transition: 'all 0.15s ease',
                                    boxShadow: '0 1px 2px rgba(52, 168, 83, 0.2)'
                                  }}
                                  onMouseEnter={(e) => e.currentTarget.style.background = '#34a853'}
                                  onMouseLeave={(e) => e.currentTarget.style.background = '#34a853'}
                                >
                                  Bestätigen
                                </button>
                                <button
                                  type="button"
                                  aria-label={`Raumbuchung für ${roomName} am ${dateFormatted} ablehnen`}
                                  onClick={() => handleRejectBooking(b.id)}
                                  style={{
                                    background: 'rgba(239, 68, 68, 0.08)',
                                    color: '#ef4444',
                                    border: '1px solid rgba(239, 68, 68, 0.15)',
                                    borderRadius: '8px',
                                    padding: '6px 12px',
                                    fontSize: '0.74rem',
                                    fontWeight: 800,
                                    cursor: 'pointer',
                                    transition: 'all 0.15s ease'
                                  }}
                                  onMouseEnter={(e) => {
                                    e.currentTarget.style.background = '#ef4444';
                                    e.currentTarget.style.color = '#ffffff';
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.background = 'rgba(239, 68, 68, 0.08)';
                                    e.currentTarget.style.color = '#ef4444';
                                  }}
                                >
                                  Ablehnen
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* WIDGET: Offene Raum-Meldungen & Mängel */}
                  {(() => {
                    const openIssues = roomIssues.filter(i => !i.is_completed && !i.is_acknowledged);
                    return (
                      <div id="tour-secretary-room-issues" style={{
                        background: '#ffffff',
                        borderRadius: '24px',
                        padding: '24px',
                        boxShadow: '0 8px 32px rgba(15, 23, 42, 0.04)',
                        border: '1px solid rgba(0, 0, 0, 0.05)'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', gap: '10px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{ background: '#fef2f2', color: '#dc2626', width: '32px', height: '32px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <Wrench size={16} />
                            </div>
                            <div>
                              <h3 style={{ margin: 0, fontSize: '0.96rem', fontWeight: 800, color: '#1e293b', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                                Offene Raum-Meldungen & Mängel
                              </h3>
                              <span style={{ fontSize: '0.65rem', fontWeight: 750, color: openIssues.length > 0 ? '#dc2626' : '#94a3b8', textTransform: 'uppercase' }}>
                                {openIssues.length > 0 ? `${openIssues.length} ${openIssues.length === 1 ? 'Mangel gemeldet' : 'Mängel gemeldet'}` : 'Keine offenen Meldungen'}
                              </span>
                            </div>
                          </div>
                        </div>

                        {openIssues.length === 0 ? (
                          <div style={{
                            background: 'rgba(52, 168, 83, 0.04)',
                            border: '1px solid rgba(52, 168, 83, 0.1)',
                            color: '#34a853',
                            borderRadius: '16px',
                            padding: '16px 20px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px'
                          }}>
                            <CheckCircle size={20} color="#34a853" />
                            <div>
                              <strong style={{ display: 'block', fontSize: '0.85rem', fontWeight: 800 }}>Alle Räume & Ausstattung intakt</strong>
                              <span style={{ fontSize: '0.74rem', opacity: 0.9 }}>Aktuell liegen keine offenen Mängel- oder Reparaturbedarfe von Lehrkräften vor.</span>
                            </div>
                          </div>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {openIssues.map((issue) => {
                              const createdDate = new Date(issue.created_at);
                              const dateFormatted = createdDate.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
                              const cleanContent = formatCleanNoteContent(issue.content, issue.student_name);
                              const authorDisplay = issue.author_name || 'Lehrkraft';

                              return (
                                <div key={issue.id} style={{
                                  background: '#fffbfb',
                                  border: '1px solid #fee2e2',
                                  borderRadius: '16px',
                                  padding: '16px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  gap: '16px',
                                  flexWrap: 'wrap'
                                }}>
                                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', flex: 1, minWidth: '240px' }}>
                                    {(() => {
                                      const isEquip = (issue.tags && issue.tags.includes('#Ausstattung')) || 
                                                      issue.content.toLowerCase().includes('klavier') || 
                                                      issue.content.toLowerCase().includes('piano') || 
                                                      issue.content.toLowerCase().includes('drum') || 
                                                      issue.content.toLowerCase().includes('gitarre') || 
                                                      issue.content.toLowerCase().includes('saite') || 
                                                      issue.content.toLowerCase().includes('kabel') || 
                                                      issue.content.toLowerCase().includes('pedal') || 
                                                      issue.content.toLowerCase().includes('netzteil');
                                      return (
                                        <div style={{
                                          background: '#fee2e2',
                                          color: '#dc2626',
                                          borderRadius: '10px',
                                          padding: '6px 10px',
                                          fontWeight: 800,
                                          fontSize: '0.75rem',
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          gap: '4px',
                                          flexShrink: 0
                                        }}>
                                          {isEquip ? <Music size={12} /> : <DoorOpen size={12} />}
                                          <span>{issue.room_id || (isEquip ? 'Ausstattung' : 'Raum')}</span>
                                        </div>
                                      );
                                    })()}
                                    <div>
                                      <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#0f172a', marginBottom: '4px' }}>
                                        {cleanContent || issue.content}
                                      </div>
                                      <div style={{ fontSize: '0.72rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <span>Gemeldet von <strong>{authorDisplay}</strong></span>
                                        <span>•</span>
                                        <span>{dateFormatted} Uhr</span>
                                      </div>
                                    </div>
                                  </div>

                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <button
                                      type="button"
                                      onClick={async () => {
                                        await notesService.resolveRoomIssue(issue.id, 'secretary');
                                        setRoomIssues(prev => prev.map(n => n.id === issue.id ? { ...n, is_completed: true, is_acknowledged: true, acknowledged_at: new Date().toISOString() } : n));
                                      }}
                                      style={{
                                        background: '#16a34a',
                                        color: '#ffffff',
                                        border: 'none',
                                        borderRadius: '10px',
                                        padding: '8px 14px',
                                        fontSize: '0.76rem',
                                        fontWeight: 750,
                                        cursor: 'pointer',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        boxShadow: '0 2px 8px rgba(22, 163, 74, 0.2)'
                                      }}
                                    >
                                      <Check size={13} />
                                      <span>Als behoben markieren</span>
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {/* WIDGET: Systemische Terminkonflikte (Apple / Enterprise SaaS Level) */}
                  <div style={{
                    background: '#ffffff',
                    borderRadius: '24px',
                    padding: '24px',
                    boxShadow: '0 8px 32px rgba(15, 23, 42, 0.04)',
                    border: scheduleConflicts.length > 0 ? '1px solid rgba(234, 67, 53, 0.18)' : '1px solid rgba(0, 0, 0, 0.05)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '18px'
                  }}>
                    {/* Widget Header */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                          background: scheduleConflicts.length > 0 ? '#fff1f2' : '#e6f4ea',
                          color: scheduleConflicts.length > 0 ? '#ea4335' : '#34a853',
                          width: '38px',
                          height: '38px',
                          borderRadius: '12px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          boxShadow: scheduleConflicts.length > 0 ? '0 2px 8px rgba(234, 67, 53, 0.15)' : 'none',
                          flexShrink: 0
                        }}>
                          {scheduleConflicts.length > 0 ? <ShieldAlert size={20} color="#ea4335" /> : <CheckCircle size={20} color="#34a853" />}
                        </div>
                        <div>
                          <h3 style={{ margin: 0, fontSize: '1.02rem', fontWeight: 800, color: '#1e293b', fontFamily: "'Plus Jakarta Sans', sans-serif", letterSpacing: '-0.01em' }}>
                            System-Kollisionsprüfer
                          </h3>
                          <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            Automatisierte Überschneidungskontrolle
                          </span>
                        </div>
                      </div>

                      {scheduleConflicts.length > 0 ? (
                        <div style={{
                          background: '#fff1f2',
                          border: '1px solid #fecdd3',
                          color: '#be123c',
                          borderRadius: '20px',
                          padding: '5px 12px',
                          fontSize: '0.72rem',
                          fontWeight: 800,
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}>
                          <span style={{
                            width: '7px',
                            height: '7px',
                            borderRadius: '50%',
                            background: '#ea4335',
                            boxShadow: '0 0 0 3px rgba(234, 67, 53, 0.2)',
                            display: 'inline-block'
                          }} />
                          {scheduleConflicts.length} {scheduleConflicts.length === 1 ? 'Kollision' : 'Kollisionen'} aktiv
                        </div>
                      ) : (
                        <div style={{
                          background: '#e6f4ea',
                          border: '1px solid #a7f3d0',
                          color: '#047857',
                          borderRadius: '20px',
                          padding: '5px 12px',
                          fontSize: '0.72rem',
                          fontWeight: 800,
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}>
                          <span style={{
                            width: '7px',
                            height: '7px',
                            borderRadius: '50%',
                            background: '#34a853',
                            boxShadow: '0 0 0 3px rgba(52, 168, 83, 0.2)',
                            display: 'inline-block'
                          }} />
                          System optimal
                        </div>
                      )}
                    </div>

                    {/* Content Body */}
                    {scheduleConflicts.length === 0 ? (
                      <div style={{
                        background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
                        borderRadius: '16px',
                        padding: '16px 20px',
                        border: '1px dashed #cbd5e1',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '14px'
                      }}>
                        <div style={{ background: '#ffffff', padding: '10px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', flexShrink: 0 }}>
                          <CheckCircle size={22} color="#34a853" />
                        </div>
                        <div>
                          <div style={{ fontSize: '0.86rem', fontWeight: 700, color: '#0f172a' }}>
                            Keine Terminüberschneidungen vorhanden
                          </div>
                          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px', fontWeight: 500 }}>
                            Alle Lehrkräfte- und Raumbelegungen im Campus-Groovelab Stundenplan sind 100% überschneidungsfrei.
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                        {scheduleConflicts.map((conflict) => (
                          <div key={conflict.id} style={{
                            background: '#ffffff',
                            border: '1px solid #fee2e2',
                            borderRadius: '18px',
                            padding: '16px',
                            boxShadow: '0 4px 16px rgba(234, 67, 53, 0.04)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '12px',
                            transition: 'all 0.2s ease-in-out'
                          }} className="hover-scale">
                            
                            {/* Top Bar inside Card */}
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                {/* Type Badge */}
                                <span style={{
                                  background: conflict.type === 'room' ? '#fff1f2' : '#fef3c7',
                                  color: conflict.type === 'room' ? '#b91c1c' : '#b45309',
                                  border: conflict.type === 'room' ? '1px solid #fecdd3' : '1px solid #fde68a',
                                  padding: '3px 10px',
                                  borderRadius: '8px',
                                  fontSize: '0.68rem',
                                  fontWeight: 800,
                                  textTransform: 'uppercase',
                                  letterSpacing: '0.04em'
                                }}>
                                  {conflict.type === 'room' ? 'Raum-Kollision' : 'Lehrer-Kollision'}
                                </span>

                                {/* Day Badge */}
                                <span style={{
                                  background: '#f8fafc',
                                  border: '1px solid #e2e8f0',
                                  color: '#334155',
                                  padding: '3px 10px',
                                  borderRadius: '8px',
                                  fontSize: '0.72rem',
                                  fontWeight: 700,
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '5px'
                                }}>
                                  <Calendar size={12} color="#64748b" />
                                  {conflict.dayLabel}
                                </span>

                                {/* Window Time Pill */}
                                <span style={{
                                  background: '#f1f5f9',
                                  border: '1px solid #cbd5e1',
                                  color: '#1e293b',
                                  padding: '3px 10px',
                                  borderRadius: '8px',
                                  fontSize: '0.72rem',
                                  fontWeight: 700,
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '5px'
                                }}>
                                  <Clock size={12} color="#64748b" />
                                  {conflict.startTime} – {conflict.endTime}
                                </span>
                              </div>

                              <ShieldAlert size={16} color="#ea4335" />
                            </div>

                            {/* Human Story Sentence */}
                            <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#0f172a', fontFamily: "'Plus Jakarta Sans', sans-serif", lineHeight: 1.35 }}>
                              ⚠️ {conflict.summarySentence}
                            </div>

                            {/* Comparison Boxes */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', background: '#fff5f5', borderRadius: '14px', padding: '12px 14px' }}>
                              {conflict.type === 'teacher' ? (
                                <>
                                  <div style={{ background: '#ffffff', border: '1px solid #fee2e2', padding: '10px 12px', borderRadius: '10px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.74rem', fontWeight: 800, color: '#991b1b' }}>
                                      <span>📍 Termin 1 ({conflict.timeA} Uhr)</span>
                                      <span style={{ color: '#64748b', fontWeight: 600 }}>Raum: {conflict.roomNameA}</span>
                                    </div>
                                    <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#1e293b' }}>
                                      👥 Schüler: <span style={{ color: '#0f172a' }}>{conflict.studentsA}</span>
                                    </div>
                                  </div>

                                  <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#ea4335', textAlign: 'center', padding: '2px 0' }}>
                                    ⚡ kollidiert zeitgleich mit:
                                  </div>

                                  <div style={{ background: '#ffffff', border: '1px solid #fee2e2', padding: '10px 12px', borderRadius: '10px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.74rem', fontWeight: 800, color: '#991b1b' }}>
                                      <span>📍 Termin 2 ({conflict.timeB} Uhr)</span>
                                      <span style={{ color: '#64748b', fontWeight: 600 }}>Raum: {conflict.roomNameB}</span>
                                    </div>
                                    <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#1e293b' }}>
                                      👥 Schüler: <span style={{ color: '#0f172a' }}>{conflict.studentsB}</span>
                                    </div>
                                  </div>
                                </>
                              ) : (
                                <>
                                  <div style={{ background: '#ffffff', border: '1px solid #fee2e2', padding: '10px 12px', borderRadius: '10px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.74rem', fontWeight: 800, color: '#991b1b' }}>
                                      <span>👤 Lehrkraft 1: {conflict.teacherNameA}</span>
                                      <span style={{ color: '#64748b', fontWeight: 600 }}>⏰ {conflict.timeA} Uhr</span>
                                    </div>
                                    <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#1e293b' }}>
                                      👥 Schüler: <span style={{ color: '#0f172a' }}>{conflict.studentsA}</span>
                                    </div>
                                  </div>

                                  <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#ea4335', textAlign: 'center', padding: '2px 0' }}>
                                    ⚡ belegt im selben Raum zeitgleich:
                                  </div>

                                  <div style={{ background: '#ffffff', border: '1px solid #fee2e2', padding: '10px 12px', borderRadius: '10px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.74rem', fontWeight: 800, color: '#991b1b' }}>
                                      <span>👤 Lehrkraft 2: {conflict.teacherNameB}</span>
                                      <span style={{ color: '#64748b', fontWeight: 600 }}>⏰ {conflict.timeB} Uhr</span>
                                    </div>
                                    <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#1e293b' }}>
                                      👥 Schüler: <span style={{ color: '#0f172a' }}>{conflict.studentsB}</span>
                                    </div>
                                  </div>
                                </>
                              )}
                            </div>

                            {/* Action Row */}
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '10px', paddingTop: '4px' }}>
                              <button
                                type="button"
                                aria-label={`Konflikt im Stundenplan lösen: ${conflict.title || 'Terminkonflikt'}`}
                                onClick={() => {
                                  setActiveTab('campus');
                                  setCampusSubTab('schedules');
                                  setSchedulesRoomsViewMode('designer');
                                  if (conflict.teacherId) {
                                    setSelectedFilterTeacherId(conflict.teacherId);
                                    setExpandedSidebarTeacherId(conflict.teacherId);
                                  }
                                }}
                                style={{
                                  background: '#ea4335',
                                  color: '#ffffff',
                                  border: 'none',
                                  borderRadius: '10px',
                                  padding: '8px 14px',
                                  fontSize: '0.76rem',
                                  fontWeight: 700,
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '6px',
                                  boxShadow: '0 2px 8px rgba(234, 67, 53, 0.2)',
                                  transition: 'all 0.2s ease'
                                }}
                                className="hover-scale"
                              >
                                <span>Im Planer fokussieren</span>
                                <ChevronRight size={14} color="#ffffff" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* WIDGET: Stundenplaneinreichungen */}
                  <div style={{
                    background: '#ffffff',
                    borderRadius: '24px',
                    padding: '24px',
                    boxShadow: '0 8px 32px rgba(15, 23, 42, 0.04)',
                    border: '1px solid rgba(0, 0, 0, 0.05)'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ background: '#eff6ff', color: '#2563eb', width: '32px', height: '32px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <ClipboardList size={16} />
                        </div>
                        <div>
                          <h3 style={{ margin: 0, fontSize: '0.96rem', fontWeight: 800, color: '#1e293b', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                            Stundenplaneinreichungen
                          </h3>
                          <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>
                            Zu prüfende Stundenpläne ({pendingSchedules.length})
                          </span>
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {pendingSchedules.length === 0 ? (
                        <div style={{
                          background: 'rgba(52, 168, 83, 0.04)',
                          border: '1px solid rgba(52, 168, 83, 0.1)',
                          color: '#34a853',
                          borderRadius: '16px',
                          padding: '16px',
                          textAlign: 'center'
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '6px' }}>
                            <CheckCircle size={22} color="#34a853" />
                          </div>
                          <strong style={{ display: 'block', fontSize: '0.82rem', fontWeight: 800 }}>Alles freigegeben</strong>
                          <span style={{ fontSize: '0.72rem', opacity: 0.9 }}>Es liegen aktuell keine ausstehenden Stundenplaneinreichungen vor.</span>
                        </div>
                      ) : (
                        (() => {
                          // Group pending schedules by teacher
                          const groupedPending: Record<string, { teacherName: string, instrument: string, days: number[], slotsCount: number, submittedAtLabel: string }> = {};
                          const allTeacherList = [...(campusTeachers || []), ...(bypassTeachers || []), ...(coaches || [])];
                          pendingSchedules.forEach(sched => {
                            const tId = sched.teacher_id;
                            if (!groupedPending[tId]) {
                              const tObj = allTeacherList.find((u: any) => u.id === tId);
                              const rawP = tObj?.planned_boards || (tObj as any)?.campus_räume || (tObj as any)?.groovelab_räume;
                              const subAtStr = (rawP as any)?.submittedAt || (sched as any).created_at || '';
                              let formattedSubAt = '';
                              if (subAtStr) {
                                const d = new Date(subAtStr);
                                if (!isNaN(d.getTime())) {
                                  formattedSubAt = `am ${d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })} um ${d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} Uhr`;
                                }
                              }
                              groupedPending[tId] = {
                                teacherName: sched.teacher_name || 'Unbekannte Lehrkraft',
                                instrument: '',
                                days: [],
                                slotsCount: 0,
                                submittedAtLabel: formattedSubAt
                              };
                            }
                            groupedPending[tId].days.push(sched.day_of_week);
                            groupedPending[tId].slotsCount++;
                          });

                          return Object.entries(groupedPending).map(([tId, data]) => {
                            const daysOfWeek = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'];
                            const uniqueDays = Array.from(new Set(data.days)).sort((a, b) => a - b);
                            let daysLabel = '';
                            
                            // Form contiguous range if possible
                            let isContiguous = true;
                            for (let i = 1; i < uniqueDays.length; i++) {
                              if (uniqueDays[i] !== uniqueDays[i-1] + 1) {
                                isContiguous = false;
                                break;
                              }
                            }
                            if (isContiguous && uniqueDays.length > 2) {
                              daysLabel = `${daysOfWeek[uniqueDays[0] - 1]} – ${daysOfWeek[uniqueDays[uniqueDays.length - 1] - 1]}`;
                            } else {
                              daysLabel = uniqueDays.map(d => daysOfWeek[d - 1]).join(', ');
                            }

                            return (
                              <div key={tId} style={{
                                padding: '12px 16px',
                                borderRadius: '16px',
                                border: '1px solid rgba(0, 0, 0, 0.05)',
                                background: 'rgba(0, 0, 0, 0.01)',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                gap: '12px'
                              }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                                  <strong style={{ fontSize: '0.84rem', color: '#1c1c1e', fontWeight: 700 }}>
                                    {data.teacherName}
                                  </strong>
                                  <span style={{ fontSize: '0.72rem', color: '#475569', fontWeight: 500 }}>
                                    📅 {daysLabel} ({data.slotsCount} {data.slotsCount === 1 ? 'Termin' : 'Termine'})
                                  </span>
                                  {data.submittedAtLabel && (
                                    <span style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 600 }}>
                                      ⏰ Eingereicht: {data.submittedAtLabel}
                                    </span>
                                  )}
                                </div>
                                <button
                                  type="button"
                                  aria-label={`Räume zuteilen für ${data.teacherName}`}
                                  onClick={() => {
                                    setActiveTab('campus');
                                    setCampusSubTab('schedules');
                                    setSchedulesRoomsViewMode('designer');
                                    setSelectedFilterTeacherId(tId);
                                    setExpandedSidebarTeacherId(tId);
                                  }}
                                  style={{
                                    background: '#007aff',
                                    color: '#ffffff',
                                    border: 'none',
                                    borderRadius: '10px',
                                    padding: '6px 14px',
                                    fontSize: '0.74rem',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    boxShadow: '0 2px 8px rgba(0, 122, 255, 0.15)',
                                    transition: 'all 0.15s'
                                  }}
                                >
                                  Zuteilen
                                </button>
                              </div>
                            );
                          });
                        })()
                      )}
                    </div>
                  </div>

                </div>

                {/* RIGHT COLUMN: SIDEBAR */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                  
                  {/* WIDGET: Unterrichtsausfälle heute (Ausfall- & Raumfreigabe-Monitor) */}
                  <div style={{
                    background: '#ffffff',
                    borderRadius: '24px',
                    padding: '24px',
                    boxShadow: '0 8px 32px rgba(15, 23, 42, 0.04)',
                    border: '1px solid rgba(0, 0, 0, 0.05)'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                      <div style={{ background: activeSickTeachers.length > 0 ? '#fee2e2' : '#e6f4ea', color: activeSickTeachers.length > 0 ? '#b91c1c' : '#34a853', width: '32px', height: '32px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800 }}>
                        {activeSickTeachers.length > 0 ? <CalendarX size={16} color="#ef4444" /> : <CheckCircle size={16} color="#34a853" />}
                      </div>
                      <div>
                        <h3 style={{ margin: 0, fontSize: '0.96rem', fontWeight: 800, color: '#1e293b', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                          Unterrichtsausfälle heute
                        </h3>
                        <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>
                          Ausfall- &amp; Raumfreigabe-Monitor
                        </span>
                      </div>
                    </div>

                    {activeSickTeachers.length === 0 ? (
                      <div style={{
                        background: 'rgba(52, 168, 83, 0.04)',
                        border: '1px solid rgba(52, 168, 83, 0.1)',
                        color: '#34a853',
                        borderRadius: '16px',
                        padding: '16px',
                        textAlign: 'center'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '6px' }}>
                          <CheckCircle size={22} color="#34a853" />
                        </div>
                        <strong style={{ display: 'block', fontSize: '0.82rem', fontWeight: 800 }}>Kein Ausfallbedarf</strong>
                        <span style={{ fontSize: '0.72rem', opacity: 0.9 }}>Alle geplanten Unterrichtsstunden finden regulär statt. Keine offenen Schüler-Benachrichtigungen.</span>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {activeSickTeachers.map(teacher => {
                          const sickUntilStr = teacher.sick_until ? new Date(teacher.sick_until).toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit' }) : 'unbefristet';
                          return (
                            <div key={teacher.id} style={{
                              padding: '12px 14px',
                              borderRadius: '16px',
                              border: '1px solid rgba(239, 68, 68, 0.15)',
                              background: 'rgba(239, 68, 68, 0.04)',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '6px'
                            }}>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <strong style={{ fontSize: '0.82rem', color: '#991b1b', fontWeight: 700 }}>
                                  {formatTeacherFullName(teacher)}
                                </strong>
                                <span style={{
                                  background: '#fee2e2',
                                  color: '#b91c1c',
                                  padding: '2px 8px',
                                  borderRadius: '6px',
                                  fontSize: '0.66rem',
                                  fontWeight: 700
                                }}>
                                  bis {sickUntilStr}
                                </span>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.70rem', color: '#64748b' }}>
                                <span style={{ color: '#16a34a', fontWeight: 700 }}>✓ Räume freigegeben</span>
                                <span>&bull;</span>
                                <span style={{ color: '#2563eb', fontWeight: 600 }}>Schüler informiert</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                </div>

              </div>
            );

};
