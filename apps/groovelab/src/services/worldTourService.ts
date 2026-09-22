/**
 * 🌍 Campus-Groovelab World Tour Service
 * 
 * Authoritative integration with Supabase RPC save_worldtour_country_mastery,
 * offline-first IndexedDB / LocalStorage synchronization and continent mastery detection.
 */

import { supabase } from '../lib/supabase';
import { WorldTourStudentProgress, ContinentId } from '../types/worldTour';
import { CONTINENTS, WORLD_TOUR_COUNTRIES } from '../domain/worldTourCatalog';

const OFFLINE_STORAGE_KEY = 'campus_worldtour_offline_progress';

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

export class WorldTourService {
  /**
   * Fetches all progress records for the current student.
   */
  public static async fetchStudentProgress(studentId?: string): Promise<Record<string, WorldTourStudentProgress>> {
    const progressMap: Record<string, WorldTourStudentProgress> = {};

    // 1. Read offline cache first
    try {
      const cached = localStorage.getItem(OFFLINE_STORAGE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        Object.assign(progressMap, parsed);
      }
    } catch {
      // Ignore cache errors
    }

    // 2. Fetch from Supabase if authenticated
    try {
      let query = supabase
        .from('student_worldtour_progress')
        .select('*');

      if (studentId) {
        query = query.eq('student_id', studentId);
      }

      const { data, error } = await query;
      if (!error && data && Array.isArray(data)) {
        data.forEach((row: any) => {
          progressMap[row.country_code] = {
            countryCode: row.country_code,
            stars: row.stars ?? 0,
            bestScorePercent: row.best_score_percent ?? 0,
            bestTempoBpm: row.best_tempo_bpm ?? 0,
            instrument: row.instrument ?? '',
            isUnlocked: Boolean(row.is_unlocked),
            unlockedAt: row.unlocked_at
          };
        });
        // Update offline cache
        try {
          localStorage.setItem(OFFLINE_STORAGE_KEY, JSON.stringify(progressMap));
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
    instrument?: string
  ): Promise<WorldTourSaveResult> {
    const cleanCode = countryCode.toUpperCase().trim();
    const cleanStars = Math.max(1, Math.min(3, stars));
    const cleanScore = Math.max(0, Math.min(100, scorePercent));

    let xpAwarded = 0;

    // 1. Attempt authoritative Supabase RPC call
    try {
      const { data, error } = await supabase.rpc('save_worldtour_country_mastery', {
        p_country_code: cleanCode,
        p_stars: cleanStars,
        p_score_percent: cleanScore,
        p_tempo_bpm: tempoBpm,
        p_instrument: instrument || ''
      });

      if (!error && data && data.success) {
        xpAwarded = data.xp_awarded ?? (cleanStars * 50);
      }
    } catch {
      // Fallback: Calculate client XP if offline
      xpAwarded = cleanStars * 50;
    }

    // 2. Update offline cache
    let cachedProgress: Record<string, WorldTourStudentProgress> = {};
    try {
      const raw = localStorage.getItem(OFFLINE_STORAGE_KEY);
      if (raw) cachedProgress = JSON.parse(raw);
    } catch {}

    const existing = cachedProgress[cleanCode];
    const finalStars = Math.max(existing?.stars ?? 0, cleanStars);
    const finalScore = Math.max(existing?.bestScorePercent ?? 0, cleanScore);

    cachedProgress[cleanCode] = {
      countryCode: cleanCode,
      stars: finalStars,
      bestScorePercent: finalScore,
      bestTempoBpm: Math.max(existing?.bestTempoBpm ?? 0, tempoBpm),
      instrument: instrument || existing?.instrument || '',
      isUnlocked: true,
      unlockedAt: existing?.unlockedAt || new Date().toISOString()
    };

    try {
      localStorage.setItem(OFFLINE_STORAGE_KEY, JSON.stringify(cachedProgress));
    } catch {}

    // 3. Check for continent completions
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
      isUnlocked: true,
      unlockedAt: new Date().toISOString(),
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

    const totalXP = totalStars * 75;
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
