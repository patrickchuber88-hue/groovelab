import React, { useState, useEffect } from 'react';
import { 
  FileText, ShieldCheck, Award, QrCode, Sliders, Calendar, Clock, 
  MapPin, User, Users, AlertTriangle, Printer, Download, Trash2, Check 
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

const ADMIN_PRIMARY = '#ea4335';
const ADMIN_BG = '#fef2f2';

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
  const [activeTab, setActiveTab] = useState<'contract' | 'access'>('contract');
  const [firstName, setFirstName] = useState<string>(student.first_name || (student.name ? student.name.split(' ')[0] : ''));
  const [lastName, setLastName] = useState<string>(student.last_name || (student.name && student.name.split(' ').length > 1 ? student.name.split(' ').slice(1).join(' ') : ''));
  const [isCampusActive, setIsCampusActive] = useState<boolean>(student.is_campus_active ?? student.isCampusActive ?? false);
  const [isGroovelabActive, setIsGroovelabActive] = useState<boolean>(student.is_groovelab_active ?? student.isGroovelabActive ?? false);
  const [exemptFromDirectBilling, setExemptFromDirectBilling] = useState<boolean>(student.exempt_from_direct_billing ?? false);
  const [customStudentPrice, setCustomStudentPrice] = useState<string>(student.custom_student_price !== null && student.custom_student_price !== undefined ? String(student.custom_student_price) : '');
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
    setFirstName(student.first_name || (student.name ? student.name.split(' ')[0] : ''));
    setLastName(student.last_name || (student.name && student.name.split(' ').length > 1 ? student.name.split(' ').slice(1).join(' ') : ''));
    setIsCampusActive(student.is_campus_active ?? student.isCampusActive ?? false);
    setIsGroovelabActive(student.is_groovelab_active ?? student.isGroovelabActive ?? false);
    setExemptFromDirectBilling(student.exempt_from_direct_billing ?? false);
    setCustomStudentPrice(student.custom_student_price !== null && student.custom_student_price !== undefined ? String(student.custom_student_price) : '');
    setLockedStudentPrice(student.locked_student_price ?? null);
    setLessonDuration(student.lesson_duration || 30);
    setIsAdult(Boolean(student.is_adult));
    setLocalQrToken(student.qr_token || '');
  }, [student]);

  // Fetch school details
  useEffect(() => {
    const fetchSchool = async () => {
      let resolvedSchoolId = student.school_id || student.schoolId || (student.schools?.id) || (Array.isArray(student.schools) ? student.schools[0]?.id : null);
      if (!resolvedSchoolId && student.id) {
        try {
          const { data } = await supabase.from('users').select('school_id').eq('id', student.id).single();
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
  }, [student.id, student.school_id, student.schools]);

  // Fetch schedules, groups, consent, and session logs
  useEffect(() => {
    const fetchAdminData = async () => {
      if (!student.id) return;

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
          .eq('student_id', student.id);
        if (schedData) setSchedulesList(schedData);
      } catch (e) {}

      // Groups
      try {
        const { data: userData } = await supabase.from('users').select('group_id').eq('id', student.id).maybeSingle();
        const currentGrpId = userData?.group_id || student.group_id;
        setGroupId(currentGrpId);

        if (currentGrpId) {
          const { data: grpData } = await supabase
            .from('users')
            .select('id, first_name, last_name, instrument')
            .eq('group_id', currentGrpId)
            .neq('id', student.id);
          setGroupStudents(grpData || []);
        } else {
          setGroupStudents([]);
        }
      } catch (e) {}

      // School students list for group picker
      const sId = student.school_id || student.schoolId;
      if (sId) {
        try {
          const { data: allStds } = await supabase
            .from('users')
            .select('id, first_name, last_name')
            .eq('school_id', sId)
            .eq('role', 'student')
            .neq('id', student.id)
            .order('first_name');
          setSchoolStudents(allStds || []);
        } catch (e) {}
      }

      // Consent logs
      try {
        const { data: consentData } = await supabase
          .from('audit_logs')
          .select('*')
          .eq('user_id', student.id)
          .like('action', '%CONSENT%')
          .order('created_at', { ascending: false });
        setConsentLogs(consentData || []);
      } catch (e) {}

      // Sessions list for CSV export
      try {
        const { data: sessData } = await supabase
          .from('presence_sessions')
          .select('id, check_in_time, check_out_time, stations ( name )')
          .eq('user_id', student.id)
          .order('check_in_time', { ascending: false });
        setSessionsList(sessData || []);
      } catch (e) {}
    };

    fetchAdminData();
  }, [student.id, refreshTrigger]);

  const ensureUserRawRecord = async () => {
    try {
      const { data: existingUser } = await supabase.from('users').select('id').eq('id', student.id).maybeSingle();
      if (!existingUser) {
        await supabase.from('users').insert({
          id: student.id,
          school_id: student.school_id || student.schoolId,
          role: 'student',
          first_name: firstName || 'Schüler',
          last_name: lastName || '',
          instrument: student.instrument || 'Musiker',
          teacher_id: student.teacher_id || null,
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

  const handleSaveName = async (cleanFirst: string, cleanLast: string) => {
    await supabase.from('users').update({ first_name: cleanFirst, last_name: cleanLast }).eq('id', student.id);
    await supabase.from('pending_students').update({ first_name: cleanFirst, last_name: cleanLast }).eq('id', student.id);
    setFirstName(cleanFirst);
    setLastName(cleanLast);
    student.first_name = cleanFirst;
    student.last_name = cleanLast;
  };

  const handleToggleCampus = async (newVal: boolean) => {
    try {
      await ensureUserRawRecord();
      const { error } = await supabase.from('users').update({ is_campus_active: newVal }).eq('id', student.id);
      if (error) throw error;
      setIsCampusActive(newVal);
      student.is_campus_active = newVal;
    } catch (err: any) {
      alert('Fehler beim Aktualisieren des Campus-Moduls: ' + err.message);
    }
  };

  const handleToggleGroovelab = async (newVal: boolean) => {
    try {
      await ensureUserRawRecord();
      const { error } = await supabase.from('users').update({ is_groovelab_active: newVal }).eq('id', student.id);
      if (error) throw error;
      setIsGroovelabActive(newVal);
      student.is_groovelab_active = newVal;
    } catch (err: any) {
      alert('Fehler beim Aktualisieren des GrooveLab-Moduls: ' + err.message);
    }
  };

  const handleToggleExemption = async (newVal: boolean) => {
    try {
      await ensureUserRawRecord();
      const { error } = await supabase.from('users').update({ exempt_from_direct_billing: newVal }).eq('id', student.id);
      if (error) throw error;
      setExemptFromDirectBilling(newVal);
      student.exempt_from_direct_billing = newVal;
    } catch (err: any) {
      alert('Fehler beim Aktualisieren des Härtefall-Status: ' + err.message);
    }
  };

  const handleSaveCustomStudentPrice = async (overrideValue: string) => {
    try {
      const numericVal = overrideValue.trim() === '' ? null : parseFloat(overrideValue.replace(',', '.'));
      if (numericVal !== null && (isNaN(numericVal) || numericVal < 0)) {
        alert('Bitte einen gültigen Euro-Betrag eingeben.');
        return;
      }
      await ensureUserRawRecord();
      const { error } = await supabase.from('users').update({ custom_student_price: numericVal }).eq('id', student.id);
      if (error) throw error;
      setCustomStudentPrice(numericVal !== null ? String(numericVal) : '');
      student.custom_student_price = numericVal;
      alert(numericVal !== null
        ? `Sondertarif von ${numericVal.toFixed(2).replace('.', ',')} € / Monat für ${firstName} gespeichert.`
        : 'Sondertarif zurückgesetzt. Es gilt der Standard-Tarif.');
    } catch (err: any) {
      alert('Fehler beim Speichern des Sondertarifs: ' + err.message);
    }
  };

  const handleUpdateDuration = async (duration: number) => {
    try {
      await ensureUserRawRecord();
      await supabase.from('users').update({ lesson_duration: duration }).eq('id', student.id);
      await supabase.from('students').update({ lesson_duration: duration }).eq('id', student.id);
      setLessonDuration(duration);
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
      await supabase.from('users').update(updates).eq('id', student.id);
      try {
        await supabase.from('students').update(updates).eq('id', student.id);
      } catch (e) {}

      setIsAdult(targetAdult);
      student.is_adult = targetAdult;

      try {
        await supabase.from('audit_logs').insert({
          action: targetAdult ? 'STUDENT_LEGAL_MAJORITY_CONFIRMED' : 'STUDENT_LEGAL_MAJORITY_REVOKED',
          school_id: student.school_id,
          user_id: student.id,
          details: {
            student_id: student.id,
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
      await supabase.from('users').update({ group_id: newGroupId }).eq('id', student.id);
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
    try {
      if (groupId) {
        await supabase.from('users').update({ group_id: null }).eq('group_id', groupId);
      } else {
        await supabase.from('users').update({ group_id: null }).eq('id', student.id);
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
        school_id: student.school_id,
        user_id: student.id,
        details: {
          student_id: student.id,
          student_name: `${firstName} ${lastName}`.trim(),
          action_by: 'admin',
          timestamp: new Date().toISOString()
        }
      });

      await supabase.from('users').delete().eq('id', student.id);
      try {
        await supabase.from('students').delete().eq('id', student.id);
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

  // DSGVO Art. 15 JSON Export
  const handleExportDSGVOJson = () => {
    const exportData = {
      exportMetadata: {
        document_type: 'Datenschutzauskunft gem. Art. 15 DSGVO',
        platform_name: 'Campus-Groovelab',
        technical_provider: 'Campus-Groovelab Cloud Infrastructure',
        responsible_controller: schoolName,
        export_date: new Date().toISOString()
      },
      studentProfile: {
        id: student.id,
        first_name: firstName,
        last_name: lastName,
        instrument: student.instrument || null,
        lesson_duration_minutes: lessonDuration,
        is_campus_active: isCampusActive,
        is_groovelab_active: isGroovelabActive,
        exempt_from_direct_billing: exemptFromDirectBilling,
        is_adult: isAdult,
        created_at: student.created_at || null
      },
      schedules: schedulesList.map((s: any) => ({
        id: s.id,
        time_slot: s.time_slot,
        day_of_week: s.day_of_week,
        room: s.rooms?.name || null,
        teacher: s.teacher ? formatTeacherFullName(s.teacher) : null
      })),
      consentLogs: consentLogs.map((log: any) => ({
        created_at: log.created_at,
        action: log.action,
        ip_address: log.ip_address || 'Anonymisiert'
      }))
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `dsgvo-auskunft-${firstName}-${lastName}-${student.id}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
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
          <div class="row"><span class="label">Schüler-ID:</span><span class="val">${student.id}</span></div>
          <div class="row"><span class="label">Volljährigkeit:</span><span class="val">${isAdult ? 'Ja (18+)' : 'Minderjährig'}</span></div>
          <div class="row"><span class="label">Campus-Modul:</span><span class="val">${isCampusActive ? 'Aktiv' : 'Inaktiv'}</span></div>
          <div class="row"><span class="label">GrooveLab-Modul:</span><span class="val">${isGroovelabActive ? 'Aktiv' : 'Inaktiv'}</span></div>
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

  const displayAvatar = resolveCampusStudentAvatar(student);
  const memberSince = student.created_at
    ? new Date(student.created_at).toLocaleDateString('de-DE', { month: 'long', year: 'numeric' })
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
          student={student}
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
            {/* Left Column: Lesson Slot, Duration, Modules */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
              {/* Schedule Card */}
              <StudentScheduleCard
                schedulesList={schedulesList}
                lessonDuration={lessonDuration}
                student={student}
                mode="admin"
                activeColor={ADMIN_PRIMARY}
              />

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

              {/* Module Subscriptions & FinOps */}
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
                  <Sliders size={16} /> Modul-Infrastruktur (FinOps)
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
                      aria-label="Campus-Modul inaktivieren"
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
                      Inaktiv
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
                      aria-label="GrooveLab-Modul inaktivieren"
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
                      Inaktiv
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
                    Schülerbeitrag &amp; FinOps-Ausnahmen
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '2px' }}>
                    {lockedStudentPrice !== null
                      ? `🔒 Festpreis ${lockedStudentPrice.toFixed(2)} € / Mo. aktiv (Direktabrechnung)`
                      : 'Standard: Automatische Berechnung gemäß Modul-Nutzung.'}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '0.76rem', fontWeight: 700, color: '#475569' }}>Sondertarif:</span>
                  <input
                    type="text"
                    aria-label="Sondertarif in Euro pro Monat"
                    placeholder="z. B. 0.35"
                    value={customStudentPrice}
                    onChange={(e) => setCustomStudentPrice(e.target.value)}
                    style={{
                      width: '85px',
                      padding: '6px 10px',
                      borderRadius: '8px',
                      border: '1.5px solid #cbd5e1',
                      fontSize: '0.8rem',
                      fontWeight: 800,
                      color: '#0f172a',
                      background: '#ffffff'
                    }}
                  />
                  <span style={{ fontSize: '0.76rem', fontWeight: 700, color: '#64748b' }}>€ / Mo.</span>
                  <button
                    type="button"
                    aria-label="Sondertarif speichern"
                    onClick={() => handleSaveCustomStudentPrice(customStudentPrice)}
                    style={{
                      background: '#34a853',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '6px 12px',
                      fontSize: '0.75rem',
                      fontWeight: 800,
                      cursor: 'pointer'
                    }}
                  >
                    Speichern
                  </button>
                  {customStudentPrice !== '' && (
                    <button
                      type="button"
                      aria-label="Sondertarif zurücksetzen"
                      onClick={() => handleSaveCustomStudentPrice('')}
                      style={{
                        background: '#ffffff',
                        color: '#64748b',
                        border: '1px solid #cbd5e1',
                        borderRadius: '8px',
                        padding: '6px 10px',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                    >
                      Reset
                    </button>
                  )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '10px', borderTop: '1px dashed #cbd5e1' }}>
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

              {/* Group Lesson Pairing */}
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
                  <h4 style={{ fontSize: '0.86rem', fontWeight: 900, color: '#1e293b', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Users size={16} /> Gruppenunterricht
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
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div style={{ fontSize: '0.76rem', color: '#64748b' }}>Verknüpft mit:</div>
                    {groupStudents.map((s) => (
                      <div key={s.id} style={{ fontSize: '0.82rem', fontWeight: 800, color: '#0f172a', background: '#f8fafc', padding: '6px 12px', borderRadius: '8px' }}>
                        👥 {s.first_name} {s.last_name} ({s.instrument || 'Instrument'})
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

              {/* Legal Majority (18+) */}
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

                <button
                  type="button"
                  aria-label={isAdult ? 'Volljährigkeitsstatus deaktivieren' : 'Als volljährig markieren'}
                  aria-pressed={isAdult}
                  onClick={() => handleToggleAdultStatus(!isAdult)}
                  style={{
                    background: isAdult ? '#ffffff' : '#f1f5f9',
                    color: isAdult ? '#15803d' : '#475569',
                    border: isAdult ? '1.5px solid #86efac' : '1.5px solid #cbd5e1',
                    borderRadius: '10px',
                    padding: '6px 14px',
                    fontSize: '0.76rem',
                    fontWeight: 800,
                    cursor: 'pointer'
                  }}
                >
                  {isAdult ? 'Volljährig ✓' : 'Als 18+ markieren'}
                </button>
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
                student={student}
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

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '6px' }}>
                  <button
                    type="button"
                    onClick={handleExportDSGVOPdf}
                    aria-label="Datenblatt als PDF drucken"
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
                    <Printer size={15} color="#475569" />
                    <span>Datenblatt drucken (PDF)</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleExportDSGVOJson}
                    aria-label="Datensatz als JSON exportieren"
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
                    <Download size={15} color="#475569" />
                    <span>Datensatz exportieren (JSON)</span>
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
                student={student}
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
                value={`${window.location.origin}/onboarding/${localQrToken || student.qr_token || student.id}?platform=campus`}
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
