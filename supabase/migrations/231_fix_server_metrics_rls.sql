-- Migration: 231_fix_server_metrics_rls.sql
-- Fix RLS policy for server_metrics to allow anon role (for localhost bypass)

DROP POLICY IF EXISTS "Master admins can view server metrics" ON public.server_metrics;

CREATE POLICY "Master admins can view server metrics" 
ON public.server_metrics 
FOR SELECT 
TO authenticated, anon
USING (public.is_master_admin());
