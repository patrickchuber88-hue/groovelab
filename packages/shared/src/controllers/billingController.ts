import { Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase Client
const supabaseUrl = process.env.SUPABASE_URL || 'https://supabase.178.105.10.2.sslip.io';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

interface SchoolBillingInvoice {
  schoolId: string;
  schoolName: string;
  subscriptionType: 'standard' | 'solo';
  hasCampus: boolean;
  hasGroovelab: boolean;
  hasKombiDiscount: boolean;
  subscriptionBypass: boolean;
  activeCampusUsers: number;
  baseFee: number;
  userFee: number;
  kombiDiscountAmount: number;
  subtotal: number;
  total: number;
  status: 'trial' | 'active' | 'bypass' | 'suspended';
  
  // New Specification Fields
  totalStudents: number;
  activeStudents: number;
  premiumStudents: number;
  b2bRevenue: number;
  b2cRevenue: number;
  userQuota: number;
  pendingUserQuota: number | null;
}

export async function getBillingMetricsHandler(req: Request, res: Response): Promise<void> {
  try {
    // 1. Authenticate user and verify super_admin/master_admin rights
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      res.status(401).json({ error: 'Authorization header is missing.' });
      return;
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      res.status(401).json({ error: 'Unauthorized or invalid token.' });
      return;
    }

    // Verify master admin / super admin privileges
    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('is_master_admin, role')
      .eq('id', user.id)
      .single();

    if (profileError || !userProfile) {
      res.status(404).json({ error: 'User profile not found.' });
      return;
    }

    if (!userProfile.is_master_admin && userProfile.role !== 'super_admin') {
      res.status(403).json({ error: 'Access forbidden. Only super admins or master admins can access billing metrics.' });
      return;
    }

    // 2. Rollover check for pending quotas
    const now = new Date();
    const { data: schoolsPending, error: pendingError } = await supabase
      .from('schools')
      .select('id, user_quota, pending_user_quota, quota_updated_at')
      .not('pending_user_quota', 'is', null);

    if (!pendingError && schoolsPending) {
      for (const s of schoolsPending) {
        if (s.quota_updated_at) {
          const quotaDate = new Date(s.quota_updated_at);
          const isDifferentMonth = (now.getFullYear() > quotaDate.getFullYear()) ||
                                   (now.getFullYear() === quotaDate.getFullYear() && now.getMonth() > quotaDate.getMonth());
          if (isDifferentMonth) {
            await supabase
              .from('schools')
              .update({
                user_quota: s.pending_user_quota,
                pending_user_quota: null,
                quota_updated_at: null
              })
              .eq('id', s.id);
          }
        }
      }
    }

    // 3. Query all schools
    const { data: schools, error: schoolsError } = await supabase
      .from('schools')
      .select('id, name, subscription_type, has_campus_subscription, has_groovelab_subscription, has_kombi_discount, subscription_bypass, status, is_trial, user_quota, pending_user_quota');

    if (schoolsError || !schools) {
      res.status(500).json({ error: 'Failed to fetch schools.', details: schoolsError?.message });
      return;
    }

    // 4. Query the Postgres database view 'active_licence_metrics'
    const { data: metrics, error: metricsError } = await supabase
      .from('active_licence_metrics')
      .select('school_id, active_campus_users, active_groovelab_users, total_billable_app_users');

    if (metricsError) {
      res.status(500).json({ error: 'Failed to fetch active licence metrics from database view.', details: metricsError.message });
      return;
    }

    // Map metrics for quick lookup
    const metricsMap: Record<string, { active_campus_users: number; active_groovelab_users: number }> = {};
    metrics?.forEach(m => {
      metricsMap[m.school_id] = {
        active_campus_users: m.active_campus_users || 0,
        active_groovelab_users: m.active_groovelab_users || 0
      };
    });

    // 5. Query all users to count student roles and premium statuses
    const { data: allUsers, error: usersError } = await supabase
      .from('users')
      .select('school_id, role, is_active, is_campus_active');

    if (usersError) {
      res.status(500).json({ error: 'Failed to fetch users for billing breakdown.', details: usersError.message });
      return;
    }

    const userStatsMap: Record<string, { totalStudents: number; activeStudents: number; premiumStudents: number }> = {};
    allUsers?.forEach(u => {
      if (u.role === 'student') {
        if (!userStatsMap[u.school_id]) {
          userStatsMap[u.school_id] = { totalStudents: 0, activeStudents: 0, premiumStudents: 0 };
        }
        userStatsMap[u.school_id].totalStudents++;
        if (u.is_active) {
          userStatsMap[u.school_id].activeStudents++;
        }
        if (u.is_campus_active) {
          userStatsMap[u.school_id].premiumStudents++;
        }
      }
    });

    // 6. Calculate monthly billing invoices
    const invoices: SchoolBillingInvoice[] = schools.map(school => {
      const schoolMetric = metricsMap[school.id] || { active_campus_users: 0, active_groovelab_users: 0 };
      const activeCampusUsers = schoolMetric.active_campus_users;

      const stats = userStatsMap[school.id] || { totalStudents: 0, activeStudents: 0, premiumStudents: 0 };
      const totalStudents = stats.totalStudents;
      const activeStudents = stats.activeStudents;
      const premiumStudents = stats.premiumStudents;

      // Base fee determination
      const isSolo = school.subscription_type === 'solo';
      const baseFee = isSolo ? 2.49 : 4.99;

      // SPECIFICATION B2B: Active student accounts (is_active = true) * 0.49 €
      const b2bRevenue = activeStudents * 0.49;
      
      // SPECIFICATION B2C: Premium users count * 9.99 € (standard consumer Premium tier rate)
      const b2cRevenue = premiumStudents * 9.99;

      // User fee (legacy active Campus users fee calculation)
      const userFee = activeCampusUsers * 0.49;

      // Kombi Discount calculation (flat 1.00 € discount if both subscriptions are active)
      const hasKombi = school.has_kombi_discount || (school.has_campus_subscription && school.has_groovelab_subscription);
      const kombiDiscountAmount = hasKombi ? 1.00 : 0.00;

      // Subtotal calculation - using B2B revenue as primary user fee component
      const subtotal = Math.max(0, baseFee + b2bRevenue - kombiDiscountAmount);

      // Bypass condition (if bypass is active, invoice is 0.00 €)
      const isBypass = school.subscription_bypass || false;
      const total = isBypass ? 0.00 : subtotal;

      // Determine billing status
      let status: 'trial' | 'active' | 'bypass' | 'suspended' = 'active';
      if (school.status === 'suspended') {
        status = 'suspended';
      } else if (isBypass) {
        status = 'bypass';
      } else if (school.is_trial) {
        status = 'trial';
      }

      return {
        schoolId: school.id,
        schoolName: school.name,
        subscriptionType: isSolo ? 'solo' : 'standard',
        hasCampus: school.has_campus_subscription || false,
        hasGroovelab: school.has_groovelab_subscription || false,
        hasKombiDiscount: hasKombi,
        subscriptionBypass: isBypass,
        activeCampusUsers,
        baseFee,
        userFee: parseFloat(userFee.toFixed(2)),
        kombiDiscountAmount,
        subtotal: parseFloat(subtotal.toFixed(2)),
        total: parseFloat(total.toFixed(2)),
        status,
        
        // Specification values
        totalStudents,
        activeStudents,
        premiumStudents,
        b2bRevenue: parseFloat(b2bRevenue.toFixed(2)),
        b2cRevenue: parseFloat(b2cRevenue.toFixed(2)),
        userQuota: school.user_quota || 150,
        pendingUserQuota: school.pending_user_quota
      };
    });

    // Calculate global platform metrics
    const totalRevenue = invoices.reduce((sum, inv) => sum + inv.total, 0);
    const totalActiveCampusUsers = invoices.reduce((sum, inv) => sum + inv.activeCampusUsers, 0);
    const bypassedSchools = invoices.filter(inv => inv.subscriptionBypass).length;
    const totalB2BRevenue = invoices.reduce((sum, inv) => sum + inv.b2bRevenue, 0);
    const totalB2CRevenue = invoices.reduce((sum, inv) => sum + inv.b2cRevenue, 0);

    res.status(200).json({
      success: true,
      timestamp: new Date().toISOString(),
      platformSummary: {
        totalSchools: schools.length,
        totalActiveCampusUsers,
        totalMonthlyRevenue: parseFloat(totalRevenue.toFixed(2)),
        bypassedSchools,
        totalB2BRevenue: parseFloat(totalB2BRevenue.toFixed(2)),
        totalB2CRevenue: parseFloat(totalB2CRevenue.toFixed(2))
      },
      invoices
    });

  } catch (err: any) {
    res.status(500).json({ error: 'Internal Server Error', details: err.message });
  }
}
