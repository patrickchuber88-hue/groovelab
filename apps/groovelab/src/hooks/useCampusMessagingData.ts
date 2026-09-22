import React, { useEffect, useRef, useCallback } from 'react';
import { decryptMessagesBatch } from '../lib/security/messageCrypto';

// 🛡️ Tier-1 Enterprise+ Local Storage Read Receipts Cache (Offline-First / Zero-Bounce)
export const getLocalChannelReads = (uid: string): Map<string, number> => {
  const map = new Map<string, number>();
  if (typeof window === 'undefined' || !uid) return map;
  try {
    const raw = localStorage.getItem(`cgl_channel_reads_${uid}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      Object.entries(parsed).forEach(([k, v]) => {
        if (typeof v === 'number') map.set(k, v);
      });
    }
  } catch (e) {}
  return map;
};

export const getLocalGroupReads = (uid: string): Map<string, number> => {
  const map = new Map<string, number>();
  if (typeof window === 'undefined' || !uid) return map;
  try {
    const raw = localStorage.getItem(`cgl_group_reads_${uid}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      Object.entries(parsed).forEach(([k, v]) => {
        if (typeof v === 'number') map.set(k, v);
      });
    }
  } catch (e) {}
  return map;
};

export const getLocalDirectReads = (uid: string): Map<string, number> => {
  const map = new Map<string, number>();
  if (typeof window === 'undefined' || !uid) return map;
  try {
    const raw = localStorage.getItem(`cgl_direct_reads_${uid}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      Object.entries(parsed).forEach(([k, v]) => {
        if (typeof v === 'number') map.set(k, v);
      });
    }
  } catch (e) {}
  return map;
};

export const getLocalReadMsgIds = (uid: string): Set<string> => {
  const set = new Set<string>();
  if (typeof window === 'undefined' || !uid) return set;
  try {
    const raw = localStorage.getItem(`cgl_read_msg_ids_${uid}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        parsed.forEach((id: string) => {
          if (typeof id === 'string') set.add(id);
        });
      }
    }
  } catch (e) {}
  return set;
};

export interface UseCampusMessagingDataParams {
  user: any;
  loggedInUserId: string | null;
  supabase: any;
  activeStudentTab: string;
  plannedSlots: string[];
  setPlannedSlots: React.Dispatch<React.SetStateAction<string[]>>;
  setGlobalPlannedSlots: React.Dispatch<React.SetStateAction<any[]>>;
  setActiveAnnouncement: React.Dispatch<React.SetStateAction<any>>;
  setAnnouncements: React.Dispatch<React.SetStateAction<any[]>>;
  annBandId: string | null;
  setAnnBandId: React.Dispatch<React.SetStateAction<string | null>>;
  userBands: any[];
  setStudentMessages: React.Dispatch<React.SetStateAction<any[]>>;
  setStudentMessagesLoading: React.Dispatch<React.SetStateAction<boolean>>;
  setCampusMessages: React.Dispatch<React.SetStateAction<any[]>>;
  setCampusUnreadCount: React.Dispatch<React.SetStateAction<number>>;
  setCampusMessagesLoading: React.Dispatch<React.SetStateAction<boolean>>;
}

export interface UseCampusMessagingDataReturn {
  fetchPlanningData: (schoolId: string, userIdArg?: string) => Promise<void>;
  toggleSlot: (day: string, time: string) => Promise<void>;
  checkAnnouncements: (schoolId: string, currentUser: any) => Promise<void>;
  fetchAnnouncements: (schoolId: string) => Promise<void>;
  fetchStudentMessagesBackground: (schoolId: string, userId: string, bandIds: string[]) => Promise<void>;
  fetchStudentMessages: () => Promise<void>;
  fetchCampusMessages: () => Promise<void>;
  debouncedFetchCampusMessages: () => void;
}

export function useCampusMessagingData({
  user,
  loggedInUserId,
  supabase,
  activeStudentTab,
  plannedSlots,
  setPlannedSlots,
  setGlobalPlannedSlots,
  setActiveAnnouncement,
  setAnnouncements,
  annBandId,
  setAnnBandId,
  userBands,
  setStudentMessages,
  setStudentMessagesLoading,
  setCampusMessages,
  setCampusUnreadCount,
  setCampusMessagesLoading
}: UseCampusMessagingDataParams): UseCampusMessagingDataReturn {

  const fetchPlanningData = useCallback(async (schoolId: string, userIdArg?: string) => {
    const currentUserId = userIdArg || loggedInUserId || (typeof window !== 'undefined' ? sessionStorage.getItem('groovelab_user_id') : null);
    console.log(`[Planning] Fetching for School: ${schoolId}, User: ${currentUserId}`);
    if (!currentUserId || !schoolId) {
      console.warn('[Planning] Missing userId or schoolId', { currentUserId, schoolId });
      return;
    }
    
    try {
      // 1. Hole alle Planungs-Einträge der Schule
      const { data: planningData, error: planningError } = await supabase
        .from('lab_planning')
        .select('*')
        .eq('school_id', schoolId);
      
      console.log(`[Planning] DB Result:`, { count: planningData?.length, error: planningError });
        
      if (planningError) {
        console.error('[Planning] Fetch Error:', planningError);
        return;
      }

      // 2. Hole alle Profile der Schule für den in-memory Join
      const { data: profilesData, error: profilesError } = await supabase
        .from('users')
        .select('id, first_name, role')
        .eq('school_id', schoolId);

      if (profilesError) {
        console.error('[Planning] Profiles Fetch Error:', profilesError);
      }

      if (planningData) {
        const profilesMap: Record<string, any> = {};
        if (profilesData) {
          profilesData.forEach((p: any) => {
            profilesMap[p.id] = p;
          });
        }

        const enrichedPlanningData = planningData.map((item: any) => ({
          ...item,
          profiles: profilesMap[item.user_id] || null
        }));

        setGlobalPlannedSlots(enrichedPlanningData);
        const mySlots = enrichedPlanningData.filter((s: any) => s.user_id === currentUserId).map((s: any) => `${s.day}-${s.time}`);
        setPlannedSlots(mySlots);
      }
    } catch (err) {
      console.error('[Planning] Unexpected error:', err);
    }
  }, [loggedInUserId, supabase, setGlobalPlannedSlots, setPlannedSlots]);

  useEffect(() => {
    let schoolId = user?.school_id;
    if (!schoolId && user?.schools) {
      schoolId = Array.isArray(user.schools) ? user.schools[0]?.id : user.schools?.id;
    }
    if (schoolId && loggedInUserId) {
      fetchPlanningData(schoolId, loggedInUserId);
    }
  }, [activeStudentTab, loggedInUserId, user, fetchPlanningData]);

  const toggleSlot = useCallback(async (day: string, time: string) => {
    if (!loggedInUserId) {
      console.error('[Planning] Kein loggedInUserId gefunden.');
      return;
    }
    
    // Attempt to find schoolId from multiple sources
    let schoolId = user?.school_id;
    if (!schoolId && user?.schools) {
      schoolId = Array.isArray(user.schools) ? user.schools[0]?.id : user.schools?.id;
    }
    
    console.log(`[Planning] Toggle attempt for ${day}-${time}. SchoolId: ${schoolId}, UserId: ${loggedInUserId}`);
    if (!schoolId) {
      console.warn('[Planning] Keine School ID gefunden, breche ab.');
      return;
    }

    const key = `${day}-${time}`;
    const isPlanned = plannedSlots.includes(key);
    console.log(`[Planning] Toggle: ${key} (Current status: ${isPlanned ? 'planned' : 'not planned'})`);
    
    // Optimistic Update
    const newPlanned = isPlanned 
      ? plannedSlots.filter(s => s !== key) 
      : [...plannedSlots, key];
    setPlannedSlots(newPlanned);

    try {
      let result;
      if (isPlanned) {
        result = await supabase.from('lab_planning')
          .delete()
          .eq('user_id', loggedInUserId)
          .eq('day', day)
          .eq('time', time);
      } else {
        result = await supabase.from('lab_planning').insert({
          user_id: loggedInUserId,
          school_id: schoolId,
          day,
          time
        });
      }
      
      if (result.error) {
        console.error('[Planning] Datenbank-Fehler:', result.error.message, result.error);
        await fetchPlanningData(schoolId, loggedInUserId);
      } else {
        console.log('[Planning] Datenbank-Erfolg:', isPlanned ? 'Deleted' : 'Inserted');
        await fetchPlanningData(schoolId, loggedInUserId);
      }
    } catch (err) {
      console.error('[Planning] Kritischer Fehler beim Toggeln:', err);
      await fetchPlanningData(schoolId);
    }
  }, [loggedInUserId, user, plannedSlots, setPlannedSlots, supabase, fetchPlanningData]);

  const checkAnnouncements = useCallback(async (schoolId: string, currentUser: any) => {
    if (!schoolId || !currentUser) return;
    try {
      const { data: annBands } = await supabase
        .from('bands')
        .select('id')
        .eq('school_id', schoolId)
        .eq('name', '__SYSTEM_ANNOUNCEMENTS__');
        
      if (!annBands || annBands.length === 0) return;
      const bandIds = annBands.map((b: any) => b.id);
      
      const { data: messages } = await supabase
        .from('band_shoutbox')
        .select('*, users(first_name, last_name, photo_url)')
        .in('band_id', bandIds)
        .order('created_at', { ascending: false });
        
      if (!messages || messages.length === 0) return;
      
      const unread = messages.find((msg: any) => {
        let parsed;
        try {
          parsed = JSON.parse(msg.content);
        } catch (e) {
          parsed = {
            title: 'Wichtige Mitteilung',
            target_type: 'all',
            target_user_ids: [],
            message: msg.content
          };
        }
        
        let targetsUser = false;
        if (parsed.target_type === 'all') targetsUser = true;
        else if (parsed.target_type === 'students' && currentUser.role === 'student') targetsUser = true;
        else if (parsed.target_type === 'teachers' && (currentUser.role === 'teacher' || currentUser.role === 'admin')) targetsUser = true;
        else if (parsed.target_type === 'specific' && parsed.target_user_ids?.includes(currentUser.id)) targetsUser = true;
        
        if (!targetsUser) return false;
        
        const hasRead = msg.read_by && msg.read_by.includes(currentUser.id);
        return !hasRead;
      });
      
      if (unread) {
        setActiveAnnouncement(unread);
      }
    } catch (err) {
      console.error('Error checking announcements:', err);
    }
  }, [supabase, setActiveAnnouncement]);

  const fetchAnnouncements = useCallback(async (schoolId: string) => {
    if (!schoolId) return;
    try {
      const { data: annBands } = await supabase
        .from('bands')
        .select('id')
        .eq('school_id', schoolId)
        .eq('name', '__SYSTEM_ANNOUNCEMENTS__');
        
      if (!annBands || annBands.length === 0) {
        setAnnBandId(null);
        return;
      }

      const bandIds = annBands.map((b: any) => b.id);
      setAnnBandId(annBands[0].id);
      
      if (bandIds.length === 0) return;
      
      const { data: messages } = await supabase
        .from('band_shoutbox')
        .select('*, users(first_name, last_name, photo_url)')
        .in('band_id', bandIds)
        .order('created_at', { ascending: false });
        
      if (messages) {
        setAnnouncements(messages);
      }
    } catch (err) {
      console.error('[Announcements] Error fetching history:', err);
    }
  }, [supabase, setAnnBandId, setAnnouncements]);

  const fetchStudentMessagesBackground = useCallback(async (schoolId: string, userId: string, bandIds: string[]) => {
    try {
      // 1. Fetch school announcements
      const { data: annBands } = await supabase
        .from('bands')
        .select('id')
        .eq('school_id', schoolId)
        .eq('name', '__SYSTEM_ANNOUNCEMENTS__');
      
      let schoolMessages: any[] = [];
      if (annBands && annBands.length > 0) {
        const { data } = await supabase
          .from('band_shoutbox')
          .select('*, users(first_name, last_name, role, photo_url)')
          .in('band_id', annBands.map((b: any) => b.id))
          .order('created_at', { ascending: false });
        if (data) schoolMessages = data;
      }

      // 2. Fetch band shoutbox messages
      let bandMessages: any[] = [];
      if (bandIds && bandIds.length > 0) {
        const { data } = await supabase
          .from('band_shoutbox')
          .select('*, users(first_name, last_name, role, photo_url), bands(id, name)')
          .in('band_id', bandIds)
          .order('created_at', { ascending: false });
        if (data) bandMessages = data;
      }

      // 3. Process school
      const processedSchool = schoolMessages.map(msg => {
        let parsed;
        try {
          parsed = JSON.parse(msg.content);
        } catch (e) {
          parsed = {
            title: 'Wichtige Mitteilung',
            target_type: 'all',
            target_user_ids: [],
            message: msg.content
          };
        }
        
        let targetsUser = false;
        if (parsed.target_type === 'all') targetsUser = true;
        else if (parsed.target_type === 'students') targetsUser = true;
        else if (parsed.target_type === 'specific' && parsed.target_user_ids?.includes(userId)) targetsUser = true;
        
        if (!targetsUser) return null;
        
        return {
          id: msg.id,
          type: 'school',
          title: parsed.title || 'Wichtige Mitteilung',
          content: parsed.message || '',
          sender: msg.users || { first_name: 'Academy', last_name: 'Coach', photo_url: '/logo.png' },
          created_at: msg.created_at,
          read_by: msg.read_by || []
        };
      }).filter(Boolean);

      // 4. Process band
      const processedBand = bandMessages.map(msg => {
        return {
          id: msg.id,
          type: 'band',
          title: `Neuigkeiten aus ${msg.bands?.name || 'deiner Band'}`,
          content: msg.content || '',
          sender: msg.users || { first_name: 'Mitglied', last_name: '', photo_url: '/avatar_ghost.jpg' },
          created_at: msg.created_at,
          read_by: msg.read_by || [],
          bandName: msg.bands?.name
        };
      });

      const combined = [...processedSchool, ...processedBand].filter(Boolean).sort(
        (a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      
      setStudentMessages(combined);
    } catch (err) {
      console.error('[StudentMessagesBackground] Error:', err);
    }
  }, [supabase, setStudentMessages]);

  const fetchStudentMessages = useCallback(async () => {
    if (!user || user.role !== 'student' || !user.school_id) return;
    setStudentMessagesLoading(true);
    const bandIds = userBands.map((b: any) => b.id);
    await fetchStudentMessagesBackground(user.school_id, user.id, bandIds);
    setStudentMessagesLoading(false);
  }, [user, userBands, fetchStudentMessagesBackground, setStudentMessagesLoading]);

  const fetchCampusMessages = useCallback(async () => {
    const uid = typeof window !== 'undefined' ? (sessionStorage.getItem('groovelab_selected_student_id') || sessionStorage.getItem('groovelab_user_id') || (user?.id)) : user?.id;
    if (!uid) return;
    setCampusMessagesLoading(true);
    try {
      let groupFilter = '';
      const groupLastReadMap = getLocalGroupReads(uid);
      const channelLastReadMap = getLocalChannelReads(uid);
      const groupDefaultChannelMap = new Map<string, string>();

      const effectiveSchoolId = user?.school_id || (Array.isArray(user?.schools) ? user?.schools[0]?.id : user?.schools?.id);

      try {
        let channelsQuery = supabase
          .from('campus_chat_channels')
          .select('id, group_id, is_default');
        if (effectiveSchoolId) {
          channelsQuery = channelsQuery.eq('school_id', effectiveSchoolId);
        }

        const [memberGroupsRes, createdGroupsRes, channelReadsRes, channelsRes] = await Promise.all([
          supabase
            .from('campus_chat_group_members')
            .select('group_id, last_read_at')
            .eq('user_id', uid),
          supabase
            .from('campus_chat_groups')
            .select('id')
            .eq('creator_id', uid)
            .eq('is_archived', false),
          supabase
            .from('campus_chat_channel_reads')
            .select('channel_id, last_read_at')
            .eq('user_id', uid),
          channelsQuery
        ]);

        const allGIds = new Set<string>();

        if (channelsRes.data && channelsRes.data.length > 0) {
          channelsRes.data.forEach((ch: any) => {
            if (ch.group_id && ch.is_default) {
              groupDefaultChannelMap.set(ch.group_id, ch.id);
            }
          });
        }

        if (memberGroupsRes.data && memberGroupsRes.data.length > 0) {
          memberGroupsRes.data.forEach((gm: any) => {
            if (gm.group_id) {
              allGIds.add(gm.group_id);
              if (gm.last_read_at) {
                const dbTime = new Date(gm.last_read_at).getTime();
                const existing = groupLastReadMap.get(gm.group_id) || 0;
                groupLastReadMap.set(gm.group_id, Math.max(dbTime, existing));
              }
            }
          });
        }

        if (createdGroupsRes.data && createdGroupsRes.data.length > 0) {
          createdGroupsRes.data.forEach((cg: any) => {
            if (cg.id) {
              allGIds.add(cg.id);
            }
          });
        }

        if (allGIds.size > 0) {
          groupFilter = `,group_id.in.(${Array.from(allGIds).join(',')})`;
        }

        if (channelReadsRes.data && channelReadsRes.data.length > 0) {
          channelReadsRes.data.forEach((cr: any) => {
            if (cr.channel_id && cr.last_read_at) {
              const dbTime = new Date(cr.last_read_at).getTime();
              const existing = channelLastReadMap.get(cr.channel_id) || 0;
              channelLastReadMap.set(cr.channel_id, Math.max(dbTime, existing));
            }
          });
        }
      } catch (grpErr) {
        // fail-safe fallback if table not yet migrated
      }

      const { data, error } = await supabase
        .from('campus_direct_messages')
        .select('*')
        .or(`sender_id.eq.${uid},recipient_id.eq.${uid}${groupFilter}`)
        .order('created_at', { ascending: false })
        .limit(300);
      if (error) throw error;
      if (data) {
        const directLastReadMap = getLocalDirectReads(uid);
        const readMsgIds = getLocalReadMsgIds(uid);

        // Reverse to maintain chronological order (oldest to newest) for downstream rendering
        const chronologicalData = data.slice().reverse();

        // 🛡️ Sanitize incoming messages with local persistence (Offline-First / Zero-Bounce)
        const sanitizedData = chronologicalData.map((m: any) => {
          if (m.is_read) return m;
          if (readMsgIds.has(m.id)) {
            return { ...m, is_read: true };
          }
          if (!m.group_id && m.recipient_id === uid && m.sender_id) {
            const partnerLastRead = directLastReadMap.get(m.sender_id) || 0;
            if (partnerLastRead > 0 && new Date(m.created_at).getTime() <= partnerLastRead) {
              return { ...m, is_read: true };
            }
          }
          return m;
        });

        // 🛡️ SEC-24: Authoritative 1% Cryptographic Message Vault Decryption (L1 Fast-Path Cache)
        const resolvedSchoolId = effectiveSchoolId || data[0]?.school_id;
        const decryptedData = await decryptMessagesBatch(sanitizedData, resolvedSchoolId);

        setCampusMessages(decryptedData);
        
        // 1. Unread direct (1:1) messages
        const directUnread = sanitizedData.filter((m: any) => !m.group_id && m.recipient_id === uid && !m.is_read).length;

        // 2. Unread group channel messages (Goldstandard: channel_reads prioritized with default channel fallback)
        const groupUnread = sanitizedData.filter((m: any) => {
          if (!m.group_id || m.sender_id === uid) return false;
          if (m.is_read || readMsgIds.has(m.id)) return false;
          const msgTime = new Date(m.created_at).getTime();
          const effectiveChannelId = m.channel_id || groupDefaultChannelMap.get(m.group_id);
          const chanLastRead = effectiveChannelId && channelLastReadMap.has(effectiveChannelId) ? (channelLastReadMap.get(effectiveChannelId) || 0) : 0;
          const grpLastRead = groupLastReadMap.get(m.group_id) || 0;
          const maxReadTime = Math.max(chanLastRead, grpLastRead);
          if (maxReadTime > 0) {
            return msgTime > maxReadTime;
          }
          return true;
        }).length;

        setCampusUnreadCount(directUnread + groupUnread);
      }
    } catch (err) {
      console.error('Error fetching campus messages:', err);
    } finally {
      setCampusMessagesLoading(false);
    }
  }, [user?.id, user?.school_id, supabase, setCampusMessages, setCampusUnreadCount, setCampusMessagesLoading]);

  const fetchCampusMessagesTimeoutRef = useRef<any>(null);
  const debouncedFetchCampusMessages = useCallback(() => {
    if (fetchCampusMessagesTimeoutRef.current) {
      clearTimeout(fetchCampusMessagesTimeoutRef.current);
    }
    fetchCampusMessagesTimeoutRef.current = setTimeout(() => {
      fetchCampusMessages();
    }, 250);
  }, [fetchCampusMessages]);

  return {
    fetchPlanningData,
    toggleSlot,
    checkAnnouncements,
    fetchAnnouncements,
    fetchStudentMessagesBackground,
    fetchStudentMessages,
    fetchCampusMessages,
    debouncedFetchCampusMessages
  };
}
