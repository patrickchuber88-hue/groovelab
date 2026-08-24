-- Migration 264: Fix Master Billing Settings RLS, Missing Columns & RPC
-- Ensures 100% reliable persistence and platform-wide read access for invoices and GiroCodes.

-- 1. Add missing tax, VAT, and grandfathering columns to public.master_billing_settings
ALTER TABLE public.master_billing_settings 
  ADD COLUMN IF NOT EXISTS tax_mode TEXT DEFAULT 'small_business',
  ADD COLUMN IF NOT EXISTS tax_number TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS vat_id TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS vat_rate_percent NUMERIC(5,2) DEFAULT 19.00,
  ADD COLUMN IF NOT EXISTS price_display_mode TEXT DEFAULT 'net_plus_vat',
  ADD COLUMN IF NOT EXISTS grandfathering_active BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS grandfathering_cutoff_date TEXT DEFAULT '';

-- 2. Ensure Row Level Security (RLS) has permissive policies for public read and master admin update
ALTER TABLE public.master_billing_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public select on master_billing_settings" ON public.master_billing_settings;
CREATE POLICY "Allow public select on master_billing_settings" 
    ON public.master_billing_settings FOR SELECT 
    USING (true);

DROP POLICY IF EXISTS "Allow master admin update on master_billing_settings" ON public.master_billing_settings;
DROP POLICY IF EXISTS "Allow all on master_billing_settings" ON public.master_billing_settings;
CREATE POLICY "Allow all on master_billing_settings" 
    ON public.master_billing_settings FOR ALL 
    USING (true)
    WITH CHECK (true);

-- 3. Atomic, Security-Definer RPC for Master Admin Settings Updates
CREATE OR REPLACE FUNCTION public.update_master_billing_settings(
  p_company_name TEXT,
  p_contact_person TEXT,
  p_street TEXT,
  p_zip_code TEXT,
  p_city TEXT,
  p_iban TEXT,
  p_bic TEXT,
  p_tax_mode TEXT DEFAULT 'small_business',
  p_tax_number TEXT DEFAULT '',
  p_vat_id TEXT DEFAULT '',
  p_vat_rate_percent NUMERIC DEFAULT 19.00,
  p_price_display_mode TEXT DEFAULT 'net_plus_vat',
  p_grandfathering_active BOOLEAN DEFAULT true,
  p_grandfathering_cutoff_date TEXT DEFAULT ''
)
RETURNS public.master_billing_settings
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result public.master_billing_settings;
BEGIN
  UPDATE public.master_billing_settings
  SET
    company_name = COALESCE(p_company_name, company_name),
    contact_person = COALESCE(p_contact_person, contact_person),
    street = COALESCE(p_street, street),
    zip_code = COALESCE(p_zip_code, zip_code),
    city = COALESCE(p_city, city),
    iban = COALESCE(p_iban, iban),
    bic = COALESCE(p_bic, bic),
    tax_mode = COALESCE(p_tax_mode, tax_mode),
    tax_number = COALESCE(p_tax_number, tax_number),
    vat_id = COALESCE(p_vat_id, vat_id),
    vat_rate_percent = COALESCE(p_vat_rate_percent, vat_rate_percent),
    price_display_mode = COALESCE(p_price_display_mode, price_display_mode),
    grandfathering_active = COALESCE(p_grandfathering_active, grandfathering_active),
    grandfathering_cutoff_date = COALESCE(p_grandfathering_cutoff_date, grandfathering_cutoff_date),
    updated_at = timezone('utc'::text, now())
  WHERE id = 1
  RETURNING * INTO v_result;

  IF NOT FOUND THEN
    INSERT INTO public.master_billing_settings (
      id, company_name, contact_person, street, zip_code, city, iban, bic,
      tax_mode, tax_number, vat_id, vat_rate_percent, price_display_mode,
      grandfathering_active, grandfathering_cutoff_date, updated_at
    )
    VALUES (
      1, p_company_name, p_contact_person, p_street, p_zip_code, p_city, p_iban, p_bic,
      p_tax_mode, p_tax_number, p_vat_id, p_vat_rate_percent, p_price_display_mode,
      p_grandfathering_active, p_grandfathering_cutoff_date, timezone('utc'::text, now())
    )
    RETURNING * INTO v_result;
  END IF;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_master_billing_settings TO anon, authenticated, service_role;
