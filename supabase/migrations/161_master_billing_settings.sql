CREATE TABLE IF NOT EXISTS public.master_billing_settings (
    id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    company_name TEXT DEFAULT 'Simplified Work GbR',
    contact_person TEXT DEFAULT 'Patrick Huber',
    street TEXT DEFAULT 'Karl-Fürstenberg-Str. 59',
    zip_code TEXT DEFAULT '79618',
    city TEXT DEFAULT 'Rheinfelden',
    iban TEXT DEFAULT '',
    bic TEXT DEFAULT '',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Row Level Security
ALTER TABLE public.master_billing_settings ENABLE ROW LEVEL SECURITY;

-- Allow select for anyone (to show on invoices)
DROP POLICY IF EXISTS "Allow public select on master_billing_settings" ON public.master_billing_settings;
CREATE POLICY "Allow public select on master_billing_settings" 
    ON public.master_billing_settings FOR SELECT USING (true);

-- Allow updates only for master admin
DROP POLICY IF EXISTS "Allow master admin update on master_billing_settings" ON public.master_billing_settings;
CREATE POLICY "Allow master admin update on master_billing_settings" 
    ON public.master_billing_settings FOR ALL 
    USING (public.is_master_admin())
    WITH CHECK (public.is_master_admin());

-- Seed the initial row
INSERT INTO public.master_billing_settings (id, company_name, contact_person, street, zip_code, city, iban, bic)
VALUES (1, 'Simplified Work GbR', 'Patrick Huber', 'Karl-Fürstenberg-Str. 59', '79618', 'Rheinfelden', '', '')
ON CONFLICT (id) DO NOTHING;
