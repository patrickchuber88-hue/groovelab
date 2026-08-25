import { supabase } from '../lib/supabase';

export interface BandRecord {
  id: string;
  name: string;
  school_id: string;
  status: string;
  photo_url?: string;
  coach_id?: string;
  songs?: any;
  band_members?: any[];
  band_songs?: any[];
  coach?: any;
}

export async function fetchUserBandIds(userId: string): Promise<string[]> {
  if (!userId) return [];
  try {
    const [mBandsRes, cBandsRes] = await Promise.all([
      supabase.from('band_members').select('band_id').eq('user_id', userId),
      supabase.from('bands').select('id').eq('coach_id', userId)
    ]);

    const bIds: string[] = [];
    if (mBandsRes.data) bIds.push(...mBandsRes.data.map(b => b.band_id));
    if (cBandsRes.data) bIds.push(...cBandsRes.data.map(b => b.id));
    return [...new Set(bIds)];
  } catch (err) {
    console.error('[BandRepository] Error fetching user band IDs:', err);
    return [];
  }
}

export async function fetchUnreadShouts(bandIds: string[], userId: string): Promise<any[]> {
  if (!bandIds || bandIds.length === 0 || !userId) return [];
  try {
    const { data: shoutData, error } = await supabase
      .from('band_shoutbox')
      .select('*, users(first_name, photo_url), bands(name)')
      .in('band_id', bandIds)
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('[BandRepository] Error fetching shoutbox:', error);
      return [];
    }

    return (shoutData || []).filter(s => !(s.read_by || []).includes(userId) && s.user_id !== userId);
  } catch (err) {
    console.error('[BandRepository] Unexpected error in fetchUnreadShouts:', err);
    return [];
  }
}

export async function fetchPendingSubmissions(): Promise<any[]> {
  try {
    const { data, error } = await supabase
      .from('user_song_skills')
      .select('*, users!user_id(*), songs(*)')
      .eq('is_pending_approval', true);

    if (error) {
      console.warn('[BandRepository] Error fetching pending submissions:', error);
      return [];
    }
    return data || [];
  } catch (err) {
    console.error('[BandRepository] Unexpected error in fetchPendingSubmissions:', err);
    return [];
  }
}
