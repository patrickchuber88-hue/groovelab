-- Migration: 217_add_disk_metrics_to_server_metrics.sql
-- Description: Add disk and volume metrics columns to server_metrics table for live tracking.

ALTER TABLE public.server_metrics 
ADD COLUMN IF NOT EXISTS disk_used_gb DOUBLE PRECISION DEFAULT 18.0,
ADD COLUMN IF NOT EXISTS disk_total_gb DOUBLE PRECISION DEFAULT 40.0,
ADD COLUMN IF NOT EXISTS volume_used_gb DOUBLE PRECISION DEFAULT 2.1,
ADD COLUMN IF NOT EXISTS volume_total_gb DOUBLE PRECISION DEFAULT 14.0;
