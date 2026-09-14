-- ==============================================================================
-- Migration 432: Removal of Obsolete Co-Parenting Table & RPC
-- Governance: Zero-Mail Platform Integrity & DSGVO Art. 5 Data Minimization
-- ==============================================================================

-- 1. Drop obsolete RPC
DROP FUNCTION IF EXISTS public.invite_coparent(UUID, TEXT, TEXT, TEXT, BOOLEAN, BOOLEAN, BOOLEAN);

-- 2. Drop obsolete table student_parent_relations CASCADE
DROP TABLE IF EXISTS public.student_parent_relations CASCADE;
