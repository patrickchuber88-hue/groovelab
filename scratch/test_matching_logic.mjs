import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const env = fs.readFileSync('.env.local', 'utf-8');
const url = env.match(/VITE_SUPABASE_URL=(.*)/)[1].trim().replace(/['"]/g, '');
const key = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1].trim().replace(/['"]/g, '');
const supabase = createClient(url, key);

const normalizeInstrument = (name) => {
  const n = (name || '').toLowerCase().trim();
  if (n.includes('gitarre') || n.includes('guitar')) return 'Guitar';
  if (n.includes('bass')) return 'Bass';
  if (n.includes('drums') || n.includes('schlagzeug')) return 'Drums';
  if (n.includes('piano') || n.includes('keys') || n.includes('klavier')) return 'Keys';
  if (n.includes('vocals') || n.includes('gesang')) return 'Vocals';
  return name;
};

async function main() {
  const userId = '84d16dae-6e9c-451e-a58f-c4f801f569d4'; // 3 Schüler
  const schoolId = '11111111-1111-1111-1111-111111111111';

  // 1. Fetch wallData
  const { data: wallData, error: wallErr } = await supabase
    .from('songs')
    .select(`
      id, artist, title, media_link, instrumentation,
      user_song_skills (
        id, song_id, progress_percent, instrument, part_number, difficulty_level, is_stage_ready, user_id, created_at, formation_group,
        profiles:users!user_song_skills_user_id_fkey(first_name, photo_url, school_id)
      )
    `)
    .eq('school_id', schoolId);

  // 2. occupiedSlots
  const { data: occupiedSlots } = await supabase
    .from('band_song_slots')
    .select('user_id, band_songs(song_id)');

  // 3. formingBands
  const { data: formingBands } = await supabase
    .from('bands')
    .select('*, band_members(*, profiles:users(id, first_name, last_name, photo_url, created_at, birth_date)), songs(*), band_songs(*, songs(*), band_song_slots(*, profiles:users!user_id(id, first_name, last_name, photo_url, created_at, birth_date)))')
    .eq('school_id', schoolId)
    .eq('status', 'forming');

  const schoolSkillsMap = {};
  (wallData || []).forEach((s) => {
    (s.user_song_skills || []).forEach((skill) => {
      if (!skill.song_id) skill.song_id = s.id;
      if (!schoolSkillsMap[skill.user_id]) schoolSkillsMap[skill.user_id] = [];
      schoolSkillsMap[skill.user_id].push(skill);
    });
  });

  const poolFormations = [];
  (wallData || []).forEach(song => {
    const instrumentation = song.instrumentation || { 'E-Gitarre': 1, 'E-Drums': 1, 'E-Bass': 1 };
    
    ['starter', 'original'].forEach(level => {
      const levelSkills = (song.user_song_skills || []).filter((s) => {
        const prof = Array.isArray(s.profiles) ? s.profiles[0] : s.profiles;
        const isReady = s.is_stage_ready && (s.difficulty_level || 'original') === level && prof?.school_id === schoolId;
        
        const isOccupied = (occupiedSlots || []).some(os => 
          os.user_id === s.user_id && (Array.isArray(os.band_songs) ? os.band_songs[0]?.song_id : os.band_songs?.song_id) === song.id
        );

        const isCoreBandMember = (formingBands || []).some((b) => {
          const isMember = (b.band_members || []).some((bm) => bm.user_id === s.user_id);
          const hasSong = (b.band_songs || []).some((bs) => bs.song_id === song.id);
          return isMember && hasSong;
        });
        
        return isReady && !isOccupied && !isCoreBandMember;
      });

      if (levelSkills.length === 0) return;

      const songFormations = [];
      levelSkills.forEach(skill => {
        const norm = normalizeInstrument(skill.instrument);
        let target = songFormations.find(f => {
          if (skill.formation_group) return f.groupKey === skill.formation_group;
          return f.groupKey.startsWith('pool_') && !f.members.some((m) => normalizeInstrument(m.instrument) === norm);
        });

        if (!target) {
          target = { 
            groupKey: skill.formation_group || `pool_${song.id}_${level}_${songFormations.length}`, 
            members: [] 
          };
          songFormations.push(target);
        }
        target.members.push(skill);
      });

      songFormations.forEach(({ groupKey, members }) => {
        const missingInstruments = [];
        const order = ['E-Gitarre', 'E-Drums', 'E-Piano', 'E-Bass'];
        order.forEach(targetInst => {
          const matchingKeys = Object.entries(instrumentation).filter(([i, c]) => {
            const low = i.toLowerCase();
            const targetLow = targetInst.toLowerCase();
            return low.includes(targetLow.replace('e-', '')) || targetLow.includes(low.replace('e-', ''));
          });

          matchingKeys.forEach(([i, c]) => {
            const normTarget = normalizeInstrument(i);
            const filledForInst = members.filter((s) => {
              return normalizeInstrument(s.instrument) === normTarget;
            }).length;

            for(let k=0; k < (c) - filledForInst; k++) {
              let norm = i;
              if (i.toLowerCase().includes('guitar')) norm = 'E-Gitarre';
              else if (i.toLowerCase().includes('drum')) norm = 'E-Drums';
              else if (i.toLowerCase().includes('bass')) norm = 'E-Bass';
              else if (i.toLowerCase().includes('piano') || i.toLowerCase().includes('keys')) norm = 'E-Piano';
              missingInstruments.push(norm);
            }
          });
        });

        if (missingInstruments.length > 0) {
          poolFormations.push({
            id: `pool_${song.id}_${level}_${groupKey}`,
            song: song,
            members,
            openSlots: missingInstruments.length,
            missingInstruments,
            type: 'pool',
            level
          });
        }
      });
    });
  });

  const bandFormations = [];
  (formingBands || []).forEach(b => {
    const isUserBandMember = (b.band_members || []).some((m) => m.user_id === userId);
    // Hide own band projects from Matching Board widget ONLY in student view mode!
    // For this test, let's toggle it to see both ways:
    const hideOwnBand = true; 
    if (isUserBandMember && hideOwnBand) {
      console.log(`[Test] Own Band project for "${b.name}" is filtered out in student view mode.`);
    }

    (b.band_songs || []).forEach((bs) => {
      if (bs.status === 'mastered') return;
      const songObj = bs.songs;
      if (!songObj) return;

      const slots = bs.band_song_slots || [];
      const members = [];
      const addedUserIds = new Set();
      const addedSlotKeys = new Set();

      slots.filter((sl) => sl.user_id).forEach((sl) => {
        const normalizedMemberInst = normalizeInstrument(sl.instrument);
        const slPart = sl.part_number || 1;
        const slotKey = `${sl.user_id}_${normalizedMemberInst}_${slPart}`;
        
        if (addedSlotKeys.has(slotKey)) return;
        addedSlotKeys.add(slotKey);
        addedUserIds.add(sl.user_id);
        
        members.push({
          user_id: sl.user_id,
          instrument: normalizedMemberInst,
          part_number: slPart,
          isFromBand: true
        });
      });

      let instCount = {};
      members.forEach((m) => {
        instCount[m.instrument] = Math.max(instCount[m.instrument] || 0, m.part_number || 1);
      });

      (b.band_members || []).forEach((bm) => {
        if (addedUserIds.has(bm.user_id)) return;
        addedUserIds.add(bm.user_id);
        
        const normalizedMemberInst = normalizeInstrument(bm.instrument);
        const nextPart = (instCount[normalizedMemberInst] || 0) + 1;
        instCount[normalizedMemberInst] = nextPart;

        members.push({
          user_id: bm.user_id,
          instrument: normalizedMemberInst,
          part_number: nextPart,
          isFromBand: true
        });
      });

      const requiredInsts = songObj.instrumentation || { 'E-Gitarre': 1, 'E-Bass': 1, 'E-Drums': 1, 'E-Piano': 1 };
      const missingInstruments = [];
      const order = ['E-Gitarre', 'E-Drums', 'E-Piano', 'E-Bass'];
      
      order.forEach(targetInst => {
        const matchingKeys = Object.entries(requiredInsts).filter(([i, c]) => {
          const low = i.toLowerCase();
          const targetLow = targetInst.toLowerCase();
          return low.includes(targetLow.replace('e-', '')) || targetLow.includes(low.replace('e-', ''));
        });

        matchingKeys.forEach(([i, c]) => {
          const normTarget = normalizeInstrument(i);
          const filledCount = members.filter((m) => {
            return normalizeInstrument(m.instrument) === normTarget;
          }).length;
          
          for(let k=0; k < (c) - filledCount; k++) {
            let norm = i;
            if (i.toLowerCase().includes('guitar')) norm = 'E-Gitarre';
            else if (i.toLowerCase().includes('drum')) norm = 'E-Drums';
            else if (i.toLowerCase().includes('bass')) norm = 'E-Bass';
            else if (i.toLowerCase().includes('piano') || i.toLowerCase().includes('keys')) norm = 'E-Piano';
            missingInstruments.push(norm);
          }
        });
      });

      bandFormations.push({
        id: `band_${bs.id}`,
        song: songObj,
        members: members,
        openSlots: missingInstruments.length,
        missingInstruments,
        type: 'band',
        level: bs.difficulty_level || 'original'
      });
    });
  });

  console.log("\n--- RESULTING BAND FORMATIONS ---");
  bandFormations.forEach(bf => {
    console.log(`Song: ${bf.song.title}, Open slots count: ${bf.openSlots}, Missing:`, bf.missingInstruments);
    bf.members.forEach(m => {
      console.log(`  - Member: user_id=${m.user_id}, instrument=${m.instrument}, part=${m.part_number}`);
    });
  });

  console.log("\n--- RESULTING POOL FORMATIONS ---");
  poolFormations.forEach(pf => {
    console.log(`Song: ${pf.song.title}, Open slots count: ${pf.openSlots}, Missing:`, pf.missingInstruments);
  });
}

main();
