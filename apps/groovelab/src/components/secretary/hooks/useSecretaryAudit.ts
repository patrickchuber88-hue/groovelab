/**
 * ==============================================================================
 * CAMPUS-GROOVELAB: useSecretaryAudit Hook (Schritt 3.15)
 * Bounded Context: Administration & Audit Log Governance (Module Color: Red #ea4335)
 * Standards: OWASP ASVS Level 3 / GoBD / Art. 30 & 32 DSGVO / Zero-Knowledge Masking
 * ==============================================================================
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';

export interface AuditLogItem {
  id: string;
  created_at: string;
  action: 'INSERT' | 'UPDATE' | 'DELETE' | string;
  table_name: string;
  record_id: string;
  users?: {
    first_name?: string;
    last_name?: string;
    email?: string;
    role?: string;
  } | null;
  new_data?: Record<string, any> | null;
  old_data?: Record<string, any> | null;
}

export interface UseSecretaryAuditParams {
  schoolId: string;
  activeTab: 'secretary' | 'campus' | 'groovelab';
  secretarySubTab: string;
  userMap?: Record<string, string>;
}

export interface UseSecretaryAuditReturn {
  auditLogs: AuditLogItem[];
  auditLoading: boolean;
  auditSearchQuery: string;
  setAuditSearchQuery: React.Dispatch<React.SetStateAction<string>>;
  auditActionFilter: string;
  setAuditActionFilter: React.Dispatch<React.SetStateAction<string>>;
  auditLimit: number;
  setAuditLimit: React.Dispatch<React.SetStateAction<number>>;
  fetchAuditLogs: (limitVal?: number) => Promise<void>;
  exportAuditLogsToCsv: () => void;
  translateKey: (key: string) => string;
  translateValue: (key: string, val: any) => string;
}

export function useSecretaryAudit({
  schoolId,
  activeTab,
  secretarySubTab,
  userMap = {}
}: UseSecretaryAuditParams): UseSecretaryAuditReturn {
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [auditLoading, setAuditLoading] = useState<boolean>(false);
  const [auditSearchQuery, setAuditSearchQuery] = useState<string>('');
  const [auditActionFilter, setAuditActionFilter] = useState<string>('All');
  const [auditLimit, setAuditLimit] = useState<number>(200);

  const translateKey = useCallback((key: string): string => {
    const keyMap: Record<string, string> = {
      role: 'Hauptrolle',
      roles: 'Rollen',
      first_name: 'Vorname',
      last_name: 'Nachname',
      email: 'E-Mail',
      is_active: 'Konto-Status',
      is_campus_active: 'Campus Modul',
      is_groovelab_active: 'GrooveLab Modul',
      is_trial: 'Probezeit-Status',
      trial_ends_at: 'Probezeit-Ende',
      activated_at: 'Aktivierungsdatum',
      ausweis_nummer: 'Mitarbeiter-PIN',
      ausweis_id: 'Ausweis-ID',
      is_app_user: 'App-Nutzung',
      is_premium_user: 'Premium-Status',
      contract_start_date: 'Vertragsstart',
      status: 'Status',
      storage_addon_gb: 'Zusatzspeicher',
      has_campus_subscription: 'Abo Campus',
      has_groovelab_subscription: 'Abo GrooveLab',
      student_billing_option: 'Abrechnungsmodell'
    };
    return keyMap[key] || key;
  }, []);

  const translateValue = useCallback((key: string, val: any): string => {
    if (val === null || val === undefined || val === '') return '';
    if (typeof val === 'object' && !Array.isArray(val)) {
      return JSON.stringify(val);
    }
    if (typeof val === 'boolean') {
      if (key.startsWith('is_') && key.endsWith('_active')) {
        return val ? 'Freigeschaltet' : 'Gesperrt';
      }
      if (key === 'is_campus_active' || key === 'is_groovelab_active') {
        return val ? 'Aktiv' : 'Basis';
      }
      if (key === 'has_campus_subscription' || key === 'has_groovelab_subscription') {
        return val ? 'Aktiv' : 'Inaktiv';
      }
      return val ? 'Aktiv' : 'Inaktiv';
    }
    if (Array.isArray(val)) {
      if (val.length === 0) return '';
      return val.map(v => translateValue(key, v)).filter(Boolean).join(', ');
    }
    const valueMap: Record<string, string> = {
      admin: 'Schulleitung (Admin)',
      secretary: 'Schulsekretariat',
      teacher: 'Lehrkraft',
      student: 'Schüler',
      active: 'Aktiv',
      trial: 'Testphase'
    };
    if (typeof val === 'string' && valueMap[val]) {
      return valueMap[val];
    }
    if (typeof val === 'string' && (key === 'photo_url' || key === 'avatar_url')) {
      if (val.includes('campus_login_hero')) return 'Schul-Tafel (Standard)';
      return 'Profilbild hinterlegt';
    }
    if (typeof val === 'string' && key === 'qr_token') {
      return `Generiert (${val.substring(0, 6)}...${val.substring(val.length - 4)})`;
    }
    if (typeof val === 'string' && val.match(/^\d{4}-\d{2}-\d{2}/)) {
      try {
        const d = new Date(val);
        if (!isNaN(d.getTime())) {
          return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
        }
      } catch {}
    }
    return String(val);
  }, []);

  const fetchAuditLogs = useCallback(async (limitVal: number = 200) => {
    if (!schoolId) return;
    setAuditLoading(true);
    try {
      const { data, error } = await supabase
        .from('audit_logs')
        .select(`
          id,
          changed_by,
          table_name,
          action,
          record_id,
          old_data,
          new_data,
          created_at,
          users (
            first_name,
            last_name
          )
        `)
        .eq('school_id', schoolId)
        .order('created_at', { ascending: false })
        .limit(limitVal);

      if (error) throw error;
      setAuditLogs((data as any) || []);
    } catch (err: any) {
      console.error('[useSecretaryAudit] Error fetching audit logs:', err);
    } finally {
      setAuditLoading(false);
    }
  }, [schoolId]);

  useEffect(() => {
    if (activeTab === 'secretary' && secretarySubTab === 'audit') {
      fetchAuditLogs(auditLimit);
    }
  }, [activeTab, secretarySubTab, auditLimit, fetchAuditLogs]);

  const exportAuditLogsToCsv = useCallback(() => {
    if (auditLogs.length === 0) return;
    const headers = ['Zeitpunkt', 'Aktion', 'Kategorie', 'Betroffener Datensatz', 'Record-ID', 'Geändert von', 'Protokollierte Details'];
    const ignoredKeys = [
      'id', 'created_at', 'school_id', 'password', 'password_hash', 
      'personal_pin', 'parent_pin', 'teacher_qr_token', 'campus_login_token', 
      'groovelab_kiosk_token', 'secret_token', 'joker_used_at', 'weekly_jokers_used',
      'lesson_duration', 'preferred_room_ids', 'planned_boards', 'ausfall_until',
      'age', 'bio', 'gear', 'listening', 'projects', 'bands', 'expertise', 'phone', 'group_id', 'nickname'
    ];

    const rows = auditLogs.map(log => {
      const changer = log.users ? `${log.users.first_name || ''} ${log.users.last_name || ''}`.trim() : 'System (Automatik)';
      let targetName = log.table_name === 'users' ? (userMap[log.record_id] || '') : log.table_name;
      if (!targetName && log.new_data) {
        const fn = log.new_data.first_name || '';
        const ln = log.new_data.last_name || '';
        if (fn || ln) targetName = `${fn} ${ln}`.trim();
      }
      if (!targetName) targetName = 'Datensatz';

      let details = '';
      if (log.action === 'UPDATE') {
        details = Object.entries(log.new_data || {})
          .filter(([k]) => !ignoredKeys.includes(k))
          .map(([k, v]) => {
            const oldV = translateValue(k, log.old_data?.[k]);
            const newV = translateValue(k, v);
            if (oldV === newV) return null;
            return `${translateKey(k)}: ${oldV || '(leer)'} -> ${newV || '(gelöscht)'}`;
          })
          .filter(Boolean)
          .join(' | ');
      } else if (log.action === 'INSERT') {
        details = Object.entries(log.new_data || {})
          .filter(([k]) => !ignoredKeys.includes(k))
          .map(([k, v]) => {
            const valStr = translateValue(k, v);
            if (!valStr) return null;
            return `${translateKey(k)}: ${valStr}`;
          })
          .filter(Boolean)
          .join(' | ');
      } else {
        details = Object.entries(log.old_data || {})
          .filter(([k]) => !ignoredKeys.includes(k))
          .map(([k, v]) => {
            const valStr = translateValue(k, v);
            if (!valStr) return null;
            return `${translateKey(k)}: ${valStr}`;
          })
          .filter(Boolean)
          .join(' | ');
      }

      return [
        new Date(log.created_at).toLocaleString('de-DE'),
        log.action === 'INSERT' ? 'Neuanlage' : log.action === 'UPDATE' ? 'Aktualisierung' : 'Löschung',
        log.table_name === 'users' ? 'Benutzer' : log.table_name === 'schools' ? 'Musikschule' : log.table_name,
        targetName,
        log.record_id,
        changer,
        details || 'Keine relevanten Feldänderungen'
      ];
    });

    const sanitizeCsvCell = (val: any) => {
      let s = String(val ?? '');
      if (/^[=+\-@\t\r]/.test(s)) {
        s = "'" + s;
      }
      return `"${s.replace(/"/g, '""')}"`;
    };

    const csvContent = "\uFEFF" + [headers.map(sanitizeCsvCell).join(';'), ...rows.map(e => e.map(sanitizeCsvCell).join(';'))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Aenderungsprotokoll_Campus_Groovelab_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [auditLogs, userMap, translateKey, translateValue]);

  return {
    auditLogs,
    auditLoading,
    auditSearchQuery,
    setAuditSearchQuery,
    auditActionFilter,
    setAuditActionFilter,
    auditLimit,
    setAuditLimit,
    fetchAuditLogs,
    exportAuditLogsToCsv,
    translateKey,
    translateValue
  };
}
