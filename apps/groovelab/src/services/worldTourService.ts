/**
 * 🌍 Campus-Groovelab World Tour Service
 * 
 * Authoritative integration with Supabase RPC save_worldtour_country_mastery,
 * student-scoped offline-first IndexedDB / LocalStorage synchronization,
 * campus-xp-awarded event dispatching, and continent mastery detection.
 */

import { supabase } from '../lib/supabase';
import { WorldTourStudentProgress, ContinentId } from '../types/worldTour';
import { CONTINENTS, WORLD_TOUR_COUNTRIES } from '../domain/worldTourCatalog';

export interface WorldTourSaveResult {
  success: boolean;
  countryCode: string;
  stars: number;
  bestScorePercent: number;
  bestTempoBpm: number;
  xpAwarded: number;
  isUnlocked: boolean;
  unlockedAt: string;
  completedContinent?: ContinentId;
  allContinentsCompleted?: boolean;
}

export interface WorldTourDbRow {
  country_code: string;
  stars?: number | null;
  best_score_percent?: number | null;
  best_tempo_bpm?: number | null;
  instrument?: string | null;
  is_unlocked?: boolean | null;
  unlocked_at?: string | null;
}

export class WorldTourService {
  /**
   * Generates student-scoped storage key
   */
  public static getStorageKey(studentId?: string): string {
    return `cg_worldtour_progress_${studentId || 'anon'}`;
  }

  /**
   * Fetches all progress records for the student.
   */
  public static async fetchStudentProgress(studentId?: string): Promise<Record<string, WorldTourStudentProgress>> {
    const progressMap: Record<string, WorldTourStudentProgress> = {};
    const storageKey = WorldTourService.getStorageKey(studentId);

    // 1. Read offline cache first (scoped key with fallback to legacy key)
    try {
      let cached = localStorage.getItem(storageKey);
      if (!cached) {
        cached = localStorage.getItem('campus_worldtour_offline_progress');
      }
      if (cached) {
        const parsed = JSON.parse(cached);
        Object.assign(progressMap, parsed);
      }
    } catch {
      // Ignore cache parse errors
    }

    // 2. Fetch from Supabase if authenticated
    try {
      let query = supabase
        .from('student_worldtour_progress')
        .select('*');

      if (studentId && studentId !== 'anon' && studentId !== 'teacher-self') {
        query = query.eq('student_id', studentId);
      }

      const { data, error } = await query;
      if (!error && data && Array.isArray(data)) {
        (data as unknown as WorldTourDbRow[]).forEach((row) => {
          progressMap[row.country_code] = {
            countryCode: row.country_code,
            stars: row.stars ?? 0,
            bestScorePercent: row.best_score_percent ?? 0,
            bestTempoBpm: row.best_tempo_bpm ?? 0,
            instrument: row.instrument ?? '',
            isUnlocked: Boolean(row.is_unlocked),
            unlockedAt: row.unlocked_at || undefined
          };
        });
        // Update scoped offline cache
        try {
          localStorage.setItem(storageKey, JSON.stringify(progressMap));
        } catch {}
      }
    } catch {
      // Offline fallback
    }

    return progressMap;
  }

  /**
   * Records a mastery playthrough via authoritative RPC.
   */
  public static async saveCountryMastery(
    countryCode: string,
    stars: number,
    scorePercent: number,
    tempoBpm: number,
    instrument?: string,
    studentId?: string
  ): Promise<WorldTourSaveResult> {
    const cleanCode = countryCode.toUpperCase().trim();
    // Allow 0 stars (no forced 1-star floor)
    const cleanStars = Math.max(0, Math.min(3, stars));
    const cleanScore = Math.max(0, Math.min(100, scorePercent));
    const storageKey = WorldTourService.getStorageKey(studentId);

    // Read cached progress first to determine star delta for offline fallback
    let cachedProgress: Record<string, WorldTourStudentProgress> = {};
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) cachedProgress = JSON.parse(raw);
    } catch {}

    const existing = cachedProgress[cleanCode];
    const prevStars = existing?.stars ?? 0;
    let xpAwarded = 0;

    // 1. Attempt authoritative Supabase RPC call
    try {
      const rpcPayload: Record<string, unknown> = {
        p_country_code: cleanCode,
        p_stars: cleanStars,
        p_score_percent: cleanScore,
        p_tempo_bpm: tempoBpm,
        p_instrument: instrument || ''
      };

      if (studentId && studentId !== 'anon' && studentId !== 'teacher-self') {
        rpcPayload.p_student_id = studentId;
      }

      const { data, error } = await supabase.rpc('save_worldtour_country_mastery', rpcPayload);

      if (!error && data && data.success) {
        xpAwarded = data.xp_awarded ?? (cleanStars > prevStars ? (cleanStars - prevStars) * 50 : 0);
      }
    } catch {
      // Fallback: Harmonized XP for newly earned stars (1★ = +50 XP, 2★ = +100 XP, 3★ = +150 XP)
      if (cleanStars > prevStars) {
        xpAwarded = (cleanStars - prevStars) * 50;
      }
    }

    // 2. Dispatch real-time XP awarded events
    if (xpAwarded > 0 && typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('campus-xp-awarded', {
          detail: {
            studentId: studentId || 'current',
            amount: xpAwarded,
            reason: `World Tour Challenge: ${cleanCode}`
          }
        })
      );
      window.dispatchEvent(
        new CustomEvent('campus_xp_awarded', {
          detail: {
            studentId: studentId || 'current',
            xp: xpAwarded,
            reason: `World Tour Challenge: ${cleanCode}`
          }
        })
      );
    }

    // 3. Update student-scoped offline cache
    const finalStars = Math.max(existing?.stars ?? 0, cleanStars);
    const finalScore = Math.max(existing?.bestScorePercent ?? 0, cleanScore);
    const isUnlocked = finalStars >= 1;

    cachedProgress[cleanCode] = {
      countryCode: cleanCode,
      stars: finalStars,
      bestScorePercent: finalScore,
      bestTempoBpm: Math.max(existing?.bestTempoBpm ?? 0, tempoBpm),
      instrument: instrument || existing?.instrument || '',
      isUnlocked,
      unlockedAt: existing?.unlockedAt || (isUnlocked ? new Date().toISOString() : undefined)
    };

    try {
      localStorage.setItem(storageKey, JSON.stringify(cachedProgress));
    } catch {}

    // 4. Check for continent completions
    const currentCountry = WORLD_TOUR_COUNTRIES.find(c => c.code === cleanCode);
    let completedContinent: ContinentId | undefined = undefined;

    if (currentCountry) {
      const continentCountries = WORLD_TOUR_COUNTRIES.filter(c => c.continent === currentCountry.continent);
      const allMastered = continentCountries.every(c => (cachedProgress[c.code]?.stars ?? 0) >= 1);
      if (allMastered) {
        completedContinent = currentCountry.continent;
      }
    }

    const allWorldMastered = WORLD_TOUR_COUNTRIES.every(c => (cachedProgress[c.code]?.stars ?? 0) >= 1);

    return {
      success: true,
      countryCode: cleanCode,
      stars: finalStars,
      bestScorePercent: finalScore,
      bestTempoBpm: tempoBpm,
      xpAwarded,
      isUnlocked,
      unlockedAt: cachedProgress[cleanCode].unlockedAt || new Date().toISOString(),
      completedContinent,
      allContinentsCompleted: allWorldMastered
    };
  }

  /**
   * Calculates collaborative school stats.
   */
  public static calculateSchoolWorldMilestone(allProgress: Record<string, WorldTourStudentProgress>): {
    unlockedCount: number;
    totalCountries: number;
    totalStars: number;
    totalXP: number;
    percentComplete: number;
  } {
    const totalCountries = WORLD_TOUR_COUNTRIES.length;
    let unlockedCount = 0;
    let totalStars = 0;

    Object.values(allProgress).forEach(p => {
      if (p.isUnlocked) {
        unlockedCount++;
        totalStars += p.stars;
      }
    });

    const totalXP = totalStars * 50;
    const percentComplete = Math.round((unlockedCount / totalCountries) * 100);

    return {
      unlockedCount,
      totalCountries,
      totalStars,
      totalXP,
      percentComplete
    };
  }
}
