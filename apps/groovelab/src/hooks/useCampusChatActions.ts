import React, { useCallback } from 'react';

// Local storage helpers for optimistic and zero-bounce read state
export const saveLocalDirectRead = (uid: string, partnerId: string, timestamp: number) => {
  if (typeof window === 'undefined' || !uid || !partnerId) return;
  try {
    const key = `cgl_direct_reads_${uid}`;
    const raw = localStorage.getItem(key);
    const obj = raw ? JSON.parse(raw) : {};
    if (!obj[partnerId] || obj[partnerId] < timestamp) {
      obj[partnerId] = timestamp;
      localStorage.setItem(key, JSON.stringify(obj));
    }
  } catch (e) {}
};

export const saveLocalGroupRead = (uid: string, groupId: string, timestamp: number) => {
  if (typeof window === 'undefined' || !uid || !groupId) return;
  try {
    const key = `cgl_group_reads_${uid}`;
    const raw = localStorage.getItem(key);
    const obj = raw ? JSON.parse(raw) : {};
    if (!obj[groupId] || obj[groupId] < timestamp) {
      obj[groupId] = timestamp;
      localStorage.setItem(key, JSON.stringify(obj));
    }
  } catch (e) {}
};

export const saveLocalChannelRead = (uid: string, channelId: string, timestamp: number) => {
  if (typeof window === 'undefined' || !uid || !channelId) return;
  try {
    const key = `cgl_channel_reads_${uid}`;
    const raw = localStorage.getItem(key);
    const obj = raw ? JSON.parse(raw) : {};
    if (!obj[channelId] || obj[channelId] < timestamp) {
      obj[channelId] = timestamp;
      localStorage.setItem(key, JSON.stringify(obj));
    }
  } catch (e) {}
};

export const saveLocalReadMsgIds = (uid: string, msgIds: string[]) => {
  if (typeof window === 'undefined' || !uid || !msgIds || msgIds.length === 0) return;
  try {
    const key = `cgl_read_msg_ids_${uid}`;
    const raw = localStorage.getItem(key);
    let arr: string[] = [];
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) arr = parsed;
      } catch (e) {}
    }
    const set = new Set(arr);
    msgIds.forEach(id => {
      if (id) set.add(id);
    });
    const updated = Array.from(set).slice(-1000);
    localStorage.setItem(key, JSON.stringify(updated));
  } catch (e) {}
};

export interface UseCampusChatActionsParams {
  user: any;
  session?: any;
  loggedInUserId: string | null;
  supabase: any;
  setCampusMessages: React.Dispatch<React.SetStateAction<any[]>>;
  setCampusUnreadCount: React.Dispatch<React.SetStateAction<number>>;
  fetchCampusMessages: () => void | Promise<void>;
  debouncedFetchCampusMessages: () => void | Promise<void>;
  studentMessages: any[];
  setStudentMessages: React.Dispatch<React.SetStateAction<any[]>>;
  announcements: any[];
  setAnnouncements: React.Dispatch<React.SetStateAction<any[]>>;
  selectedStudentMessage: any;
  setSelectedStudentMessage: React.Dispatch<React.SetStateAction<any>>;
  deletedMessageIds: string[];
  setDeletedMessageIds: React.Dispatch<React.SetStateAction<string[]>>;
  studentMessagesFilter: string;
  setActiveAnnouncement: React.Dispatch<React.SetStateAction<any>>;
  announcementTitle: string;
  setAnnouncementTitle: (val: string) => void;
  announcementMessage: string;
  setAnnouncementMessage: (val: string) => void;
  announcementTarget: string;
  setAnnouncementTarget: React.Dispatch<React.SetStateAction<any>> | ((val: any) => void);
  selectedTargetUserIds: string[];
  setSelectedTargetUserIds: (val: string[]) => void;
  setRecipientSearchText: (val: string) => void;
  annBandId: string | null;
  setAnnBandId: (val: string | null) => void;
  fetchAnnouncements: (schoolId: string) => Promise<void> | void;
  setLoading: (loading: boolean) => void;
  setToastMessage: (msg: { text: string; type: 'success' | 'error' } | null) => void;
}

export function useCampusChatActions({
  user,
  session,
  loggedInUserId,
  supabase,
  setCampusMessages,
  setCampusUnreadCount,
  fetchCampusMessages,
  debouncedFetchCampusMessages,
  studentMessages,
  setStudentMessages,
  announcements,
  setAnnouncements,
  selectedStudentMessage,
  setSelectedStudentMessage,
  deletedMessageIds,
  setDeletedMessageIds,
  studentMessagesFilter,
  setActiveAnnouncement,
  announcementTitle,
  setAnnouncementTitle,
  announcementMessage,
  setAnnouncementMessage,
  announcementTarget,
  setAnnouncementTarget,
  selectedTargetUserIds,
  setSelectedTargetUserIds,
  setRecipientSearchText,
  annBandId,
  setAnnBandId,
  fetchAnnouncements,
  setLoading,
  setToastMessage
}: UseCampusChatActionsParams) {

  const handleSendCampusMessage = useCallback(async (
    recipientId: string, 
    content: string, 
    groupId?: string, 
    channelId?: string, 
    parentMessageId?: string, 
    subject?: string
  ) => {
    const uid = typeof window !== 'undefined' ? (sessionStorage.getItem('groovelab_user_id') || (user?.id)) : user?.id;
    if (!uid) return;

    // 0ms Optimistic UI update: immediately display message in UI
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const optimisticMessage: any = {
      id: tempId,
      sender_id: uid,
      content,
      created_at: new Date().toISOString(),
      is_read: false
    };
    if (groupId) {
      optimisticMessage.group_id = groupId;
      optimisticMessage.recipient_id = uid;
      if (channelId) optimisticMessage.channel_id = channelId;
      if (parentMessageId) optimisticMessage.parent_message_id = parentMessageId;
      if (subject) optimisticMessage.subject = subject;
    } else {
      optimisticMessage.recipient_id = recipientId;
      if (parentMessageId) optimisticMessage.parent_message_id = parentMessageId;
      if (subject) optimisticMessage.subject = subject;
    }

    setCampusMessages(prev => [...prev, optimisticMessage]);

    try {
      const payload: any = {
        sender_id: uid,
        content
      };
      if (groupId) {
        payload.group_id = groupId;
        payload.recipient_id = uid;
        if (channelId) payload.channel_id = channelId;
        if (parentMessageId) payload.parent_message_id = parentMessageId;
        if (subject) {
          payload.subject = subject;
          payload.message_type = 'topic';
        }
      } else {
        payload.recipient_id = recipientId;
        if (parentMessageId) payload.parent_message_id = parentMessageId;
        if (subject) {
          payload.subject = subject;
          payload.message_type = 'topic';
        }
      }

      let insertedMsg: any = null;
      const { data, error } = await supabase.from('campus_direct_messages').insert(payload).select().single();
      if (error) {
        const errorStr = String(error.message || (error as any).details || (error as any).hint || '');
        const isColumnMissing = error.code === '42703' || 
          error.code === 'PGRST204' ||
          errorStr.includes('schema cache') ||
          errorStr.includes('message_type') ||
          errorStr.includes('subject') || 
          errorStr.includes('parent_message_id') ||
          errorStr.includes('channel_id');

        if (isColumnMissing) {
          console.warn('[handleSendCampusMessage] DB schema column pending in cache, applying resilient insert fallback:', error);
          const fallbackPayload: any = {
            sender_id: uid,
            content: subject && errorStr.includes('subject') ? `📌 [${subject}]\n\n${content}` : content
          };
          if (groupId) {
            fallbackPayload.group_id = groupId;
            fallbackPayload.recipient_id = uid;
            if (channelId && !errorStr.includes('channel_id')) fallbackPayload.channel_id = channelId;
          } else {
            fallbackPayload.recipient_id = recipientId;
          }
          if (subject && !errorStr.includes('subject')) {
            fallbackPayload.subject = subject;
          }
          if (parentMessageId && !errorStr.includes('parent_message_id')) {
            fallbackPayload.parent_message_id = parentMessageId;
          }
          // Only pass message_type if error was not about message_type / schema cache
          if (payload.message_type && !errorStr.includes('message_type') && !errorStr.includes('schema cache')) {
            fallbackPayload.message_type = payload.message_type;
          }

          const retryRes = await supabase.from('campus_direct_messages').insert(fallbackPayload).select().single();
          if (retryRes.error) {
            console.warn('[handleSendCampusMessage] Level 1 fallback failed, applying minimal safe insert:', retryRes.error);
            const minimalPayload: any = {
              sender_id: uid,
              content: subject ? `📌 [${subject}]\n\n${content}` : content,
              recipient_id: groupId ? uid : recipientId
            };
            if (groupId) minimalPayload.group_id = groupId;
            const minimalRes = await supabase.from('campus_direct_messages').insert(minimalPayload).select().single();
            if (minimalRes.error) {
              setCampusMessages(prev => prev.filter(m => m.id !== tempId));
              throw minimalRes.error;
            }
            insertedMsg = minimalRes.data;
          } else {
            insertedMsg = retryRes.data;
          }
        } else {
          // Rollback optimistic update on error
          setCampusMessages(prev => prev.filter(m => m.id !== tempId));
          throw error;
        }
      } else {
        insertedMsg = data;
      }

      // Replace optimistic message with actual persisted message, preserving subject for thread view
      if (insertedMsg) {
        setCampusMessages(prev => prev.map(m => m.id === tempId ? { ...insertedMsg, subject: insertedMsg.subject || subject } : m));
      }

      // Group lesson message replication: Check if recipient has a group_id (only for 1:1 direct messages)
      if (!groupId) {
        try {
          let recipientGroupId: string | null = null;
          const { data: recUser } = await supabase.from('users').select('group_id').eq('id', recipientId).maybeSingle();
          if (recUser?.group_id) recipientGroupId = recUser.group_id;
          else {
            const { data: recPending } = await supabase.from('pending_students_decrypted').select('group_id').eq('id', recipientId).maybeSingle();
            if (recPending?.group_id) recipientGroupId = recPending.group_id;
          }

          if (recipientGroupId) {
            const { data: groupUsers } = await supabase.from('users').select('id').eq('group_id', recipientGroupId).neq('id', recipientId);
            const { data: groupPending } = await supabase.from('pending_students_decrypted').select('id').eq('group_id', recipientGroupId).neq('id', recipientId);
            
            const partnerIds = new Set<string>();
            (groupUsers || []).forEach((u: any) => { if (u?.id && u.id !== uid) partnerIds.add(u.id); });
            (groupPending || []).forEach((p: any) => { if (p?.id && p.id !== uid) partnerIds.add(p.id); });

            for (const partnerId of Array.from(partnerIds)) {
              await supabase.from('campus_direct_messages').insert({
                sender_id: uid,
                recipient_id: partnerId,
                content
              });
            }
          }
        } catch (grpErr) {
          console.error('Error replicating group lesson message:', grpErr);
        }
      }

      fetchCampusMessages();
      return insertedMsg || optimisticMessage;
    } catch (err) {
      console.error('Error sending campus message:', err);
      throw err;
    }
  }, [user?.id, supabase, setCampusMessages, fetchCampusMessages]);

  const handleMarkCampusMessagesAsRead = useCallback(async (senderId: string) => {
    const uid = typeof window !== 'undefined' ? (sessionStorage.getItem('groovelab_selected_student_id') || sessionStorage.getItem('groovelab_user_id') || (user?.id)) : user?.id;
    if (!uid || !senderId) return;

    const nowTime = Date.now();
    const nowIso = new Date(nowTime).toISOString();

    // 1. Persist to local storage immediately (Zero-Bounce Guarantee)
    saveLocalDirectRead(uid, senderId, nowTime);
    const affectedMsgIds: string[] = [];

    // Optimistic 0ms update: mark direct messages locally as read
    let unreadCountDiff = 0;
    setCampusMessages(prev => prev.map(m => {
      if (!m.group_id && m.sender_id === senderId && m.recipient_id === uid && !m.is_read) {
        unreadCountDiff++;
        affectedMsgIds.push(m.id);
        return { ...m, is_read: true, read_at: nowIso, acknowledged_at: nowIso };
      }
      return m;
    }));
    if (affectedMsgIds.length > 0) {
      saveLocalReadMsgIds(uid, affectedMsgIds);
    }
    setCampusUnreadCount(prev => Math.max(0, prev - unreadCountDiff));

    try {
      const { error } = await supabase.rpc('mark_campus_direct_chat_as_read', { p_partner_id: senderId, p_user_id: uid });
      if (error) {
        // Fallback direct table update
        await supabase
          .from('campus_direct_messages')
          .update({ is_read: true, read_at: nowIso })
          .eq('sender_id', senderId)
          .eq('recipient_id', uid);
      }
      debouncedFetchCampusMessages();
    } catch (err) {
      console.error('Error marking messages as read:', err);
    }
  }, [user?.id, setCampusMessages, setCampusUnreadCount, supabase, debouncedFetchCampusMessages]);

  const handleMarkCampusGroupAsRead = useCallback(async (groupId: string) => {
    const uid = typeof window !== 'undefined' ? (sessionStorage.getItem('groovelab_selected_student_id') || sessionStorage.getItem('groovelab_user_id') || (user?.id)) : user?.id;
    if (!uid || !groupId) return;

    const nowTime = Date.now();
    saveLocalGroupRead(uid, groupId, nowTime);

    const affectedMsgIds: string[] = [];
    // 0ms Optimistic Update: Unread-Zähler atomar berechnen und anpassen
    let unreadCountDiff = 0;
    setCampusMessages(prev => {
      return prev.map(m => {
        if (m.group_id === groupId && m.sender_id !== uid) {
          unreadCountDiff++;
          affectedMsgIds.push(m.id);
        }
        return m;
      });
    });
    if (affectedMsgIds.length > 0) {
      saveLocalReadMsgIds(uid, affectedMsgIds);
    }
    setCampusUnreadCount(prev => Math.max(0, prev - unreadCountDiff));

    try {
      const { error } = await supabase.rpc('mark_campus_group_as_read', { p_group_id: groupId, p_user_id: uid });
      if (error) {
        console.warn('[App] Fallback direct group channel read update:', error);
        // Fallback direct table updates
        const nowIso = new Date().toISOString();
        await supabase
          .from('campus_chat_group_members')
          .update({ last_read_at: nowIso })
          .eq('group_id', groupId)
          .eq('user_id', uid);
      }
      debouncedFetchCampusMessages();
    } catch (err) {
      console.error('Error marking campus group as read:', err);
    }
  }, [user?.id, setCampusMessages, setCampusUnreadCount, supabase, debouncedFetchCampusMessages]);

  const handleMarkCampusChannelAsRead = useCallback(async (channelId: string, groupId: string) => {
    const uid = typeof window !== 'undefined' ? (sessionStorage.getItem('groovelab_selected_student_id') || sessionStorage.getItem('groovelab_user_id') || (user?.id)) : user?.id;
    if (!uid || !channelId) return;

    const nowTime = Date.now();
    saveLocalChannelRead(uid, channelId, nowTime);
    if (groupId) {
      saveLocalGroupRead(uid, groupId, nowTime);
    }

    const affectedIds: string[] = [];
    // 0ms Optimistic Update: Unread-Zähler für diesen Kanal atomar berechnen und anpassen
    let unreadCountDiff = 0;
    setCampusMessages(prev => {
      return prev.map(m => {
        if (m.group_id === groupId && (m.channel_id === channelId || (!m.channel_id && channelId)) && m.sender_id !== uid) {
          unreadCountDiff++;
          affectedIds.push(m.id);
        }
        return m;
      });
    });
    if (affectedIds.length > 0) {
      saveLocalReadMsgIds(uid, affectedIds);
    }
    if (unreadCountDiff > 0) {
      setCampusUnreadCount(prev => Math.max(0, prev - unreadCountDiff));
    }

    try {
      const { error } = await supabase.rpc('mark_campus_channel_as_read', { p_channel_id: channelId, p_user_id: uid });
      if (error) {
        console.warn('[App] Fallback direct channel read update:', error);
        const schoolId = user?.school_id || (Array.isArray(user?.schools) ? user?.schools[0]?.id : user?.schools?.id);
        if (schoolId) {
          const nowIso = new Date().toISOString();
          await supabase
            .from('campus_chat_channel_reads')
            .upsert({
              channel_id: channelId,
              user_id: uid,
              school_id: schoolId,
              last_read_at: nowIso
            }, { onConflict: 'channel_id,user_id' });
        }
      }
      debouncedFetchCampusMessages();
    } catch (err) {
      console.error('Error marking campus channel as read:', err);
    }
  }, [user, setCampusMessages, setCampusUnreadCount, supabase, debouncedFetchCampusMessages]);

  const handleAcknowledgeStudentMessage = useCallback(async (msgOrId: any) => {
    if (!user) return;
    const msgId = typeof msgOrId === 'string' ? msgOrId : msgOrId?.id;
    if (!msgId) return;
    
    // Optimistic update of local states in studentMessages and announcements
    setStudentMessages(prev => prev.map(m => {
      if (m.id !== msgId) return m;
      const rBy = m.read_by || [];
      return rBy.includes(user.id) ? m : { ...m, read_by: [...rBy, user.id] };
    }));
    
    setAnnouncements(prev => prev.map(m => {
      if (m.id !== msgId) return m;
      const rBy = m.read_by || [];
      return rBy.includes(user.id) ? m : { ...m, read_by: [...rBy, user.id] };
    }));
    
    setSelectedStudentMessage((prev: any) => {
      if (!prev || prev.id !== msgId) return prev;
      const rBy = prev.read_by || [];
      return rBy.includes(user.id) ? prev : { ...prev, read_by: [...rBy, user.id] };
    });
    
    try {
      const { data: current } = await supabase
        .from('band_shoutbox')
        .select('read_by')
        .eq('id', msgId)
        .maybeSingle();

      const existingReadBy = Array.isArray(current?.read_by) ? current.read_by : [];
      if (!existingReadBy.includes(user.id)) {
        await supabase
          .from('band_shoutbox')
          .update({ read_by: [...existingReadBy, user.id] })
          .eq('id', msgId);
      }
    } catch (err) {
      console.error('Error acknowledging student message:', err);
    }
  }, [user, setStudentMessages, setAnnouncements, setSelectedStudentMessage, supabase]);

  const handleDeleteMessageForSelf = useCallback((msgId: string) => {
    if (!user) return;
    if (!window.confirm('Möchtest du diese Nachricht wirklich für dich aus deiner Mailbox löschen?')) return;
    
    const newDeleted = [...deletedMessageIds, msgId];
    setDeletedMessageIds(newDeleted);
    localStorage.setItem(`groovelab_deleted_messages_${user.id}`, JSON.stringify(newDeleted));
    
    // Auto-select the next or first available message after deletion
    const remaining = studentMessages.filter(m => {
      if (newDeleted.includes(m.id)) return false;
      if (studentMessagesFilter === 'school') return m.type === 'school';
      if (studentMessagesFilter === 'band') return m.type === 'band';
      return true;
    });
    
    setSelectedStudentMessage(remaining.length > 0 ? remaining[0] : null);
  }, [user, deletedMessageIds, setDeletedMessageIds, studentMessages, studentMessagesFilter, setSelectedStudentMessage]);

  const handleAcknowledgeAnnouncement = useCallback(async (msg: any) => {
    if (!user) return;
    const currentReadBy = msg.read_by || [];
    if (currentReadBy.includes(user.id)) {
      setActiveAnnouncement(null);
      return;
    }
    const newReadBy = [...currentReadBy, user.id];
    
    setActiveAnnouncement(null);
    
    try {
      await supabase
        .from('band_shoutbox')
        .update({ read_by: newReadBy })
        .eq('id', msg.id);
    } catch (err) {
      console.error('Error acknowledging announcement:', err);
    }
  }, [user, setActiveAnnouncement, supabase]);

  const handlePostAnnouncement = useCallback(async (e: React.FormEvent) => {
    if (e && typeof e.preventDefault === 'function') e.preventDefault();
    if (!user || !user.school_id) return;
    if (!announcementTitle.trim() || !announcementMessage.trim()) {
      throw new Error('Bitte Betreff und Nachricht ausfüllen.');
    }
    
    setLoading(true);
    try {
      let bandId = annBandId;
      if (!bandId) {
        const { data: annBands } = await supabase
          .from('bands')
          .select('id')
          .eq('school_id', user.school_id)
          .eq('name', '__SYSTEM_ANNOUNCEMENTS__');
          
        if (!annBands || annBands.length === 0) {
          const { data: newBand, error: insertErr } = await supabase
            .from('bands')
            .insert({
              name: '__SYSTEM_ANNOUNCEMENTS__',
              status: 'active',
              school_id: user.school_id,
              coach_id: null,
              genre: 'System',
              photo_url: '/logo.png'
            })
            .select();
          if (insertErr) {
            console.error('[handlePostAnnouncement] Error inserting band:', insertErr);
          }
          if (newBand && newBand[0]) {
            bandId = newBand[0].id;
            setAnnBandId(bandId);
          }
        } else {
          bandId = annBands[0].id;
          setAnnBandId(annBands[0].id);
        }
      }
      
      if (!bandId) {
        throw new Error('Fehler beim Erstellen der System-Band.');
      }
      
      const payload = {
        title: announcementTitle.trim(),
        message: announcementMessage.trim(),
        target_type: announcementTarget,
        target_user_ids: announcementTarget === 'specific' ? selectedTargetUserIds : []
      };
      
      const { error } = await supabase.from('band_shoutbox').insert({
        band_id: bandId,
        user_id: user.id,
        content: JSON.stringify(payload),
        read_by: [user.id]
      });
      
      if (error) {
        throw new Error('Fehler beim Senden: ' + error.message);
      } else {
        setAnnouncementTitle('');
        setAnnouncementMessage('');
        setAnnouncementTarget('all');
        setSelectedTargetUserIds([]);
        setRecipientSearchText('');
        
        await fetchAnnouncements(user.school_id);
      }
    } catch (err: any) {
      console.error('[Announcements] Error posting:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [
    user,
    announcementTitle,
    announcementMessage,
    announcementTarget,
    selectedTargetUserIds,
    annBandId,
    setAnnBandId,
    setAnnouncementTitle,
    setAnnouncementMessage,
    setAnnouncementTarget,
    setSelectedTargetUserIds,
    setRecipientSearchText,
    fetchAnnouncements,
    setLoading,
    supabase
  ]);

  const handleDeleteAnnouncement = useCallback(async (msgId: string) => {
    if (!window.confirm('Möchtest du diese Mitteilung wirklich unwiderruflich löschen? Sie wird dann für alle Empfänger entfernt.')) return;
    setLoading(true);
    try {
      const { error } = await supabase.from('band_shoutbox').delete().eq('id', msgId);
      if (error) {
        alert('Fehler beim Löschen: ' + error.message);
      } else {
        if (user?.school_id) {
          await fetchAnnouncements(user.school_id);
        }
      }
    } catch (err: any) {
      console.error('[Announcements] Error deleting:', err);
    } finally {
      setLoading(false);
    }
  }, [user?.school_id, setLoading, fetchAnnouncements, supabase]);

  const handleHelpRequest = useCallback(async () => {
    if (!session?.station_id || !loggedInUserId) return;
    
    const sId = user?.school_id || (Array.isArray(user?.schools) ? user?.schools[0]?.id : user?.schools?.id);
    
    // Optimistic UI: Show success toast immediately
    setToastMessage({ text: 'Hilfe wurde angefordert. Der Lehrer sieht deinen Tisch im Dashboard.', type: 'success' });
    
    // Perform insert in background
    supabase
      .from('help_requests')
      .insert({
        user_id: loggedInUserId,
        station_id: session.station_id,
        school_id: sId,
        status: 'pending'
      })
      .then(({ error }: any) => {
        if (error) {
          setToastMessage({ text: 'Fehler beim Senden: ' + error.message, type: 'error' });
        }
      });
  }, [session?.station_id, loggedInUserId, user, setToastMessage, supabase]);

  return {
    handleSendCampusMessage,
    handleMarkCampusMessagesAsRead,
    handleMarkCampusGroupAsRead,
    handleMarkCampusChannelAsRead,
    handleAcknowledgeStudentMessage,
    handleDeleteMessageForSelf,
    handleAcknowledgeAnnouncement,
    handlePostAnnouncement,
    handleDeleteAnnouncement,
    handleHelpRequest
  };
}
