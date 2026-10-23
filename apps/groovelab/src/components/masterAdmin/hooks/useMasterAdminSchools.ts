import { useState, useCallback, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { logApplicationAudit } from '../../../services/auditLogService';
import { aggregateSchoolMetrics } from '../../../domain/schoolMetricsAggregator';
import { ensureMasterAdminSessionLease } from '../../../utils/sessionLeaseManager';
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

      // 1 & 2 & 4. Fetch schools table, authoritative master overview RPC, users, pending students, and school stats concurrently in 1 single roundtrip
      let [
        schoolTableRes,
        overviewRpcRes,
        rpcStatsRes,
        statsTableRes,
        usersRes,
        pendingStudentsRes
      ] = await Promise.all([
        Promise.resolve(supabase.from('schools').select('*').order('name')).catch((err) => {
          console.warn('Direct schools table query notice:', err);
          return { data: null, error: err };
        }),
        Promise.resolve(supabase.rpc('get_master_schools_overview')).catch((e) => {
          console.warn('get_master_schools_overview RPC notice:', e);
          return { data: null, error: e };
        }),
        Promise.resolve(supabase.rpc('get_master_school_stats')).catch(() => ({ data: null })),
        Promise.resolve(supabase.from('school_user_statistics').select('*')).catch(() => ({ data: null })),
        Promise.resolve(
          supabase
            .from('users')
            .select('id, school_id, role, roles, first_name, last_name, email, is_active, is_campus_active, is_groovelab_active, is_trial, student_billing_payment_method, student_billing_cash_paid, exempt_from_direct_billing')
        ).catch(() => ({ data: null })),
        Promise.resolve(supabase.from('pending_students_decrypted').select('id, school_id, first_name, last_name')).catch(() => ({ data: null }))
      ]);

      let tableSchools: School[] = (!schoolTableRes.error && Array.isArray(schoolTableRes.data)) ? schoolTableRes.data : [];
      let rpcRows: any[] = (!overviewRpcRes.error && Array.isArray(overviewRpcRes.data) && overviewRpcRes.data.length > 0) ? overviewRpcRes.data : [];

      // 🛡️ Self-Healing Master Admin Session Lease Bootstrap
      // If table query and RPC both returned 0 rows, ensure an authoritative lease token exists and retry once
      if (tableSchools.length === 0 && rpcRows.length === 0) {
        console.log('[useMasterAdminSchools] 0 schools returned. Initiating ensureMasterAdminSessionLease bootstrap...');
        const healedToken = await ensureMasterAdminSessionLease();
        if (healedToken) {
          const [retryTable, retryRpc] = await Promise.all([
            Promise.resolve(supabase.from('schools').select('*').order('name')).catch(() => ({ data: null, error: true })),
            Promise.resolve(supabase.rpc('get_master_schools_overview')).catch(() => ({ data: null, error: true }))
          ]);
          if (!retryTable.error && Array.isArray(retryTable.data) && retryTable.data.length > 0) {
            tableSchools = retryTable.data;
          }
          if (!retryRpc.error && Array.isArray(retryRpc.data) && retryRpc.data.length > 0) {
            rpcRows = retryRpc.data;
          }
        }

        // Resilient Fallback 3: search_public_schools RPC
        if (tableSchools.length === 0 && rpcRows.length === 0) {
          try {
            const { data: publicSchools } = await supabase.rpc('search_public_schools', { p_query: '' });
            if (Array.isArray(publicSchools) && publicSchools.length > 0) {
              tableSchools = publicSchools as any[];
            }
          } catch (pubErr) {
            console.warn('[useMasterAdminSchools] search_public_schools fallback notice:', pubErr);
          }
        }
      }

      // 3. Union Map: Unify all schools across both sources so zero schools are dropped
      const schoolMap = new Map<string, School>();

      // Index table schools first
      for (const s of tableSchools) {
        if (s && s.id) {
          schoolMap.set(s.id, { ...s });
        }
      }

      // Merge / Inject RPC schools (Authoritative Master Ingestion)
      for (const rpc of rpcRows) {
        if (!rpc || !rpc.school_id) continue;
        const existing = schoolMap.get(rpc.school_id);
        if (existing) {
          schoolMap.set(rpc.school_id, {
            ...existing,
            name: rpc.name || existing.name,
            legal_name: rpc.legal_name ?? existing.legal_name,
            zip_code: rpc.zip_code ?? existing.zip_code,
            city: rpc.city ?? existing.city,
            street: rpc.street ?? existing.street,
            house_number: rpc.house_number ?? existing.house_number,
            phone_number: rpc.phone_number ?? existing.phone_number,
            billing_email: rpc.billing_email ?? existing.billing_email,
            billing_contact_person: rpc.billing_contact_person ?? existing.billing_contact_person,
            status: rpc.status ?? existing.status,
            is_trial: rpc.is_trial ?? existing.is_trial,
            trial_ends_at: rpc.trial_until ?? existing.trial_ends_at,
            has_campus_subscription: rpc.has_campus_subscription ?? existing.has_campus_subscription,
            has_groovelab_subscription: rpc.has_groovelab_subscription ?? existing.has_groovelab_subscription,
            is_paused: rpc.is_paused ?? existing.is_paused,
            subscription_bypass: rpc.subscription_bypass ?? existing.subscription_bypass,
            is_billing_booked: rpc.is_billing_booked ?? existing.is_billing_booked ?? false,
            contract_start_date: rpc.contract_start_date ?? existing.contract_start_date ?? null,
            storage_addon_gb: (() => {
              let gb = Math.max(Number(rpc.storage_addon_gb || 0), Number(existing.storage_addon_gb || 0));
              if (gb === 0 && ((rpc as any).extra_billing_option === 'option1' || (existing as any).extra_billing_option === 'option1')) gb = 25;
              if (gb === 0 && typeof window !== 'undefined') {
                try {
                  const localGb = localStorage.getItem(`groovelab_storage_addon_gb_${rpc.school_id}`) || localStorage.getItem(`campus_storage_addon_gb_${rpc.school_id}`);
                  if (localGb) gb = Math.max(gb, Number(localGb));
                } catch {}
              }
              return gb;
            })(),
            storage_addon_monthly_fee: (() => {
              let fee = Math.max(Number(rpc.storage_addon_monthly_fee || 0), Number(existing.storage_addon_monthly_fee || 0));
              const gb = Math.max(Number(rpc.storage_addon_gb || 0), Number(existing.storage_addon_gb || 0));
              if (fee === 0 && gb >= 25) fee = 4.90;
              else if (fee === 0 && gb === 10) fee = 2.90;
              return fee;
            })(),
            created_at: rpc.created_at ?? existing.created_at,
            operator_notes: rpc.operator_notes ?? existing.operator_notes,
            invite_token: rpc.invite_token ?? existing.invite_token,
            invite_expires_at: rpc.invite_expires_at ?? existing.invite_expires_at,
            avv_signed_at: rpc.avv_signed_at ?? existing.avv_signed_at,
            avv_signee_name: rpc.avv_signee_name ?? existing.avv_signee_name,
            last_session_at: rpc.last_session_at ?? existing.last_session_at,
            active_students_count: Number(rpc.campus_active_students || rpc.total_students || existing.active_students_count || 0),
            teachers_count: Number(rpc.teacher_count || existing.teachers_count || 0),
          });
        } else {
          // School was blocked by Table RLS or only exists in Master Overview: Add it directly!
          schoolMap.set(rpc.school_id, {
            id: rpc.school_id,
            name: rpc.name || 'Unbenannte Schule',
            legal_name: rpc.legal_name || null,
            zip_code: rpc.zip_code || null,
            city: rpc.city || null,
            street: rpc.street || null,
            house_number: rpc.house_number || null,
            phone_number: rpc.phone_number || null,
            billing_email: rpc.billing_email || null,
            billing_contact_person: rpc.billing_contact_person || null,
            status: rpc.status || 'active',
            is_trial: Boolean(rpc.is_trial),
            trial_ends_at: rpc.trial_until || null,
            has_campus_subscription: Boolean(rpc.has_campus_subscription),
            has_groovelab_subscription: Boolean(rpc.has_groovelab_subscription),
            is_paused: Boolean(rpc.is_paused),
            subscription_bypass: Boolean(rpc.subscription_bypass),
            is_billing_booked: Boolean(rpc.is_billing_booked),
            contract_start_date: rpc.contract_start_date || null,
            storage_addon_gb: (() => {
              let gb = Number(rpc.storage_addon_gb || 0);
              if (gb === 0 && (rpc as any).extra_billing_option === 'option1') gb = 25;
              if (gb === 0 && typeof window !== 'undefined') {
                try {
                  const localGb = localStorage.getItem(`groovelab_storage_addon_gb_${rpc.school_id}`) || localStorage.getItem(`campus_storage_addon_gb_${rpc.school_id}`);
                  if (localGb) gb = Math.max(gb, Number(localGb));
                } catch {}
              }
              return gb;
            })(),
            storage_addon_monthly_fee: (() => {
              let fee = Number(rpc.storage_addon_monthly_fee || 0);
              const gb = Number(rpc.storage_addon_gb || 0);
              if (fee === 0 && gb >= 25) fee = 4.90;
              else if (fee === 0 && gb === 10) fee = 2.90;
              return fee;
            })(),
            created_at: rpc.created_at || new Date().toISOString(),
            operator_notes: rpc.operator_notes || null,
            invite_token: rpc.invite_token || null,
            invite_expires_at: rpc.invite_expires_at || null,
            avv_signed_at: rpc.avv_signed_at || null,
            avv_signee_name: rpc.avv_signee_name || null,
            last_session_at: rpc.last_session_at || null,
            primary_color: '#34a853',
            logo_url: null,
            active_students_count: Number(rpc.campus_active_students || rpc.total_students || 0),
            teachers_count: Number(rpc.teacher_count || 0),
          });
        }
      }

      const mergedSchools = Array.from(schoolMap.values()).sort((a, b) => (a.name || '').localeCompare(b.name || ''));

      setSchools(mergedSchools);
      setSelectedSchool((prev: any) => {
        if (!prev) return prev;
        const fresh = mergedSchools.find(s => s.id === prev.id);
        return fresh ? { ...prev, ...fresh } : prev;
      });

      const rpcStats = Array.isArray(rpcStatsRes?.data) ? rpcStatsRes.data : [];
      const statsData = Array.isArray(statsTableRes?.data) ? statsTableRes.data : [];
      const allUsers = Array.isArray(usersRes?.data) ? usersRes.data : [];
      const pendingStudents = Array.isArray(pendingStudentsRes?.data) ? pendingStudentsRes.data : [];

      const rpcBySchool = new Map<string, any>();
      rpcStats.forEach((row: any) => {
        if (row?.school_id) rpcBySchool.set(row.school_id, row);
      });
      const statTableBySchool = new Map<string, any>();
      statsData.forEach((row: any) => {
        if (row?.school_id) statTableBySchool.set(row.school_id, row);
      });
      const usersBySchool = new Map<string, any[]>();
      allUsers.forEach((u: any) => {
        if (!u?.school_id) return;
        const arr = usersBySchool.get(u.school_id);
        if (arr) arr.push(u); else usersBySchool.set(u.school_id, [u]);
      });
      const pendingBySchool = new Map<string, any[]>();
      pendingStudents.forEach((p: any) => {
        if (!p?.school_id) return;
        const arr = pendingBySchool.get(p.school_id);
        if (arr) arr.push(p); else pendingBySchool.set(p.school_id, [p]);
      });

      const statsMap: Record<string, SchoolStat> = {};

      mergedSchools.forEach(s => {
        const agg = aggregateSchoolMetrics(
          s,
          usersBySchool.get(s.id) || [],
          pendingBySchool.get(s.id) || []
        );
        const rpcRow = rpcBySchool.get(s.id);
        const statRow = statTableBySchool.get(s.id);

        const hasLiveUserRows = (usersBySchool.get(s.id)?.length || 0) > 0 || (pendingBySchool.get(s.id)?.length || 0) > 0;
        const teachersCount = hasLiveUserRows
          ? agg.activeTeachers
          : Number(rpcRow?.total_teachers ?? statRow?.teacher_count ?? s.teachers_count ?? 0);
        const totalTeachersCount = hasLiveUserRows
          ? agg.totalTeachers
          : teachersCount;
        const totalStudentsCount = hasLiveUserRows
          ? agg.totalStudents
          : Number(rpcRow?.total_students ?? statRow?.student_count ?? s.active_students_count ?? 0);
        const campusCount = hasLiveUserRows
          ? agg.campusStudents
          : Number(rpcRow?.active_students ?? statRow?.active_student_count ?? s.active_students_count ?? 0);
        const groovelabCount = hasLiveUserRows ? agg.groovelabStudents : 0;
        const activeCount = Math.max(campusCount, groovelabCount);
        const passiveCount = Math.max(0, totalStudentsCount - activeCount);

        statsMap[s.id] = {
          totalStudents: totalStudentsCount,
          activeStudents: activeCount,
          totalTeachers: totalTeachersCount,
          totalSongs: Number(rpcRow?.total_songs || 0),
          hasGroovelab: Boolean(s.has_groovelab_subscription ?? rpcRow?.has_groovelab),
          hasCampus: Boolean(s.has_campus_subscription ?? rpcRow?.has_campus),
          teachers: teachersCount,
          students: totalStudentsCount,
          studentsCampus: campusCount,
          studentsGroovelab: groovelabCount,
          passiveStudents: passiveCount,
          exemptActiveStudents: agg.exemptActiveStudents || 0,
          parentPaidStudents: agg.parentPaidStudents || 0
        };
      });

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

  const handleProvisionSchool = useCallback(async (data: Record<string, unknown>) => {
    const nameStr = String(data?.name || '').trim();
    const streetStr = String(data?.street || '').trim();
    const houseStr = String(data?.house_number || '').trim();
    const zipStr = String(data?.zip_code || '').trim();
    const cityStr = String(data?.city || '').trim();
    const emailStr = String(data?.billing_email || data?.email || '').trim();

    if (!nameStr || !streetStr || !houseStr || !zipStr || !cityStr || !emailStr) {
      throw new Error('MANDATORY_FIELD_MISSING: Die Musikschule kann nicht angelegt werden. Name, Straße, Hausnummer, PLZ, Ort und E-Mail sind zwingend erforderlich.');
    }
    const { data: created, error } = await supabase.from('schools').insert(data).select().single();
    if (error) throw error;

    // Auto-provision initial Schulleiter admin user with CSPRNG PIN
    const contactPerson = String(data.billing_contact_person || 'Schulleitung').trim();
    const nameParts = contactPerson.split(' ');
    const fName = nameParts[0] || 'Schulleitung';
    const lName = nameParts.slice(1).join(' ') || '';
    const randBuf = new Uint32Array(1);
    window.crypto.getRandomValues(randBuf);
    const initialAdminPin = (100000 + (randBuf[0] % 900000)).toString();

    try {
      await supabase.from('users').insert({
        id: crypto.randomUUID(),
        school_id: created.id,
        role: 'admin',
        roles: ['admin'],
        first_name: fName,
        last_name: lName,
        email: emailStr || `${fName.toLowerCase()}@campus-groovelab.de`,
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
    } catch (e: unknown) {
      console.warn('Admin user auto-provision notice:', e);
    }

    await fetchSchoolsAndStats();
    notify(`Mandant „${created.name}“ erfolgreich provisioniert.`);
    return { ...created, initialAdminPin };
  }, [fetchSchoolsAndStats, notify]);

  const handleArchiveSchool = useCallback(async (school: School) => {
    try {
      setArchivingSchool(true);
      await ensureMasterAdminSessionLease();

      const { data, error } = await supabase.rpc('delete_school_cascade', {
        p_school_id: school.id,
        p_archive_only: true
      });

      if (error) {
        throw error;
      }

      const result = data as { success?: boolean; message?: string; error?: string } | null;
      if (result && result.success === false) {
        throw new Error(result.message || result.error || 'Server verweigerte die Archivierung.');
      }

      notify(result?.message || `Schule „${school.name}“ wurde DSGVO-bereinigt und GoBD-konform archiviert.`);
      setArchiveModalSchool(null);
      setArchiveConfirmName('');
      await fetchSchoolsAndStats();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('[useMasterAdminSchools] handleArchiveSchool error:', err);
      alert('Fehler beim Archivieren: ' + msg);
      notify(`Fehler beim Archivieren: ${msg}`);
    } finally {
      setArchivingSchool(false);
    }
  }, [fetchSchoolsAndStats, notify]);

  const handleDeleteSchool = useCallback(async (id: string, name: string, hasInvoices: boolean = false) => {
    try {
      setLoading(true);

      // 🛡️ Zero-Trust Lease Assurance
      await ensureMasterAdminSessionLease();

      // 🛡️ Authoritative Server-Side Cascade RPC (OWASP ASVS L3 / GoBD § 147 AO / DSGVO Art. 17)
      const { data, error } = await supabase.rpc('delete_school_cascade', {
        p_school_id: id,
        p_archive_only: hasInvoices
      });

      if (error) {
        throw error;
      }

      const result = data as { success?: boolean; action?: string; message?: string; error?: string } | null;
      if (result && result.success === false) {
        throw new Error(result.message || result.error || 'Server verweigerte das Löschen/Archivieren.');
      }

      if (result?.action === 'deleted') {
        setSchools(prev => prev.filter(s => s.id !== id));
        if (selectedSchool?.id === id) {
          selectSchool(null);
        }
        setArchiveModalSchool(null);
        notify(result.message || `Schule „${name}“ wurde erfolgreich vollständig gelöscht.`);
      } else {
        // 'archived'
        setSchools(prev => prev.map(s => s.id === id ? { ...s, status: 'archived', is_paused: true, is_active: false } : s));
        if (selectedSchool?.id === id) {
          selectSchool({ ...selectedSchool, status: 'archived', is_paused: true, is_active: false });
        }
        setArchiveModalSchool(null);
        notify(result?.message || `Schule „${name}“ wurde DSGVO-bereinigt und GoBD-konform archiviert.`);
      }

      await fetchSchoolsAndStats();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('[useMasterAdminSchools] handleDeleteSchool error:', err);
      alert('Fehler beim Ausführen der Aktion: ' + msg);
      notify(`Fehler: ${msg}`);
    } finally {
      setLoading(false);
    }
  }, [fetchSchoolsAndStats, notify, selectSchool, selectedSchool]);

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
      } catch {}

      const { data: ghostRpcData, error: ghostRpcError } = await supabase.rpc('activate_support_ghost_session', {
        p_school_id: school.id,
        p_target_user_id: targetUserId || null,
        p_role: 'admin',
        p_reason: reasonStr
      });

      const ghostToken = (ghostRpcData as Record<string, string> | null)?.ghost_lease_token;
      if (ghostRpcError || !ghostToken) {
        const msg = ghostRpcError?.message || 'Kein gültiges Ghost-Lease-Token vom Sicherheits-RPC erhalten (Fail-Closed).';
        notify(`Ghost-Sitzung abgelehnt: ${msg}`);
        throw new Error(`GHOST_SESSION_DENIED: ${msg}`);
      }

      localStorage.setItem('gl_active_session_lease_id', ghostToken);
      sessionStorage.setItem('gl_active_session_lease_id', ghostToken);

      try {
        await logApplicationAudit({
          schoolId: school.id,
          action: 'SUPPORT_GHOST_SESSION_STARTED',
          tableName: 'schools',
          recordId: targetUserId || school.id,
          details: {
            reason: reasonStr,
            initiated_by: 'Platform Master Admin Leitstand',
            auth_method: 'GOOGLE_AUTHENTICATOR_TOTP',
          }
        });
      } catch (e) {
        console.warn('[Ghost] School transparency audit log insert error:', e);
      }

      const userParam = targetUserId ? `&ghost_user_id=${targetUserId}` : '';
      const tokenParam = `&ghost_lease_token=${ghostToken}`;
      localStorage.setItem('groovelab_ghost_auth_token', Date.now().toString());
      const url = `${window.location.origin}/?school_id=${school.id}&support_ghost=true&role=admin${userParam}${tokenParam}&ts=${Date.now()}`;
      window.open(url, '_blank');
      notify(`Ghost-Sitzung für „${school.name}“ im neuen Tab geöffnet (Kürzel: ⌥+Q).`);
    } catch (err) {
      console.error('Ghost session error (Fail-Closed):', err);
    }
  }, [notify]);

  const handleStopGhostMode = useCallback(() => {
    sessionStorage.removeItem('groovelab_support_ghost');
    sessionStorage.removeItem('groovelab_ghost_school_id');
    localStorage.removeItem('ghost_support_session');
    setActiveGhostSession(null);
    notify('Support-Sitzung beendet.');
  }, [notify]);

  const handleUpdateSchool = useCallback(async (updatedData: Record<string, unknown>) => {
    if (!selectedSchool) return;
    const targetSchoolId = selectedSchool.id;
    const payload = { ...updatedData };
    delete payload.extra_storage_gb;

    const { data: updatedRows, error } = await supabase
      .from('schools')
      .update(payload)
      .eq('id', targetSchoolId)
      .select();

    if (error) {
      console.error('Failed to update school in Supabase:', error);
      throw error;
    }

    const returnedRow = (updatedRows && updatedRows.length > 0) ? updatedRows[0] : {};
    const updatedSchoolObj = { ...selectedSchool, ...updatedData, ...returnedRow } as School;

    setSelectedSchool(updatedSchoolObj);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('groovelab_school_updated'));
    }
    await fetchSchoolsAndStats();
    notify(`Mandant „${updatedSchoolObj.name}“ erfolgreich aktualisiert.`);
  }, [selectedSchool, fetchSchoolsAndStats, notify]);

  const [rawPendingUsers, setRawPendingUsers] = useState<PendingUser[]>([]);
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([]);
  const [loadingPending, setLoadingPending] = useState<boolean>(false);

  const fetchPendingUsers = useCallback(async () => {
    try {
      setLoadingPending(true);
      const { data, error } = await supabase
        .from('users')
        .select('id, first_name, last_name, role, ausweis_nummer, instrument, student_billing_payment_method, student_billing_cash_paid, is_campus_active, is_groovelab_active, is_trial, exempt_from_direct_billing, contract_ends_at, coach_notes, created_at, school_id, last_seen')
        .eq('role', 'student')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRawPendingUsers(data || []);
    } catch (err: any) {
      console.error('Error loading pending users:', err);
    } finally {
      setLoadingPending(false);
    }
  }, []);

  useEffect(() => {
    const directBillingSchoolIds = new Set(
      schools
        .filter(s => ['option2', 'student_full', 'student_partial'].includes((s as any).student_billing_option))
        .map(s => s.id)
    );

    const filtered = rawPendingUsers.filter((u: any) => {
      const isFromDirectBillingSchool = directBillingSchoolIds.has(u.school_id);
      const hasPaymentMethod = Boolean(u.student_billing_payment_method);
      const isExplicitlyDirectBilled = Boolean(u.is_direct_billed);
      const isExempt = Boolean(u.exempt_from_direct_billing || u.is_hardship_exempt);

      // 0,1% Goldstandard: Strikte B2B/B2C-Trennung - Keine B2B-Sammelzahler im B2C-Cockpit
      if (directBillingSchoolIds.size > 0) {
        return isFromDirectBillingSchool || isExplicitlyDirectBilled || hasPaymentMethod;
      }
      return isExplicitlyDirectBilled || hasPaymentMethod || isExempt;
    });

    setPendingUsers(filtered);
  }, [rawPendingUsers, schools]);

  const handleActivateUser = useCallback(async (userId: string) => {
    try {
      const user = pendingUsers.find(u => u.id === userId);
      if (!user) return;

      let rpcSucceeded = false;
      try {
        const { data, error } = await supabase.rpc('admin_manage_b2c_student_subscription', {
          p_student_id: userId,
          p_action: 'activate_paid'
        });
        if (!error && (data as any)?.success) {
          rpcSucceeded = true;
        }
      } catch {
        rpcSucceeded = false;
      }

      const updates: any = {
        is_campus_active: true,
        is_groovelab_active: true,
        student_billing_cash_paid: true
      };

      if (!rpcSucceeded) {
        const { error } = await supabase
          .from('users')
          .update(updates)
          .eq('id', userId);
        if (error) throw error;
      }
      
      setRawPendingUsers(prev => prev.map(u => u.id === userId ? { ...u, ...updates } : u));
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
        student_billing_cash_paid: true
      };
      const { error } = await supabase
        .from('users')
        .update(updates)
        .in('id', userIds);
      if (error) throw error;

      setRawPendingUsers(prev => prev.map(u => userIds.includes(u.id) ? { ...u, ...updates } : u));
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

