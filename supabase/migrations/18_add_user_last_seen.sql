-- Add last_seen to users table to track online presence for all roles
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Update existing users
UPDATE users SET last_seen = NOW() WHERE last_seen IS NULL;
