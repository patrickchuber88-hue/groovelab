-- Migration 471: Master Pricing CHF & Lifetime Protection Goldstandard
-- Classification: Tier-1 SaaS Enterprise+ Multi-Currency & Fair B2B School Pricing Governance
-- Scope: Multi-Currency Support (EUR & CHF - +30% pauschal auf 5 oder 0 Rappen aufgerundet), Storage Tiers, and Canonical Billing Settings

ALTER TABLE public.master_billing_settings
  ADD COLUMN IF NOT EXISTS price_module_campus_chf NUMERIC(10, 2) DEFAULT 25.90,
  ADD COLUMN IF NOT EXISTS price_module_groovelab_chf NUMERIC(10, 2) DEFAULT 16.80,
  ADD COLUMN IF NOT EXISTS price_module_kombi_chf NUMERIC(10, 2) DEFAULT 32.50,
  ADD COLUMN IF NOT EXISTS price_user_teacher_chf NUMERIC(10, 2) DEFAULT 0.65,
  ADD COLUMN IF NOT EXISTS price_user_student_chf NUMERIC(10, 2) DEFAULT 0.65,
  ADD COLUMN IF NOT EXISTS price_user_passive_student_chf NUMERIC(10, 2) DEFAULT 0.15,
  ADD COLUMN IF NOT EXISTS price_storage_addon_chf NUMERIC(10, 2) DEFAULT 3.80,
  ADD COLUMN IF NOT EXISTS storage_tiers_eur JSONB DEFAULT '[
    {"gb": 0, "price": 0, "label": "10 GB Basis", "sublabel": "Inklusive (Hard Cap)"},
    {"gb": 10, "price": 2.90, "label": "+10 GB", "sublabel": "Gesamt 20 GB (Verdoppler)", "popular": true},
    {"gb": 25, "price": 4.90, "label": "+25 GB", "sublabel": "Gesamt 35 GB (Bis 250 Sch.)"},
    {"gb": 50, "price": 8.90, "label": "+50 GB", "sublabel": "Gesamt 60 GB (Beliebt)"},
    {"gb": 100, "price": 14.90, "label": "+100 GB", "sublabel": "Gesamt 110 GB"},
    {"gb": 250, "price": 19.90, "label": "+250 GB", "sublabel": "Gesamt 260 GB (Archiv)"}
  ]'::jsonb,
  ADD COLUMN IF NOT EXISTS storage_tiers_chf JSONB DEFAULT '[
    {"gb": 0, "price": 0, "label": "10 GB Basis", "sublabel": "Inklusive (Hard Cap)"},
    {"gb": 10, "price": 3.80, "label": "+10 GB", "sublabel": "Gesamt 20 GB (Verdoppler)", "popular": true},
    {"gb": 25, "price": 6.40, "label": "+25 GB", "sublabel": "Gesamt 35 GB (Bis 250 Sch.)"},
    {"gb": 50, "price": 11.60, "label": "+50 GB", "sublabel": "Gesamt 60 GB (Beliebt)"},
    {"gb": 100, "price": 19.40, "label": "+100 GB", "sublabel": "Gesamt 110 GB"},
    {"gb": 250, "price": 25.90, "label": "+250 GB", "sublabel": "Gesamt 260 GB (Archiv)"}
  ]'::jsonb;

-- Ensure default initial row exists with correct Fair B2B School values
UPDATE public.master_billing_settings
SET
  price_module_campus = COALESCE(price_module_campus, 19.90),
  price_module_groovelab = COALESCE(price_module_groovelab, 12.90),
  price_module_kombi = COALESCE(price_module_kombi, 24.90),
  price_module_campus_chf = COALESCE(price_module_campus_chf, 25.90),
  price_module_groovelab_chf = COALESCE(price_module_groovelab_chf, 16.80),
  price_module_kombi_chf = COALESCE(price_module_kombi_chf, 32.50),
  price_user_teacher_chf = COALESCE(price_user_teacher_chf, 0.65),
  price_user_student_chf = COALESCE(price_user_student_chf, 0.65),
  price_user_passive_student_chf = COALESCE(price_user_passive_student_chf, 0.15),
  price_storage_addon_chf = COALESCE(price_storage_addon_chf, 3.80)
WHERE id = 1;
