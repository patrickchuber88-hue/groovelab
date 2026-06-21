-- Migration: 186_create_invoices_table.sql
CREATE TABLE IF NOT EXISTS public.invoices (
    id VARCHAR(50) PRIMARY KEY,
    school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL, -- 'INF' (Infrastructure/Modules), 'AKT' (Student activations)
    amount NUMERIC(10, 2) NOT NULL,
    status VARCHAR(50) DEFAULT 'open', -- 'open', 'paid', 'overdue', 'cancelled'
    billing_date DATE NOT NULL DEFAULT CURRENT_DATE,
    due_date DATE NOT NULL,
    paid_at TIMESTAMP WITH TIME ZONE,
    items JSONB DEFAULT '[]'::jsonb, -- detail items for print layout
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

-- Select policy: schools view their own, master admins view all
DROP POLICY IF EXISTS "Schools can view their own invoices" ON public.invoices;
CREATE POLICY "Schools can view their own invoices" 
    ON public.invoices FOR SELECT 
    USING (
        school_id = (SELECT school_id FROM public.users WHERE id = auth.uid()) 
        OR public.is_master_admin()
    );

-- All operations policy for master admins
DROP POLICY IF EXISTS "Master admins have full control on invoices" ON public.invoices;
CREATE POLICY "Master admins have full control on invoices" 
    ON public.invoices FOR ALL 
    USING (public.is_master_admin());

-- Add index on school_id for performance
CREATE INDEX IF NOT EXISTS invoices_school_id_idx ON public.invoices(school_id);
