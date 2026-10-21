import React, { useState, useMemo } from 'react';
import {
  ArrowUpRight, BookOpen, Calendar, CalendarX, Check, CheckCircle, ChevronDown,
  ChevronRight, ChevronUp, ClipboardList, Clock, DoorOpen, HardDrive, Music,
  RotateCcw, ShieldAlert, Sparkles, UserCheck, Users, Wrench
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { UpdateAnnouncementHero } from '../common/UpdateAnnouncementHero';
import { CampusSponsorIngressBanner } from '../ui/CampusSponsorIngressBanner';
import { getDynamicAnnualPrice } from './licenses/licenseUtils';
import { formatCleanNoteContent } from '../notes/notesConstants';
import { notesService } from '../../services/notesService';
import { formatTeacherFullName } from '../../utils/nameHelper';
import { SecretaryTagesRadarBoard } from './widgets/SecretaryTagesRadarBoard';

export interface SecretaryBriefingViewProps {
  currentSchoolProfile: any; setCurrentSchoolProfile: React.Dispatch<React.SetStateAction<any>>; currentUserProfile: any;
  userId?: string; schoolId: string; schoolNumericId: string | number; schoolName?: string; windowWidth?: number;
  activeTab: string; setActiveTab: (tab: any) => void; secretarySubTab: string; setSecretarySubTab: (tab: any) => void;
  campusSubTab: string; setCampusSubTab: (tab: any) => void; schedulesRoomsViewMode: string; setSchedulesRoomsViewMode: (mode: any) => void;
  expandedSidebarTeacherId: string | null; setExpandedSidebarTeacherId: (id: any) => void;
  selectedFilterTeacherId: string | null; setSelectedFilterTeacherId: (id: any) => void;
  pendingBookings: any[]; setPendingBookings?: React.Dispatch<React.SetStateAction<any[]>>;
  roomIssues: any[]; setRoomIssues: React.Dispatch<React.SetStateAction<any[]>>;
  rooms: any[]; buildings?: any[]; students: any[]; campusTeachers: any[]; bypassTeachers: any[]; coaches: any[];
  matrixAllocations: any[]; pendingSchedules: any[]; userMap: Record<string, any>; roomMap: Record<string, any>;
  isAvvSigned: boolean; setShowAvvModal?: (show: boolean) => void;
  showLogbookModal: boolean; setShowLogbookModal: (show: boolean) => void;
  showStorageManagerModal: boolean; setShowStorageManagerModal: (show: boolean) => void;
  dismissedInvoiceAlert: boolean; setDismissedInvoiceAlert: (dismissed: boolean) => void;
  studentBillingOption: string; isBillingBooked: boolean; bookedExtraUsers: number; extraBillingOption: string;
  selectedStorageAddonGb: number; setSelectedStorageAddonGb: React.Dispatch<React.SetStateAction<number>>;
  selectedInvoice: any; setSelectedInvoice: (inv: any) => void; contractStartDate: string | null; simulatedToday: string;
  studentLevyMonthly_global: number; extraLevyMonthly_global: number; studentSharePreview_global: number;
  schoolShareBookedExtra_global: number; currentTotalB2B_global: number; mixedTotal_global: number;
  fetchLogbookBookings: () => Promise<void> | void; handleConfirmBooking: (id: string) => Promise<void> | void;
  handleRejectBooking: (id: string) => Promise<void> | void; getEffectiveStorageUsedBytes: (profile: any) => number;
  roomsSubView?: 'overview' | 'plan' | 'settings'; setRoomsSubView?: (view: 'overview' | 'plan' | 'settings') => void;
  roomSearchQuery?: string; setRoomSearchQuery?: React.Dispatch<React.SetStateAction<string>>; onOpenFacilityLogModal?: () => void;
}

export const SecretaryBriefingView: React.FC<SecretaryBriefingViewProps> = ({
  currentSchoolProfile, setCurrentSchoolProfile, currentUserProfile, userId, schoolId, schoolNumericId, schoolName, windowWidth,
  activeTab, setActiveTab, secretarySubTab, setSecretarySubTab, campusSubTab, setCampusSubTab, schedulesRoomsViewMode,
  setSchedulesRoomsViewMode, expandedSidebarTeacherId, setExpandedSidebarTeacherId, selectedFilterTeacherId, setSelectedFilterTeacherId,
  pendingBookings = [], setPendingBookings, roomIssues = [], setRoomIssues, rooms = [], buildings = [], students = [],
  campusTeachers = [], bypassTeachers = [], coaches = [], matrixAllocations = [], pendingSchedules = [], userMap = {}, roomMap = {},
  isAvvSigned, setShowAvvModal, showLogbookModal, setShowLogbookModal, showStorageManagerModal, setShowStorageManagerModal,
  dismissedInvoiceAlert, setDismissedInvoiceAlert, studentBillingOption, isBillingBooked, bookedExtraUsers, extraBillingOption,
  selectedStorageAddonGb, setSelectedStorageAddonGb, selectedInvoice, setSelectedInvoice, contractStartDate, simulatedToday,
  studentLevyMonthly_global, extraLevyMonthly_global, studentSharePreview_global, schoolShareBookedExtra_global,
  currentTotalB2B_global, mixedTotal_global, fetchLogbookBookings, handleConfirmBooking, handleRejectBooking,
  getEffectiveStorageUsedBytes, roomsSubView, setRoomsSubView, roomSearchQuery, setRoomSearchQuery, onOpenFacilityLogModal,
}) => {
            const [showIntegrityDetails, setShowIntegrityDetails] = useState<boolean>(false);
            const [roomIssuesTab, setRoomIssuesTab] = useState<'open' | 'resolved' | 'all'>('open');
            const effectiveWidth = useMemo(() => {
              if (typeof windowWidth === 'number' && windowWidth > 0) return windowWidth;
              if (typeof window === 'undefined') return 1280;
              return window.innerWidth;
            }, [windowWidth]);
            const isMobileView = effectiveWidth <= 768;
            const isTabletOrMobile = effectiveWidth <= 1180;
            const simDate = simulatedToday ? new Date(simulatedToday + 'T14:00:00') : new Date();
            const todayDayNum = simDate.getDay() === 0 ? 7 : simDate.getDay();
            const todayDateStr = simulatedToday || new Date().toISOString().split('T')[0];
            const safeRooms = rooms || [];
            const safeStudents = students || [];
            const safeAllocations = matrixAllocations || [];

            const { todayAllocations, roomOccupancyRate, todayTeachersCount } = useMemo(() => {
              const safeAllocs = matrixAllocations || [];
              const safeRms = rooms || [];
              const todayAllocs = safeAllocs.filter((p: any) => p && p.dayOfWeek === todayDayNum && p.roomId);
              const totalSlots = safeRms.length * 8;
              const occRate = totalSlots > 0 ? Math.round((todayAllocs.length / totalSlots) * 100) : 0;
              const teacherIds = Array.from(new Set(todayAllocs.map((p: any) => p.teacherId).filter(Boolean)));
              return { todayAllocations: todayAllocs, roomOccupancyRate: occRate, todayTeachersCount: teacherIds.length };
            }, [rooms, matrixAllocations, todayDayNum]);

            const downloadedBackupCount = useMemo(() => {
              let count = 0;
              for (let i = 0; i < localStorage.length; i++) {
                const k = localStorage.key(i);
                if (k && k.startsWith('campus_storage_backup_downloaded_') && localStorage.getItem(k) === 'true') count++;
              }
              return count;
            }, [students.length, currentSchoolProfile?.storage_termination_status]);

            const memoizedEffectiveUsedBytes = useMemo(() => getEffectiveStorageUsedBytes(currentSchoolProfile), [getEffectiveStorageUsedBytes, currentSchoolProfile]);

            const activeAusfallTeachers = useMemo(() => {
              return [...(campusTeachers || []), ...(bypassTeachers || []), ...(coaches || [])].filter(t => {
                const untilVal = t?.ausfall_until;
                return untilVal ? String(untilVal).substring(0, 10) >= todayDateStr : false;
              }).reduce((acc: any[], current) => {
                if (current && !acc.some(item => item.id === current.id)) acc.push(current);
                return acc;
              }, []);
            }, [campusTeachers, bypassTeachers, coaches, todayDateStr]);

            const { totalStudentsCount, activeStudentsCount, activationRate } = useMemo(() => {
              const safeStuds = students || [];
              const total = safeStuds.length;
              const active = safeStuds.filter((s: any) => s?.is_pin_activated).length;
              return { totalStudentsCount: total, activeStudentsCount: active, activationRate: total > 0 ? Math.round((active / total) * 100) : 0 };
            }, [students]);

            const scheduleConflicts = useMemo(() => {
              const safeAllocs = matrixAllocations || [];
              const getStudentNames = (block: any) => {
                if (!block || !Array.isArray(block.slots) || block.slots.length === 0) return '';
                const names = block.slots.map((s: any) => s.student_name || (s.student_id ? (userMap[s.student_id] || '') : '')).filter((n: string) => n && n !== 'Pause');
                return names.length > 0 ? names.join(', ') : '';
              };
              const getTeacherName = (block: any) => (!block || block.teacherId === 'groovelab' || block.id?.startsWith('groovelab_')) ? '' : (block.teacherName || (block.teacherId ? (userMap[block.teacherId] || '') : '') || '');
              const isRealBlock = (block: any) => Boolean(block && block.teacherId !== 'groovelab' && !block.id?.startsWith('groovelab_') && getStudentNames(block).length > 0);
              const list: any[] = [];
              const days = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'];
              const byRoomDay: Record<string, any[]> = {};
              safeAllocs.filter((p: any) => p.roomId && isRealBlock(p)).forEach((p: any) => {
                const k = `${p.roomId}_${p.dayOfWeek}`;
                (byRoomDay[k] = byRoomDay[k] || []).push(p);
              });
              Object.values(byRoomDay).forEach(group => {
                if (group.length > 1) {
                  group.forEach((p, i) => group.forEach((q, j) => {
                    if (i < j && p.startTime < q.endTime && q.startTime < p.endTime) {
                      const roomName = roomMap[p.roomId] || 'Raum';
                      const dayLabel = days[p.dayOfWeek - 1] || 'Wochentag';
                      list.push({
                        id: `room_${p.id}_${q.id}`, type: 'room', dayOfWeek: p.dayOfWeek, dayLabel,
                        startTime: p.startTime < q.startTime ? p.startTime : q.startTime,
                        endTime: p.endTime > q.endTime ? p.endTime : q.endTime,
                        summarySentence: `Der Raum "${roomName}" ist am ${dayLabel} um ${p.startTime} Uhr doppelt belegt.`,
                        teacherId: p.teacherId, teacherNameA: getTeacherName(p) || 'Lehrkraft A', teacherNameB: getTeacherName(q) || 'Lehrkraft B',
                        studentsA: getStudentNames(p) || 'Schüler', studentsB: getStudentNames(q) || 'Schüler',
                        roomId: p.roomId, roomNameA: roomName, roomNameB: roomName, timeA: `${p.startTime}-${p.endTime}`, timeB: `${q.startTime}-${q.endTime}`
                      });
                    }
                  }));
                }
              });
              const byTeacherDay: Record<string, any[]> = {};
              safeAllocs.filter((p: any) => isRealBlock(p)).forEach((p: any) => {
                if (p.teacherId && p.teacherId !== 'groovelab') {
                  const k = `${p.teacherId}_${p.dayOfWeek}`;
                  (byTeacherDay[k] = byTeacherDay[k] || []).push(p);
                }
              });
              Object.values(byTeacherDay).forEach(group => {
                if (group.length > 1) {
                  group.forEach((p, i) => group.forEach((q, j) => {
                    if (i < j && p.startTime < q.endTime && q.startTime < p.endTime) {
                      const teacherName = getTeacherName(p) || 'Lehrkraft';
                      const dayLabel = days[p.dayOfWeek - 1] || 'Wochentag';
                      list.push({
                        id: `teacher_${p.id}_${q.id}`, type: 'teacher', dayOfWeek: p.dayOfWeek, dayLabel,
                        startTime: p.startTime < q.startTime ? p.startTime : q.startTime,
                        endTime: p.endTime > q.endTime ? p.endTime : q.endTime,
                        summarySentence: `${teacherName} ist am ${dayLabel} um ${p.startTime} Uhr zeitgleich an 2 Terminen gebucht.`,
                        teacherId: p.teacherId, teacherNameA: teacherName, studentsA: getStudentNames(p) || 'Schüler', studentsB: getStudentNames(q) || 'Schüler',
                        roomId: p.roomId, roomNameA: p.roomId ? (roomMap[p.roomId] || 'Raum') : 'Ohne Raumzuweisung',
                        roomNameB: q.roomId ? (roomMap[q.roomId] || 'Raum') : 'Ohne Raumzuweisung',
                        timeA: `${p.startTime}-${p.endTime}`, timeB: `${q.startTime}-${q.endTime}`
                      });
                    }
                  }));
                }
              });
              return list;
            }, [matrixAllocations, userMap, roomMap]);

            const allIssues = (roomIssues || []);
            const openIssues = allIssues.filter((i: any) => !i.is_completed && !i.is_acknowledged);
            const resolvedIssues = allIssues.filter((i: any) => i.is_completed || i.is_acknowledged);
            const displayedIssues = roomIssuesTab === 'open' ? openIssues : (roomIssuesTab === 'resolved' ? resolvedIssues : allIssues);
            const totalPendingActionCount = (pendingBookings?.length || 0) + openIssues.length + scheduleConflicts.length + (pendingSchedules?.length || 0);
            const hasAnyActionRequired = totalPendingActionCount > 0;

            const dayNamesDe = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
            const currentDayNameDe = dayNamesDe[simDate.getDay()] || 'Heute';
            const secretaryFirstName = (currentUserProfile?.first_name || '').trim() || 'Schulleitung';
            const displaySchoolName = schoolName || currentSchoolProfile?.name || 'Musikschule';

            return (
              <div 
                role="tabpanel"
                id="secretary-briefing-tabpanel"
                aria-label="Sekretariat Briefing Übersicht"
                tabIndex={0}
                style={{
                  display: 'grid',
                  gridTemplateColumns: isTabletOrMobile ? '1fr' : '1fr 360px',
                  gap: isMobileView ? '16px' : '24px',
                  alignItems: 'start',
                  minWidth: 0
                }}
              >
                
                {/* LEFT COLUMN: MAIN CONTENT AREA */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: isMobileView ? '16px' : '24px', minWidth: 0 }}>
                  {/* 🏛️ 0,1% Goldstandard: Offizielle Bildungsförderung im Briefing Board */}
                  <CampusSponsorIngressBanner schoolId={schoolId} sponsorSettings={currentSchoolProfile?.sponsor_settings} supabase={supabase} />

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

                    const downloadedCount = downloadedBackupCount;
                    const totalStudents = students.length || 1;
                    const backupPct = Math.min(100, Math.round((downloadedCount / totalStudents) * 100));

                    return (
                      <div style={{ background: '#ecfdf5', border: 'none', borderRadius: '24px', padding: isMobileView ? '16px' : '20px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px', boxShadow: 'none' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: '1 1 240px' }}>
                          <div style={{ background: '#ffffff', borderRadius: '16px', padding: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', flexShrink: 0 }}>
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
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
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
                            style={{ background: '#ffffff', color: '#475569', border: 'none', borderRadius: '12px', padding: '9px 14px', fontWeight: 800, fontSize: '0.78rem', cursor: 'pointer' }}
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
                                    storage_used_bytes: 0, storage_addon_gb: 0, storage_addon_monthly_fee: 0,
                                    storage_addon_status: 'active', storage_termination_status: 'completed'
                                  }).eq('id', schoolId);

                                  const overridesStr = localStorage.getItem('groovelab_school_overrides') || '{}';
                                  const overrides = JSON.parse(overridesStr);
                                  overrides[schoolId] = {
                                    ...(overrides[schoolId] || {}),
                                    storage_used_bytes: 0, storage_addon_gb: 0, storage_addon_monthly_fee: 0,
                                    storage_addon_status: 'active', storage_termination_status: 'completed'
                                  };
                                  localStorage.setItem('groovelab_school_overrides', JSON.stringify(overrides));
                                  localStorage.setItem('groovelab_storage_addon_active', 'false');
                                  localStorage.setItem('campus_storage_addon_active', 'false');
                                  localStorage.setItem('groovelab_storage_addon_gb', '0');
                                  localStorage.setItem('campus_storage_addon_gb', '0');

                                  setCurrentSchoolProfile((prev: any) => prev ? {
                                    ...prev, storage_used_bytes: 0, storage_addon_gb: 0, storage_addon_monthly_fee: 0,
                                    storage_addon_status: 'active', storage_termination_status: 'completed'
                                  } : prev);

                                  window.dispatchEvent(new Event('groovelab_school_updated'));
                                  alert("✅ Audio-Tresor erfolgreich bereinigt. Tarif wurde auf 0,00 € (Standard 1 GB) umgestellt.");
                                } catch (e: any) {
                                  alert("Fehler: " + e.message);
                                }
                              }
                            }}
                            style={{ background: '#16a34a', color: '#ffffff', border: 'none', borderRadius: '12px', padding: '9px 16px', fontWeight: 800, fontSize: '0.78rem', cursor: 'pointer', boxShadow: 'none' }}
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
                    const currentTotalCapGb = 1.0 + activeAddonGb;
                    const usedBytes = memoizedEffectiveUsedBytes;
                    const usedGb = usedBytes / (1024 * 1024 * 1024);
                    const usedMb = usedBytes / (1024 * 1024);
                    const usagePct = currentTotalCapGb > 0 ? (usedGb / currentTotalCapGb) * 100 : 0;
                    if (usagePct < 80) return null;

                    const isFull = usagePct >= 100;
                    const isCritical = usagePct >= 95;
                    const formattedUsed = usedBytes > 0 && usedGb < 1.0 ? `${usedMb.toFixed(1).replace('.', ',')} MB` : `${usedGb.toFixed(2).replace('.', ',')} GB`;
                    const nextTierGb = activeAddonGb < 10 ? 10 : activeAddonGb < 25 ? 25 : activeAddonGb < 50 ? 50 : activeAddonGb < 100 ? 100 : 250;

                    return (
                      <div style={{ background: isFull ? '#fee2e2' : isCritical ? '#ffedd5' : '#fef3c7', border: 'none', borderRadius: '24px', padding: isMobileView ? '16px' : '20px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px', boxShadow: 'none' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: '1 1 240px' }}>
                          <div style={{ background: '#ffffff', borderRadius: '16px', padding: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', flexShrink: 0 }}>
                            <HardDrive size={24} style={{ color: isFull ? '#dc2626' : isCritical ? '#ea580c' : '#d97706' }} />
                          </div>
                          <div>
                            <strong style={{ display: 'block', fontSize: '1rem', color: isFull ? '#991b1b' : isCritical ? '#9a3412' : '#92400e', marginBottom: '4px' }}>
                              {isFull ? `🚨 Audio-Tresor voll: 100% Speicher belegt (${formattedUsed} von ${currentTotalCapGb} GB)` : isCritical ? `⚠️ Kritische Speicherauslastung: Audio-Tresor zu ${Math.round(usagePct)}% belegt!` : `⚠️ Speicher-Vorwarnung: Audio-Tresor zu ${Math.round(usagePct)}% belegt`}
                            </strong>
                            <span style={{ fontSize: '0.84rem', color: isFull ? '#7f1d1d' : isCritical ? '#7c2d12' : '#78350f', lineHeight: '1.4' }}>
                              {formattedUsed} von {currentTotalCapGb} GB belegt. {isFull ? 'Neue Audioaufnahmen sind vorübergehend pausiert. Alle bestehenden Aufnahmen bleiben 100% geschützt und abspielbar.' : isCritical ? 'Der Kulanz-Puffer ist aktiv. Bitte erweitere jetzt dein Speichervolumen, um Unterbrechungen im Unterricht zu vermeiden.' : 'Erweitere rechtzeitig dein Speichervolumen, damit Schüler und Lehrkräfte weiterhin nahtlos in Studio-Qualität aufnehmen können.'}
                            </span>
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                          <button
                            type="button"
                            aria-label={`Audio-Tresor Speichervolumen auf +${nextTierGb} GB erweitern`}
                            onClick={() => { setSelectedStorageAddonGb(nextTierGb); setShowStorageManagerModal(true); }}
                            style={{ background: isFull ? '#dc2626' : isCritical ? '#ea580c' : '#d97706', color: '#ffffff', border: 'none', borderRadius: '12px', padding: '10px 18px', fontWeight: 800, fontSize: '0.84rem', cursor: 'pointer', whiteSpace: 'nowrap', boxShadow: 'none', transition: 'transform 0.15s, background-color 0.15s' }}
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
                    <div style={{ background: '#fee2e2', border: 'none', borderRadius: '24px', padding: isMobileView ? '16px' : '20px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px', boxShadow: 'none' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: '1 1 240px' }}>
                        <div style={{ background: '#ffffff', borderRadius: '16px', padding: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', flexShrink: 0 }}>
                          <ShieldAlert size={24} style={{ color: '#dc2626' }} />
                        </div>
                        <div>
                          <strong style={{ display: 'block', fontSize: '1rem', color: '#991b1b', marginBottom: '4px' }}>AV-Vertrag (Schul-Vereinbarung) ausstehend!</strong>
                          <span style={{ fontSize: '0.84rem', color: '#7f1d1d', lineHeight: '1.4' }}>Dein gesetzlich vorgeschriebener Auftragsverarbeitungsvertrag (AVV) nach Art. 28 DSGVO ist noch nicht digital unterzeichnet. Bitte hole dies umgehend nach, um den rechtssicheren Schulbetrieb zu gewährleisten.</span>
                        </div>
                      </div>
                      <button
                        type="button"
                        aria-label="Auftragsverarbeitungsvertrag (AVV) jetzt unterzeichnen"
                        onClick={() => { if (setShowAvvModal) setShowAvvModal(true); }}
                        style={{ background: '#dc2626', color: '#ffffff', border: 'none', borderRadius: '12px', padding: '10px 20px', fontSize: '0.84rem', fontWeight: 800, cursor: 'pointer', whiteSpace: 'nowrap', boxShadow: 'none', transition: 'transform 0.15s, background-color 0.15s' }}
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
                    if (today.getTime() < creationTime.getTime()) return null;

                    const monthStr = m < 10 ? `0${m}` : `${m}`;
                    const yearShort = String(y).slice(-2);
                    const currentInvoiceId = `RE-${schoolNumericId}-${yearShort}${monthStr}-01`;
                    const deMonths = ['', 'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
                    const monthName = deMonths[m];
                    const invoiceDateStr = `${lastDay}. ${monthName} ${y}`;
                    const dueDateObj = new Date(y, m - 1, lastDay);
                    dueDateObj.setDate(dueDateObj.getDate() + 30);
                    if (dueDateObj.getDay() === 6) dueDateObj.setDate(dueDateObj.getDate() + 2);
                    else if (dueDateObj.getDay() === 0) dueDateObj.setDate(dueDateObj.getDate() + 1);
                    const dueDateStr = `${dueDateObj.getDate()}. ${deMonths[dueDateObj.getMonth() + 1]} ${dueDateObj.getFullYear()}`;

                    return (
                      <div style={{ background: '#dbeafe', border: 'none', borderRadius: '24px', padding: isMobileView ? '16px' : '20px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px', boxShadow: 'none' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: '1 1 240px' }}>
                          <div style={{ background: '#3b82f6', color: '#ffffff', width: '38px', height: '38px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem', flexShrink: 0 }}>📧</div>
                          <div>
                            <h4 style={{ margin: 0, fontSize: '0.96rem', fontWeight: 900, color: '#1e3a8a', fontFamily: 'Urbanist' }}>Monatsrechnung ${currentInvoiceId} versendet</h4>
                            <p style={{ margin: '4px 0 0 0', fontSize: '0.76rem', color: '#1e40af', lineHeight: '1.4', fontWeight: 500 }}>
                              Die Rechnung für den Leistungszeitraum ${monthName} ${y} über <strong>{(Number(mixedTotal_global) || 0).toFixed(2).replace('.', ',')} €</strong> wurde am ${invoiceDateStr} per E-Mail an <strong>{currentUserProfile?.email || 'buchhaltung@musikschule.de'}</strong> gesendet.
                            </p>
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
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
                              setSelectedInvoice({ id: currentInvoiceId, year: String(y), date: invoiceDateStr, dueDateStr, isCurrentMonth: true, b2b: totalB2BWithEinmalzahlung, amount: totalB2BWithEinmalzahlung, schoolStudentCost: studentSharePreview_global, schoolStudentLevy: studentLevyMonthly_global, schoolExtraCost: schoolShareBookedExtra_global, extraLevyMonthly: extraLevyMonthly_global, extraEinmalzahlung: extraEinmalzahlungTotal, b2c: 0, einmalzahlung: einmalzahlungTotal,
                                status: 'Bezahlt',
                                paid: true
                              });
                            }}
                            style={{
                              background: '#ffffff',
                              color: '#2563eb',
                              border: 'none',
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
                  
                  {/* 🏛️ 0,1% GOLDSTANDARD SPLIT HERO-DECK (Top-Left Primary Stage, 1:1 Baseline with Right Sidebar) */}
                  <div
                    data-testid="secretary-briefing-hero-deck"
                    style={{
                      display: 'flex',
                      flexDirection: isMobileView ? 'column' : 'row',
                      background: '#ffffff',
                      borderRadius: '24px',
                      border: 'none',
                      overflow: 'hidden',
                      boxShadow: 'none'
                    }}
                  >
                    {/* Left Stage: Full-Cover Blackboard Hero Artwork with Ambient Overlays */}
                    <div style={{ width: isMobileView ? '100%' : '220px', minHeight: isMobileView ? '160px' : '190px', background: '#0f172a', position: 'relative', overflow: 'hidden', flexShrink: 0, boxSizing: 'border-box', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '12px' }}>
                      {/* Full-Cover Tafelbild Image */}
                      <img src="/campus_login_hero.png" alt="Campus Tafelbild" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center', display: 'block' }} loading="eager" />

                      {/* Soft Ambient Vignette for Maximum Badge Legibility */}
                      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(15, 23, 42, 0.40) 0%, rgba(15, 23, 42, 0.15) 40%, rgba(15, 23, 42, 0.75) 100%)', pointerEvents: 'none' }} />

                      {/* Top-Left Live Status Pill */}
                      <div style={{ position: 'relative', zIndex: 2, alignSelf: 'flex-start', display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 10px', borderRadius: '999px', background: activeAusfallTeachers.length > 0 ? '#ef4444' : '#0f172a', color: '#ffffff', fontSize: '0.62rem', fontWeight: 900, letterSpacing: '0.06em', textTransform: 'uppercase', border: 'none' }}>
                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: activeAusfallTeachers.length > 0 ? '#fca5a5' : '#4ade80' }} />
                        <span>{activeAusfallTeachers.length > 0 ? `${activeAusfallTeachers.length} Ausfall aktiv` : 'Verwaltung aktiv'}</span>
                      </div>

                      {/* Bottom School Name Chip */}
                      <div style={{ position: 'relative', zIndex: 2, alignSelf: 'center', maxWidth: '100%' }}>
                        <span style={{ display: 'inline-block', padding: '4px 12px', borderRadius: '999px', background: '#0f172a', color: '#f8fafc', fontSize: '0.68rem', fontWeight: 800, maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', border: 'none' }}>
                          {displaySchoolName}
                        </span>
                      </div>
                    </div>

                    {/* Right Content Stage: Greeting + Operational Summary + Quick Actions */}
                    <div
                      style={{
                        flex: 1,
                        minWidth: 0,
                        padding: isMobileView ? '18px 16px' : '22px 26px',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        gap: '14px',
                        boxSizing: 'border-box'
                      }}
                    >
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '5px',
                              padding: '4px 10px',
                              borderRadius: '999px',
                              background: '#fee2e2',
                              color: '#b91c1c',
                              fontSize: '0.66rem',
                              fontWeight: 900,
                              letterSpacing: '0.05em',
                              textTransform: 'uppercase'
                            }}
                          >
                            🛡️ Schulleitung &amp; Sekretariat • {currentDayNameDe}
                          </span>
                          {totalPendingActionCount > 0 && (
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                padding: '4px 10px',
                                borderRadius: '999px',
                                background: '#ffedd5',
                                color: '#c2410c',
                                fontSize: '0.66rem',
                                fontWeight: 800
                              }}
                            >
                              ⚡ {totalPendingActionCount} {totalPendingActionCount === 1 ? 'Freigabe offen' : 'Freigaben offen'}
                            </span>
                          )}
                        </div>

                        <h2
                          style={{
                            margin: 0,
                            fontSize: isMobileView ? '1.25rem' : '1.45rem',
                            fontWeight: 900,
                            color: '#0f172a',
                            letterSpacing: '-0.02em',
                            lineHeight: 1.2,
                            fontFamily: "'Plus Jakarta Sans', sans-serif"
                          }}
                        >
                          Guten Tag, {secretaryFirstName}!
                        </h2>

                        <p
                          style={{
                            margin: 0,
                            fontSize: '0.84rem',
                            color: '#475569',
                            lineHeight: 1.45,
                            fontWeight: 600
                          }}
                        >
                          Heute sind <strong style={{ color: '#0f172a' }}>{todayAllocations.length} Raumbelegungen</strong> durch{' '}
                          <strong style={{ color: '#0f172a' }}>{todayTeachersCount} Lehrkräfte</strong> eingeplant.{' '}
                          {hasAnyActionRequired
                            ? `Es liegen ${totalPendingActionCount} operative Vorgänge zur Prüfung bereit.`
                            : 'Alle Systeme, Räume und Stundenpläne laufen zu 100% synchron.'}
                        </p>
                      </div>

                      {/* 3 Tactile Quick-Action Pills */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <button
                          type="button"
                          onClick={() => {
                            if (setRoomsSubView) setRoomsSubView('plan');
                            setActiveTab('secretary');
                            setSecretarySubTab('rooms');
                          }}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            minHeight: '38px',
                            padding: '8px 14px',
                            borderRadius: '12px',
                            border: 'none',
                            background: '#ef4444',
                            color: '#ffffff',
                            fontSize: '0.76rem',
                            fontWeight: 800,
                            cursor: 'pointer'
                          }}
                        >
                          <DoorOpen size={14} color="#ffffff" />
                          <span>Räume-Board</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setActiveTab('campus');
                            setCampusSubTab('schedules');
                          }}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            minHeight: '38px',
                            padding: '8px 14px',
                            borderRadius: '12px',
                            border: 'none',
                            background: '#dcfce7',
                            color: '#15803d',
                            fontSize: '0.76rem',
                            fontWeight: 800,
                            cursor: 'pointer'
                          }}
                        >
                          <Calendar size={14} color="#16a34a" />
                          <span>Stundenpläne {pendingSchedules.length > 0 ? `(${pendingSchedules.length})` : ''}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setActiveTab('secretary');
                            setSecretarySubTab('employees');
                          }}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            minHeight: '38px',
                            padding: '8px 14px',
                            borderRadius: '12px',
                            border: 'none',
                            background: '#f1f5f9',
                            color: '#334155',
                            fontSize: '0.76rem',
                            fontWeight: 800,
                            cursor: 'pointer'
                          }}
                        >
                          <Users size={14} color="#475569" />
                          <span>Team &amp; Rollen</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* 📅 LIVE CAMPUS RADAR & HEUTE IM HAUS (Operatives Tages-Cockpit, 0,1% Goldstandard Satellit) */}
                  <SecretaryTagesRadarBoard
                    rooms={rooms}
                    buildings={buildings}
                    todayAllocations={todayAllocations}
                    todayTeachersCount={todayTeachersCount}
                    todayDayNum={todayDayNum}
                    simulatedToday={simulatedToday}
                    userMap={userMap}
                    setRoomsSubView={setRoomsSubView}
                    setRoomSearchQuery={setRoomSearchQuery}
                    setActiveTab={setActiveTab}
                    setSecretarySubTab={setSecretarySubTab}
                    fetchLogbookBookings={fetchLogbookBookings}
                    setShowLogbookModal={setShowLogbookModal}
                  />

                  {/* 🛡️ KONDENSIERTE SYSTEM-INTEGRITÄTSLEISTE (Wenn keine offenen Aktionen) */}
                  {!hasAnyActionRequired && !showIntegrityDetails && (
                    <div style={{
                      background: '#ffffff',
                      borderRadius: '20px',
                      padding: isMobileView ? '16px' : '18px 24px',
                      boxShadow: 'none',
                      border: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '16px'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flex: '1 1 240px', minWidth: 0 }}>
                        <div style={{ background: '#dcfce7', border: 'none', width: '36px', height: '36px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <CheckCircle size={20} color="#16a34a" />
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                            <strong style={{ fontSize: '0.90rem', fontWeight: 800, color: '#0f172a' }}>
                              System-Integrität: 100% stabil &amp; überschneidungsfrei
                            </strong>
                            <span style={{ background: '#dcfce7', color: '#15803d', fontSize: '0.66rem', fontWeight: 800, padding: '2px 8px', borderRadius: '6px', border: 'none' }}>
                              Optimal
                            </span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '4px', flexWrap: 'wrap', fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>
                            <span>✓ 0 Terminkonflikte</span>
                            <span>&bull;</span>
                            <span>✓ Alle Räume &amp; Ausstattung intakt</span>
                            <span>&bull;</span>
                            <span>✓ Keine ausstehenden Raumbuchungen</span>
                            <span>&bull;</span>
                            <span>✓ Stundenpläne synchron</span>
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        aria-label="Detaillierte System-Prüfberichte anzeigen"
                        onClick={() => setShowIntegrityDetails(true)}
                        style={{
                          background: '#f1f5f9',
                          border: 'none',
                          borderRadius: '10px',
                          color: '#334155',
                          padding: '7px 14px',
                          fontSize: '0.74rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          transition: 'all 0.15s ease'
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = '#e2e8f0'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = '#f1f5f9'; }}
                      >
                        <span>Prüfberichte anzeigen</span>
                        <ChevronDown size={14} color="#64748b" />
                      </button>
                    </div>
                  )}

                  {/* Toggle Button zum Schließen der Details */}
                  {showIntegrityDetails && !hasAnyActionRequired && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', background: '#f8fafc', border: 'none', borderRadius: '14px', padding: '10px 16px' }}>
                      <span style={{ fontSize: '0.76rem', color: '#475569', fontWeight: 600 }}>
                        📋 Detaillierte System-Prüfberichte geöffnet (0 Anomalien gefunden)
                      </span>
                      <button
                        type="button"
                        aria-label="Prüfberichte wieder einklappen"
                        onClick={() => setShowIntegrityDetails(false)}
                        style={{
                          background: '#ffffff',
                          border: 'none',
                          borderRadius: '8px',
                          color: '#334155',
                          padding: '5px 12px',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                      >
                        <span>Prüfberichte einklappen</span>
                        <ChevronUp size={13} color="#64748b" />
                      </button>
                    </div>
                  )}

                  {/* WIDGET: Vorläufige Raumbuchungen */}
                  {(pendingBookings.length > 0 || showIntegrityDetails) && (
                  <div id="tour-secretary-bookings" style={{
                    background: '#ffffff',
                    borderRadius: '24px',
                    padding: isMobileView ? '16px' : '24px',
                    boxShadow: 'none',
                    border: 'none'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', gap: '10px', flexWrap: 'wrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ background: '#ffedd5', color: '#ea580c', width: '32px', height: '32px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
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
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
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
                            background: '#ef4444',
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
                            boxShadow: 'none'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = '#dc2626';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = '#ef4444';
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
                            background: '#f1f5f9',
                            border: 'none',
                            color: '#1c1c1e',
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
                            e.currentTarget.style.background = '#e2e8f0';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = '#f1f5f9';
                          }}
                        >
                          <BookOpen size={13} style={{ color: '#1c1c1e' }} />
                          <span>Logbuch öffnen</span>
                        </button>
                      </div>
                    </div>

                    {pendingBookings.length === 0 ? (
                      <div style={{
                        background: '#dcfce7',
                        border: 'none',
                        color: '#15803d',
                        borderRadius: '16px',
                        padding: '16px 20px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px'
                      }}>
                        <CheckCircle size={20} color="#16a34a" />
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
                              background: '#f8fafc',
                              border: 'none',
                              borderRadius: '16px',
                              padding: '14px 18px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              flexWrap: 'wrap',
                              gap: '12px',
                              boxShadow: 'none'
                            }}>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: 0, flex: '1 1 200px' }}>
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
                              <div style={{ display: 'flex', gap: '8px', flexShrink: 0, alignItems: 'center', flexWrap: 'wrap' }}>
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
                                    background: '#e2e8f0',
                                    color: '#0f172a',
                                    border: 'none',
                                    borderRadius: '8px',
                                    padding: '6px 12px',
                                    fontSize: '0.74rem',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    transition: 'all 0.15s ease',
                                    boxShadow: 'none'
                                  }}
                                  onMouseEnter={(e) => {
                                    e.currentTarget.style.background = '#cbd5e1';
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.background = '#e2e8f0';
                                  }}
                                >
                                  <DoorOpen size={13} style={{ color: '#ef4444' }} />
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
                                    boxShadow: 'none'
                                  }}
                                  onMouseEnter={(e) => e.currentTarget.style.background = '#2d9247'}
                                  onMouseLeave={(e) => e.currentTarget.style.background = '#34a853'}
                                >
                                  Bestätigen
                                </button>
                                <button
                                  type="button"
                                  aria-label={`Raumbuchung für ${roomName} am ${dateFormatted} ablehnen`}
                                  onClick={() => handleRejectBooking(b.id)}
                                  style={{
                                    background: '#fee2e2',
                                    color: '#dc2626',
                                    border: 'none',
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
                                    e.currentTarget.style.background = '#fee2e2';
                                    e.currentTarget.style.color = '#dc2626';
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
                  )}

                  {/* WIDGET: Raum-Meldungen & Mängel */}
                  {(allIssues.length > 0 || showIntegrityDetails) && (
                      <div id="tour-secretary-room-issues" style={{
                        background: '#ffffff',
                        borderRadius: '24px',
                        padding: '24px',
                        boxShadow: 'none',
                        border: 'none'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', gap: '12px', flexWrap: 'wrap' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{ background: openIssues.length > 0 ? '#fee2e2' : '#dcfce7', color: openIssues.length > 0 ? '#dc2626' : '#16a34a', width: '32px', height: '32px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <Wrench size={16} />
                            </div>
                            <div>
                              <h3 style={{ margin: 0, fontSize: '0.96rem', fontWeight: 800, color: '#1e293b', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                                Raum-Meldungen & Mängel
                              </h3>
                              <span style={{ fontSize: '0.65rem', fontWeight: 750, color: openIssues.length > 0 ? '#dc2626' : '#16a34a', textTransform: 'uppercase' }}>
                                {openIssues.length > 0 ? `${openIssues.length} ${openIssues.length === 1 ? 'Mangel gemeldet' : 'Mängel gemeldet'}` : 'Alle Räume intakt'}
                              </span>
                            </div>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                            {/* Segmented status filter */}
                            <div 
                              role="tablist"
                              aria-label="Mängelfilter"
                              style={{
                                display: 'inline-flex',
                                background: '#f1f5f9',
                                borderRadius: '10px',
                                padding: '3px'
                              }}
                            >
                              <button
                                type="button"
                                role="tab"
                                aria-selected={roomIssuesTab === 'open'}
                                onClick={() => setRoomIssuesTab('open')}
                                style={{
                                  padding: '5px 10px',
                                  borderRadius: '8px',
                                  border: 'none',
                                  background: roomIssuesTab === 'open' ? '#ffffff' : 'transparent',
                                  color: roomIssuesTab === 'open' ? '#dc2626' : '#64748b',
                                  fontSize: '0.74rem',
                                  fontWeight: 750,
                                  cursor: 'pointer',
                                  boxShadow: 'none',
                                  transition: 'all 0.15s ease'
                                }}
                              >
                                Offen ({openIssues.length})
                              </button>
                              <button
                                type="button"
                                role="tab"
                                aria-selected={roomIssuesTab === 'resolved'}
                                onClick={() => setRoomIssuesTab('resolved')}
                                style={{
                                  padding: '5px 10px',
                                  borderRadius: '8px',
                                  border: 'none',
                                  background: roomIssuesTab === 'resolved' ? '#ffffff' : 'transparent',
                                  color: roomIssuesTab === 'resolved' ? '#15803d' : '#64748b',
                                  fontSize: '0.74rem',
                                  fontWeight: 750,
                                  cursor: 'pointer',
                                  boxShadow: 'none',
                                  transition: 'all 0.15s ease'
                                }}
                              >
                                Behoben ({resolvedIssues.length})
                              </button>
                              <button
                                type="button"
                                role="tab"
                                aria-selected={roomIssuesTab === 'all'}
                                onClick={() => setRoomIssuesTab('all')}
                                style={{
                                  padding: '5px 10px',
                                  borderRadius: '8px',
                                  border: 'none',
                                  background: roomIssuesTab === 'all' ? '#ffffff' : 'transparent',
                                  color: roomIssuesTab === 'all' ? '#0f172a' : '#64748b',
                                  fontSize: '0.74rem',
                                  fontWeight: 750,
                                  cursor: 'pointer',
                                  boxShadow: 'none',
                                  transition: 'all 0.15s ease'
                                }}
                              >
                                Alle ({allIssues.length})
                              </button>
                            </div>

                            {/* Open Logbook Button */}
                            {onOpenFacilityLogModal && (
                              <button
                                type="button"
                                onClick={onOpenFacilityLogModal}
                                aria-label="Mängel-Logbuch öffnen"
                                style={{
                                  background: '#f1f5f9',
                                  border: 'none',
                                  borderRadius: '10px',
                                  padding: '6px 12px',
                                  fontSize: '0.76rem',
                                  fontWeight: 750,
                                  color: '#334155',
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '6px',
                                  transition: 'all 0.15s ease'
                                }}
                              >
                                <BookOpen size={13} />
                                <span>Mängel-Logbuch</span>
                              </button>
                            )}
                          </div>
                        </div>

                        {displayedIssues.length === 0 ? (
                          <div style={{
                            background: roomIssuesTab === 'open' ? '#dcfce7' : '#f8fafc',
                            border: 'none',
                            color: roomIssuesTab === 'open' ? '#15803d' : '#64748b',
                            borderRadius: '16px',
                            padding: '16px 20px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px'
                          }}>
                            <CheckCircle size={20} color={roomIssuesTab === 'open' ? '#16a34a' : '#64748b'} />
                            <div>
                              <strong style={{ display: 'block', fontSize: '0.85rem', fontWeight: 800 }}>
                                {roomIssuesTab === 'open' 
                                  ? 'Alle Räume & Ausstattung intakt' 
                                  : (roomIssuesTab === 'resolved' ? 'Keine behobenen Mängel vorhanden' : 'Keine Meldungen vorhanden')}
                              </strong>
                              <span style={{ fontSize: '0.74rem', opacity: 0.9 }}>
                                {roomIssuesTab === 'open'
                                  ? 'Aktuell liegen keine offenen Mängel- oder Reparaturbedarfe von Lehrkräften vor.'
                                  : (roomIssuesTab === 'resolved' ? 'Sobald ein Mangel behoben wird, bleibt er hier dauerhaft dokumentiert.' : 'Es liegen noch keine Mängelmeldungen vor.')}
                              </span>
                            </div>
                          </div>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {displayedIssues.map((issue) => {
                              const isResolved = Boolean(issue.is_completed || issue.is_acknowledged);
                              const createdDate = new Date(issue.created_at);
                              const dateFormatted = createdDate.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
                              const cleanContent = formatCleanNoteContent(issue.content, issue.student_name);
                              const authorDisplay = issue.author_name || 'Lehrkraft';
                              const resolvedDateFormatted = issue.acknowledged_at 
                                ? new Date(issue.acknowledged_at).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
                                : null;

                              return (
                                <div key={issue.id} style={{
                                  background: isResolved ? '#f8fafc' : '#fef2f2',
                                  border: 'none',
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
                                          background: isResolved ? '#e2e8f0' : '#fee2e2',
                                          color: isResolved ? '#475569' : '#dc2626',
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
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                                        {isResolved && (
                                          <span style={{
                                            background: '#dcfce7',
                                            color: '#15803d',
                                            border: 'none',
                                            borderRadius: '5px',
                                            padding: '1px 6px',
                                            fontSize: '0.66rem',
                                            fontWeight: 800
                                          }}>
                                            ✓ Behoben
                                          </span>
                                        )}
                                        <div style={{ fontSize: '0.88rem', fontWeight: 700, color: isResolved ? '#334155' : '#0f172a' }}>
                                          {cleanContent || issue.content}
                                        </div>
                                      </div>
                                      <div style={{ fontSize: '0.72rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                        <span>Gemeldet von <strong>{authorDisplay}</strong></span>
                                        <span>•</span>
                                        <span>{dateFormatted} Uhr</span>
                                        {isResolved && resolvedDateFormatted && (
                                          <>
                                            <span>•</span>
                                            <span style={{ color: '#15803d', fontWeight: 650 }}>
                                              Behoben am {resolvedDateFormatted} Uhr ({issue.resolved_by === 'teacher' ? 'Lehrkraft' : 'Sekretariat'})
                                            </span>
                                          </>
                                        )}
                                      </div>
                                    </div>
                                  </div>

                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    {!isResolved ? (
                                      <button
                                        type="button"
                                        onClick={async () => {
                                          await notesService.resolveRoomIssue(issue.id, 'secretary', schoolId);
                                          setRoomIssues(prev => prev.map(n => n.id === issue.id ? { ...n, is_completed: true, is_acknowledged: true, acknowledged_at: new Date().toISOString(), resolved_by: 'secretary' } : n));
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
                                          boxShadow: 'none'
                                        }}
                                      >
                                        <Check size={13} />
                                        <span>Als behoben markieren</span>
                                      </button>
                                    ) : (
                                      <button
                                        type="button"
                                        onClick={async () => {
                                          await notesService.reopenRoomIssue(issue.id, schoolId);
                                          setRoomIssues(prev => prev.map(n => n.id === issue.id ? { ...n, is_completed: false, is_acknowledged: false, acknowledged_at: null, resolved_by: null } : n));
                                        }}
                                        style={{
                                          background: '#e2e8f0',
                                          color: '#475569',
                                          border: 'none',
                                          borderRadius: '10px',
                                          padding: '7px 12px',
                                          fontSize: '0.74rem',
                                          fontWeight: 700,
                                          cursor: 'pointer',
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          gap: '5px'
                                        }}
                                      >
                                        <RotateCcw size={12} />
                                        <span>Wiedereröffnen</span>
                                      </button>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                  )}

                  {/* WIDGET: Systemische Terminkonflikte (Apple / Enterprise SaaS Level) */}
                  {(scheduleConflicts.length > 0 || showIntegrityDetails) && (
                  <div style={{
                    background: '#ffffff',
                    borderRadius: '24px',
                    padding: '24px',
                    boxShadow: 'none',
                    border: 'none',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '18px'
                  }}>
                    {/* Widget Header */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                          background: scheduleConflicts.length > 0 ? '#fee2e2' : '#e6f4ea',
                          color: scheduleConflicts.length > 0 ? '#ef4444' : '#34a853',
                          width: '38px',
                          height: '38px',
                          borderRadius: '12px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          boxShadow: 'none',
                          flexShrink: 0
                        }}>
                          {scheduleConflicts.length > 0 ? <ShieldAlert size={20} color="#ef4444" /> : <CheckCircle size={20} color="#34a853" />}
                        </div>
                        <div>
                          <h3 style={{ margin: 0, fontSize: '1.02rem', fontWeight: 800, color: '#1e293b', fontFamily: "'Plus Jakarta Sans', sans-serif", letterSpacing: '-0.01em' }}>
                            System-Kollisionsprüfer
                          </h3>
                          <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            Automatisierte Überschneidungskontrolle
                          </span>
                        </div>
                      </div>

                      {scheduleConflicts.length > 0 ? (
                        <div style={{
                          background: '#fee2e2',
                          border: 'none',
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
                            background: '#ef4444',
                            boxShadow: 'none',
                            display: 'inline-block'
                          }} />
                          {scheduleConflicts.length} {scheduleConflicts.length === 1 ? 'Kollision' : 'Kollisionen'} aktiv
                        </div>
                      ) : (
                        <div style={{
                          background: '#dcfce7',
                          border: 'none',
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
                            boxShadow: 'none',
                            display: 'inline-block'
                          }} />
                          System optimal
                        </div>
                      )}
                    </div>

                    {/* Content Body */}
                    {scheduleConflicts.length === 0 ? (
                      <div style={{
                        background: '#f8fafc',
                        borderRadius: '16px',
                        padding: '16px 20px',
                        border: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '14px'
                      }}>
                        <div style={{ background: '#ffffff', padding: '10px', borderRadius: '12px', boxShadow: 'none', flexShrink: 0 }}>
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
                            background: '#f8fafc',
                            border: 'none',
                            borderRadius: '18px',
                            padding: '16px',
                            boxShadow: 'none',
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
                                  background: conflict.type === 'room' ? '#fee2e2' : '#fef3c7',
                                  color: conflict.type === 'room' ? '#b91c1c' : '#b45309',
                                  border: 'none',
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
                                  background: '#e2e8f0',
                                  border: 'none',
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
                                  background: '#e2e8f0',
                                  border: 'none',
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

                              <ShieldAlert size={16} color="#ef4444" />
                            </div>

                            {/* Human Story Sentence */}
                            <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#0f172a', fontFamily: "'Plus Jakarta Sans', sans-serif", lineHeight: 1.35 }}>
                              ⚠️ {conflict.summarySentence}
                            </div>

                            {/* Comparison Boxes */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', background: '#fef2f2', borderRadius: '14px', padding: '12px 14px' }}>
                              {conflict.type === 'teacher' ? (
                                <>
                                  <div style={{ background: '#ffffff', border: 'none', padding: '10px 12px', borderRadius: '10px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.74rem', fontWeight: 800, color: '#991b1b' }}>
                                      <span>📍 Termin 1 ({conflict.timeA} Uhr)</span>
                                      <span style={{ color: '#64748b', fontWeight: 600 }}>Raum: {conflict.roomNameA}</span>
                                    </div>
                                    <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#1e293b' }}>
                                      👥 Schüler: <span style={{ color: '#0f172a' }}>{conflict.studentsA}</span>
                                    </div>
                                  </div>

                                  <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#ef4444', textAlign: 'center', padding: '2px 0' }}>
                                    ⚡ kollidiert zeitgleich mit:
                                  </div>

                                  <div style={{ background: '#ffffff', border: 'none', padding: '10px 12px', borderRadius: '10px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
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
                                  <div style={{ background: '#ffffff', border: 'none', padding: '10px 12px', borderRadius: '10px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.74rem', fontWeight: 800, color: '#991b1b' }}>
                                      <span>👤 Lehrkraft 1: {conflict.teacherNameA}</span>
                                      <span style={{ color: '#64748b', fontWeight: 600 }}>⏰ {conflict.timeA} Uhr</span>
                                    </div>
                                    <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#1e293b' }}>
                                      👥 Schüler: <span style={{ color: '#0f172a' }}>{conflict.studentsA}</span>
                                    </div>
                                  </div>

                                  <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#ef4444', textAlign: 'center', padding: '2px 0' }}>
                                    ⚡ belegt im selben Raum zeitgleich:
                                  </div>

                                  <div style={{ background: '#ffffff', border: 'none', padding: '10px 12px', borderRadius: '10px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
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
                                  background: '#ef4444',
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
                                  boxShadow: 'none',
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
                  )}

                  {/* WIDGET: Stundenplaneinreichungen */}
                  {(pendingSchedules.length > 0 || showIntegrityDetails) && (
                  <div style={{
                    background: '#ffffff',
                    borderRadius: '24px',
                    padding: '24px',
                    boxShadow: 'none',
                    border: 'none'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ background: '#e0e7ff', color: '#4f46e5', width: '32px', height: '32px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <ClipboardList size={16} />
                        </div>
                        <div>
                          <h3 style={{ margin: 0, fontSize: '0.96rem', fontWeight: 800, color: '#1e293b', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                            Stundenplaneinreichungen
                          </h3>
                          <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                            Zu prüfende Stundenpläne ({pendingSchedules.length})
                          </span>
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {pendingSchedules.length === 0 ? (
                        <div style={{
                          background: '#dcfce7',
                          border: 'none',
                          color: '#15803d',
                          borderRadius: '16px',
                          padding: '16px',
                          textAlign: 'center'
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '6px' }}>
                            <CheckCircle size={22} color="#16a34a" />
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
                                border: 'none',
                                background: '#f8fafc',
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
                                    background: '#4f46e5',
                                    color: '#ffffff',
                                    border: 'none',
                                    borderRadius: '10px',
                                    padding: '6px 14px',
                                    fontSize: '0.74rem',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    boxShadow: 'none',
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
                  )}

                </div>

                {/* RIGHT COLUMN: SIDEBAR (0,1% Goldstandard: Consolidated 2x2 Telemetry Cockpit + Quick Actions) */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

                  {/* WIDGET 1: Tages-Puls & Systemstatus (2x2 Bento KPI Cockpit) */}
                  <div
                    id="tour-secretary-kpis"
                    style={{
                      background: '#ffffff',
                      borderRadius: '24px',
                      padding: '20px',
                      boxShadow: 'none',
                      border: 'none',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '14px'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ background: '#e0e7ff', color: '#4f46e5', width: '32px', height: '32px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <Clock size={16} />
                        </div>
                        <div>
                          <h3 style={{ margin: 0, fontSize: '0.92rem', fontWeight: 800, color: '#0f172a', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                            Tages-Puls &amp; Auslastung
                          </h3>
                          <span style={{ fontSize: '0.64rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                            Live-Telemetrie heute
                          </span>
                        </div>
                      </div>
                      <span style={{
                        fontSize: '0.66rem',
                        fontWeight: 800,
                        color: (activeAusfallTeachers.length === 0 && scheduleConflicts.length === 0) ? '#15803d' : '#b91c1c',
                        background: (activeAusfallTeachers.length === 0 && scheduleConflicts.length === 0) ? '#dcfce7' : '#fee2e2',
                        padding: '3px 9px',
                        borderRadius: '999px'
                      }}>
                        {(activeAusfallTeachers.length === 0 && scheduleConflicts.length === 0) ? 'Planmäßig ✓' : 'Prüfung aktiv'}
                      </span>
                    </div>

                    {/* 2x2 Compact Bento KPI Grid */}
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                        gap: '10px'
                      }}
                    >
                      {/* Tile 1: Raumauslastung */}
                      <div
                        role="button"
                        tabIndex={0}
                        aria-label={`Raumauslastung ${roomOccupancyRate} Prozent, zum Räume-Board wechseln`}
                        onClick={() => {
                          if (setRoomsSubView) setRoomsSubView('plan');
                          setActiveTab('secretary');
                          setSecretarySubTab('rooms');
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            if (setRoomsSubView) setRoomsSubView('plan');
                            setActiveTab('secretary');
                            setSecretarySubTab('rooms');
                          }
                        }}
                        style={{
                          background: '#f8fafc',
                          border: 'none',
                          borderRadius: '16px',
                          padding: '12px 13px',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between',
                          minHeight: '66px',
                          cursor: 'pointer',
                          boxSizing: 'border-box',
                          transition: 'all 0.15s ease'
                        }}
                        className="hover-scale"
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                          <span style={{ fontSize: '0.60rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Raumauslastung</span>
                          <div style={{ background: '#e0e7ff', padding: '4px', borderRadius: '7px', display: 'flex' }}>
                            <DoorOpen size={12} color="#4f46e5" />
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginTop: '6px', flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '1.2rem', fontWeight: 900, color: '#0f172a', fontFamily: "'Plus Jakarta Sans', sans-serif", letterSpacing: '-0.02em', lineHeight: 1 }}>
                            {roomOccupancyRate}%
                          </span>
                          <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#64748b' }}>
                            ({todayAllocations.length} Slots)
                          </span>
                        </div>
                      </div>

                      {/* Tile 2: Aktivierung */}
                      <div
                        role="button"
                        tabIndex={0}
                        aria-label={`Schüler-Aktivierung ${activationRate} Prozent, zur Schülerübersicht wechseln`}
                        onClick={() => {
                          setActiveTab('campus');
                          setCampusSubTab('students');
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            setActiveTab('campus');
                            setCampusSubTab('students');
                          }
                        }}
                        style={{
                          background: '#f8fafc',
                          border: 'none',
                          borderRadius: '16px',
                          padding: '12px 13px',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between',
                          minHeight: '66px',
                          cursor: 'pointer',
                          boxSizing: 'border-box',
                          transition: 'all 0.15s ease'
                        }}
                        className="hover-scale"
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                          <span style={{ fontSize: '0.60rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Aktivierung</span>
                          <div style={{ background: '#dcfce7', padding: '4px', borderRadius: '7px', display: 'flex' }}>
                            <UserCheck size={12} color="#15803d" />
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginTop: '6px', flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '1.2rem', fontWeight: 900, color: '#0f172a', fontFamily: "'Plus Jakarta Sans', sans-serif", letterSpacing: '-0.02em', lineHeight: 1 }}>
                            {activationRate}%
                          </span>
                          <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#64748b' }}>
                            ({activeStudentsCount}/{totalStudentsCount})
                          </span>
                        </div>
                      </div>

                      {/* Tile 3: Konflikte */}
                      <div
                        role="button"
                        tabIndex={0}
                        aria-label={`Terminkonflikte: ${scheduleConflicts.length}, zum Stundenplan wechseln`}
                        onClick={() => {
                          setActiveTab('campus');
                          setCampusSubTab('schedules');
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            setActiveTab('campus');
                            setCampusSubTab('schedules');
                          }
                        }}
                        style={{
                          background: scheduleConflicts.length === 0 ? '#f8fafc' : '#facc15',
                          border: 'none',
                          borderRadius: '16px',
                          padding: '12px 13px',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between',
                          minHeight: '66px',
                          cursor: 'pointer',
                          boxSizing: 'border-box',
                          transition: 'all 0.15s ease'
                        }}
                        className="hover-scale"
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                          <span style={{ fontSize: '0.60rem', fontWeight: 800, color: scheduleConflicts.length === 0 ? '#475569' : '#0f172a', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Konflikte</span>
                          <div style={{ background: scheduleConflicts.length === 0 ? '#dcfce7' : 'rgba(15, 23, 42, 0.1)', padding: '4px', borderRadius: '7px', display: 'flex' }}>
                            <ShieldAlert size={12} color={scheduleConflicts.length === 0 ? '#15803d' : '#0f172a'} />
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginTop: '6px', flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '1.2rem', fontWeight: 900, color: '#0f172a', fontFamily: "'Plus Jakarta Sans', sans-serif", letterSpacing: '-0.02em', lineHeight: 1 }}>
                            {scheduleConflicts.length}
                          </span>
                          <span style={{ fontSize: '0.65rem', fontWeight: 800, color: scheduleConflicts.length === 0 ? '#15803d' : '#0f172a' }}>
                            {scheduleConflicts.length === 0 ? 'Stabil ✓' : 'Konflikt'}
                          </span>
                        </div>
                      </div>

                      {/* Tile 4: Ausfälle Heute */}
                      <div
                        role="button"
                        tabIndex={0}
                        aria-label={`Ausfälle heute: ${activeAusfallTeachers.length}, zum Ausfall-Cockpit wechseln`}
                        onClick={() => {
                          setActiveTab('secretary');
                          setSecretarySubTab('crisis');
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            setActiveTab('secretary');
                            setSecretarySubTab('crisis');
                          }
                        }}
                        style={{
                          background: activeAusfallTeachers.length === 0 ? '#f8fafc' : '#ef4444',
                          border: 'none',
                          borderRadius: '16px',
                          padding: '12px 13px',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between',
                          minHeight: '66px',
                          cursor: 'pointer',
                          boxSizing: 'border-box',
                          transition: 'all 0.15s ease'
                        }}
                        className="hover-scale"
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                          <span style={{ fontSize: '0.60rem', fontWeight: 800, color: activeAusfallTeachers.length === 0 ? '#475569' : '#ffffff', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Ausfälle Heute</span>
                          <div style={{ background: activeAusfallTeachers.length === 0 ? '#dcfce7' : 'rgba(255, 255, 255, 0.2)', padding: '4px', borderRadius: '7px', display: 'flex' }}>
                            <CalendarX size={12} color={activeAusfallTeachers.length === 0 ? '#15803d' : '#ffffff'} />
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginTop: '6px', flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '1.2rem', fontWeight: 900, color: activeAusfallTeachers.length === 0 ? '#0f172a' : '#ffffff', fontFamily: "'Plus Jakarta Sans', sans-serif", letterSpacing: '-0.02em', lineHeight: 1 }}>
                            {activeAusfallTeachers.length}
                          </span>
                          <span style={{ fontSize: '0.65rem', fontWeight: 800, color: activeAusfallTeachers.length === 0 ? '#15803d' : '#ffffff' }}>
                            {activeAusfallTeachers.length === 0 ? 'Planmäßig ✓' : (activeAusfallTeachers.length === 1 ? '1 Ausfall' : `${activeAusfallTeachers.length} Ausfälle`)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Active Teacher Absences List (if any today) */}
                    {activeAusfallTeachers.length > 0 && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingTop: '4px', borderTop: '1px solid #f1f5f9' }}>
                        {activeAusfallTeachers.map(teacher => {
                          const untilDateVal = teacher.ausfall_until;
                          const ausfallUntilStr = untilDateVal ? new Date(untilDateVal).toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit' }) : 'unbefristet';
                          return (
                            <div key={teacher.id} style={{
                              padding: '10px 12px',
                              borderRadius: '12px',
                              background: '#fef2f2',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '4px'
                            }}>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <strong style={{ fontSize: '0.78rem', color: '#991b1b', fontWeight: 700 }}>
                                  {formatTeacherFullName(teacher)}
                                </strong>
                                <span style={{
                                  background: '#fee2e2',
                                  color: '#b91c1c',
                                  padding: '2px 7px',
                                  borderRadius: '6px',
                                  fontSize: '0.64rem',
                                  fontWeight: 700
                                }}>
                                  bis {ausfallUntilStr}
                                </span>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.68rem', color: '#64748b' }}>
                                <span style={{ color: '#15803d', fontWeight: 700 }}>✓ Räume freigegeben</span>
                                <span>&bull;</span>
                                <span style={{ color: '#2563eb', fontWeight: 600 }}>Schüler informiert</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* WIDGET 2: Schnellzugriff & Werkzeuge */}
                  <div style={{
                    background: '#ffffff',
                    borderRadius: '24px',
                    padding: '22px 20px',
                    boxShadow: 'none',
                    border: 'none',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '14px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ background: '#fee2e2', color: '#ef4444', width: '32px', height: '32px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Sparkles size={16} />
                      </div>
                      <div>
                        <h3 style={{ margin: 0, fontSize: '0.92rem', fontWeight: 800, color: '#1e293b', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                          Schnellzugriff Sekretariat
                        </h3>
                        <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                          Häufige Verwaltungsaktionen
                        </span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <button
                        type="button"
                        aria-label="Zur Schülerübersicht und Stammdaten wechseln"
                        onClick={() => {
                          setActiveTab('campus');
                          setCampusSubTab('students');
                        }}
                        style={{
                          background: '#f8fafc',
                          border: 'none',
                          borderRadius: '12px',
                          padding: '10px 14px',
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          color: '#1e293b',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          minHeight: '44px',
                          transition: 'all 0.15s ease'
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = '#f1f5f9'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = '#f8fafc'; }}
                      >
                        <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <Users size={15} color="#3b82f6" />
                          <span>Schülerübersicht &amp; Stammdaten</span>
                        </span>
                        <ChevronRight size={14} color="#94a3b8" />
                      </button>

                      <button
                        type="button"
                        aria-label="Zum Räume- und Belegungsplan wechseln"
                        onClick={() => {
                          if (setRoomsSubView) setRoomsSubView('plan');
                          setActiveTab('secretary');
                          setSecretarySubTab('rooms');
                        }}
                        style={{
                          background: '#f8fafc',
                          border: 'none',
                          borderRadius: '12px',
                          padding: '10px 14px',
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          color: '#1e293b',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          minHeight: '44px',
                          transition: 'all 0.15s ease'
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = '#f1f5f9'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = '#f8fafc'; }}
                      >
                        <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <DoorOpen size={15} color="#ea580c" />
                          <span>Räume- &amp; Belegungsplan</span>
                        </span>
                        <ChevronRight size={14} color="#94a3b8" />
                      </button>

                      <button
                        type="button"
                        aria-label="Zu Abrechnung und Infrastruktur wechseln"
                        onClick={() => {
                          setActiveTab('secretary');
                          setSecretarySubTab('licenses');
                        }}
                        style={{
                          background: '#f8fafc',
                          border: 'none',
                          borderRadius: '12px',
                          padding: '10px 14px',
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          color: '#1e293b',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          minHeight: '44px',
                          transition: 'all 0.15s ease'
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = '#f1f5f9'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = '#f8fafc'; }}
                      >
                        <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <ClipboardList size={15} color="#16a34a" />
                          <span>Abrechnung &amp; Infrastruktur</span>
                        </span>
                        <ChevronRight size={14} color="#94a3b8" />
                      </button>

                      <button
                        type="button"
                        aria-label="Zu Mitteilungen und Informationen wechseln"
                        onClick={() => {
                          setActiveTab('secretary');
                          setSecretarySubTab('announcements');
                        }}
                        style={{
                          background: '#f8fafc',
                          border: 'none',
                          borderRadius: '12px',
                          padding: '10px 14px',
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          color: '#1e293b',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          minHeight: '44px',
                          transition: 'all 0.15s ease'
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = '#f1f5f9'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = '#f8fafc'; }}
                      >
                        <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <BookOpen size={15} color="#8b5cf6" />
                          <span>Mitteilungen &amp; Aushänge</span>
                        </span>
                        <ChevronRight size={14} color="#94a3b8" />
                      </button>
                    </div>
                  </div>
                </div>

              </div>
            );

};
