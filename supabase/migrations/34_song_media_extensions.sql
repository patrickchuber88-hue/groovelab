-- Migration 34: Add PDF folder URL, Guitar Pro URL, and WLAN bypass check to songs table
ALTER TABLE songs ADD COLUMN IF NOT EXISTS pdf_folder_url TEXT;
ALTER TABLE songs ADD COLUMN IF NOT EXISTS guitar_pro_url TEXT;
ALTER TABLE songs ADD COLUMN IF NOT EXISTS bypass_wlan_check BOOLEAN DEFAULT FALSE;
