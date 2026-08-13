-- Migration 268: Complete B2B Billing Address & GoBD/UStG Compliance for Music Schools
-- Adds legal entity name, accounting contact, billing email, street/house number, address addition, country, VAT ID, and Leitweg-ID to public.schools.

ALTER TABLE public.schools
ADD COLUMN IF NOT EXISTS legal_name VARCHAR(255) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS billing_contact_person VARCHAR(255) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS billing_email VARCHAR(255) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS street VARCHAR(255) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS house_number VARCHAR(50) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS address_addition VARCHAR(255) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS country VARCHAR(100) DEFAULT 'Deutschland',
ADD COLUMN IF NOT EXISTS vat_id VARCHAR(50) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS leitweg_id VARCHAR(100) DEFAULT NULL;

COMMENT ON COLUMN public.schools.legal_name IS 'Official legal entity name of the music school or governing body';
COMMENT ON COLUMN public.schools.billing_contact_person IS 'Name of the accounting/finance contact person';
COMMENT ON COLUMN public.schools.billing_email IS 'Dedicated invoice delivery email address (e.g. buchhaltung@musaek.de)';
COMMENT ON COLUMN public.schools.street IS 'Street name of the billing address';
COMMENT ON COLUMN public.schools.house_number IS 'House number of the billing address';
COMMENT ON COLUMN public.schools.address_addition IS 'Address addition (e.g. Building B, Dept. Finance)';
COMMENT ON COLUMN public.schools.country IS 'Country of the billing address (Default: Deutschland)';
COMMENT ON COLUMN public.schools.vat_id IS 'VAT Identification Number (USt-IdNr.) or tax number';
COMMENT ON COLUMN public.schools.leitweg_id IS 'E-Invoicing Leitweg-ID / Buyer Reference for public sector billing (XRechnung / ZUGFeRD)';
