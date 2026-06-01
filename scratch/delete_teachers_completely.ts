import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: 'apps/groovelab/.env.local' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_ANON_KEY!
);

const EMAILS_TO_DELETE = [
  'patrick.huber@musaek.de',
  'boris@test.com',
  'test'
];

async function run() {
  console.log("Locating and deleting teachers and all their corresponding data...");

  for (const email of EMAILS_TO_DELETE) {
    // 1. Fetch user id
    const { data: user } = await supabase
      .from('users')
      .select('id, first_name, last_name')
      .eq('email', email)
      .single();

    if (!user) {
      console.log(`Teacher with email ${email} not found.`);
      continue;
    }

    console.log(`Deleting teacher ${user.first_name} ${user.last_name} (${email}) and dependent data...`);

    // Delete custom schedules or linked objects if cascade is missing (just in case)
    // E.g., if there are tables like user_progress or sessions, delete them
    await supabase.from('sessions').delete().eq('user_id', user.id);
    await supabase.from('user_progress').delete().eq('user_id', user.id);
    await supabase.from('user_song_skills').delete().eq('user_id', user.id);
    await supabase.from('rejection_history').delete().eq('user_id', user.id);
    await supabase.from('dpa_agreements').delete().eq('user_id', user.id);

    // Finally delete the user row itself
    const { error: deleteError } = await supabase
      .from('users')
      .delete()
      .eq('id', user.id);

    if (deleteError) {
      console.error(`Error deleting user ${email}:`, deleteError);
    } else {
      console.log(`Successfully deleted ${email} from database.`);
    }
  }

  console.log("Cleanup completed.");
}
run();
