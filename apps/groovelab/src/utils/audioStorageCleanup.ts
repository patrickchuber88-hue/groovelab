/**
 * 🧹 Audio Storage Lifecycle & Cache Pruning Utilities
 * Provides safe garbage collection for orphaned IndexedDB audio blobs and temporary cuts.
 */

import { deleteBlob } from './blobStorage';
import { supabase } from '../lib/supabase';

export const audioStorageCleanup = {
  /**
   * Physically removes a recording from Supabase Storage and cleans up local IndexedDB cache
   */
  async purgeRecording(audioUrl: string | null | undefined): Promise<boolean> {
    if (!audioUrl) return true;

    try {
      // 1. If stored locally in IndexedDB, purge blob entry
      if (audioUrl.startsWith('campus_blob_') || audioUrl.startsWith('campus_audio_')) {
        await deleteBlob(audioUrl);
      }

      // 2. If stored in Supabase Storage, delete from the audio bucket
      if (audioUrl.includes('/storage/v1/object/public/')) {
        const urlParts = audioUrl.split('/storage/v1/object/public/');
        if (urlParts.length === 2) {
          const pathSegments = urlParts[1].split('/');
          const bucket = pathSegments[0];
          const objectPath = pathSegments.slice(1).join('/');

          if (bucket && objectPath) {
            const { error } = await supabase.storage.from(bucket).remove([objectPath]);
            if (error) {
              console.warn('[AudioCleanup] Supabase Storage remove warning:', error.message);
            }
          }
        }
      } else if (audioUrl.includes('supabase.co/storage/v1/object/public/')) {
        const urlParts = audioUrl.split('/public/');
        if (urlParts.length === 2) {
          const pathSegments = urlParts[1].split('/');
          const bucket = pathSegments[0];
          const objectPath = pathSegments.slice(1).join('/');

          if (bucket && objectPath) {
            const { error } = await supabase.storage.from(bucket).remove([objectPath]);
            if (error) {
              console.warn('[AudioCleanup] Supabase Storage remove warning:', error.message);
            }
          }
        }
      }

      return true;
    } catch (err) {
      console.warn('[AudioCleanup] Error purging recording:', err);
      return false;
    }
  }
};
