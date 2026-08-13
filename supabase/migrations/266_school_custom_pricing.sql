-- Migration 266: B2B School-Specific Custom Pricing, Grandfathering Rate Lock, and Pricing Tiers
-- Enables Enterprise SaaS Multi-Tenant Custom Pricing per Music School

ALTER TABLE public.schools
ADD COLUMN IF NOT EXISTS custom_price_campus NUMERIC(10, 2) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS custom_price_groovelab NUMERIC(10, 2) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS custom_price_kombi NUMERIC(10, 2) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS custom_price_teacher NUMERIC(10, 2) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS custom_price_student NUMERIC(10, 2) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS custom_free_months_per_year INTEGER DEFAULT NULL,
ADD COLUMN IF NOT EXISTS locked_contract_pricing JSONB DEFAULT NULL,
ADD COLUMN IF NOT EXISTS pricing_tier_name VARCHAR(100) DEFAULT 'Standard',
ADD COLUMN IF NOT EXISTS contract_price_locked_at TIMESTAMPTZ DEFAULT NULL;

COMMENT ON COLUMN public.schools.custom_price_campus IS 'Custom Campus module flat rate override in €/mo for this music school';
COMMENT ON COLUMN public.schools.custom_price_groovelab IS 'Custom GrooveLab module flat rate override in €/mo for this music school';
COMMENT ON COLUMN public.schools.custom_price_kombi IS 'Custom Kombi bundle flat rate override in €/mo for this music school';
COMMENT ON COLUMN public.schools.custom_price_teacher IS 'Custom teacher/staff service fee in €/mo for this music school';
COMMENT ON COLUMN public.schools.custom_price_student IS 'Custom student activation fee in €/mo for this music school';
COMMENT ON COLUMN public.schools.custom_free_months_per_year IS 'Custom free months per year override for this music school';
COMMENT ON COLUMN public.schools.locked_contract_pricing IS 'Snapshot of master prices locked at contract signup date (Bestandsschutz-Tarif)';
COMMENT ON COLUMN public.schools.pricing_tier_name IS 'Pricing tier designation (Standard, VdM-Großschule, Rahmenvertrag, Partner-Sondertarif)';
COMMENT ON COLUMN public.schools.contract_price_locked_at IS 'Timestamp when the school contract price lock was established';
