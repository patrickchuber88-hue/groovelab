import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const env = fs.readFileSync('/Users/patrickhuber/Documents/Antigravity Projects/Groovelab app/.env.local', 'utf-8');
const url = env.match(/VITE_SUPABASE_URL=(.*)/)[1].trim();
const key = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1].trim();
const supabase = createClient(url, key);

// Helper function to normalize instruments
const normalize = (name) => {
  if (!name) return "";
  const n = (name || "").toLowerCase().trim();
  if (n.includes('guitar') || n.includes('gitarre')) return 'E-Gitarre';
  if (n.includes('bass')) return 'E-Bass';
  if (n.includes('drum') || n.includes('schlagzeug')) return 'E-Drums';
  if (n.includes('vocals') || n.includes('gesang') || n.includes('stimme')) return 'Vocals';
  if (n.includes('piano') || n.includes('keys') || n.includes('klavier') || n.includes('e-piano')) return 'E-Piano';
  return name;
};

async function fixSongs() {
  console.log("Fetching active band songs...");
  const { data: bandSongs, error: bsErr } = await supabase
    .from('band_songs')
    .select(`
      id,
      band_id,
      song_id,
      status,
      songs (id, title, instrumentation),
      bands (id, name, song_id),
      band_song_slots (id, user_id, instrument)
    `)
    .eq('status', 'active');

  if (bsErr) {
    console.error("Error fetching band songs:", bsErr.message);
    return;
  }

  console.log(`Found ${bandSongs.length} active band songs. Checking mastery status...`);

  for (const bs of bandSongs) {
    const song = bs.songs;
    const band = bs.bands;
    if (!song) continue;

    // Check if it's the founding song
    if (band && String(song.id) === String(band.song_id)) {
      console.log(`- Band "${band.name}": Song "${song.title}" is the founding song. Keeping active.`);
      continue;
    }

    const instrumentation = song.instrumentation || {};
    const slots = bs.band_song_slots || [];

    // Fetch the actual user_song_skills for all users in these slots for this song
    const userIds = slots.map(sl => sl.user_id).filter(Boolean);
    let skillsMap = {};
    if (userIds.length > 0) {
      const { data: skillsData } = await supabase
        .from('user_song_skills')
        .select('user_id, instrument, progress_percent, is_stage_ready')
        .eq('song_id', song.id)
        .in('user_id', userIds);
      
      (skillsData || []).forEach(sk => {
        const key = `${sk.user_id}_${normalize(sk.instrument)}`;
        skillsMap[key] = sk;
      });
    }

    // Now verify if every required instrument is fully mastered
    let isFullyMastered = true;
    for (const [inst, count] of Object.entries(instrumentation)) {
      const normReq = normalize(inst);
      if (normReq === 'Vocals') continue; // Vocals don't need mastery check
      const requiredCount = count;
      if (requiredCount <= 0) continue;

      // Find slots for this instrument that are occupied by users with 100% progress
      const masteredSlots = slots.filter(slot => {
        if (!slot.user_id) return false;
        if (normalize(slot.instrument) !== normReq) return false;
        const skillKey = `${slot.user_id}_${normReq}`;
        const skill = skillsMap[skillKey];
        return skill && (skill.progress_percent >= 100 || skill.is_stage_ready === true);
      });

      if (masteredSlots.length < requiredCount) {
        isFullyMastered = false;
        console.log(`  Missing mastered slot for ${normReq} (needs ${requiredCount}, has ${masteredSlots.length})`);
      }
    }

    if (!isFullyMastered) {
      console.log(`[FIX] Demoting "${song.title}" in Band "${band?.name || bs.band_id}" to proposal...`);
      const { error: updateErr } = await supabase
        .from('band_songs')
        .update({ status: 'proposal' })
        .eq('id', bs.id);

      if (updateErr) {
        console.error(`  Error demoting song:`, updateErr.message);
      } else {
        console.log(`  Successfully demoted "${song.title}".`);
      }
    } else {
      console.log(`- Band "${band?.name || bs.band_id}": Song "${song.title}" is indeed fully mastered. Keeping active.`);
    }
  }

  console.log("Fix completed successfully!");
}

fixSongs();
