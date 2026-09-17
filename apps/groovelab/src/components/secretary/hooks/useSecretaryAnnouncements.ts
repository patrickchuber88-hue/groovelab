import { useState, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';
import { validateMediaBlob } from '../../../utils/mediaSecurityValidator';
import { formatTeacherFullName } from '../../../utils/nameHelper';

export interface UseSecretaryAnnouncementsOptions {
  schoolId: string;
  currentUserProfile?: any;
  campusTeachers?: any[];
  bypassTeachers?: any[];
  coaches?: any[];
  setApprovalToast?: (toast: { message: string; type: 'success' | 'error' } | null) => void;
}

export function useSecretaryAnnouncements({
  schoolId,
  currentUserProfile,
  campusTeachers = [],
  bypassTeachers = [],
  coaches = [],
  setApprovalToast
}: UseSecretaryAnnouncementsOptions) {
  const [announcementsList, setAnnouncementsList] = useState<any[]>([]);
  const [announcementsLoading, setAnnouncementsLoading] = useState<boolean>(false);
  const [newAnnouncementTitle, setNewAnnouncementTitle] = useState('');
  const [newAnnouncementDescription, setNewAnnouncementDescription] = useState('');
  const [newAnnouncementType, setNewAnnouncementType] = useState<'todo' | 'questionnaire'>('todo');
  const [newAnnouncementQuestions, setNewAnnouncementQuestions] = useState<any[]>([]);
  const [newAnnouncementQuestionType, setNewAnnouncementQuestionType] = useState<'text' | 'choice' | 'boolean'>('text');
  const [newAnnouncementQuestionOptions, setNewAnnouncementQuestionOptions] = useState<string>('Ja, Nein, Vielleicht');
  const [newAnnouncementPriority, setNewAnnouncementPriority] = useState<'standard' | 'critical'>('standard');
  const [newAnnouncementIsAnonymous, setNewAnnouncementIsAnonymous] = useState<boolean>(false);
  const [newAnnouncementTargetType, setNewAnnouncementTargetType] = useState<'all' | 'group' | 'individual'>('all');
  const [newAnnouncementTargetGroup, setNewAnnouncementTargetGroup] = useState('guitar');
  const [newAnnouncementTargetTeacherId, setNewAnnouncementTargetTeacherId] = useState('');
  const [newAnnouncementDueDate, setNewAnnouncementDueDate] = useState('');
  const [newAnnouncementRecurrence, setNewAnnouncementRecurrence] = useState<'none' | 'monthly' | 'half_yearly'>('none');
  const [newAnnouncementAttachmentUrl, setNewAnnouncementAttachmentUrl] = useState('');
  const [isUploadingAnnouncementAttachment, setIsUploadingAnnouncementAttachment] = useState(false);
  const [selectedAnnouncementForStats, setSelectedAnnouncementForStats] = useState<any>(null);
  const [statsSearchQuery, setStatsSearchQuery] = useState('');
  const [statsStatusFilter, setStatsStatusFilter] = useState<'all' | 'completed' | 'pending'>('all');
  const [statsModalTab, setStatsModalTab] = useState<'status' | 'qa'>('status');
  const [announcementResponsesList, setAnnouncementResponsesList] = useState<any[]>([]);
  const [newAnnouncementQuestionInput, setNewAnnouncementQuestionInput] = useState('');
  const [editingAnnouncementId, setEditingAnnouncementId] = useState<string | null>(null);
  const [expandedResponseIds, setExpandedResponseIds] = useState<Record<string, boolean>>({});

  const showToast = useCallback((message: string, type: 'success' | 'error' = 'success', duration = 3500) => {
    if (setApprovalToast) {
      setApprovalToast({ message, type });
      setTimeout(() => setApprovalToast(null), duration);
    }
  }, [setApprovalToast]);

  const fetchAnnouncements = useCallback(async () => {
    if (!schoolId) return;
    try {
      setAnnouncementsLoading(true);
      const { data, error } = await supabase
        .from('campus_feedback_requests')
        .select('*')
        .eq('school_id', schoolId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setAnnouncementsList(data || []);
    } catch (err: any) {
      console.error('Error fetching announcements:', err);
    } finally {
      setAnnouncementsLoading(false);
    }
  }, [schoolId]);

  const handleUploadAnnouncementAttachment = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setIsUploadingAnnouncementAttachment(true);

      // 🛡️ Enterprise Media Security & Anti-Malware Ingestion Validation
      const validation = await validateMediaBlob(file, 'any');
      if (!validation.isValid) {
        alert(validation.reason || 'Sicherheitswarnung: Das Dateiformat ist unzulässig oder enthält bedenkliche Binärstrukturen.');
        setIsUploadingAnnouncementAttachment(false);
        return;
      }

      const fileExt = file.name.split('.').pop();
      const fileName = `announcement_${Date.now()}.${fileExt}`;
      const filePath = `feed-attachments/${fileName}`;
      const { error: uploadErr } = await supabase.storage
        .from('campus-assets')
        .upload(filePath, file);
      if (uploadErr) throw uploadErr;
      
      const { data: urlData } = supabase.storage
        .from('campus-assets')
        .getPublicUrl(filePath);
      setNewAnnouncementAttachmentUrl(urlData.publicUrl);
    } catch (err: any) {
      alert('Upload fehlgeschlagen: ' + err.message);
    } finally {
      setIsUploadingAnnouncementAttachment(false);
    }
  }, []);

  const handleMoveQuestion = useCallback((idx: number, direction: 'up' | 'down') => {
    setNewAnnouncementQuestions((prev) => {
      const nextQuestions = [...prev];
      if (direction === 'up' && idx > 0) {
        const temp = nextQuestions[idx - 1];
        nextQuestions[idx - 1] = nextQuestions[idx];
        nextQuestions[idx] = temp;
      } else if (direction === 'down' && idx < nextQuestions.length - 1) {
        const temp = nextQuestions[idx + 1];
        nextQuestions[idx + 1] = nextQuestions[idx];
        nextQuestions[idx] = temp;
      }
      return nextQuestions;
    });
  }, []);

  const handleCreateAnnouncement = useCallback(async () => {
    if (!newAnnouncementTitle.trim()) {
      showToast('⚠️ Bitte einen Titel für die Mitteilung eingeben.', 'error', 3500);
      return;
    }
    try {
      const currentUserName = currentUserProfile ? `${currentUserProfile.first_name} ${currentUserProfile.last_name}` : 'Verwaltung';
      const currentUserRole = currentUserProfile?.role === 'admin' ? 'Administration' : 'Sekretariat';

      const payload: any = {
        title: newAnnouncementTitle.trim(),
        description: newAnnouncementDescription.trim(),
        questions: newAnnouncementType === 'questionnaire' ? newAnnouncementQuestions : null,
        due_date: newAnnouncementDueDate ? newAnnouncementDueDate + (newAnnouncementDueDate.includes('T') ? '' : 'T23:59:59Z') : null,
        priority: newAnnouncementPriority,
        target_type: newAnnouncementTargetType,
        target_group: newAnnouncementTargetType === 'group' ? newAnnouncementTargetGroup : null,
        target_teacher_id: newAnnouncementTargetType === 'individual' ? newAnnouncementTargetTeacherId : null,
        recurrence: newAnnouncementRecurrence,
        attachment_url: newAnnouncementAttachmentUrl || null,
        is_anonymous: newAnnouncementType === 'questionnaire' ? newAnnouncementIsAnonymous : false
      };

      if (editingAnnouncementId) {
        let { error } = await supabase
          .from('campus_feedback_requests')
          .update(payload)
          .eq('id', editingAnnouncementId);

        if (error && error.message?.includes('is_anonymous')) {
          delete payload.is_anonymous;
          const retry = await supabase
            .from('campus_feedback_requests')
            .update(payload)
            .eq('id', editingAnnouncementId);
          error = retry.error;
        }

        if (error) throw error;
        showToast('✅ Mitteilung erfolgreich aktualisiert!', 'success', 4000);
        setEditingAnnouncementId(null);
      } else {
        payload.school_id = schoolId;
        payload.created_by_name = currentUserName;
        payload.created_by_role = currentUserRole;

        let { error } = await supabase
          .from('campus_feedback_requests')
          .insert(payload);

        if (error && error.message?.includes('is_anonymous')) {
          delete payload.is_anonymous;
          const retry = await supabase
            .from('campus_feedback_requests')
            .insert(payload);
          error = retry.error;
        }

        if (error) throw error;
        showToast('✅ Mitteilung erfolgreich am Infobrett veröffentlicht!', 'success', 4000);
      }

      setNewAnnouncementTitle('');
      setNewAnnouncementDescription('');
      setNewAnnouncementType('todo');
      setNewAnnouncementQuestions([]);
      setNewAnnouncementPriority('standard');
      setNewAnnouncementIsAnonymous(false);
      setNewAnnouncementTargetType('all');
      setNewAnnouncementDueDate('');
      setNewAnnouncementRecurrence('none');
      setNewAnnouncementAttachmentUrl('');
      
      await fetchAnnouncements();
    } catch (err: any) {
      showToast('❌ Speichern fehlgeschlagen: ' + err.message, 'error', 5000);
    }
  }, [
    newAnnouncementTitle,
    newAnnouncementDescription,
    newAnnouncementType,
    newAnnouncementQuestions,
    newAnnouncementDueDate,
    newAnnouncementPriority,
    newAnnouncementTargetType,
    newAnnouncementTargetGroup,
    newAnnouncementTargetTeacherId,
    newAnnouncementRecurrence,
    newAnnouncementAttachmentUrl,
    newAnnouncementIsAnonymous,
    editingAnnouncementId,
    currentUserProfile,
    schoolId,
    fetchAnnouncements,
    showToast
  ]);

  const handleDeleteAnnouncement = useCallback(async (id: string) => {
    if (!confirm('Möchtest du diese Mitteilung wirklich entfernen? Alle Rückmeldungen von Lehrkräften werden ebenfalls gelöscht.')) return;
    try {
      const { error } = await supabase
        .from('campus_feedback_requests')
        .delete()
        .eq('id', id);
      if (error) throw error;
      showToast('Mitteilung gelöscht.', 'success', 3000);
      await fetchAnnouncements();
    } catch (err: any) {
      alert('Löschen fehlgeschlagen: ' + err.message);
    }
  }, [fetchAnnouncements, showToast]);

  const fetchAnnouncementStats = useCallback(async (announcement: any) => {
    try {
      setSelectedAnnouncementForStats(announcement);
      setStatsSearchQuery('');
      setStatsStatusFilter('all');
      setStatsModalTab('status');
      const { data, error } = await supabase
        .from('campus_feedback_responses')
        .select('*')
        .eq('request_id', announcement.id);
      if (error) throw error;
      setAnnouncementResponsesList(data || []);
    } catch (err: any) {
      console.error('Error fetching announcement stats:', err);
    }
  }, []);

  const getAnnouncementTargetedTeachers = useCallback((announcement: any) => {
    const allUniqueTeachers = [...campusTeachers, ...bypassTeachers, ...coaches].reduce((acc: any[], t: any) => {
      if (!acc.some(existing => existing.id === t.id)) {
        acc.push(t);
      }
      return acc;
    }, []);

    if (announcement.target_type === 'all') return allUniqueTeachers;
    if (announcement.target_type === 'individual') {
      const found = allUniqueTeachers.find(t => t.id === announcement.target_teacher_id);
      return found ? [found] : [];
    }
    if (announcement.target_type === 'group') {
      return allUniqueTeachers.filter(t => {
        const inst = (t.instrument || '').toLowerCase();
        const targetGrp = (announcement.target_group || '').toLowerCase();
        if (targetGrp === 'guitar') return inst.includes('gitarre') || inst.includes('guitar') || inst.includes('bass');
        if (targetGrp === 'piano') return inst.includes('klavier') || inst.includes('piano') || inst.includes('keyboard') || inst.includes('keys');
        if (targetGrp === 'vocals') return inst.includes('gesang') || inst.includes('vocal') || inst.includes('sing');
        if (targetGrp === 'drums') return inst.includes('schlagzeug') || inst.includes('drum');
        return inst.includes(targetGrp);
      });
    }
    return [];
  }, [campusTeachers, bypassTeachers, coaches]);

  const handleSendReminder = useCallback(async (announcement: any) => {
    if (!announcement) return;
    const targeted = getAnnouncementTargetedTeachers(announcement);
    const pendingTeachers = targeted.filter((t: any) => !announcementResponsesList.some((res: any) => res.teacher_id === t.id));
    
    if (pendingTeachers.length === 0) {
      alert('Alle Lehrkräfte haben diese Mitteilung bereits zur Kenntnis genommen bzw. beantwortet!');
      return;
    }
    
    const confirmSend = confirm(`Möchtest du eine Erinnerung an ${pendingTeachers.length} ausstehende Lehrkräfte senden?`);
    if (!confirmSend) return;
    
    let successCount = 0;
    for (const teacher of pendingTeachers) {
      try {
        const title = 'Mitteilung der Musikschulleitung 📋';
        const message = `Bitte beachten bzw. Rückmeldung geben: "${announcement.title}"`;
        const metadata = { type: 'announcement_reminder', request_id: announcement.id };

        const { data: notification, error: notifErr } = await supabase
          .from('notifications')
          .insert({
            user_id: teacher.id,
            title,
            message,
            metadata
          })
          .select('id')
          .single();

        if (!notifErr && notification) {
          await supabase.functions.invoke('send-push', {
            body: {
              userId: teacher.id,
              title,
              body: message,
              url: '/',
              notificationId: notification.id
            }
          });
        }
        successCount++;
      } catch (err) {
        console.error('Failed to send reminder to', teacher.id, err);
      }
    }
    
    alert(`Erinnerungen erfolgreich an ${successCount} Lehrkräfte gesendet!`);
  }, [getAnnouncementTargetedTeachers, announcementResponsesList]);

  const handleExportCSV = useCallback((announcement: any) => {
    if (!announcement) return;
    const targeted = getAnnouncementTargetedTeachers(announcement);
    
    let csvContent = '\uFEFF'; // Add BOM for excel support
    const isAnonymous = !!announcement.is_anonymous;
    
    if (announcement.questions && announcement.questions.length > 0) {
      const headers = ['Lehrkraft', 'Status', 'Abgabe-Datum', ...announcement.questions.map((q: any) => typeof q === 'string' ? q : q.text)];
      csvContent += headers.map(h => `"${h.replace(/"/g, '""')}"`).join(',') + '\n';
      
      targeted.forEach((t: any, idx: number) => {
        const response = announcementResponsesList.find(res => res.teacher_id === t.id);
        const hasCompleted = !!response;
        
        let answersObj: Record<string, string> = {};
        if (hasCompleted && response.response_text) {
          try {
            if (response.response_text.startsWith('{')) {
              answersObj = JSON.parse(response.response_text);
            }
          } catch (e) {}
        }
        
        const row = [
          isAnonymous ? `Anonyme Lehrkraft #${idx + 1}` : formatTeacherFullName(t),
          hasCompleted ? 'Bestätigt' : 'Ausstehend',
          hasCompleted ? new Date(response.created_at).toLocaleDateString('de-DE') : '-',
          ...announcement.questions.map((q: any) => {
            const qKey = typeof q === 'string' ? q : q.text;
            if (!hasCompleted) return '-';
            const ans = answersObj[qKey] !== undefined ? answersObj[qKey] : (response.response_text || '');
            return ans;
          })
        ];
        
        csvContent += row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',') + '\n';
      });
    } else {
      const headers = ['Lehrkraft', 'Status', 'Abgabe-Datum', 'Antwort'];
      csvContent += headers.map(h => `"${h.replace(/"/g, '""')}"`).join(',') + '\n';
      
      targeted.forEach((t: any, idx: number) => {
        const response = announcementResponsesList.find(res => res.teacher_id === t.id);
        const hasCompleted = !!response;
        
        const row = [
          isAnonymous ? `Anonyme Lehrkraft #${idx + 1}` : formatTeacherFullName(t),
          hasCompleted ? 'Bestätigt' : 'Ausstehend',
          hasCompleted ? new Date(response.created_at).toLocaleDateString('de-DE') : '-',
          hasCompleted ? (response.response_text || 'Bestätigt') : '-'
        ];
        
        csvContent += row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',') + '\n';
      });
    }
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Mitteilung_${announcement.title.replace(/[^a-zA-Z0-9]/g, '_')}_Auswertung.csv`);
    document.body.appendChild(link);
    link.click();
  }, [getAnnouncementTargetedTeachers, announcementResponsesList]);

  return {
    announcementsList,
    setAnnouncementsList,
    announcementsLoading,
    setAnnouncementsLoading,
    newAnnouncementTitle,
    setNewAnnouncementTitle,
    newAnnouncementDescription,
    setNewAnnouncementDescription,
    newAnnouncementType,
    setNewAnnouncementType,
    newAnnouncementQuestions,
    setNewAnnouncementQuestions,
    newAnnouncementQuestionType,
    setNewAnnouncementQuestionType,
    newAnnouncementQuestionOptions,
    setNewAnnouncementQuestionOptions,
    newAnnouncementPriority,
    setNewAnnouncementPriority,
    newAnnouncementIsAnonymous,
    setNewAnnouncementIsAnonymous,
    newAnnouncementTargetType,
    setNewAnnouncementTargetType,
    newAnnouncementTargetGroup,
    setNewAnnouncementTargetGroup,
    newAnnouncementTargetTeacherId,
    setNewAnnouncementTargetTeacherId,
    newAnnouncementDueDate,
    setNewAnnouncementDueDate,
    newAnnouncementRecurrence,
    setNewAnnouncementRecurrence,
    newAnnouncementAttachmentUrl,
    setNewAnnouncementAttachmentUrl,
    isUploadingAnnouncementAttachment,
    setIsUploadingAnnouncementAttachment,
    selectedAnnouncementForStats,
    setSelectedAnnouncementForStats,
    statsSearchQuery,
    setStatsSearchQuery,
    statsStatusFilter,
    setStatsStatusFilter,
    statsModalTab,
    setStatsModalTab,
    announcementResponsesList,
    setAnnouncementResponsesList,
    newAnnouncementQuestionInput,
    setNewAnnouncementQuestionInput,
    editingAnnouncementId,
    setEditingAnnouncementId,
    expandedResponseIds,
    setExpandedResponseIds,
    fetchAnnouncements,
    handleUploadAnnouncementAttachment,
    handleMoveQuestion,
    handleCreateAnnouncement,
    handleDeleteAnnouncement,
    fetchAnnouncementStats,
    getAnnouncementTargetedTeachers,
    handleSendReminder,
    handleExportCSV
  };
}
