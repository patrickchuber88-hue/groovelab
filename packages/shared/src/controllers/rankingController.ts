import { Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase Client
const supabaseUrl = process.env.SUPABASE_URL || 'https://supabase.178.105.10.2.sslip.io';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

/**
 * GET /api/ranking/global
 * query parameters: schoolId, userId
 */
export async function getGlobalRankingHandler(req: Request, res: Response): Promise<void> {
  try {
    const { schoolId, userId } = req.query;

    // 1. Fetch all schools to verify bypass filters
    const { data: schools, error: schoolsError } = await supabase
      .from('schools')
      .select('id, name, allow_global_ranking');

    if (schoolsError || !schools) {
      res.status(500).json({ error: 'Failed to fetch schools.', details: schoolsError?.message });
      return;
    }

    // 2. Resolve the requesting school ID
    let userSchoolId = schoolId as string;
    if (!userSchoolId && userId) {
      const { data: user } = await supabase
        .from('users')
        .select('school_id')
        .eq('id', userId)
        .maybeSingle();
      if (user) {
        userSchoolId = user.school_id;
      }
    }

    if (!userSchoolId) {
      res.status(400).json({ error: 'schoolId or userId is required to identify your school context.' });
      return;
    }

    // BYPASS-FILTER check: if requesting school has allow_global_ranking === false, block retrieve
    const requestingSchool = schools.find(s => s.id === userSchoolId);
    if (!requestingSchool || !requestingSchool.allow_global_ranking) {
      res.status(403).json({ error: 'Global ranking access is disabled for your school.' });
      return;
    }

    // 3. Fetch all student-users
    const { data: students, error: studentsError } = await supabase
      .from('users')
      .select('id, school_id')
      .eq('role', 'student');

    if (studentsError || !students) {
      res.status(500).json({ error: 'Failed to fetch student list.', details: studentsError?.message });
      return;
    }

    // 4. Fetch student practice stats (monthly focus minutes)
    const { data: stats, error: statsError } = await supabase
      .from('student_stats')
      .select('student_id, monthly_focus_minutes');

    if (statsError || !stats) {
      res.status(500).json({ error: 'Failed to fetch student statistics.', details: statsError?.message });
      return;
    }

    // Map stats by student_id
    const statsMap = new Map<string, number>();
    stats.forEach(s => {
      statsMap.set(s.student_id, s.monthly_focus_minutes || 0);
    });

    // Group total minutes and count students per school
    const schoolGroups = new Map<string, { totalMinutes: number; studentCount: number }>();
    students.forEach(student => {
      if (!schoolGroups.has(student.school_id)) {
        schoolGroups.set(student.school_id, { totalMinutes: 0, studentCount: 0 });
      }
      const group = schoolGroups.get(student.school_id)!;
      group.studentCount += 1;
      group.totalMinutes += statsMap.get(student.id) || 0;
    });

    // 5. Calculate Relative-Fokus-Index (RFI) for allowed schools
    const rankingList = schools
      .filter(school => school.allow_global_ranking === true)
      .map(school => {
        const group = schoolGroups.get(school.id) || { totalMinutes: 0, studentCount: 0 };
        const divisor = group.studentCount > 0 ? group.studentCount : 1;
        const rfi = Number((group.totalMinutes / divisor).toFixed(2));
        return {
          name: school.name,
          rfi,
          isOwnSchool: school.id === userSchoolId
        };
      });

    // Sort descending by RFI
    rankingList.sort((a, b) => b.rfi - a.rfi);

    // Assign rank numbers
    const ranked = rankingList.map((item, index) => ({
      rank: index + 1,
      name: item.name,
      rfi: item.rfi,
      isOwnSchool: item.isOwnSchool
    }));

    // GDPR Wall Enforcement: Response contains ONLY rank, school name, RFI, and ownership flag
    res.status(200).json({
      success: true,
      ranking: ranked
    });

  } catch (err: any) {
    res.status(500).json({ error: 'Internal Server Error', details: err.message });
  }
}
