-- Add show_messages_menu column to users table to allow hiding messages board for specific students
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS show_messages_menu BOOLEAN DEFAULT true;

-- Refresh schema cache
COMMENT ON COLUMN public.users.show_messages_menu IS 'Controls whether the Nachrichten (messages) menu point is visible in the student profile';
