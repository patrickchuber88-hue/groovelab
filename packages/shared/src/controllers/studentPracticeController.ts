import { Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase Client
const supabaseUrl = process.env.SUPABASE_URL || 'https://supabase.178.105.10.2.sslip.io';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

/**
 * POST /api/student/finish-session
 * body: { studentId, topicName, durationMinutes }
 */
export async function finishSessionHandler(req: Request, res: Response): Promise<void> {
  try {
    const { studentId, topicName, durationMinutes } = req.body;

    if (!studentId || typeof durationMinutes !== 'number' || durationMinutes <= 0) {
      res.status(400).json({ error: 'studentId and valid durationMinutes are required.' });
      return;
    }

    // Plausibility check: session cannot exceed 1440 minutes (24 hours)
    if (durationMinutes > 1440) {
      res.status(400).json({ error: 'Plausibility check failed. Session duration is unreasonably high.' });
      return;
    }

    // 1. Fetch current student stats or initialize them
    const { data: stats, error: statsError } = await supabase
      .from('student_stats')
      .select('*')
      .eq('student_id', studentId)
      .maybeSingle();

    if (statsError) {
      res.status(500).json({ error: 'Failed to fetch student stats.', details: statsError.message });
      return;
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    let totalFocus = 0;
    let monthlyFocus = 0;
    let currentXp = 0;
    let streakFlame = 0;
    let lastPracticeDate: string | null = null;

    if (stats) {
      totalFocus = stats.total_focus_minutes || 0;
      monthlyFocus = stats.monthly_focus_minutes || 0;
      currentXp = stats.current_xp || 0;
      streakFlame = stats.streak_flame || 0;
      lastPracticeDate = stats.last_practice_date ? String(stats.last_practice_date) : null;
    }

    // Calculate new stats
    totalFocus += durationMinutes;
    monthlyFocus += durationMinutes;
    
    // XP Payout: +10 XP per minute
    const xpAdded = durationMinutes * 10;
    currentXp += xpAdded;

    // Streak Logic
    let streakChanged = false;
    if (!lastPracticeDate) {
      streakFlame = 1;
      streakChanged = true;
    } else if (lastPracticeDate === yesterdayStr) {
      streakFlame += 1;
      streakChanged = true;
    } else if (lastPracticeDate === todayStr) {
      // Already practiced today, keep current streak
    } else {
      // Streak broken, reset to 1
      streakFlame = 1;
      streakChanged = true;
    }

    // 2. Upsert student stats
    const { error: upsertError } = await supabase
      .from('student_stats')
      .upsert({
        student_id: studentId,
        total_focus_minutes: totalFocus,
        monthly_focus_minutes: monthlyFocus,
        streak_flame: streakFlame,
        last_practice_date: todayStr,
        current_xp: currentXp,
        updated_at: new Date().toISOString()
      });

    if (upsertError) {
      res.status(500).json({ error: 'Failed to save student stats.', details: upsertError.message });
      return;
    }

    // 3. Log focus session details to `fokus_logs` for analysis
    await supabase.from('fokus_logs').insert({
      user_id: studentId,
      duration_minutes: durationMinutes,
      created_at: new Date().toISOString()
    });

    // 4. Sync XP and Streak back to the `avatars` table (used for student gamification rendering)
    const { data: avatar } = await supabase
      .from('avatars')
      .select('*')
      .eq('user_id', studentId)
      .maybeSingle();

    if (avatar) {
      // Calculate level up based on thresholds (matching avatarController / wrappedController)
      const currentLevel = avatar.evolution_level || 1;
      let newLevel = currentLevel;
      const instrument = avatar.instrument_type || 'guitarist';

      const STAGES: Record<string, Record<number, { xpThreshold: number; assetPath: string }>> = {
        guitarist: {
          1: { xpThreshold: 0, assetPath: '/avatars/hero_guitarist_lvl1.png' },
          2: { xpThreshold: 100, assetPath: '/avatars/hero_guitarist_lvl2.png' },
          3: { xpThreshold: 300, assetPath: '/avatars/hero_guitarist_lvl3.png' }
        },
        drummer: {
          1: { xpThreshold: 0, assetPath: '/avatars/hero_drummer_lvl1.png' },
          2: { xpThreshold: 100, assetPath: '/avatars/hero_drummer_lvl2.png' },
          3: { xpThreshold: 300, assetPath: '/avatars/hero_drummer_lvl3.png' }
        },
        keyboardist: {
          1: { xpThreshold: 0, assetPath: '/avatars/hero_keys_lvl1.png' },
          2: { xpThreshold: 100, assetPath: '/avatars/hero_keys_lvl2.png' },
          3: { xpThreshold: 300, assetPath: '/avatars/hero_keys_lvl3.png' }
        },
        vocalist: {
          1: { xpThreshold: 0, assetPath: '/avatars/hero_vocals_lvl1.png' },
          2: { xpThreshold: 100, assetPath: '/avatars/hero_vocals_lvl2.png' },
          3: { xpThreshold: 300, assetPath: '/avatars/hero_vocals_lvl3.png' }
        }
      };

      const heroStages = STAGES[instrument] || STAGES.guitarist;
      if (currentXp >= heroStages[3].xpThreshold) {
        newLevel = 3;
      } else if (currentXp >= heroStages[2].xpThreshold) {
        newLevel = 2;
      } else {
        newLevel = 1;
      }

      const nextAssetPath = heroStages[newLevel].assetPath;

      await supabase
        .from('avatars')
        .update({
          xp: currentXp,
          evolution_level: newLevel,
          asset_path: nextAssetPath,
          streak_flame: streakFlame,
          last_focus_date: todayStr
        })
        .eq('id', avatar.id);

      // Sync user profile avatar_url
      await supabase
        .from('users')
        .update({ avatar_url: nextAssetPath })
        .eq('id', studentId);
    }

    res.status(200).json({
      success: true,
      message: 'Übe-Session erfolgreich beendet.',
      stats: {
        totalFocusMinutes: totalFocus,
        monthlyFocusMinutes: monthlyFocus,
        streakFlame: streakFlame,
        currentXp,
        xpAdded
      }
    });

  } catch (err: any) {
    res.status(500).json({ error: 'Internal Server Error', details: err.message });
  }
}
