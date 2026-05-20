-- Enable realtime for user_song_skills
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime'
  ) THEN
    -- Check if it is already in the publication
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_rel pr
      JOIN pg_class c ON pr.prrelid = c.oid
      JOIN pg_publication p ON pr.prpubid = p.oid
      WHERE p.pubname = 'supabase_realtime' AND c.relname = 'user_song_skills'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE user_song_skills;
    END IF;
  END IF;
END $$;
