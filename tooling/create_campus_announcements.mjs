import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || 'https://supabase.campus-groovelab.de',
  process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || ''
);

async function createCampusAnnouncementsTable() {
  console.log('Creating campus_announcements table via insert+upsert workaround...');
  
  // Since we can't run DDL directly, we need to use the Supabase API
  // First, let's try inserting into a table that might not exist yet
  const { data, error } = await supabase
    .from('campus_announcements')
    .select('id')
    .limit(1);
  
  if (error && error.code === 'PGRST205') {
    console.log('Table does not exist. You need to create it manually.');
    console.log('\nRun this SQL in your Supabase SQL Editor:');
    console.log(`
CREATE TABLE IF NOT EXISTS public.campus_announcements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    target_type TEXT DEFAULT 'all' CHECK (target_type IN ('all', 'students', 'teachers')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.campus_announcements DISABLE ROW LEVEL SECURITY;
GRANT ALL ON public.campus_announcements TO authenticated, anon, service_role;
    `);
    return false;
  } else if (!error) {
    console.log('Table already exists!');
    return true;
  } else {
    console.error('Unexpected error:', error);
    return false;
  }
}

createCampusAnnouncementsTable();
