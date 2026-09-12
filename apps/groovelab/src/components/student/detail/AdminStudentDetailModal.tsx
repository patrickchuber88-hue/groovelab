import React, { useState, useEffect } from 'react';
import { 
  FileText, ShieldCheck, Award, QrCode, Sliders, Calendar, Clock, 
  MapPin, User, Users, AlertTriangle, Printer, Download, Trash2, Check,
  Music, Edit3, ArrowRight, CheckCircle2, UserCheck
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { StudentModalHeader } from './shared/StudentModalHeader';
import { StudentScheduleCard, getFormattedScheduleDayTime } from './shared/StudentScheduleCard';
import { StudentAccessSection } from './shared/StudentAccessSection';
import { StudentConsentProtocol } from './shared/StudentConsentProtocol';
import { IDBadgeCard } from '../../IDBadgeCard';
import { formatTeacherFullName } from '../../../utils/nameHelper';
import { getInstrumentAvatarUrl, resolveCampusStudentAvatar } from '../../StudioAvatar';
import QRCode from 'react-qr-code';
import { getCanonicalQrLandingUrl } from '../../../utils/tenantUrlHelper';

const ADMIN_PRIMARY = '#ea4335';
const ADMIN_BG = '#fef2f2';

export const STANDARD_INSTRUMENTS = [
  'Gitarre',
  'E-Gitarre',
  'Klavier',
  'Keyboard',
  'Schlagzeug',
  'E-Bass',
  'Kontrabass',
  'Gesang',
  'Trompete',
  'Posaune',
  'Saxofon',
  'Blockflöte',
  'Querflöte',
  'Violine / Geige',
  'Cello',
  'Ukulele',
  'Cajon',
  'Musikalische Früherziehung (MFE)',
  'Allgemein / Musiker'
];

export const sanitizeName = (val: string): string => {
  if (!val) return '';
  return val
    .trim()
    .split(/([\s-]+)/)
    .map(part => part.length > 0 && !/[\s-]/.test(part)
      ? part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()
      : part)
    .join('');
};

export const isCompoundName = (first: string): boolean => {
  if (!first) return false;
  return /\s(&|und|\+|\/|,)\s/i.test(first) || /&|\+/.test(first);
};

export const splitCompoundNames = (first: string): [string, string] | null => {
  if (!first) return null;
  const parts = first.split(/\s*(?:&|und|\+|\/|,)\s*/i);
  if (parts.length >= 2 && parts[0].trim() && parts[1].trim()) {
    return [sanitizeName(parts[0]), sanitizeName(parts[1])];
  }
  return null;
};

export interface AdminStudentDetailModalProps {
  student: any;
  onClose: () => void;
  onOpenBandProfile?: (band: any) => void;
  onOpenTageskompass?: (student: any) => void;
  activePlatform?: string;
  callerDashboard?: string;
  onSwitchPlatform?: (newPlatform: 'campus' | 'groovelab') => void;
}

export const AdminStudentDetailModal: React.FC<AdminStudentDetailModalProps> = ({
  student,
  onClose,
  onOpenBandProfile,
  onOpenTageskompass,
  activePlatform,
  callerDashboard,
  onSwitchPlatform
}) => {
  const [activeStudent, setActiveStudent] = useState<any>(student);
  const [activeTab, setActiveTab] = useState<'contract' | 'access'>('contract');
  const [firstName, setFirstName] = useState<string>(student.first_name || (student.name ? student.name.split(' ')[0] : ''));
  const [lastName, setLastName] = useState<string>(student.last_name || (student.name && student.name.split(' ').length > 1 ? student.name.split(' ').slice(1).join(' ') : ''));
  const [instrument, setInstrument] = useState<string>(student.instrument || 'Musiker');
  const [isCustomInstrument, setIsCustomInstrument] = useState<boolean>(false);
  const [customInstrumentInput, setCustomInstrumentInput] = useState<string>('');
  const [schoolSubjects, setSchoolSubjects] = useState<string[]>([]);
  const [isCampusActive, setIsCampusActive] = useState<boolean>(student.is_campus_active ?? student.isCampusActive ?? false);
  const [isGroovelabActive, setIsGroovelabActive] = useState<boolean>(student.is_groovelab_active ?? student.isGroovelabActive ?? false);
  const [exemptFromDirectBilling, setExemptFromDirectBilling] = useState<boolean>(student.exempt_from_direct_billing ?? false);
  const [lockedStudentPrice, setLockedStudentPrice] = useState<number | null>(student.locked_student_price ?? null);
  const [lessonDuration, setLessonDuration] = useState<number>(student.lesson_duration || 30);
  const [isAdult, setIsAdult] = useState<boolean>(Boolean(student.is_adult));
  const [schedulesList, setSchedulesList] = useState<any[]>([]);
  const [groupId, setGroupId] = useState<string | null>(null);
  const [groupStudents, setGroupStudents] = useState<any[]>([]);
  const [schoolStudents, setSchoolStudents] = useState<any[]>([]);
  const [selectedStudentToLink, setSelectedStudentToLink] = useState<string>('');
  const [studentSearchQuery, setStudentSearchQuery] = useState('');
  const [searchDropdownOpen, setSearchDropdownOpen] = useState(false);
  const [showGroupSelector, setShowGroupSelector] = useState(false);
  const [consentLogs, setConsentLogs] = useState<any[]>([]);
  const [sessionsList, setSessionsList] = useState<any[]>([]);
  const [showQrOverlay, setShowQrOverlay] = useState<boolean>(false);
  const [qrOverlayTab, setQrOverlayTab] = useState<'campus' | 'groovelab'>('campus');
  const [showIdCardOverlay, setShowIdCardOverlay] = useState(false);
  const [schoolName, setSchoolName] = useState<string>('Campus-Groovelab Partner-Musikschule');
  const [schoolSubdomain, setSchoolSubdomain] = useState<string | undefined>(undefined);
  const [localQrToken, setLocalQrToken] = useState<string>(student.qr_token || '');
  const [confirmDurationModal, setConfirmDurationModal] = useState<{ open: boolean; targetDuration: number } | null>(null);
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [isDeletingStudent, setIsDeletingStudent] = useState(false);
  const [isSplittingStudent, setIsSplittingStudent] = useState(false);
  const [editingPartnerId, setEditingPartnerId] = useState<string | null>(null);
  const [partnerEditFirst, setPartnerEditFirst] = useState('');
  const [partnerEditLast, setPartnerEditLast] = useState('');
  const [partnerEditInstrument, setPartnerEditInstrument] = useState('');
  const [isSavingPartner, setIsSavingPartner] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Keyboard accessibility (Escape key closes modal)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showQrOverlay) setShowQrOverlay(false);
        else if (showIdCardOverlay) setShowIdCardOverlay(false);
        else if (confirmDurationModal) setConfirmDurationModal(null);
        else if (showDeleteConfirmModal) setShowDeleteConfirmModal(false);
        else onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showQrOverlay, showIdCardOverlay, confirmDurationModal, showDeleteConfirmModal, onClose]);

  // Sync state with incoming student prop
  useEffect(() => {
    setActiveStudent(student);
    setFirstName(student.first_name || (student.name ? student.name.split(' ')[0] : ''));
    setLastName(student.last_name || (student.name && student.name.split(' ').length > 1 ? student.name.split(' ').slice(1).join(' ') : ''));
    setInstrument(student.instrument || 'Musiker');
    setIsCampusActive(student.is_campus_active ?? student.isCampusActive ?? false);
    setIsGroovelabActive(student.is_groovelab_active ?? student.isGroovelabActive ?? false);
    setExemptFromDirectBilling(student.exempt_from_direct_billing ?? false);
    setLockedStudentPrice(student.locked_student_price ?? null);
    setLessonDuration(student.lesson_duration || 30);
    setIsAdult(Boolean(student.is_adult));
    setLocalQrToken(student.qr_token || '');
  }, [student]);

  // Fetch school details
  useEffect(() => {
    const fetchSchool = async () => {
      let resolvedSchoolId = activeStudent.school_id || activeStudent.schoolId || (activeStudent.schools?.id) || (Array.isArray(activeStudent.schools) ? activeStudent.schools[0]?.id : null);
      if (!resolvedSchoolId && activeStudent.id) {
        try {
          const { data } = await supabase.from('users').select('school_id').eq('id', activeStudent.id).single();
          if (data?.school_id) resolvedSchoolId = data.school_id;
        } catch (e) {}
      }
      if (resolvedSchoolId) {
        try {
          const { data } = await supabase.from('schools').select('name, subdomain').eq('id', resolvedSchoolId).single();
          if (data) {
            setSchoolName(data.name || 'Campus-Groovelab Partner-Musikschule');
            setSchoolSubdomain(data.subdomain || undefined);
          }
        } catch (e) {}
      }
    };
    fetchSchool();
  }, [activeStudent.id, activeStudent.school_id, activeStudent.schools]);

  // Fetch subjects for this school
  useEffect(() => {
    const fetchSubjects = async () => {
      let resolvedSchoolId = activeStudent.school_id || activeStudent.schoolId || (activeStudent.schools?.id);
      if (!resolvedSchoolId && activeStudent.id) {
        try {
          const { data } = await supabase.from('users').select('school_id').eq('id', activeStudent.id).maybeSingle();
          if (data?.school_id) resolvedSchoolId = data.school_id;
        } catch (e) {}
      }
      if (resolvedSchoolId) {
        try {
          const { data } = await supabase
            .from('subjects')
            .select('name')
            .eq('school_id', resolvedSchoolId)
            .order('name');
          if (data) {
            const names = data.map((d: any) => d.name).filter(Boolean);
            setSchoolSubjects(names);
          }
        } catch (e) {}
      }
    };
    fetchSubjects();
  }, [activeStudent.id, activeStudent.school_id, activeStudent.schoolId]);

  // Fetch schedules, groups, consent, and session logs
  useEffect(() => {
    const fetchAdminData = async () => {
      if (!activeStudent.id) return;

      // Schedules
      try {
        const { data: schedData } = await supabase
          .from('schedules')
          .select(`
            id,
            time_slot,
            day_of_week,
            status,
            rooms:room_id ( id, name ),
            teacher:teacher_id ( first_name, last_name )
          `)
          .eq('student_id', activeStudent.id);
        if (schedData) setSchedulesList(schedData);
      } catch (e) {}

      // Groups
      try {
        const { data: userData } = await supabase.from('users').select('group_id').eq('id', activeStudent.id).maybeSingle();
        const currentGrpId = userData?.group_id || activeStudent.group_id;
        setGroupId(currentGrpId);

        if (currentGrpId) {
          const { data: grpData } = await supabase
            .from('users')
            .select('id, first_name, last_name, instrument')
            .eq('group_id', currentGrpId)
            .neq('id', activeStudent.id);
          setGroupStudents(grpData || []);
        } else {
          setGroupStudents([]);
        }
      } catch (e) {}

      // School students list for group picker
      const sId = activeStudent.school_id || activeStudent.schoolId;
      if (sId) {
        try {
          const { data: allStds } = await supabase
            .from('users')
            .select('id, first_name, last_name')
            .eq('school_id', sId)
            .eq('role', 'student')
            .neq('id', activeStudent.id)
            .order('first_name');
          setSchoolStudents(allStds || []);
        } catch (e) {}
      }

      // Consent logs
      try {
        const { data: consentData } = await supabase
          .from('audit_logs')
          .select('*')
          .eq('user_id', activeStudent.id)
          .like('action', '%CONSENT%')
          .order('created_at', { ascending: false });
        setConsentLogs(consentData || []);
      } catch (e) {}

      // Sessions list for CSV export
      try {
        const { data: sessData } = await supabase
          .from('presence_sessions')
          .select('id, check_in_time, check_out_time, stations ( name )')
          .eq('user_id', activeStudent.id)
          .order('check_in_time', { ascending: false });
        setSessionsList(sessData || []);
      } catch (e) {}
    };

    fetchAdminData();
  }, [activeStudent.id, refreshTrigger]);

  const allAvailableInstruments = Array.from(new Set([
    ...schoolSubjects,
    ...STANDARD_INSTRUMENTS,
    ...(instrument && !STANDARD_INSTRUMENTS.includes(instrument) ? [instrument] : [])
  ]));

  const ensureUserRawRecord = async () => {
    try {
      const { data: existingUser } = await supabase.from('users').select('id').eq('id', activeStudent.id).maybeSingle();
      if (!existingUser) {
        await supabase.from('users').insert({
          id: activeStudent.id,
          school_id: activeStudent.school_id || activeStudent.schoolId,
          role: 'student',
          first_name: firstName || 'Schüler',
          last_name: lastName || '',
          instrument: instrument || 'Musiker',
          teacher_id: activeStudent.teacher_id || null,
          lesson_duration: lessonDuration || 30,
          is_campus_active: isCampusActive,
          is_groovelab_active: isGroovelabActive,
          is_active: false,
          exempt_from_direct_billing: exemptFromDirectBilling
        });
      }
    } catch (e) {
      console.warn('ensureUserRawRecord notice:', e);
    }
  };

  const handleSaveName = async (newFirst: string, newLast: string) => {
    const cleanFirst = sanitizeName(newFirst);
    const cleanLast = sanitizeName(newLast);
    if (!cleanFirst || !cleanLast) {
      alert('Vor- und Nachname dürfen nicht leer sein.');
      return;
    }
    await ensureUserRawRecord();
    await supabase.from('users').update({ first_name: cleanFirst, last_name: cleanLast }).eq('id', activeStudent.id);
    try {
      await supabase.from('students').update({ first_name: cleanFirst, last_name: cleanLast, name: `${cleanFirst} ${cleanLast}`.trim() }).eq('id', activeStudent.id);
    } catch (e) {}
    try {
      await supabase.from('pending_students').update({ first_name: cleanFirst, last_name: cleanLast }).eq('id', activeStudent.id);
    } catch (e) {}
    setFirstName(cleanFirst);
    setLastName(cleanLast);
    activeStudent.first_name = cleanFirst;
    activeStudent.last_name = cleanLast;
    student.first_name = cleanFirst;
    student.last_name = cleanLast;
  };

  const handleSaveInstrument = async (newInst: string) => {
    const cleanInst = newInst.trim();
    if (!cleanInst) return;
    try {
      await ensureUserRawRecord();
      await supabase.from('users').update({ instrument: cleanInst }).eq('id', activeStudent.id);
      try {
        await supabase.from('students').update({ instrument: cleanInst }).eq('id', activeStudent.id);
      } catch (e) {}
      setInstrument(cleanInst);
      activeStudent.instrument = cleanInst;
      student.instrument = cleanInst;
    } catch (err: any) {
      alert('Fehler beim Speichern des Instruments: ' + err.message);
    }
  };

  const handleSwitchActiveStudent = async (targetStudent: any) => {
    try {
      const { data } = await supabase.from('users').select('*').eq('id', targetStudent.id).maybeSingle();
      const chosen = data || targetStudent;
      setActiveStudent(chosen);
      setFirstName(chosen.first_name || (chosen.name ? chosen.name.split(' ')[0] : ''));
      setLastName(chosen.last_name || (chosen.name && chosen.name.split(' ').length > 1 ? chosen.name.split(' ').slice(1).join(' ') : ''));
      setInstrument(chosen.instrument || 'Musiker');
      setIsCampusActive(chosen.is_campus_active ?? chosen.isCampusActive ?? false);
      setIsGroovelabActive(chosen.is_groovelab_active ?? chosen.isGroovelabActive ?? false);
      setExemptFromDirectBilling(chosen.exempt_from_direct_billing ?? false);
      setLockedStudentPrice(chosen.locked_student_price ?? null);
      setLessonDuration(chosen.lesson_duration || 30);
      setIsAdult(Boolean(chosen.is_adult));
      setLocalQrToken(chosen.qr_token || '');
      setEditingPartnerId(null);
      setRefreshTrigger(prev => prev + 1);
    } catch (e) {
      setActiveStudent(targetStudent);
      setFirstName(targetStudent.first_name || '');
      setLastName(targetStudent.last_name || '');
      setInstrument(targetStudent.instrument || 'Musiker');
      setEditingPartnerId(null);
      setRefreshTrigger(prev => prev + 1);
    }
  };

  const handleSavePartnerQuickEdit = async (partnerId: string) => {
    const cleanFirst = sanitizeName(partnerEditFirst);
    const cleanLast = sanitizeName(partnerEditLast);
    const cleanInst = partnerEditInstrument.trim();
    if (!cleanFirst || !cleanLast) {
      alert('Vor- und Nachname des Partners dürfen nicht leer sein.');
      return;
    }
    try {
      setIsSavingPartner(true);
      await supabase.from('users').update({
        first_name: cleanFirst,
        last_name: cleanLast,
        instrument: cleanInst || 'Musiker'
      }).eq('id', partnerId);
      try {
        await supabase.from('students').update({
          first_name: cleanFirst,
          last_name: cleanLast,
          name: `${cleanFirst} ${cleanLast}`.trim(),
          instrument: cleanInst || 'Musiker'
        }).eq('id', partnerId);
      } catch (e) {}

      setGroupStudents(prev => prev.map(s => s.id === partnerId ? { ...s, first_name: cleanFirst, last_name: cleanLast, instrument: cleanInst } : s));
      setEditingPartnerId(null);
    } catch (err: any) {
      alert('Fehler beim Speichern des Partners: ' + err.message);
    } finally {
      setIsSavingPartner(false);
    }
  };

  const handleSplitCompoundStudent = async () => {
    const parts = splitCompoundNames(firstName);
    if (!parts) {
      alert('Konnte die Namen nicht automatisch trennen.');
      return;
    }
    const [childAFirst, childBFirst] = parts;
    const confirmed = window.confirm(
      `Soll der Datensatz in 2 eigenständige Profile aufgeteilt werden?\n\n` +
      `Kind 1: ${childAFirst} ${lastName}\n` +
      `Kind 2: ${childBFirst} ${lastName}\n\n` +
      `Beide Kinder werden automatisch als Partner-Gruppe verknüpft und erhalten eigene Ausweis- und Login-Rechte.`
    );
    if (!confirmed) return;

    try {
      setIsSplittingStudent(true);
      const newGroupId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : 'grp-' + Date.now();
      const newStudentBId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : 'std-' + Date.now();
      const newQrTokenB = 'cg-badge-' + Math.random().toString(36).substring(2, 10).toUpperCase();

      // 1. Update Student A
      await ensureUserRawRecord();
      await supabase.from('users').update({
        first_name: childAFirst,
        group_id: newGroupId
      }).eq('id', activeStudent.id);
      try {
        await supabase.from('students').update({
          first_name: childAFirst,
          name: `${childAFirst} ${lastName}`.trim(),
          group_id: newGroupId
        }).eq('id', activeStudent.id);
      } catch (e) {}

      // 2. Insert Student B
      await supabase.from('users').insert({
        id: newStudentBId,
        school_id: activeStudent.school_id || activeStudent.schoolId,
        role: 'student',
        first_name: childBFirst,
        last_name: lastName,
        instrument: instrument || 'Musiker',
        teacher_id: activeStudent.teacher_id || null,
        lesson_duration: lessonDuration || 30,
        is_campus_active: isCampusActive,
        is_groovelab_active: isGroovelabActive,
        group_id: newGroupId,
        qr_token: newQrTokenB,
        is_active: false,
        exempt_from_direct_billing: exemptFromDirectBilling
      });
      try {
        await supabase.from('students').insert({
          id: newStudentBId,
          school_id: activeStudent.school_id || activeStudent.schoolId,
          name: `${childBFirst} ${lastName}`.trim(),
          first_name: childBFirst,
          last_name: lastName,
          instrument: instrument || 'Musiker',
          teacher_id: activeStudent.teacher_id || null,
          lesson_duration: lessonDuration || 30,
          group_id: newGroupId,
          qr_token: newQrTokenB
        });
      } catch (e) {}

      // 3. Audit Log
      try {
        await supabase.from('audit_logs').insert({
          action: 'STUDENT_RECORD_SPLIT_INTO_GROUP',
          school_id: activeStudent.school_id || activeStudent.schoolId,
          user_id: activeStudent.id,
          details: {
            original_id: activeStudent.id,
            child_a: `${childAFirst} ${lastName}`,
            new_student_b_id: newStudentBId,
            child_b: `${childBFirst} ${lastName}`,
            new_group_id: newGroupId,
            action_by: 'admin',
            timestamp: new Date().toISOString()
          }
        });
      } catch (e) {}

      // 4. Update local state
      setFirstName(childAFirst);
      activeStudent.first_name = childAFirst;
      setGroupId(newGroupId);
      setRefreshTrigger(prev => prev + 1);
      alert(`Erfolgreich aufgeteilt!\n\n${childAFirst} und ${childBFirst} sind nun als getrennte Profile mit Partner-Gruppe angelegt.`);
    } catch (err: any) {
      alert('Fehler beim Aufteilen des Profils: ' + err.message);
    } finally {
      setIsSplittingStudent(false);
    }
  };

  const handleToggleCampus = async (newVal: boolean) => {
    try {
      await ensureUserRawRecord();
      const { error } = await supabase.from('users').update({ is_campus_active: newVal }).eq('id', activeStudent.id);
      if (error) throw error;
      setIsCampusActive(newVal);
      activeStudent.is_campus_active = newVal;
      student.is_campus_active = newVal;
    } catch (err: any) {
      alert('Fehler beim Aktualisieren des Campus-Moduls: ' + err.message);
    }
  };

  const handleToggleGroovelab = async (newVal: boolean) => {
    try {
      await ensureUserRawRecord();
      const { error } = await supabase.from('users').update({ is_groovelab_active: newVal }).eq('id', activeStudent.id);
      if (error) throw error;
      setIsGroovelabActive(newVal);
      activeStudent.is_groovelab_active = newVal;
      student.is_groovelab_active = newVal;
    } catch (err: any) {
      alert('Fehler beim Aktualisieren des GrooveLab-Moduls: ' + err.message);
    }
  };

  const handleToggleExemption = async (newVal: boolean) => {
    try {
      await ensureUserRawRecord();
      const { error } = await supabase.from('users').update({ exempt_from_direct_billing: newVal }).eq('id', activeStudent.id);
      if (error) throw error;
      setExemptFromDirectBilling(newVal);
      activeStudent.exempt_from_direct_billing = newVal;
      student.exempt_from_direct_billing = newVal;
    } catch (err: any) {
      alert('Fehler beim Aktualisieren des Härtefall-Status: ' + err.message);
    }
  };

  const handleUpdateDuration = async (duration: number) => {
    try {
      await ensureUserRawRecord();
      await supabase.from('users').update({ lesson_duration: duration }).eq('id', activeStudent.id);
      try {
        await supabase.from('students').update({ lesson_duration: duration }).eq('id', activeStudent.id);
      } catch (e) {}
      setLessonDuration(duration);
      activeStudent.lesson_duration = duration;
      student.lesson_duration = duration;
      setConfirmDurationModal(null);
    } catch (err: any) {
      alert('Fehler beim Aktualisieren der Dauer: ' + err.message);
    }
  };

  const handleToggleAdultStatus = async (targetAdult: boolean) => {
    try {
      await ensureUserRawRecord();
      const updates = {
        is_adult: targetAdult,
        adult_verified_at: targetAdult ? new Date().toISOString() : null
      };
      await supabase.from('users').update(updates).eq('id', activeStudent.id);
      try {
        await supabase.from('students').update(updates).eq('id', activeStudent.id);
      } catch (e) {}

      setIsAdult(targetAdult);
      activeStudent.is_adult = targetAdult;
      student.is_adult = targetAdult;

      try {
        await supabase.from('audit_logs').insert({
          action: targetAdult ? 'STUDENT_LEGAL_MAJORITY_CONFIRMED' : 'STUDENT_LEGAL_MAJORITY_REVOKED',
          school_id: activeStudent.school_id || activeStudent.schoolId,
          user_id: activeStudent.id,
          details: {
            student_id: activeStudent.id,
            student_name: `${firstName} ${lastName}`.trim(),
            action_by: 'admin',
            timestamp: new Date().toISOString()
          }
        });
      } catch (auditErr) {}

      alert(targetAdult
        ? `Schüler ${firstName} wurde als volljährig (18+) bestätigt. Elterlicher PIN-Zugriff wurde deaktiviert.`
        : `Volljährigkeits-Status für ${firstName} wurde zurückgesetzt.`);
    } catch (err: any) {
      alert('Fehler beim Aktualisieren des Volljährigkeits-Status: ' + err.message);
    }
  };

  const handleLinkGroup = async () => {
    if (!selectedStudentToLink) return;
    try {
      const newGroupId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : 'grp-' + Date.now();
      await ensureUserRawRecord();
      await supabase.from('users').update({ group_id: newGroupId }).eq('id', activeStudent.id);
      await supabase.from('users').update({ group_id: newGroupId }).eq('id', selectedStudentToLink);

      alert('Gruppenunterricht erfolgreich eingerichtet!');
      setSelectedStudentToLink('');
      setStudentSearchQuery('');
      setShowGroupSelector(false);
      setGroupId(newGroupId);
      setRefreshTrigger(prev => prev + 1);
    } catch (err: any) {
      alert('Fehler beim Einrichten der Gruppe: ' + err.message);
    }
  };

  const handleUnlinkGroup = async () => {
    if (!window.confirm('Soll der Gruppenunterricht wirklich aufgelöst werden? Beide Schüler bleiben als Einzelschüler erhalten.')) {
      return;
    }
    try {
      if (groupId) {
        await supabase.from('users').update({ group_id: null }).eq('group_id', groupId);
        try {
          await supabase.from('students').update({ group_id: null }).eq('group_id', groupId);
        } catch (e) {}
      } else {
        await supabase.from('users').update({ group_id: null }).eq('id', activeStudent.id);
        try {
          await supabase.from('students').update({ group_id: null }).eq('id', activeStudent.id);
        } catch (e) {}
      }
      alert('Verbindung zum Gruppenunterricht erfolgreich getrennt.');
      setGroupId(null);
      setGroupStudents([]);
      setRefreshTrigger(prev => prev + 1);
    } catch (err: any) {
      alert('Fehler beim Trennen der Gruppe: ' + err.message);
    }
  };

  const handleDeleteStudentProfile = async () => {
    try {
      setIsDeletingStudent(true);
      // DSGVO Art. 17 Deletion via audit and soft/hard delete
      await supabase.from('audit_logs').insert({
        action: 'STUDENT_PROFILE_DELETED_ART17',
        school_id: activeStudent.school_id || activeStudent.schoolId,
        user_id: activeStudent.id,
        details: {
          student_id: activeStudent.id,
          student_name: `${firstName} ${lastName}`.trim(),
          action_by: 'admin',
          timestamp: new Date().toISOString()
        }
      });

      await supabase.from('users').delete().eq('id', activeStudent.id);
      try {
        await supabase.from('students').delete().eq('id', activeStudent.id);
      } catch (e) {}

      alert(`Das Profil von ${firstName} ${lastName} wurde nach Art. 17 DSGVO erfolgreich aus dem System entfernt.`);
      setShowDeleteConfirmModal(false);
      onClose();
    } catch (err: any) {
      alert('Fehler beim Löschen des Profils: ' + err.message);
    } finally {
      setIsDeletingStudent(false);
    }
  };

  // DSGVO Art. 15 PDF Export
  const handleExportDSGVOPdf = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Bitte Popups erlauben, um die DSGVO-Auskunft anzuzeigen.');
      return;
    }

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>DSGVO-Auskunft (Art. 15) - ${firstName} ${lastName}</title>
        <style>
          @page { size: A4; margin: 15mm; }
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #0f172a; line-height: 1.5; margin: 0; padding: 10px; }
          .header { border-bottom: 2px solid #e2e8f0; padding-bottom: 12px; margin-bottom: 18px; }
          .header h1 { margin: 0; font-size: 1.4rem; color: #0f172a; }
          .meta { font-size: 0.8rem; color: #64748b; margin-top: 4px; }
          .section { margin-bottom: 16px; border: 1px solid #e2e8f0; border-radius: 10px; padding: 14px; }
          .section h2 { font-size: 0.95rem; text-transform: uppercase; margin: 0 0 10px 0; color: #334155; }
          .row { display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px solid #f1f5f9; font-size: 0.82rem; }
          .row:last-child { border-bottom: none; }
          .label { color: #64748b; font-weight: 600; }
          .val { font-weight: 800; color: #0f172a; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Datenschutzauskunft nach Art. 15 DSGVO</h1>
          <div class="meta">Verantwortliche Stelle: ${schoolName} • Erstellt am: ${new Date().toLocaleDateString('de-DE')}</div>
        </div>
        <div class="section">
          <h2>Stammdaten &amp; Vertragsstatus</h2>
          <div class="row"><span class="label">Vorname:</span><span class="val">${firstName}</span></div>
          <div class="row"><span class="label">Nachname:</span><span class="val">${lastName}</span></div>
          <div class="row"><span class="label">Hauptfach / Instrument:</span><span class="val">${instrument}</span></div>
          <div class="row"><span class="label">Schüler-ID:</span><span class="val">${activeStudent.id}</span></div>
          <div class="row"><span class="label">Volljährigkeit:</span><span class="val">${isAdult ? 'Ja (18+)' : 'Minderjährig'}</span></div>
          <div class="row"><span class="label">Campus-Modul:</span><span class="val">${isCampusActive ? 'Aktiv' : 'Basis'}</span></div>
          <div class="row"><span class="label">GrooveLab-Modul:</span><span class="val">${isGroovelabActive ? 'Aktiv' : 'Basis'}</span></div>
          <div class="row"><span class="label">Unterrichtsdauer:</span><span class="val">${lessonDuration} Minuten</span></div>
        </div>
        <div class="section">
          <h2>Unterrichtsorganisation</h2>
          ${schedulesList.length > 0 ? schedulesList.map((s: any) => `
            <div class="row">
              <span class="label">${getFormattedScheduleDayTime(s.day_of_week, s.time_slot)}</span>
              <span class="val">${s.rooms?.name || 'Raum'} • ${s.teacher ? formatTeacherFullName(s.teacher) : 'Lehrkraft'}</span>
            </div>
          `).join('') : '<div style="font-size: 0.8rem; color: #64748b;">Kein regelmäßiger Termin hinterlegt.</div>'}
        </div>
        <div style="margin-top: 20px; font-size: 0.7rem; color: #94a3b8; text-align: center;">
          Generiert über Campus-Groovelab • Vertrauliches Dokument zur Vorlage bei Aufsichtsbehörden oder Betroffenen.
        </div>
      </body>
      </html>
    `;
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 350);
  };

  const handleExportPresenceCSV = () => {
    if (!sessionsList || sessionsList.length === 0) {
      alert('Keine Anwesenheitsdaten für diesen Schüler vorhanden.');
      return;
    }
    let csv = '\uFEFFSchüler;Datum;Check-In;Check-Out;Station\n';
    sessionsList.forEach((s: any) => {
      const d = new Date(s.check_in_time);
      const datum = d.toLocaleDateString('de-DE');
      const ci = d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
      const co = s.check_out_time ? new Date(s.check_out_time).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }) : 'Aktiv';
      const station = s.stations?.name || 'Terminal';
      csv += `"${firstName} ${lastName}";"${datum}";"${ci}";"${co}";"${station}"\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `anwesenheit-${firstName}-${lastName}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const displayAvatar = resolveCampusStudentAvatar({
    ...activeStudent,
    first_name: firstName,
    last_name: lastName,
    instrument: instrument
  });
  const memberSince = activeStudent.created_at
    ? new Date(activeStudent.created_at).toLocaleDateString('de-DE', { month: 'long', year: 'numeric' })
    : 'Juli 2026';

  return (
    <div
      className="student-detail-backdrop"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 10500,
        background: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Verwaltungs-Karteikarte"
    >
      <div
        className="student-detail-panel"
        style={{
          background: '#ffffff',
          borderRadius: '32px',
          padding: '32px',
          width: '100%',
          maxWidth: '1020px',
          maxHeight: '90vh',
          overflowY: 'auto',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          position: 'relative',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        {/* Header */}
        <StudentModalHeader
          mode="admin"
          student={activeStudent}
          firstName={firstName}
          lastName={lastName}
          displayAvatarSrc={displayAvatar}
          memberSince={memberSince}
          activeColor={ADMIN_PRIMARY}
          groupStudents={groupStudents}
          onSaveName={handleSaveName}
          onOpenIDCard={() => setShowIdCardOverlay(true)}
          onClose={onClose}
        />

        {/* Smarter Sammelnamen-Split-Assistent (DSGVO Art. 5 & BGB Konformität) */}
        {isCompoundName(firstName) && (
          <div
            style={{
              background: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)',
              border: '1.5px solid #fde68a',
              borderRadius: '20px',
              padding: '16px 20px',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '16px',
              boxShadow: '0 4px 12px rgba(245, 158, 11, 0.08)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '12px',
                  background: '#fef3c7',
                  border: '1px solid #fde68a',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#b45309',
                  flexShrink: 0
                }}
              >
                <Users size={22} />
              </div>
              <div>
                <div style={{ fontSize: '0.88rem', fontWeight: 900, color: '#92400e' }}>
                  Sammel-Anmeldung erkannt: 2 Kinder in einem Datensatz
                </div>
                <div style={{ fontSize: '0.74rem', color: '#b45309', marginTop: '2px' }}>
                  Der Vorname enthält mehrere Namen ({firstName}). Gemäß DSGVO Art. 5 und BGB wird die Aufteilung in zwei eigenständige, partner-verknüpfte Profile empfohlen.
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={handleSplitCompoundStudent}
              disabled={isSplittingStudent}
              style={{
                background: '#ea4335',
                color: '#ffffff',
                border: 'none',
                borderRadius: '12px',
                padding: '10px 18px',
                fontSize: '0.8rem',
                fontWeight: 900,
                cursor: isSplittingStudent ? 'wait' : 'pointer',
                whiteSpace: 'nowrap',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 2px 8px rgba(234, 67, 53, 0.25)',
                transition: 'all 0.15s'
              }}
              className="hover-scale"
            >
              <CheckCircle2 size={16} />
              <span>{isSplittingStudent ? 'Teile auf...' : 'In 2 Profile aufteilen (Goldstandard)'}</span>
            </button>
          </div>
        )}

        {/* Admin Navigation Tabs */}
        <div
          role="tablist"
          aria-label="Schüler-Detailbereiche"
          style={{
            display: 'flex',
            gap: '8px',
            borderBottom: '1px solid #e2e8f0',
            marginBottom: '26px'
          }}
        >
          <button
            type="button"
            role="tab"
            id="tab-contract"
            aria-controls="panel-contract"
            aria-selected={activeTab === 'contract'}
            aria-label="Vertrag und Unterrichtsorganisation"
            onClick={() => setActiveTab('contract')}
            style={{
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === 'contract' ? `3px solid ${ADMIN_PRIMARY}` : '3px solid transparent',
              padding: '10px 18px',
              fontSize: '0.92rem',
              fontWeight: 800,
              color: activeTab === 'contract' ? '#0f172a' : '#64748b',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.15s'
            }}
          >
            <FileText size={17} style={{ color: activeTab === 'contract' ? ADMIN_PRIMARY : '#94a3b8' }} />
            <span>Vertrag &amp; Unterrichtsorganisation</span>
          </button>

          <button
            type="button"
            role="tab"
            id="tab-access"
            aria-controls="panel-access"
            aria-selected={activeTab === 'access'}
            aria-label="Zugang, Datenschutz und Einverständnis"
            onClick={() => setActiveTab('access')}
            style={{
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === 'access' ? `3px solid ${ADMIN_PRIMARY}` : '3px solid transparent',
              padding: '10px 18px',
              fontSize: '0.92rem',
              fontWeight: 800,
              color: activeTab === 'access' ? '#0f172a' : '#64748b',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.15s'
            }}
          >
            <ShieldCheck size={17} style={{ color: activeTab === 'access' ? ADMIN_PRIMARY : '#94a3b8' }} />
            <span>Zugang &amp; DSGVO-Recht</span>
          </button>
        </div>

        {/* Tab 1: Vertrag & Unterrichtsorganisation */}
        {activeTab === 'contract' && (
          <div
            role="tabpanel"
            id="panel-contract"
            aria-labelledby="tab-contract"
            tabIndex={0}
            style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '28px', alignItems: 'start' }}
            className="student-detail-grid"
          >
            {/* Left Column: Lesson Slot, Instrument, Duration, Modules */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
              {/* Schedule Card */}
              <StudentScheduleCard
                schedulesList={schedulesList}
                lessonDuration={lessonDuration}
                student={activeStudent}
                mode="admin"
                activeColor={ADMIN_PRIMARY}
              />

              {/* Instrument & Fach Selector Card */}
              <section
                style={{
                  background: '#ffffff',
                  borderRadius: '24px',
                  padding: '20px 24px',
                  border: '1.5px solid #f1f5f9',
                  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.02)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#1e293b' }}>
                      Unterrichtsfach &amp; Instrument
                    </div>
                    <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '2px' }}>
                      Bestimmt das Hauptfach und den 3D-Musiker-Avatar
                    </div>
                  </div>
                  <div
                    style={{
                      background: '#fef2f2',
                      color: ADMIN_PRIMARY,
                      fontSize: '0.74rem',
                      fontWeight: 800,
                      padding: '3px 10px',
                      borderRadius: '100px',
                      border: '1px solid #fee2e2'
                    }}
                  >
                    {instrument || 'Nicht festgelegt'}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <select
                    aria-label="Instrument auswählen"
                    value={allAvailableInstruments.includes(instrument) ? instrument : 'custom'}
                    onChange={(e) => {
                      if (e.target.value === 'custom') {
                        setIsCustomInstrument(true);
                      } else {
                        setIsCustomInstrument(false);
                        handleSaveInstrument(e.target.value);
                      }
                    }}
                    style={{
                      flex: 1,
                      minWidth: '180px',
                      padding: '8px 12px',
                      borderRadius: '12px',
                      border: '1.5px solid #cbd5e1',
                      fontSize: '0.82rem',
                      fontWeight: 700,
                      color: '#0f172a',
                      background: '#ffffff',
                      cursor: 'pointer'
                    }}
                  >
                    {allAvailableInstruments.map((inst) => (
                      <option key={inst} value={inst}>
                        {inst}
                      </option>
                    ))}
                    <option value="custom">✏️ Anderes Instrument eingeben...</option>
                  </select>

                  {isCustomInstrument && (
                    <div style={{ display: 'flex', gap: '6px', flex: 1, minWidth: '200px' }}>
                      <input
                        type="text"
                        placeholder="Instrument z. B. Didgeridoo"
                        value={customInstrumentInput}
                        onChange={(e) => setCustomInstrumentInput(e.target.value)}
                        style={{
                          flex: 1,
                          padding: '8px 12px',
                          borderRadius: '12px',
                          border: '1.5px solid #cbd5e1',
                          fontSize: '0.82rem',
                          fontWeight: 700,
                          color: '#0f172a'
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (customInstrumentInput.trim()) {
                            handleSaveInstrument(customInstrumentInput.trim());
                            setIsCustomInstrument(false);
                            setCustomInstrumentInput('');
                          }
                        }}
                        style={{
                          background: '#34a853',
                          color: '#ffffff',
                          border: 'none',
                          borderRadius: '10px',
                          padding: '8px 14px',
                          fontSize: '0.78rem',
                          fontWeight: 800,
                          cursor: 'pointer'
                        }}
                      >
                        OK
                      </button>
                    </div>
                  )}
                </div>
              </section>

              {/* Lesson Duration Picker */}
              <section
                style={{
                  background: '#ffffff',
                  borderRadius: '24px',
                  padding: '20px 24px',
                  border: '1.5px solid #f1f5f9',
                  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.02)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}
              >
                <div>
                  <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#1e293b' }}>
                    Unterrichtsdauer
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '2px' }}>
                    Vertraglich vereinbarter Zeittakt
                  </div>
                </div>

                <div style={{ display: 'flex', background: '#f1f5f9', padding: '3px', borderRadius: '12px', gap: '3px' }}>
                  {[30, 45, 60, 90].map((dur) => (
                    <button
                      key={dur}
                      type="button"
                      aria-label={`Unterrichtsdauer ${dur} Minuten auswählen`}
                      aria-pressed={lessonDuration === dur}
                      onClick={() => {
                        if (dur !== lessonDuration) {
                          setConfirmDurationModal({ open: true, targetDuration: dur });
                        }
                      }}
                      style={{
                        background: lessonDuration === dur ? '#ffffff' : 'transparent',
                        color: lessonDuration === dur ? '#0f172a' : '#64748b',
                        border: 'none',
                        borderRadius: '9px',
                        padding: '6px 12px',
                        fontSize: '0.78rem',
                        fontWeight: lessonDuration === dur ? 900 : 700,
                        cursor: 'pointer',
                        boxShadow: lessonDuration === dur ? '0 1px 3px rgba(0,0,0,0.08)' : 'none'
                      }}
                    >
                      {dur}m
                    </button>
                  ))}
                </div>
              </section>

              {/* Module Subscriptions & App-Bereitstellung */}
              <section
                style={{
                  background: '#ffffff',
                  borderRadius: '24px',
                  padding: '20px 24px',
                  border: '1.5px solid #f1f5f9',
                  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.02)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '14px'
                }}
              >
                <h4
                  style={{
                    fontSize: '0.75rem',
                    fontWeight: 900,
                    color: '#64748b',
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    margin: 0,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  <Sliders size={16} /> App-Module &amp; Bereitstellung
                </h4>

                {/* Campus Module */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #f1f5f9' }}>
                  <div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#1e293b' }}>
                      🎓 Campus-Modul (0,49 € / Mo.)
                    </div>
                    <div style={{ fontSize: '0.7rem', color: '#64748b' }}>
                      Hausaufgabenheft, XP, Übe-Timer &amp; Raum-Engine
                    </div>
                  </div>
                  <div style={{ display: 'flex', background: '#f1f5f9', padding: '2px', borderRadius: '10px' }}>
                    <button
                      type="button"
                      aria-label="Campus-Modul auf Basis setzen"
                      aria-pressed={!isCampusActive}
                      onClick={() => handleToggleCampus(false)}
                      style={{
                        background: !isCampusActive ? '#ffffff' : 'transparent',
                        color: !isCampusActive ? '#1e293b' : '#64748b',
                        border: 'none',
                        borderRadius: '8px',
                        padding: '4px 10px',
                        fontSize: '0.74rem',
                        fontWeight: !isCampusActive ? 850 : 600,
                        cursor: 'pointer'
                      }}
                    >
                      Basis
                    </button>
                    <button
                      type="button"
                      aria-label="Campus-Modul aktivieren"
                      aria-pressed={isCampusActive}
                      onClick={() => handleToggleCampus(true)}
                      style={{
                        background: isCampusActive ? '#34a853' : 'transparent',
                        color: isCampusActive ? '#ffffff' : '#64748b',
                        border: 'none',
                        borderRadius: '8px',
                        padding: '4px 10px',
                        fontSize: '0.74rem',
                        fontWeight: isCampusActive ? 850 : 600,
                        cursor: 'pointer'
                      }}
                    >
                      Aktiv
                    </button>
                  </div>
                </div>

                {/* GrooveLab Module */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0' }}>
                  <div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#1e293b' }}>
                      🎸 GrooveLab-Modul (0,49 € / Mo.)
                    </div>
                    <div style={{ fontSize: '0.7rem', color: '#64748b' }}>
                      Band-Rooms, Song-Repertoire &amp; Live Lab
                    </div>
                  </div>
                  <div style={{ display: 'flex', background: '#f1f5f9', padding: '2px', borderRadius: '10px' }}>
                    <button
                      type="button"
                      aria-label="GrooveLab-Modul auf Basis setzen"
                      aria-pressed={!isGroovelabActive}
                      onClick={() => handleToggleGroovelab(false)}
                      style={{
                        background: !isGroovelabActive ? '#ffffff' : 'transparent',
                        color: !isGroovelabActive ? '#1e293b' : '#64748b',
                        border: 'none',
                        borderRadius: '8px',
                        padding: '4px 10px',
                        fontSize: '0.74rem',
                        fontWeight: !isGroovelabActive ? 850 : 600,
                        cursor: 'pointer'
                      }}
                    >
                      Basis
                    </button>
                    <button
                      type="button"
                      aria-label="GrooveLab-Modul aktivieren"
                      aria-pressed={isGroovelabActive}
                      onClick={() => handleToggleGroovelab(true)}
                      style={{
                        background: isGroovelabActive ? '#eab308' : 'transparent',
                        color: isGroovelabActive ? '#0f172a' : '#64748b',
                        border: 'none',
                        borderRadius: '8px',
                        padding: '4px 10px',
                        fontSize: '0.74rem',
                        fontWeight: isGroovelabActive ? 850 : 600,
                        cursor: 'pointer'
                      }}
                    >
                      Aktiv
                    </button>
                  </div>
                </div>
              </section>
            </div>

            {/* Right Column: Pricing, Groups, Legal & Danger Zone */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
              {/* Pricing & Exemption Control */}
              <section
                style={{
                  background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
                  borderRadius: '24px',
                  padding: '20px 24px',
                  border: '1.5px solid #e2e8f0',
                  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.02)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '14px'
                }}
              >
                <div>
                  <div style={{ fontSize: '0.86rem', fontWeight: 900, color: '#1e293b' }}>
                    Schülerbeitrag &amp; Beitragsbefreiung
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '2px' }}>
                    {lockedStudentPrice !== null
                      ? `🔒 Festpreis ${lockedStudentPrice.toFixed(2)} € / Mo. aktiv (Direktabrechnung)`
                      : 'Standard: Automatische Berechnung gemäß Modul-Nutzung.'}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '6px' }}>
                  <span style={{ fontSize: '0.76rem', color: '#475569', fontWeight: 650 }}>
                    Härtefall- &amp; Geschwisterbefreiung (0,00 €):
                  </span>
                  <button
                    type="button"
                    aria-label={exemptFromDirectBilling ? 'Härtefall-Befreiung deaktivieren' : 'Härtefall-Befreiung aktivieren'}
                    aria-pressed={exemptFromDirectBilling}
                    onClick={() => handleToggleExemption(!exemptFromDirectBilling)}
                    style={{
                      background: exemptFromDirectBilling ? '#ef4444' : '#e2e8f0',
                      color: exemptFromDirectBilling ? '#ffffff' : '#475569',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '5px 12px',
                      fontSize: '0.74rem',
                      fontWeight: 800,
                      cursor: 'pointer'
                    }}
                  >
                    {exemptFromDirectBilling ? 'Befreit (0,00 €)' : 'Nein'}
                  </button>
                </div>
              </section>

              {/* Group Lesson Duo-Cards (Goldstandard) */}
              <section
                style={{
                  background: '#ffffff',
                  borderRadius: '24px',
                  padding: '20px 24px',
                  border: '1.5px solid #f1f5f9',
                  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.02)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '14px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <h4 style={{ fontSize: '0.86rem', fontWeight: 900, color: '#1e293b', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Users size={16} /> Partner- &amp; Gruppenunterricht
                  </h4>
                  {groupId && (
                    <button
                      type="button"
                      aria-label="Gruppe auflösen"
                      onClick={handleUnlinkGroup}
                      style={{
                        background: '#fff1f2',
                        color: '#e11d48',
                        border: '1px solid #fecdd3',
                        borderRadius: '8px',
                        padding: '4px 10px',
                        fontSize: '0.72rem',
                        fontWeight: 800,
                        cursor: 'pointer'
                      }}
                    >
                      Gruppe auflösen
                    </button>
                  )}
                </div>

                {groupId && groupStudents.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {/* Member 1: Current Active Student */}
                    <div
                      style={{
                        background: '#f8fafc',
                        border: '1.5px solid #e2e8f0',
                        borderRadius: '14px',
                        padding: '12px 14px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '10px'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                        <div
                          style={{
                            width: '34px',
                            height: '34px',
                            borderRadius: '10px',
                            background: '#fee2e2',
                            color: ADMIN_PRIMARY,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 900,
                            fontSize: '0.85rem',
                            flexShrink: 0
                          }}
                        >
                          1
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: '0.84rem', fontWeight: 800, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {firstName} {lastName}
                          </div>
                          <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                            {instrument || 'Musiker'}
                          </div>
                        </div>
                      </div>
                      <span
                        style={{
                          background: '#fef2f2',
                          color: ADMIN_PRIMARY,
                          fontSize: '0.68rem',
                          fontWeight: 800,
                          padding: '2px 8px',
                          borderRadius: '8px',
                          border: '1px solid #fee2e2',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        Diese Karteikarte
                      </span>
                    </div>

                    {/* Member 2+: Partner Student(s) */}
                    {groupStudents.map((partner, idx) => (
                      <div
                        key={partner.id}
                        style={{
                          background: '#ffffff',
                          border: '1.5px solid #cbd5e1',
                          borderRadius: '14px',
                          padding: '12px 14px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '8px'
                        }}
                      >
                        {editingPartnerId === partner.id ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#334155' }}>
                              Partner bearbeiten:
                            </div>
                            <div style={{ display: 'flex', gap: '6px' }}>
                              <input
                                type="text"
                                placeholder="Vorname"
                                value={partnerEditFirst}
                                onChange={(e) => setPartnerEditFirst(e.target.value)}
                                style={{
                                  flex: 1,
                                  padding: '6px 8px',
                                  borderRadius: '8px',
                                  border: '1.5px solid #cbd5e1',
                                  fontSize: '0.78rem',
                                  fontWeight: 700
                                }}
                              />
                              <input
                                type="text"
                                placeholder="Nachname"
                                value={partnerEditLast}
                                onChange={(e) => setPartnerEditLast(e.target.value)}
                                style={{
                                  flex: 1,
                                  padding: '6px 8px',
                                  borderRadius: '8px',
                                  border: '1.5px solid #cbd5e1',
                                  fontSize: '0.78rem',
                                  fontWeight: 700
                                }}
                              />
                            </div>
                            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                              <select
                                value={partnerEditInstrument}
                                onChange={(e) => setPartnerEditInstrument(e.target.value)}
                                style={{
                                  flex: 1,
                                  padding: '6px 8px',
                                  borderRadius: '8px',
                                  border: '1.5px solid #cbd5e1',
                                  fontSize: '0.78rem',
                                  fontWeight: 700,
                                  background: '#ffffff'
                                }}
                              >
                                {allAvailableInstruments.map((i) => (
                                  <option key={i} value={i}>
                                    {i}
                                  </option>
                                ))}
                              </select>
                              <button
                                type="button"
                                onClick={() => handleSavePartnerQuickEdit(partner.id)}
                                disabled={isSavingPartner}
                                style={{
                                  background: '#34a853',
                                  color: '#ffffff',
                                  border: 'none',
                                  borderRadius: '8px',
                                  padding: '6px 12px',
                                  fontSize: '0.74rem',
                                  fontWeight: 800,
                                  cursor: 'pointer'
                                }}
                              >
                                {isSavingPartner ? '...' : 'Speichern'}
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingPartnerId(null)}
                                style={{
                                  background: '#f1f5f9',
                                  color: '#64748b',
                                  border: 'none',
                                  borderRadius: '8px',
                                  padding: '6px 10px',
                                  fontSize: '0.74rem',
                                  fontWeight: 700,
                                  cursor: 'pointer'
                                }}
                              >
                                Abbrechen
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                              <div
                                style={{
                                  width: '34px',
                                  height: '34px',
                                  borderRadius: '10px',
                                  background: '#e0f2fe',
                                  color: '#0284c7',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontWeight: 900,
                                  fontSize: '0.85rem',
                                  flexShrink: 0
                                }}
                              >
                                {idx + 2}
                              </div>
                              <div style={{ minWidth: 0 }}>
                                <div style={{ fontSize: '0.84rem', fontWeight: 800, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                  {partner.first_name} {partner.last_name}
                                </div>
                                <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                                  {partner.instrument || 'Musiker'}
                                </div>
                              </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <button
                                type="button"
                                title="Partner-Stammdaten schnell korrigieren"
                                aria-label="Partner bearbeiten"
                                onClick={() => {
                                  setPartnerEditFirst(partner.first_name || '');
                                  setPartnerEditLast(partner.last_name || '');
                                  setPartnerEditInstrument(partner.instrument || instrument || 'Gitarre');
                                  setEditingPartnerId(partner.id);
                                }}
                                style={{
                                  background: '#f8fafc',
                                  border: '1px solid #cbd5e1',
                                  borderRadius: '8px',
                                  padding: '5px 8px',
                                  color: '#475569',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  fontSize: '0.72rem',
                                  fontWeight: 700
                                }}
                              >
                                <Edit3 size={13} />
                              </button>
                              <button
                                type="button"
                                title={`Zur vollständigen Karteikarte von ${partner.first_name} wechseln`}
                                aria-label={`Profil von ${partner.first_name} öffnen`}
                                onClick={() => handleSwitchActiveStudent(partner)}
                                style={{
                                  background: '#eff6ff',
                                  color: '#2563eb',
                                  border: '1px solid #bfdbfe',
                                  borderRadius: '8px',
                                  padding: '5px 10px',
                                  fontSize: '0.72rem',
                                  fontWeight: 800,
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '4px'
                                }}
                              >
                                <span>Profil öffnen</span>
                                <ArrowRight size={12} />
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div>
                    {!showGroupSelector ? (
                      <button
                        type="button"
                        aria-label="Partner für Gruppenunterricht zuweisen"
                        onClick={() => setShowGroupSelector(true)}
                        style={{
                          background: '#f8fafc',
                          color: '#1e293b',
                          border: '1.5px solid #e2e8f0',
                          borderRadius: '10px',
                          padding: '8px 14px',
                          fontSize: '0.78rem',
                          fontWeight: 800,
                          cursor: 'pointer'
                        }}
                      >
                        + Partner für Gruppenunterricht zuweisen
                      </button>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <div style={{ position: 'relative' }}>
                          <input
                            type="text"
                            aria-label="Schüler suchen..."
                            placeholder="Schüler suchen..."
                            value={studentSearchQuery}
                            onChange={(e) => {
                              setStudentSearchQuery(e.target.value);
                              setSearchDropdownOpen(true);
                            }}
                            style={{
                              width: '100%',
                              padding: '8px 12px',
                              borderRadius: '10px',
                              border: '1.5px solid #cbd5e1',
                              fontSize: '0.8rem',
                              boxSizing: 'border-box'
                            }}
                          />
                          {searchDropdownOpen && (
                            <div
                              style={{
                                position: 'absolute',
                                top: '100%',
                                left: 0,
                                right: 0,
                                background: '#ffffff',
                                border: '1.5px solid #cbd5e1',
                                borderRadius: '10px',
                                marginTop: '4px',
                                maxHeight: '140px',
                                overflowY: 'auto',
                                zIndex: 20,
                                boxShadow: '0 8px 20px rgba(0,0,0,0.1)'
                              }}
                            >
                              {schoolStudents
                                .filter((s) => `${s.first_name || ''} ${s.last_name || ''}`.toLowerCase().includes(studentSearchQuery.toLowerCase()))
                                .map((s) => (
                                  <div
                                    key={s.id}
                                    role="button"
                                    tabIndex={0}
                                    aria-label={`Schüler ${s.first_name} ${s.last_name} auswählen`}
                                    onClick={() => {
                                      setSelectedStudentToLink(s.id);
                                      setStudentSearchQuery(`${s.first_name || ''} ${s.last_name || ''}`.trim());
                                      setSearchDropdownOpen(false);
                                    }}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter' || e.key === ' ') {
                                        e.preventDefault();
                                        setSelectedStudentToLink(s.id);
                                        setStudentSearchQuery(`${s.first_name || ''} ${s.last_name || ''}`.trim());
                                        setSearchDropdownOpen(false);
                                      }
                                    }}
                                    style={{
                                      padding: '8px 12px',
                                      fontSize: '0.78rem',
                                      cursor: 'pointer',
                                      background: selectedStudentToLink === s.id ? '#fef2f2' : '#ffffff',
                                      borderBottom: '1px solid #f1f5f9'
                                    }}
                                  >
                                    {s.first_name} {s.last_name}
                                  </div>
                                ))}
                            </div>
                          )}
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            type="button"
                            aria-label="Gruppe verknüpfen"
                            onClick={handleLinkGroup}
                            disabled={!selectedStudentToLink}
                            style={{
                              flex: 1,
                              background: selectedStudentToLink ? '#34a853' : '#cbd5e1',
                              color: '#ffffff',
                              border: 'none',
                              borderRadius: '8px',
                              padding: '6px',
                              fontSize: '0.75rem',
                              fontWeight: 800,
                              cursor: selectedStudentToLink ? 'pointer' : 'default'
                            }}
                          >
                            Verknüpfen
                          </button>
                          <button
                            type="button"
                            aria-label="Gruppenzuweisung abbrechen"
                            onClick={() => {
                              setShowGroupSelector(false);
                              setSelectedStudentToLink('');
                            }}
                            style={{
                              flex: 1,
                              background: '#f1f5f9',
                              color: '#64748b',
                              border: 'none',
                              borderRadius: '8px',
                              padding: '6px',
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              cursor: 'pointer'
                            }}
                          >
                            Abbrechen
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </section>

              {/* Legal Majority (18+) - 2-Way Segmented Switch */}
              <section
                style={{
                  background: isAdult ? '#f0fdf4' : '#f8fafc',
                  border: isAdult ? '1.5px solid #bbf7d0' : '1.5px solid #e2e8f0',
                  borderRadius: '24px',
                  padding: '20px 24px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '14px'
                }}
              >
                <div>
                  <div style={{ fontSize: '0.86rem', fontWeight: 900, color: isAdult ? '#15803d' : '#0f172a' }}>
                    Volljährigkeits-Status (18+)
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '2px' }}>
                    {isAdult
                      ? 'Schüler ist volljährig (§ 2 BGB). Elterlicher PIN-Zugriff ist deaktiviert.'
                      : 'Minderjährig. Gesetzliche Vertretung durch Erziehungsberechtigte.'}
                  </div>
                </div>

                <div style={{ display: 'flex', background: '#e2e8f0', padding: '3px', borderRadius: '12px', gap: '3px', flexShrink: 0 }}>
                  <button
                    type="button"
                    aria-label="Status Minderjährig setzen"
                    aria-pressed={!isAdult}
                    onClick={() => {
                      if (isAdult) handleToggleAdultStatus(false);
                    }}
                    style={{
                      background: !isAdult ? '#ffffff' : 'transparent',
                      color: !isAdult ? '#0f172a' : '#64748b',
                      border: 'none',
                      borderRadius: '9px',
                      padding: '6px 12px',
                      fontSize: '0.75rem',
                      fontWeight: !isAdult ? 900 : 700,
                      cursor: 'pointer',
                      boxShadow: !isAdult ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                      transition: 'all 0.15s'
                    }}
                  >
                    Minderjährig
                  </button>
                  <button
                    type="button"
                    aria-label="Status Volljährig (18+) setzen"
                    aria-pressed={isAdult}
                    onClick={() => {
                      if (!isAdult) handleToggleAdultStatus(true);
                    }}
                    style={{
                      background: isAdult ? '#15803d' : 'transparent',
                      color: isAdult ? '#ffffff' : '#64748b',
                      border: 'none',
                      borderRadius: '9px',
                      padding: '6px 12px',
                      fontSize: '0.75rem',
                      fontWeight: isAdult ? 900 : 700,
                      cursor: 'pointer',
                      boxShadow: isAdult ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                      transition: 'all 0.15s'
                    }}
                  >
                    Volljährig (18+)
                  </button>
                </div>
              </section>



              {/* Danger Zone: Deletion Art. 17 DSGVO */}
              <section
                style={{
                  background: '#fef2f2',
                  border: '1.5px solid #fecdd3',
                  borderRadius: '24px',
                  padding: '20px 24px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px'
                }}
              >
                <div>
                  <div style={{ fontSize: '0.84rem', fontWeight: 900, color: '#991b1b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <AlertTriangle size={15} /> Schülerprofil löschen (Art. 17 DSGVO)
                  </div>
                  <div style={{ fontSize: '0.7rem', color: '#b91c1c', marginTop: '2px' }}>
                    Unwiderruflicher DSGVO-Löschvorgang mit Audit-Trail.
                  </div>
                </div>

                <button
                  type="button"
                  aria-label="Schülerprofil unwiderruflich löschen"
                  onClick={() => setShowDeleteConfirmModal(true)}
                  style={{
                    background: '#ffffff',
                    color: '#dc2626',
                    border: '1.5px solid #fca5a5',
                    borderRadius: '10px',
                    padding: '6px 14px',
                    fontSize: '0.76rem',
                    fontWeight: 800,
                    cursor: 'pointer'
                  }}
                >
                  Löschen...
                </button>
              </section>
            </div>
          </div>
        )}

        {/* Tab 2: Zugang & DSGVO-Recht */}
        {activeTab === 'access' && (
          <div
            role="tabpanel"
            id="panel-access"
            aria-labelledby="tab-access"
            tabIndex={0}
            style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '28px', alignItems: 'start' }}
            className="student-detail-grid"
          >
            {/* Left Column: PWA Pass, PIN Reset, Session Kill */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
              <StudentAccessSection
                student={activeStudent}
                mode="admin"
                activeColor={ADMIN_PRIMARY}
                isGroove={activePlatform === 'groovelab'}
                avatarSrc={displayAvatar}
                localQrToken={localQrToken}
                onOpenQrOverlay={() => setShowQrOverlay(true)}
              />
            </div>

            {/* Right Column: DSGVO Art. 15 Exports & Consent Protocol */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
              {/* Art. 15 Export Box */}
              <section
                style={{
                  background: '#ffffff',
                  borderRadius: '24px',
                  padding: '22px',
                  border: '1.5px solid #f1f5f9',
                  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.02)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px'
                }}
              >
                <h4
                  style={{
                    fontSize: '0.92rem',
                    fontWeight: 900,
                    color: '#1e293b',
                    margin: 0,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  <ShieldCheck size={18} style={{ color: ADMIN_PRIMARY }} />
                  DSGVO-Auskunft &amp; Export (Art. 15)
                </h4>
                <p style={{ fontSize: '0.74rem', color: '#64748b', margin: 0 }}>
                  Gesetzeskonforme Auskunftserteilung über alle gespeicherten Stammdaten, Verträge und Audit-Logs.
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '6px' }}>
                  <button
                    type="button"
                    onClick={handleExportDSGVOPdf}
                    aria-label="Datenblatt als PDF drucken"
                    style={{
                      width: '100%',
                      background: '#fef2f2',
                      color: ADMIN_PRIMARY,
                      border: '1.5px solid #fecdd3',
                      borderRadius: '14px',
                      padding: '12px 16px',
                      fontSize: '0.84rem',
                      fontWeight: 900,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      boxShadow: '0 2px 8px rgba(234, 67, 53, 0.08)'
                    }}
                    className="hover-scale"
                  >
                    <Printer size={17} color={ADMIN_PRIMARY} />
                    <span>Datenblatt drucken (PDF)</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleExportPresenceCSV}
                    aria-label="Anwesenheits-Logbuch als CSV exportieren"
                    style={{
                      width: '100%',
                      background: '#f8fafc',
                      color: '#1e293b',
                      border: '1.5px solid #cbd5e1',
                      borderRadius: '12px',
                      padding: '10px 14px',
                      fontSize: '0.8rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px'
                    }}
                    className="hover-scale"
                  >
                    <Calendar size={15} color="#475569" />
                    <span>Anwesenheits-Logbuch (CSV)</span>
                  </button>
                </div>
              </section>

              {/* Consent Protocol Audit */}
              <StudentConsentProtocol
                student={activeStudent}
                consentLogs={consentLogs}
                mode="admin"
              />
            </div>
          </div>
        )}
      </div>

      {/* QR Code Modal Overlay */}
      {showQrOverlay && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Ausweis-QR für ${firstName}`}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 11000,
            background: 'rgba(15, 23, 42, 0.75)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
          }}
          onClick={() => setShowQrOverlay(false)}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '28px',
              padding: '28px',
              maxWidth: '360px',
              width: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
              boxShadow: '0 20px 40px rgba(0,0,0,0.3)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ fontSize: '1.1rem', fontWeight: 900, color: '#1e293b', marginBottom: '6px' }}>
              Ausweis-QR für {firstName}
            </div>
            <div style={{ fontSize: '0.76rem', color: '#64748b', marginBottom: '18px' }}>
              Kann mit jedem Smartphone direkt abgescannt werden.
            </div>
            <div style={{ background: '#ffffff', padding: '16px', borderRadius: '18px', border: '1.5px solid #e2e8f0' }}>
              <QRCode
                value={getCanonicalQrLandingUrl(localQrToken || student.qr_token || student.ausweis_nummer)}
                size={200}
              />
            </div>
            <button
              type="button"
              onClick={() => setShowQrOverlay(false)}
              aria-label="Ausweis-QR-Code schließen"
              style={{
                marginTop: '20px',
                width: '100%',
                background: ADMIN_PRIMARY,
                color: '#ffffff',
                border: 'none',
                borderRadius: '12px',
                padding: '10px',
                fontSize: '0.85rem',
                fontWeight: 800,
                cursor: 'pointer'
              }}
            >
              Schließen
            </button>
          </div>
        </div>
      )}

      {/* ID Card Overlay */}
      {showIdCardOverlay && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Schülerausweis für ${firstName} ${lastName}`}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 11000,
            background: 'rgba(15, 23, 42, 0.75)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
          }}
          onClick={() => setShowIdCardOverlay(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#ffffff',
              borderRadius: '28px',
              padding: '28px',
              maxWidth: '380px',
              width: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              boxShadow: '0 20px 40px rgba(0,0,0,0.3)'
            }}
          >
            <IDBadgeCard
              user={{ ...student, first_name: firstName, last_name: lastName }}
              activePlatform="campus"
            />
            <button
              type="button"
              onClick={() => setShowIdCardOverlay(false)}
              aria-label="Ausweis-Ansicht schließen"
              style={{
                marginTop: '18px',
                width: '100%',
                background: ADMIN_PRIMARY,
                color: '#ffffff',
                border: 'none',
                borderRadius: '12px',
                padding: '10px',
                fontSize: '0.85rem',
                fontWeight: 800,
                cursor: 'pointer'
              }}
            >
              Schließen
            </button>
          </div>
        </div>
      )}

      {/* Duration Confirmation Modal */}
      {confirmDurationModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Unterrichtsdauer ändern"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 11000,
            background: 'rgba(15, 23, 42, 0.75)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
          }}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '24px',
              padding: '26px',
              maxWidth: '400px',
              width: '100%',
              textAlign: 'center'
            }}
          >
            <div style={{ fontSize: '1.1rem', fontWeight: 900, color: '#1e293b' }}>
              Unterrichtsdauer ändern?
            </div>
            <div style={{ fontSize: '0.82rem', color: '#64748b', margin: '10px 0 20px 0' }}>
              Möchtest du die Unterrichtsdauer für {firstName} verbindlich von {lessonDuration} auf {confirmDurationModal.targetDuration} Minuten anpassen?
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                onClick={() => handleUpdateDuration(confirmDurationModal.targetDuration)}
                aria-label="Unterrichtsdauer verbindlich anpassen"
                style={{
                  flex: 1,
                  background: ADMIN_PRIMARY,
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '10px',
                  fontWeight: 800,
                  cursor: 'pointer'
                }}
              >
                Ja, ändern
              </button>
              <button
                type="button"
                onClick={() => setConfirmDurationModal(null)}
                aria-label="Dauer-Anpassung abbrechen"
                style={{
                  flex: 1,
                  background: '#f1f5f9',
                  color: '#475569',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '10px',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Abbrechen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirmModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Schülerprofil endgültig löschen"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 11000,
            background: 'rgba(15, 23, 42, 0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
          }}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '24px',
              padding: '28px',
              maxWidth: '420px',
              width: '100%',
              textAlign: 'center'
            }}
          >
            <div style={{ width: '48px', height: '48px', borderRadius: '16px', background: '#fee2e2', color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px auto' }}>
              <Trash2 size={24} />
            </div>
            <div style={{ fontSize: '1.15rem', fontWeight: 950, color: '#1e293b' }}>
              Profil endgültig löschen?
            </div>
            <div style={{ fontSize: '0.8rem', color: '#64748b', margin: '8px 0 20px 0', lineHeight: 1.45 }}>
              Dieser Schritt löscht alle Zugangsdaten und Verknüpfungen von <strong>{firstName} {lastName}</strong> nach Art. 17 DSGVO. Diese Aktion kann nicht rückgängig gemacht werden!
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                onClick={handleDeleteStudentProfile}
                disabled={isDeletingStudent}
                aria-label="Schülerprofil endgültig löschen"
                style={{
                  flex: 1,
                  background: '#dc2626',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '12px',
                  fontWeight: 850,
                  fontSize: '0.82rem',
                  cursor: isDeletingStudent ? 'wait' : 'pointer'
                }}
              >
                {isDeletingStudent ? 'Wird gelöscht...' : 'Ja, endgültig löschen'}
              </button>
              <button
                type="button"
                onClick={() => setShowDeleteConfirmModal(false)}
                aria-label="Löschvorgang abbrechen"
                style={{
                  flex: 1,
                  background: '#f1f5f9',
                  color: '#475569',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '12px',
                  fontWeight: 700,
                  fontSize: '0.82rem',
                  cursor: 'pointer'
                }}
              >
                Abbrechen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
