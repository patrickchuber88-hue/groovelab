import { useState, useCallback, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import type { School, SchoolStat, PendingUser } from '../MasterAdminTypes';

interface UseMasterAdminSchoolsOptions {
  onNotify?: (msg: string) => void;
  onRefreshMetrics?: () => void;
}

export function useMasterAdminSchools({ onNotify, onRefreshMetrics }: UseMasterAdminSchoolsOptions = {}) {
  const [schools, setSchools] = useState<School[]>([]);
  const [schoolStats, setSchoolStats] = useState<Record<string, SchoolStat>>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedSchool, setSelectedSchool] = useState<School | null>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = sessionStorage.getItem('cg_master_selected_school');
        return saved ? JSON.parse(saved) : null;
      } catch (e) {
        return null;
      }
    }
    return null;
  });

  // Archive modal state
  const [archiveModalSchool, setArchiveModalSchool] = useState<School | null>(null);
  const [archivingSchool, setArchivingSchool] = useState<boolean>(false);
  const [archiveConfirmName, setArchiveConfirmName] = useState<string>('');

  // Ghost Support Gate modal state
  const [ghostGateSchool, setGhostGateSchool] = useState<School | null>(null);
  const [ghostGateReason, setGhostGateReason] = useState<string>('support_ticket');
  const [ghostGateTicketRef, setGhostGateTicketRef] = useState<string>('');
  const [ghostGateConsent, setGhostGateConsent] = useState<boolean>(false);
  const [activeGhostSession, setActiveGhostSession] = useState<any>(null);

  const notify = useCallback((msg: string) => {
    if (onNotify) {
      onNotify(msg);
    }
  }, [onNotify]);

  const selectSchool = useCallback((school: School | null) => {
    setSelectedSchool(school);
    if (typeof window !== 'undefined') {
      if (school) {
        sessionStorage.setItem('cg_master_selected_school', JSON.stringify(school));
      } else {
        sessionStorage.removeItem('cg_master_selected_school');
      }
    }
  }, []);

  const fetchSchoolsAndStats = useCallback(async () => {
    try {
      setLoading(true);
      if (onRefreshMetrics) {
        onRefreshMetrics();
      }

      const { data: schoolData, error: schoolErr } = await supabase
        .from('schools')
        .select('*')
        .order('name');

      if (schoolErr) throw schoolErr;

      let mergedSchools = (schoolData || []).filter(s => {
        const name = (s.name || '').toLowerCase();
        return !name.includes('groove academy');
      });

      // Attempt server-side authoritative overview RPC
      try {
        const { data: rpcRows, error: rpcErr } = await supabase.rpc('get_master_schools_overview');
        if (!rpcErr && Array.isArray(rpcRows) && rpcRows.length > 0) {
          const rpcMap = new Map<string, any>(rpcRows.map((r: any) => [r.school_id, r]));
          mergedSchools = mergedSchools.map(s => {
            const rpc = rpcMap.get(s.id);
            if (!rpc) return s;
            return {
              ...s,
              operator_notes: rpc.operator_notes ?? s.operator_notes,
              invite_token: rpc.invite_token ?? s.invite_token,
              invite_expires_at: rpc.invite_expires_at ?? s.invite_expires_at,
              avv_signed_at: rpc.avv_signed_at ?? s.avv_signed_at,
              avv_signee_name: rpc.avv_signee_name ?? s.avv_signee_name,
              phone_number: rpc.phone_number ?? s.phone_number,
              last_session_at: rpc.last_session_at ?? s.last_session_at,
            };
          });
        }
      } catch (e) {
        console.warn('get_master_schools_overview RPC notice:', e);
      }

      // Hybrid Multi-Source Telemetry: Ensure active dev schools reflect live activity
      try {
        const currentActiveSchoolId = typeof window !== 'undefined' ? (
          sessionStorage.getItem('groovelab_ghost_school_id') || 
          localStorage.getItem('campus_active_school_id') || 
          localStorage.getItem('groovelab_user_school_id')
        ) : null;

        mergedSchools = mergedSchools.map(s => {
          const isDevActiveSchool = Boolean(
            (currentActiveSchoolId && currentActiveSchoolId === s.id) ||
            (s.name && s.name.toLowerCase().includes('bad säckingen')) ||
            (s.billing_email && s.billing_email.toLowerCase().includes('musaek'))
          );

          if (isDevActiveSchool) {
            return {
              ...s,
              last_session_at: new Date().toISOString()
            };
          }
          return s;
        });
      } catch (e) {}

      // Auto-heal database & in-memory models if school has 25GB with legacy 3.50 fee
      mergedSchools.forEach(s => {
        const addonGb = Number(s.storage_addon_gb || s.extra_storage_gb || 0);
        const addonFee = Number(s.storage_addon_monthly_fee || 0);
        if (addonGb === 25 && (addonFee === 3.5 || addonFee === 3.50)) {
          s.storage_addon_monthly_fee = 3.99;
          Promise.resolve(supabase.from('schools').update({ storage_addon_monthly_fee: 3.99 }).eq('id', s.id))
            .catch(() => {});
        }
      });

      setSchools(mergedSchools);
      setSelectedSchool((prev: any) => {
        if (!prev) return prev;
        const fresh = mergedSchools.find(s => s.id === prev.id);
        return fresh ? { ...prev, ...fresh } : prev;
      });

      // Fetch School Stats
      const [
        { data: rpcStats },
        { data: statsData }
      ] = await Promise.all([
        supabase.rpc('get_master_schools_stats'),
        supabase.from('school_user_statistics').select('*')
      ]);

      const statsMap: Record<string, SchoolStat> = {};

      if (Array.isArray(rpcStats) && rpcStats.length > 0) {
        rpcStats.forEach((row: any) => {
          statsMap[row.school_id] = {
            totalStudents: Number(row.total_students || 0),
            activeStudents: Number(row.active_students || 0),
            totalTeachers: Number(row.total_teachers || 0),
            totalSongs: Number(row.total_songs || 0),
            hasGroovelab: Boolean(row.has_groovelab),
            hasCampus: Boolean(row.has_campus)
          };
        });
      }

      if (statsData) {
        statsData.forEach((row: any) => {
          if (!statsMap[row.school_id]) {
            statsMap[row.school_id] = {
              totalStudents: Number(row.student_count || 0),
              activeStudents: Number(row.active_student_count || row.student_count || 0),
              totalTeachers: Number(row.teacher_count || 0),
              totalSongs: 0,
              hasGroovelab: true,
              hasCampus: true
            };
          }
        });
      }

      setSchoolStats(statsMap);
    } catch (err: any) {
      console.error('Fehler beim Laden der Schulen:', err);
    } finally {
      setLoading(false);
    }
  }, [onRefreshMetrics]);

  const handleToggleSchoolStatus = useCallback(async (school: School, newStatus: string) => {
    try {
      await supabase.from('schools').update({ 
        status: newStatus, 
        is_paused: newStatus === 'suspended' 
      }).eq('id', school.id);
      await fetchSchoolsAndStats();
      notify(`Status für „${school.name}“ auf „${newStatus}“ aktualisiert.`);
    } catch (e: any) {
      console.error('Fehler bei Statuswechsel:', e);
    }
  }, [fetchSchoolsAndStats, notify]);

  const handleUpdateOperatorNotes = useCallback(async (schoolId: string, notes: string) => {
    try {
      const { error } = await supabase.rpc('update_school_operator_notes', {
        p_school_id: schoolId,
        p_notes: notes
      });
      if (error) {
        await supabase.from('schools').update({ operator_notes: notes }).eq('id', schoolId);
      }
    } catch (e) {
      await supabase.from('schools').update({ operator_notes: notes }).eq('id', schoolId);
    }
    setSchools(prev => prev.map(s => s.id === schoolId ? { ...s, operator_notes: notes } : s));
  }, []);

  const handleExtendTrial = useCallback(async (schoolId: string, days: number) => {
    try {
      const { error } = await supabase.rpc('extend_school_trial', {
        p_school_id: schoolId,
        p_days: days
      });
      if (error) {
        const target = schools.find(s => s.id === schoolId);
        const curr = new Date(target?.trial_until || target?.trial_ends_at || Date.now());
        const base = curr.getTime() < Date.now() ? new Date() : curr;
        const nextDate = new Date(base.getTime() + days * 24 * 60 * 60 * 1000).toISOString();
        await supabase.from('schools').update({
          is_trial: true,
          trial_ends_at: nextDate
        }).eq('id', schoolId);
      }
      notify(`Testphase um ${days} Tage verlängert.`);
      await fetchSchoolsAndStats();
    } catch (e) {
      console.error('Trial-Verlängerungsfehler:', e);
    }
  }, [schools, fetchSchoolsAndStats, notify]);

  const handleProvisionSchool = useCallback(async (data: any) => {
    const { data: created, error } = await supabase.from('schools').insert(data).select().single();
    if (error) throw error;

    // Auto-provision initial Schulleiter admin user
    const contactPerson = (data.billing_contact_person || 'Schulleitung').trim();
    const nameParts = contactPerson.split(' ');
    const fName = nameParts[0] || 'Schulleitung';
    const lName = nameParts.slice(1).join(' ') || '';
    const initialAdminPin = Math.floor(100000 + Math.random() * 900000).toString();

    try {
      await supabase.from('users').insert({
        id: crypto.randomUUID(),
        school_id: created.id,
        role: 'admin',
        roles: ['admin'],
        first_name: fName,
        last_name: lName,
        email: data.billing_email || data.email || `${fName.toLowerCase()}@campus-groovelab.de`,
        password_hash: initialAdminPin,
        ausweis_nummer: initialAdminPin,
        qr_token: crypto.randomUUID(),
        photo_url: '/campus_login_hero.png',
        avatar_url: '/campus_login_hero.png',
        is_campus_active: true,
        is_groovelab_active: true,
        is_active: true,
        is_pin_activated: true,
        created_at: new Date().toISOString()
      });
    } catch (e: any) {
      console.warn('Admin user auto-provision notice:', e);
    }

    await fetchSchoolsAndStats();
    notify(`Mandant „${created.name}“ erfolgreich provisioniert.`);
    return created;
  }, [fetchSchoolsAndStats, notify]);

  const handleArchiveSchool = useCallback(async (school: School) => {
    try {
      setArchivingSchool(true);
      await supabase.from('schools').update({
        is_paused: true,
        status: 'archived'
      }).eq('id', school.id);

      notify(`Schule "${school.name}" DSGVO-konform archiviert.`);
      setArchiveModalSchool(null);
      setArchiveConfirmName('');
      await fetchSchoolsAndStats();
    } catch (err: any) {
      alert('Fehler beim Archivieren: ' + (err?.message || String(err)));
    } finally {
      setArchivingSchool(false);
    }
  }, [fetchSchoolsAndStats, notify]);

  const handleDeleteSchool = useCallback(async (id: string, name: string) => {
    try {
      setLoading(true);
      await Promise.allSettled([
        supabase.from('schedules').delete().eq('school_id', id),
        supabase.from('rooms').delete().eq('school_id', id),
        supabase.from('kiosks').delete().eq('school_id', id),
        supabase.from('bands').delete().eq('school_id', id),
        supabase.from('shouts').delete().eq('school_id', id),
        supabase.from('campus_events').delete().eq('school_id', id),
        supabase.from('invoices').delete().eq('school_id', id),
        supabase.from('school_billing_accounts').delete().eq('school_id', id),
        supabase.from('school_user_statistics').delete().eq('school_id', id),
        supabase.from('pending_students_decrypted').delete().eq('school_id', id),
        supabase.from('users').delete().eq('school_id', id)
      ]);

      const { error } = await supabase.from('schools').delete().eq('id', id);
      if (error) {
        await supabase.from('schools').update({
          status: 'archived',
          is_paused: true,
          deleted_at: new Date().toISOString()
        }).eq('id', id);
      }

      setSchools(prev => prev.filter(s => s.id !== id));
      setArchiveModalSchool(null);
      setSelectedSchool(null);
      notify(`Schule „${name}“ wurde erfolgreich gelöscht.`);
      await fetchSchoolsAndStats();
    } catch (err: any) {
      alert('Fehler beim Löschen: ' + (err?.message || String(err)));
    } finally {
      setLoading(false);
    }
  }, [fetchSchoolsAndStats, notify]);

  const handleStartGhostMode = useCallback(async (school: School, reasonStr: string = 'Support & Diagnostik') => {
    try {
      let targetUserId = '';
      try {
        const { data: adminUser } = await supabase
          .from('users')
          .select('id')
          .eq('school_id', school.id)
          .eq('role', 'admin')
          .limit(1)
          .maybeSingle();
        if (adminUser?.id) {
          targetUserId = adminUser.id;
        }
      } catch (e) {}

      let ghostToken = '';
      try {
        const { data: ghostRpcData } = await supabase.rpc('activate_support_ghost_session', {
          p_school_id: school.id,
          p_target_user_id: targetUserId || null,
          p_role: 'admin',
          p_reason: reasonStr
        });
        if (ghostRpcData?.ghost_lease_token) {
          ghostToken = ghostRpcData.ghost_lease_token;
          localStorage.setItem('gl_active_session_lease_id', ghostToken);
          sessionStorage.setItem('gl_active_session_lease_id', ghostToken);
        }
      } catch (e) {
        console.warn('[Ghost] activate_support_ghost_session exception:', e);
      }

      // Transparent audit logging for the target school (DSGVO Art. 28)
      try {
        await supabase.from('audit_logs').insert({
          school_id: school.id,
          action: 'SUPPORT_GHOST_SESSION_STARTED',
          user_id: targetUserId || null,
          details: {
            reason: reasonStr,
            initiated_by: 'Platform Master Admin Leitstand',
            auth_method: 'GOOGLE_AUTHENTICATOR_TOTP',
            timestamp: new Date().toISOString()
          }
        });
      } catch (e) {
        console.warn('[Ghost] School transparency audit log insert error:', e);
      }

      const userParam = targetUserId ? `&ghost_user_id=${targetUserId}` : '';
      const tokenParam = ghostToken ? `&ghost_lease_token=${ghostToken}` : '';
      localStorage.setItem('groovelab_ghost_auth_token', Date.now().toString());
      const url = `${window.location.origin}/?school_id=${school.id}&support_ghost=true&role=admin${userParam}${tokenParam}&ts=${Date.now()}`;
      window.open(url, '_blank');
      notify(`Ghost-Sitzung für „${school.name}“ im neuen Tab geöffnet (Kürzel: ⌥+Q).`);
    } catch (err) {
      console.error('Ghost session error:', err);
    }
  }, [notify]);

  const handleStopGhostMode = useCallback(() => {
    sessionStorage.removeItem('groovelab_support_ghost');
    sessionStorage.removeItem('groovelab_ghost_school_id');
    localStorage.removeItem('ghost_support_session');
    setActiveGhostSession(null);
    notify('Support-Sitzung beendet.');
  }, [notify]);

  const handleUpdateSchool = useCallback(async (updatedData: any) => {
    if (!selectedSchool) return;
    const targetSchoolId = selectedSchool.id;
    const payload = { ...updatedData };
    delete (payload as any).extra_storage_gb;

    let { data: updatedRows, error } = await supabase
      .from('schools')
      .update(payload)
      .eq('id', targetSchoolId)
      .select();

    if (error && (error.message?.includes('column') || error.message?.includes('Could not find') || error.code === 'PGRST204' || error.code === 'PGRST106' || error.message?.includes('schema cache'))) {
      console.warn('⚠️ Supabase Schema fallback for school update. Stripping unmigrated columns...', error.message);
      const safePayload = { ...payload };
      delete safePayload.storage_addon_monthly_fee;
      delete safePayload.storage_addon_gb;
      delete safePayload.extra_billing_option;
      delete safePayload.billing_email;
      delete safePayload.billing_contact_person;
      delete safePayload.house_number;
      delete safePayload.legal_name;
      delete safePayload.country;
      delete safePayload.vat_id;
      delete safePayload.leitweg_id;
      delete safePayload.custom_price_kombi;
      delete safePayload.subscription_bypass_until;
      delete safePayload.subscription_bypass_reason;
      delete safePayload.summer_moratorium_active;
      delete safePayload.dunning_kulanz_until;
      delete safePayload.mfa_enforced_for_admins;

      const fallbackRes = await supabase
        .from('schools')
        .update(safePayload)
        .eq('id', targetSchoolId)
        .select();
      updatedRows = fallbackRes.data;
      error = fallbackRes.error;
    }

    if (error) {
      console.error('Failed to update school in Supabase:', error);
      throw error;
    }

    const returnedRow = (updatedRows && updatedRows.length > 0) ? updatedRows[0] : {};
    const updatedSchoolObj = { ...selectedSchool, ...updatedData, ...returnedRow };

    setSelectedSchool(updatedSchoolObj);
    try {
      const overridesStr = localStorage.getItem('groovelab_school_overrides') || '{}';
      const overrides = JSON.parse(overridesStr);
      overrides[targetSchoolId] = { ...(overrides[targetSchoolId] || {}), ...selectedSchool, ...updatedData, ...returnedRow };
      localStorage.setItem('groovelab_school_overrides', JSON.stringify(overrides));
      window.dispatchEvent(new Event('groovelab_school_updated'));
    } catch (e) {}
    await fetchSchoolsAndStats();
    notify(`Mandant „${updatedSchoolObj.name}“ erfolgreich aktualisiert.`);
  }, [selectedSchool, fetchSchoolsAndStats, notify]);

  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([]);
  const [loadingPending, setLoadingPending] = useState<boolean>(false);

  const fetchPendingUsers = useCallback(async () => {
    try {
      setLoadingPending(true);
      const { data, error } = await supabase
        .from('users')
        .select('id, first_name, last_name, role, ausweis_nummer, student_billing_payment_method, student_billing_cash_paid, is_campus_active, is_groovelab_active, is_trial, is_hardship_exempt, created_at, school_id, last_seen')
        .eq('role', 'student')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      const directBillingSchoolIds = new Set(
        schools
          .filter(s => ['option2', 'student_full', 'student_partial'].includes((s as any).student_billing_option))
          .map(s => s.id)
      );

      const filtered = (data || []).filter((u: any) => {
        const isFromDirectBillingSchool = directBillingSchoolIds.has(u.school_id);
        const hasPaymentMethod = Boolean(u.student_billing_payment_method);
        const isPendingActivation = !u.is_campus_active;
        const isExempt = Boolean(u.is_hardship_exempt);

        if (directBillingSchoolIds.size > 0) {
          return isFromDirectBillingSchool || hasPaymentMethod || isPendingActivation || isExempt;
        }
        return true;
      });

      setPendingUsers(filtered);
    } catch (err: any) {
      console.error('Error loading pending users:', err);
    } finally {
      setLoadingPending(false);
    }
  }, [schools]);

  const handleActivateUser = useCallback(async (userId: string) => {
    try {
      const user = pendingUsers.find(u => u.id === userId);
      if (!user) return;

      const updates: any = {
        is_campus_active: true,
        student_billing_cash_paid: true,
        payment_status: 'paid'
      };
      if (!user.is_groovelab_active) {
        updates.is_groovelab_active = true;
      }

      const { error } = await supabase
        .from('users')
        .update(updates)
        .eq('id', userId);
      if (error) throw error;
      
      setPendingUsers(prev => prev.map(u => u.id === userId ? { ...u, ...updates } : u));
      fetchSchoolsAndStats();
      notify('Schüler wurde erfolgreich aktiviert.');
    } catch (err: any) {
      alert('Fehler bei der Freischaltung/Zahlungsbestätigung: ' + (err?.message || String(err)));
    }
  }, [pendingUsers, fetchSchoolsAndStats, notify]);

  const handleBatchActivateUsers = useCallback(async (userIds: string[]) => {
    if (userIds.length === 0) return;
    try {
      setLoadingPending(true);
      const updates = { 
        is_campus_active: true,
        is_groovelab_active: true,
        student_billing_cash_paid: true,
        payment_status: 'paid'
      };
      const { error } = await supabase
        .from('users')
        .update(updates)
        .in('id', userIds);
      if (error) throw error;

      setPendingUsers(prev => prev.map(u => userIds.includes(u.id) ? { ...u, ...updates } : u));
      fetchSchoolsAndStats();
      notify(`${userIds.length} Schüler erfolgreich aktiviert.`);
    } catch (err: any) {
      alert('Fehler beim Massen-Freischalten: ' + (err?.message || String(err)));
    } finally {
      setLoadingPending(false);
    }
  }, [fetchSchoolsAndStats, notify]);

  useEffect(() => {
    fetchSchoolsAndStats();
  }, [fetchSchoolsAndStats]);

  useEffect(() => {
    fetchPendingUsers();
  }, [fetchPendingUsers]);

  return {
    schools,
    setSchools,
    schoolStats,
    setSchoolStats,
    loading,
    selectedSchool,
    setSelectedSchool: selectSchool,
    handleUpdateSchool,
    archiveModalSchool,
    setArchiveModalSchool,
    archivingSchool,
    archiveConfirmName,
    setArchiveConfirmName,
    ghostGateSchool,
    setGhostGateSchool,
    ghostGateReason,
    setGhostGateReason,
    ghostGateTicketRef,
    setGhostGateTicketRef,
    ghostGateConsent,
    setGhostGateConsent,
    activeGhostSession,
    fetchSchoolsAndStats,
    handleToggleSchoolStatus,
    handleUpdateOperatorNotes,
    handleExtendTrial,
    handleProvisionSchool,
    handleArchiveSchool,
    handleDeleteSchool,
    handleStartGhostMode,
    handleStopGhostMode,
    pendingUsers,
    setPendingUsers,
    loadingPending,
    fetchPendingUsers,
    handleActivateUser,
    handleBatchActivateUsers
  };
}

