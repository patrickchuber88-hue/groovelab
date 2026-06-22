-- 📊 GrooveLab Server Metrics Table and Policies
-- Erstellt die Tabelle für Server-Leistungsmetriken (CPU, RAM, Verbindungen) und schützt sie mit RLS.

CREATE TABLE IF NOT EXISTS public.server_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    cpu_load DOUBLE PRECISION NOT NULL,
    mem_used_mb INTEGER NOT NULL,
    mem_total_mb INTEGER NOT NULL,
    swap_used_mb INTEGER NOT NULL,
    active_connections INTEGER NOT NULL
);

-- RLS aktivieren
ALTER TABLE public.server_metrics ENABLE ROW LEVEL SECURITY;

-- Richtlinien erstellen (Nur Master-Admins dürfen Metriken abrufen)
CREATE POLICY "Master admins can view server metrics" 
ON public.server_metrics 
FOR SELECT 
TO authenticated 
USING (is_master_admin());

-- Ermöglicht dem Service-Role / Postgres-Rolle das Einfügen
CREATE POLICY "Service role can insert server metrics" 
ON public.server_metrics 
FOR INSERT 
TO service_role 
WITH CHECK (true);

-- Berechtigungen erteilen
GRANT SELECT ON public.server_metrics TO authenticated;
GRANT INSERT ON public.server_metrics TO service_role;
GRANT INSERT ON public.server_metrics TO anon; -- Für anonyme / lokale Tests falls nötig

-- Index für schnelles zeitliches Abfragen erstellen
CREATE INDEX IF NOT EXISTS idx_server_metrics_created_at ON public.server_metrics(created_at DESC);
