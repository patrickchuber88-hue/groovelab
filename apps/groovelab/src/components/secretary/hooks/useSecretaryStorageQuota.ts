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
 * Encapsulates dynamic local-first + cloud multi-layer storage calculation and auto-refresh.
 */
export function useSecretaryStorageQuota({
  currentSchoolProfile,
  setCurrentSchoolProfile,
  supabase = defaultSupabase
}: UseSecretaryStorageQuotaOptions): UseSecretaryStorageQuotaReturn {

  // 🎙️ Dynamic Multi-Layer Audio-Vault Calculator (Local-First + Cloud Reconciliation)
  const getEffectiveStorageUsedBytes = useCallback((profile: any): number => {
    let bytes = Number(profile?.storage_used_bytes || 0);

    try {
      if (typeof window !== 'undefined') {
        let localBytes = 0;
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (!key) continue;

          // 1. Homework audio notes: campus_homework_notes_${studentId}
          if (key.startsWith('campus_homework_notes_')) {
            try {
              const val = localStorage.getItem(key);
              if (val) {
                const notes = JSON.parse(val);
                if (Array.isArray(notes)) {
                  notes.forEach((note: string) => {
                    if (typeof note === 'string' && (note.startsWith('AUDIO:') || note.startsWith('LOOP:'))) {
                      const parts = note.split('|');
                      const durSec = Number(parts[1] || 10);
                      localBytes += Math.max(120000, durSec * 32000);
                    }
                  });
                }
              }
            } catch {}
          }

          // 2. Junior student recordings: campus_junior_recordings_${studentId}
          if (key.startsWith('campus_junior_recordings_')) {
            try {
              const val = localStorage.getItem(key);
              if (val) {
                const recs = JSON.parse(val);
                if (Array.isArray(recs)) {
                  recs.forEach((rec: any) => {
                    const dur = Number(rec?.duration || 10);
                    localBytes += Math.max(120000, dur * 32000);
                  });
                }
              }
            } catch {}
          }

          // 3. Audio biography takes: campus_audio_biography_${studentId}
          if (key.startsWith('campus_audio_biography_')) {
            try {
              const val = localStorage.getItem(key);
              if (val) {
                const bio = JSON.parse(val);
                if (Array.isArray(bio)) {
                  bio.forEach((track: any) => {
                    const dur = Number(track?.duration || 30);
                    localBytes += Math.max(250000, dur * 32000);
                  });
                }
              }
            } catch {}
          }

          // 4. Raw loop tracks: groovelab_loop_tracks_
          if (key.startsWith('groovelab_loop_tracks_')) {
            try {
              const val = localStorage.getItem(key);
              if (val) {
                const loops = JSON.parse(val);
                if (Array.isArray(loops)) {
                  loops.forEach((lp: any) => {
                    const dur = Number(lp?.duration || 15);
                    localBytes += Math.max(180000, dur * 32000);
                  });
                }
              }
            } catch {}
          }
        }
        bytes = Math.max(bytes, localBytes);
      }
    } catch {}

    return bytes;
  }, []);

  // 🎙️ Multi-Tenant Isolated Storage Scanner Function
  const refreshStorageQuota = useCallback(async () => {
    if (!currentSchoolProfile?.id) return;
    try {
      const schoolId = String(currentSchoolProfile.id);
      let usedBytes = 0;

      // MULTI-TENANT ISOLATED STORAGE SCANNER: Multi-layer aggregation (Cloud Bucket + Audio Notes + Local Caches)
      try {
        // 1. Fetch all user IDs (students, teachers, admins) belonging to this school
        const schoolUserIds = new Set<string>();
        try {
          const { data: schoolUsers } = await supabase
            .from('users')
            .select('id')
            .eq('school_id', schoolId);
          if (schoolUsers && schoolUsers.length > 0) {
            schoolUsers.forEach((u: any) => {
              if (u?.id) schoolUserIds.add(String(u.id));
            });
          }
        } catch (uErr) {
          console.warn('[Storage Scan] Error fetching school users for storage scan:', uErr);
        }

        let schoolAggregatedBytes = 0;
        const subFolders = ['recordings', 'loops', 'audio_biography', 'audio'];

        // 2. Scan school-prefixed folders: schools/${schoolId}/${subFolder}
        for (const subFolder of subFolders) {
          try {
            const { data: files } = await supabase.storage
              .from('campus-assets')
              .list(`schools/${schoolId}/${subFolder}`, { limit: 1000 });
            if (files && files.length > 0) {
              for (const file of files) {
                const fileSize = Number(file.metadata?.size || 0);
                if (fileSize > 0) {
                  schoolAggregatedBytes += fileSize;
                }
              }
            }
          } catch (folderErr) {}
        }

        // 3. Scan root folders in campus-assets: recordings, audio_biography, audio, loops
        for (const rootFolder of subFolders) {
          try {
            const { data: rootFiles } = await supabase.storage
              .from('campus-assets')
              .list(rootFolder, { limit: 1000 });
            if (rootFiles && rootFiles.length > 0) {
              for (const file of rootFiles) {
                const fileSize = Number(file.metadata?.size || 0);
                if (fileSize <= 0) continue;

                const fileName = file.name || '';
                let belongsToSchool = false;
                if (fileName.includes(schoolId)) {
                  belongsToSchool = true;
                } else if (schoolUserIds.size > 0) {
                  for (const uid of schoolUserIds) {
                    if (fileName.includes(uid)) {
                      belongsToSchool = true;
                      break;
                    }
                  }
                } else {
                  belongsToSchool = true;
                }

                if (belongsToSchool) {
                  schoolAggregatedBytes += fileSize;
                }
              }
            }
          } catch (rootErr) {}
        }

        // 4. Scan student audio recordings from localStorage
        let studentAudioBytes = 0;
        try {
          if (typeof window !== 'undefined') {
            for (let i = 0; i < localStorage.length; i++) {
              const key = localStorage.key(i);
              if (!key) continue;

              // 1. Homework audio notes: campus_homework_notes_${studentId}
              if (key.startsWith('campus_homework_notes_')) {
                try {
                  const val = localStorage.getItem(key);
                  if (val) {
                    const notes = JSON.parse(val);
                    if (Array.isArray(notes)) {
                      notes.forEach((note: string) => {
                        if (typeof note === 'string' && (note.startsWith('AUDIO:') || note.startsWith('LOOP:'))) {
                          const parts = note.split('|');
                          const durSec = Number(parts[1] || 10);
                          const estimatedTakeBytes = Math.max(120000, durSec * 32000);
                          studentAudioBytes += estimatedTakeBytes;
                        }
                      });
                    }
                  }
                } catch (e) {}
              }

              // 2. Junior student recordings: campus_junior_recordings_${studentId}
              if (key.startsWith('campus_junior_recordings_')) {
                try {
                  const val = localStorage.getItem(key);
                  if (val) {
                    const recs = JSON.parse(val);
                    if (Array.isArray(recs)) {
                      recs.forEach((rec: any) => {
                        const dur = Number(rec?.duration || 10);
                        studentAudioBytes += Math.max(120000, dur * 32000);
                      });
                    }
                  }
                } catch (e) {}
              }

              // 3. Audio biography takes: campus_audio_biography_${studentId}
              if (key.startsWith('campus_audio_biography_')) {
                try {
                  const val = localStorage.getItem(key);
                  if (val) {
                    const bio = JSON.parse(val);
                    if (Array.isArray(bio)) {
                      bio.forEach((track: any) => {
                        const dur = Number(track?.duration || 30);
                        studentAudioBytes += Math.max(250000, dur * 32000);
                      });
                    }
                  }
                } catch (e) {}
              }
            }
          }
        } catch (scanLocalErr) {
          console.warn('[Storage Scan] Local audio aggregator note:', scanLocalErr);
        }

        const maxDiscoveredBytes = Math.max(schoolAggregatedBytes, studentAudioBytes);
        if (maxDiscoveredBytes > 0) {
          usedBytes = maxDiscoveredBytes;
        }

        // Sync local overrides cache cleanly
        try {
          const overridesStr = localStorage.getItem('groovelab_school_overrides') || '{}';
          const overrides = JSON.parse(overridesStr);
          if (!overrides[schoolId]) overrides[schoolId] = {};
          overrides[schoolId].storage_used_bytes = usedBytes;
          localStorage.setItem('groovelab_school_overrides', JSON.stringify(overrides));
          localStorage.setItem(`groovelab_storage_used_bytes_${schoolId}`, String(usedBytes));
          localStorage.setItem('groovelab_storage_used_bytes', String(usedBytes));
        } catch (e) {}

        // Safe update attempt to Supabase
        try {
          await supabase
            .from('schools')
            .update({ storage_used_bytes: usedBytes })
            .eq('id', schoolId);
        } catch (upErr) {}
      } catch (scanErr) {
        console.warn('[Storage Scan] School quota sync note:', scanErr);
      }

      setCurrentSchoolProfile((prev: any) => prev ? ({ ...prev, storage_used_bytes: usedBytes }) : prev);
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
