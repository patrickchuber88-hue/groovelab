-- Migration: 264_master_pricing_audit_log.sql
-- Description: Create audit log table for master pricing changes with RLS

CREATE TABLE IF NOT EXISTS public.master_pricing_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  changed_by_user_id UUID,
  changed_by_name TEXT,
  old_price_campus NUMERIC(10, 2),
  new_price_campus NUMERIC(10, 2),
  old_price_groovelab NUMERIC(10, 2),
  new_price_groovelab NUMERIC(10, 2),
  old_price_kombi NUMERIC(10, 2),
  new_price_kombi NUMERIC(10, 2),
  old_price_teacher NUMERIC(10, 2),
  new_price_teacher NUMERIC(10, 2),
  old_price_student NUMERIC(10, 2),
  new_price_student NUMERIC(10, 2),
  old_free_months INTEGER,
  new_free_months INTEGER,
  change_scope TEXT DEFAULT 'new_only',
  affected_schools_count INTEGER DEFAULT 0
);

ALTER TABLE public.master_pricing_audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow master admin select on master_pricing_audit_log" ON public.master_pricing_audit_log;
CREATE POLICY "Allow master admin select on master_pricing_audit_log" 
  ON public.master_pricing_audit_log FOR SELECT 
  USING (public.is_master_admin());

DROP POLICY IF EXISTS "Allow master admin insert on master_pricing_audit_log" ON public.master_pricing_audit_log;
CREATE POLICY "Allow master admin insert on master_pricing_audit_log" 
  ON public.master_pricing_audit_log FOR INSERT 
  WITH CHECK (public.is_master_admin());

ALTER PUBLICATION supabase_realtime ADD TABLE public.master_pricing_audit_log;
