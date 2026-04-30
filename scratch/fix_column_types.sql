-- Convert bands and projects to JSONB safely
-- 1. Temporary columns
ALTER TABLE users ADD COLUMN bands_jsonb JSONB DEFAULT '[]'::jsonb;
ALTER TABLE users ADD COLUMN projects_jsonb JSONB DEFAULT '[]'::jsonb;

-- 2. Data migration
-- We try to parse the existing text as JSON if it looks like JSON, 
-- otherwise we wrap it in an array or default to empty array.
UPDATE users SET 
  bands_jsonb = CASE 
    WHEN bands IS NULL OR bands = '' THEN '[]'::jsonb
    WHEN bands LIKE '[%' THEN bands::jsonb
    ELSE jsonb_build_array(bands)
  END,
  projects_jsonb = CASE 
    WHEN projects IS NULL OR projects = '' THEN '[]'::jsonb
    WHEN projects LIKE '[%' THEN projects::jsonb
    ELSE jsonb_build_array(projects)
  END;

-- 3. Drop old columns and rename new ones
ALTER TABLE users DROP COLUMN bands;
ALTER TABLE users DROP COLUMN projects;
ALTER TABLE users RENAME COLUMN bands_jsonb TO bands;
ALTER TABLE users RENAME COLUMN projects_jsonb TO projects;
