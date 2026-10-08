import React, { useEffect, useCallback } from 'react';
import { supabase as defaultSupabase } from '../../../lib/supabase';

export interface UseSecretaryStorageQuotaOptions {
  currentSchoolProfile: any;
  setCurrentSchoolProfile: React.Dispatch<React.SetStateAction<any>> | ((profile: any) => void);
  supabase?: any;
}

export interface UseSecretaryStorageQuotaReturn {
  getEffectiveStorageUsedBytes: (profile: any) => number;
  refreshStorageQuota: () => Promise<void>;
}

/**
 * 🎙️ Modular Storage Quota & Multi-Tenant Scanner Hook
 * 🏛️ 0,1% Goldstandard: Autoritatives Laden aus PostgreSQL public.schools (SSOT).
 * Keine clientseitigen Phantomschätzungen oder Überschreibungen aus localStorage.
 */
export function useSecretaryStorageQuota({
  currentSchoolProfile,
  setCurrentSchoolProfile,
  supabase = defaultSupabase
}: UseSecretaryStorageQuotaOptions): UseSecretaryStorageQuotaReturn {

  // 🏛️ 0,1% Goldstandard: Autoritativer Wert aus PostgreSQL public.schools (SSOT)
  const getEffectiveStorageUsedBytes = useCallback((profile: any): number => {
    return Number(profile?.storage_used_bytes || 0);
  }, []);

  // 🎙️ Autoritatives Laden des Speicherverbrauchs aus public.schools
  const refreshStorageQuota = useCallback(async () => {
    if (!currentSchoolProfile?.id) return;
    try {
      const schoolId = String(currentSchoolProfile.id);

      const { data: schoolData, error } = await supabase
        .from('schools')
        .select('storage_used_bytes, storage_limit_bytes')
        .eq('id', schoolId)
        .maybeSingle();

      if (!error && schoolData) {
        const usedBytes = Number(schoolData.storage_used_bytes || 0);
        setCurrentSchoolProfile((prev: any) => prev ? ({
          ...prev,
          storage_used_bytes: usedBytes,
          storage_limit_bytes: schoolData.storage_limit_bytes ?? prev.storage_limit_bytes
        }) : prev);
      }
    } catch (err) {
      console.warn('[Storage] Auto-refresh quota note:', err);
    }
  }, [currentSchoolProfile?.id, setCurrentSchoolProfile, supabase]);

  // Live Audio-Tresor Storage & Quota Auto-Refresh Effect
  useEffect(() => {
    if (currentSchoolProfile?.id) {
      refreshStorageQuota();
    }
  }, [currentSchoolProfile?.id, refreshStorageQuota]);

  return {
    getEffectiveStorageUsedBytes,
    refreshStorageQuota
  };
}
