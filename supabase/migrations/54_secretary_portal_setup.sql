-- Sprint 5 - Modul 1: Sekretariat-Portal Setup
ALTER TABLE schools ADD COLUMN IF NOT EXISTS secretary_onboarding_token UUID UNIQUE DEFAULT uuid_generate_v4();
ALTER TABLE schools ADD COLUMN IF NOT EXISTS groovelab_kiosk_token VARCHAR(255) UNIQUE DEFAULT uuid_generate_v4()::text;
ALTER TABLE schools ADD COLUMN IF NOT EXISTS campus_login_token VARCHAR(255) UNIQUE DEFAULT uuid_generate_v4()::text;
ALTER TABLE schools ADD COLUMN IF NOT EXISTS allow_messages_global BOOLEAN DEFAULT TRUE;
