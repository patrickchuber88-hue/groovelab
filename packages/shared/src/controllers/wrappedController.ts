import { Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://supabase.178.105.10.2.sslip.io';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

// Static catalog of avatars and their evolution stages (matching avatarController.ts)
const STAGES: Record<string, Record<number, { name: string; assetPath: string; xpThreshold: number }>> = {
  guitarist: {
    1: { name: 'Garagen-Gitarrist', assetPath: '/avatars/hero_guitarist_lvl1.png', xpThreshold: 0 },
    2: { name: 'Band-Mitglied', assetPath: '/avatars/hero_guitarist_lvl2.png', xpThreshold: 100 },
    3: { name: 'Rockstar', assetPath: '/avatars/hero_guitarist_lvl3.png', xpThreshold: 300 }
  },
  drummer: {
    1: { name: 'Takt-Anfänger', assetPath: '/avatars/hero_drummer_lvl1.png', xpThreshold: 0 },
    2: { name: 'Studio-Drummer', assetPath: '/avatars/hero_drummer_lvl2.png', xpThreshold: 100 },
    3: { name: 'Rhythmus-Gott', assetPath: '/avatars/hero_drummer_lvl3.png', xpThreshold: 300 }
  },
  keyboardist: {
    1: { name: 'Melodien-Sucher', assetPath: '/avatars/hero_keys_lvl1.png', xpThreshold: 0 },
    2: { name: 'Synthie-Pionier', assetPath: '/avatars/hero_keys_lvl2.png', xpThreshold: 100 },
    3: { name: 'Tasten-Virtuose', assetPath: '/avatars/hero_keys_lvl3.png', xpThreshold: 300 }
  },
  vocalist: {
    1: { name: 'Dusch-Sänger', assetPath: '/avatars/hero_vocals_lvl1.png', xpThreshold: 0 },
    2: { name: 'Bühnen-Neuling', assetPath: '/avatars/hero_vocals_lvl2.png', xpThreshold: 100 },
    3: { name: 'Stimm-König/in', assetPath: '/avatars/hero_vocals_lvl3.png', xpThreshold: 300 }
  }
};

/**
 * 1. INTERVALL-AGGREGATION & ZENSUR-LOGIK (Monthly Flashback & Campus Wrapped)
 * GET /api/wrapped?userId=...
 */
export async function getWrappedDataHandler(req: Request, res: Response): Promise<void> {
  try {
    const userId = (req.query.userId || req.body.userId) as string;
    if (!userId) {
      res.status(400).json({ error: 'User ID is required.' });
      return;
    }

    // Fetch user profile and premium status
    const { data: user, error: userErr } = await supabase
      .from('users')
      .select('id, is_premium_user, avatar_url')
      .eq('id', userId)
      .single();

    if (userErr || !user) {
      res.status(404).json({ error: 'User profile not found.' });
      return;
    }

    const isPremium = user.is_premium_user ?? false;

    // Dates for Flashback (current calendar month)
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    // Dates for Campus Wrapped (current calendar year)
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const endOfYear = new Date(now.getFullYear(), 11, 31, 23, 59, 59);

    // Query focus logs for year
    const { data: focusLogs, error: focusErr } = await supabase
      .from('fokus_logs')
      .select('duration_minutes, created_at')
      .eq('user_id', userId)
      .gte('created_at', startOfYear.toISOString())
      .lte('created_at', endOfYear.toISOString());

    // Query mastered songs (from student_progress_matrix status = 'mastered')
    const { data: progressMatrix, error: matrixErr } = await supabase
      .from('student_progress_matrix')
      .select('id, status, updated_at')
      .eq('user_id', userId)
      .eq('status', 'mastered');

    if (focusErr || matrixErr) {
      res.status(500).json({ error: 'Failed to aggregate wrapped metrics.', details: { focusErr, matrixErr } });
      return;
    }

    // Filter focus logs
    const monthLogs = (focusLogs || []).filter(log => new Date(log.created_at) >= startOfMonth && new Date(log.created_at) <= endOfMonth);
    const yearLogs = focusLogs || [];

    // Filter mastered songs
    const monthMastered = (progressMatrix || []).filter(song => new Date(song.updated_at) >= startOfMonth && new Date(song.updated_at) <= endOfMonth);
    const yearMastered = progressMatrix || [];

    // Calculate sum of focus minutes
    const monthFocusMinutes = monthLogs.reduce((sum, log) => sum + (log.duration_minutes || 0), 0);
    const yearFocusMinutes = yearLogs.reduce((sum, log) => sum + (log.duration_minutes || 0), 0);

    // Generate monthly badge (e.g. "Gold-Focus-Hero-May-2026")
    const monthNames = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"];
    const currentMonthName = monthNames[now.getMonth()];
    const collectibleBadge = `Badge_${currentMonthName}_${now.getFullYear()}`;

    // Apply two-class censorship
    if (!isPremium) {
      res.status(200).json({
        success: true,
        isPremium: false,
        avatarStyle: 'Standard_Silhouette',
        avatarUrl: '/avatars/silhouette_grey.png',
        monthlyFlashback: {
          focusMinutes: null, // Censored (blur-md on client)
          masteredSongsCount: null, // Censored
          badgeName: 'Gesperrt 🔒'
        },
        campusWrapped: {
          focusMinutes: null, // Censored
          masteredSongsCount: null // Censored
        }
      });
      return;
    }

    // Premium full unmasked payload
    res.status(200).json({
      success: true,
      isPremium: true,
      avatarStyle: 'Premium_Hero',
      avatarUrl: user.avatar_url,
      monthlyFlashback: {
        focusMinutes: monthFocusMinutes,
        masteredSongsCount: monthMastered.length,
        badgeName: `${currentMonthName}-Fokus-Badge 🏆`,
        badgeCode: collectibleBadge
      },
      campusWrapped: {
        focusMinutes: yearFocusMinutes,
        masteredSongsCount: yearMastered.length
      }
    });

  } catch (err: any) {
    res.status(500).json({ error: 'Internal Server Error', details: err.message });
  }
}

/**
 * 2. DETOX TIMER COMPLETION & STREAK VALIDATION
 * POST /api/detox/complete
 * Body: { userId, songId, durationMinutes }
 */
export async function completeDetoxSessionHandler(req: Request, res: Response): Promise<void> {
  try {
    const { userId, songId, durationMinutes } = req.body;

    if (!userId || typeof durationMinutes !== 'number' || durationMinutes <= 0) {
      res.status(400).json({ error: 'Missing or invalid parameters.' });
      return;
    }

    // Insert focus log row
    const { error: logErr } = await supabase
      .from('fokus_logs')
      .insert({
        user_id: userId,
        song_id: songId || null,
        duration_minutes: durationMinutes
      });

    if (logErr) {
      res.status(500).json({ error: 'Failed to save focus log.', details: logErr.message });
      return;
    }

    // Check student profile and premium status
    const { data: user } = await supabase
      .from('users')
      .select('is_premium_user')
      .eq('id', userId)
      .single();

    const isPremium = user?.is_premium_user ?? false;

    // Fetch current avatar stats
    const { data: avatar, error: avatarErr } = await supabase
      .from('avatars')
      .select('id, xp, evolution_level, streak_flame, last_focus_date, instrument_type, asset_path')
      .eq('user_id', userId)
      .single();

    if (avatarErr || !avatar) {
      res.status(404).json({ error: 'Avatar record not found for this user.' });
      return;
    }

    // If not premium, they do not get streak increment or XP payout from detox
    if (!isPremium) {
      res.status(200).json({
        success: true,
        message: 'Fokus-Sitzung gespeichert (kostenloser Modus). Upgrade für XP und Streaks erforderlich.',
        streakFlame: 0,
        xpAdded: 0,
        levelUp: false,
        avatar
      });
      return;
    }

    // Streak validation logic
    const todayStr = new Date().toISOString().split('T')[0];
    const lastFocusStr = avatar.last_focus_date ? String(avatar.last_focus_date) : null;
    
    let newStreak = avatar.streak_flame || 0;
    let xpAdded = 0;
    let streakIncremented = false;

    if (lastFocusStr !== todayStr) {
      // Focus goal is 15 minutes today, check total focus minutes today
      const { data: todayLogs } = await supabase
        .from('fokus_logs')
        .select('duration_minutes')
        .eq('user_id', userId)
        .gte('created_at', todayStr + 'T00:00:00.000Z');

      const totalMinutesToday = (todayLogs || []).reduce((sum, log) => sum + (log.duration_minutes || 0), 0);

      if (totalMinutesToday >= 15) {
        // Milestone reached!
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];

        if (lastFocusStr === yesterdayStr) {
          // Continued streak
          newStreak += 1;
        } else {
          // New/broken streak
          newStreak = 1;
        }
        streakIncremented = true;
        xpAdded = 100; // Payout 100 XP for hitting daily focus milestone
      }
    }

    const newXp = (avatar.xp || 0) + xpAdded;
    let newLevel = avatar.evolution_level || 1;
    let nextAssetPath = avatar.asset_path;
    let levelUpOccurred = false;

    // Calculate level up based on thresholds (Premium stages)
    const instrument = avatar.instrument_type || 'guitarist';
    const heroStages = STAGES[instrument] || STAGES.guitarist;

    if (newXp >= heroStages[3].xpThreshold) {
      newLevel = 3;
    } else if (newXp >= heroStages[2].xpThreshold) {
      newLevel = 2;
    } else {
      newLevel = 1;
    }

    levelUpOccurred = newLevel > avatar.evolution_level;
    nextAssetPath = heroStages[newLevel].assetPath;

    // Update avatar stats in database
    const updatePayload: any = {
      xp: newXp,
      evolution_level: newLevel,
      asset_path: nextAssetPath,
      streak_flame: newStreak
    };

    if (streakIncremented) {
      updatePayload.last_focus_date = todayStr;
    }

    const { data: updatedAvatar, error: updateErr } = await supabase
      .from('avatars')
      .update(updatePayload)
      .eq('id', avatar.id)
      .select('*')
      .single();

    if (updateErr) {
      res.status(500).json({ error: 'Failed to update avatar stats.', details: updateErr.message });
      return;
    }

    // Sync asset_path back to user profile's avatar_url
    await supabase
      .from('users')
      .update({ avatar_url: nextAssetPath })
      .eq('id', userId);

    res.status(200).json({
      success: true,
      message: levelUpOccurred ? 'Level-up! Avatar evolved!' : 'Fokus-Sitzung erfolgreich beendet!',
      streakFlame: newStreak,
      xpAdded,
      levelUp: levelUpOccurred,
      avatar: updatedAvatar
    });

  } catch (err: any) {
    res.status(500).json({ error: 'Internal Server Error', details: err.message });
  }
}
