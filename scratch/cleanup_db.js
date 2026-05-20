import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://msyxlqljswpertszbotf.supabase.co';
const supabaseAnonKey = 'sb_publishable_GF8tj3-jMPuOUGMC5tDamA_NUrNyGh4';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function cleanupDb() {
  try {
    const { data: skills, error } = await supabase
      .from('user_song_skills')
      .select('id, formation_group')
      .not('formation_group', 'is', null);

    if (error) throw error;

    console.log('Found skills with formation groups:', skills.length);

    for (const skill of skills) {
      const fg = skill.formation_group;
      if (fg && fg.includes('pool_')) {
        // Find the song ID and level and index
        // e.g. "pool_2ca8b80c-41cc-4691-9c01-d44718cdca68_starter_pool_..."
        // We want to extract the first prefix part and the trailing number.
        // Let's find the last '_0' or '_1' etc.
        const matchIndex = fg.match(/_(\d+)$/);
        const idx = matchIndex ? matchIndex[1] : '0';
        
        // Match the first UUID in the string
        const uuidMatch = fg.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
        const songId = uuidMatch ? uuidMatch[0] : '';
        
        // Find if starter or original
        const level = fg.includes('original') ? 'original' : 'starter';

        if (songId) {
          const cleanId = `pool_${songId}_${level}_${idx}`;
          if (cleanId !== fg) {
            console.log(`Updating skill ${skill.id}: "${fg}" -> "${cleanId}"`);
            const { error: updateError } = await supabase
              .from('user_song_skills')
              .update({ formation_group: cleanId })
              .eq('id', skill.id);
            
            if (updateError) console.error('Update failed:', updateError);
          }
        }
      }
    }
    console.log('Cleanup complete!');
  } catch (err) {
    console.error('Error during cleanup:', err);
  }
}

cleanupDb();
