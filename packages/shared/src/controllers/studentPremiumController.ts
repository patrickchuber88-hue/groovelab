import { Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase Client
const supabaseUrl = process.env.SUPABASE_URL || 'https://supabase.178.105.10.2.sslip.io';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

/**
 * POST /api/billing/checkout
 * Body: { userId }
 */
export async function checkoutHandler(req: Request, res: Response): Promise<void> {
  try {
    const { userId } = req.body;
    if (!userId) {
      res.status(400).json({ error: 'userId is required.' });
      return;
    }

    // Mock Stripe Session URL by pointing back to a success page
    const frontendUrl = req.get('origin') || process.env.FRONTEND_URL || 'https://campus-groovelab.de';
    const checkoutUrl = `${frontendUrl}/success?session_id=mock_stripe_session_${Date.now()}&user_id=${userId}`;

    res.status(200).json({
      success: true,
      message: 'Stripe Checkout-Sitzung erfolgreich erstellt.',
      checkoutUrl
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Internal Server Error', details: err.message });
  }
}

/**
 * POST /api/complete-detox
 * Body: { userId, durationMinutes }
 */
export async function completeDetoxHandler(req: Request, res: Response): Promise<void> {
  try {
    const { userId, durationMinutes } = req.body;
    if (!userId || !durationMinutes) {
      res.status(400).json({ error: 'userId and durationMinutes are required.' });
      return;
    }

    // 1. Fetch student stats
    const { data: stats } = await supabase
      .from('student_stats')
      .select('*')
      .eq('student_id', userId)
      .maybeSingle();

    const todayStr = new Date().toISOString().split('T')[0];
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    let totalFocus = durationMinutes;
    let monthlyFocus = durationMinutes;
    let currentXp = durationMinutes;
    let streakFlame = 1;
    let lastPracticeDate = null;

    if (stats) {
      totalFocus = (stats.total_focus_minutes || 0) + durationMinutes;
      monthlyFocus = (stats.monthly_focus_minutes || 0) + durationMinutes;
      currentXp = (stats.current_xp || 0) + durationMinutes;
      streakFlame = stats.streak_flame || 0;
      lastPracticeDate = stats.last_practice_date ? String(stats.last_practice_date) : null;
    }

    if (lastPracticeDate === yesterdayStr) {
      streakFlame += 1;
    } else if (lastPracticeDate === todayStr) {
      // already practiced today, keep streak same
    } else {
      streakFlame = 1;
    }

    // 2. Update student stats
    await supabase.from('student_stats').upsert({
      student_id: userId,
      total_focus_minutes: totalFocus,
      monthly_focus_minutes: monthlyFocus,
      streak_flame: streakFlame,
      last_practice_date: todayStr,
      current_xp: currentXp,
      updated_at: new Date().toISOString()
    });

    // 3. Log focus minutes
    await supabase.from('fokus_logs').insert({
      user_id: userId,
      duration_minutes: durationMinutes,
      created_at: new Date().toISOString()
    });

    // 4. Update avatar table
    const { data: avatar } = await supabase
      .from('avatars')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (avatar) {
      await supabase.from('avatars').update({
        xp: currentXp,
        streak_flame: streakFlame,
        last_focus_date: todayStr
      }).eq('id', avatar.id);
    }

    res.status(200).json({
      success: true,
      stats: {
        xpAdded: durationMinutes * 10,
        streakFlame,
        focusMinutes: durationMinutes
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Internal Server Error', details: err.message });
  }
}

/**
 * POST /api/student/finish-session
 * Body: { studentId, topicName, durationMinutes }
 */
export async function finishSessionHandler(req: Request, res: Response): Promise<void> {
  // Map completeDetox logic but with topicName logged as well
  try {
    const { studentId, topicName, durationMinutes } = req.body;
    if (!studentId || !topicName || !durationMinutes) {
      res.status(400).json({ error: 'studentId, topicName and durationMinutes are required.' });
      return;
    }

    // Reuse completeDetox db operations
    const { data: stats } = await supabase
      .from('student_stats')
      .select('*')
      .eq('student_id', studentId)
      .maybeSingle();

    const todayStr = new Date().toISOString().split('T')[0];
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    let totalFocus = durationMinutes;
    let monthlyFocus = durationMinutes;
    let currentXp = durationMinutes * 15; // 15 XP per minute for session training
    let streakFlame = 1;
    let lastPracticeDate = null;

    if (stats) {
      totalFocus = (stats.total_focus_minutes || 0) + durationMinutes;
      monthlyFocus = (stats.monthly_focus_minutes || 0) + durationMinutes;
      currentXp = (stats.current_xp || 0) + (durationMinutes * 15);
      streakFlame = stats.streak_flame || 0;
      lastPracticeDate = stats.last_practice_date ? String(stats.last_practice_date) : null;
    }

    if (lastPracticeDate === yesterdayStr) {
      streakFlame += 1;
    } else if (lastPracticeDate === todayStr) {
      // already practiced
    } else {
      streakFlame = 1;
    }

    await supabase.from('student_stats').upsert({
      student_id: studentId,
      total_focus_minutes: totalFocus,
      monthly_focus_minutes: monthlyFocus,
      streak_flame: streakFlame,
      last_practice_date: todayStr,
      current_xp: currentXp,
      updated_at: new Date().toISOString()
    });

    await supabase.from('fokus_logs').insert({
      user_id: studentId,
      duration_minutes: durationMinutes,
      topic_name: topicName,
      created_at: new Date().toISOString()
    });

    const { data: avatar } = await supabase
      .from('avatars')
      .select('*')
      .eq('user_id', studentId)
      .maybeSingle();

    if (avatar) {
      await supabase.from('avatars').update({
        xp: currentXp,
        streak_flame: streakFlame,
        last_focus_date: todayStr
      }).eq('id', avatar.id);
    }

    res.status(200).json({
      success: true,
      stats: {
        xpAdded: durationMinutes * 15,
        streakFlame,
        focusMinutes: durationMinutes
      }
    });

  } catch (err: any) {
    res.status(500).json({ error: 'Internal Server Error', details: err.message });
  }
}

/**
 * GET /api/wrapped
 * Query: ?userId=...
 */
export async function getWrappedHandler(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.query.userId as string;
    if (!userId) {
      res.status(400).json({ error: 'userId parameter is required.' });
      return;
    }

    // Check Premium active status
    const { data: premiumInfo } = await supabase
      .from('premium_status')
      .select('is_premium_active')
      .eq('student_id', userId)
      .maybeSingle();

    const isPremium = premiumInfo?.is_premium_active ?? false;

    // Fetch Stats
    const { data: stats } = await supabase
      .from('student_stats')
      .select('*')
      .eq('student_id', userId)
      .maybeSingle();

    // Fetch Mastered songs count
    const { count: masteredCount } = await supabase
      .from('progress_matrix')
      .select('id', { count: 'exact', head: true })
      .eq('student_id', userId)
      .eq('status', 'MASTERED');

    res.status(200).json({
      success: true,
      isPremium,
      avatarStyle: isPremium ? 'Premium_Hero' : 'Standard_Silhouette',
      monthlyFlashback: {
        focusMinutes: isPremium ? (stats?.monthly_focus_minutes || 120) : null,
        masteredSongsCount: isPremium ? (masteredCount || 0) : null,
        badgeName: isPremium ? 'Fokus-Gott des Monats 🏆' : 'Gesperrt 🔒',
        badgeCode: 'Badge_Wrapped_2026'
      },
      campusWrapped: {
        focusMinutes: isPremium ? (stats?.total_focus_minutes || 480) : null,
        masteredSongsCount: isPremium ? (masteredCount || 0) : null
      }
    });

  } catch (err: any) {
    res.status(500).json({ error: 'Internal Server Error', details: err.message });
  }
}
