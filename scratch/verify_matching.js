import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://msyxlqljswpertszbotf.supabase.co';
const supabaseAnonKey = 'sb_publishable_GF8tj3-jMPuOUGMC5tDamA_NUrNyGh4';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

function normalizeInstrument(inst) {
  if (!inst) return 'Other';
  const name = inst.toLowerCase();
  if (name.includes('guitar') || name.includes('gitarre')) return 'E-Gitarre';
  if (name.includes('drum')) return 'E-Drums';
  if (name.includes('bass')) return 'E-Bass';
  if (name.includes('piano') || name.includes('keyboard') || name.includes('keys')) return 'E-Piano';
  if (name.includes('gesang') || name.includes('vocal') || name.includes('sing')) return 'Gesang';
  return inst;
}

async function simulateMatching() {
  try {
    const { data: songs } = await supabase
      .from('songs')
      .select('*')
      .ilike('title', 'Over Each Other');

    const song = songs[0];
    const { data: skills } = await supabase
      .from('user_song_skills')
      .select('*, profiles:users!user_song_skills_user_id_fkey(*)')
      .eq('song_id', song.id);

    const levelSkills = skills.filter(s => s.is_stage_ready || (s.progress_percent || 0) >= 100);

    const level = 'starter';
    const instrumentation = song.instrumentation;

    const songFormations = [];
    // Sort levelSkills: skills with a formation_group first
    const sortedSkills = [...levelSkills].sort((a, b) => {
      const aHas = !!a.formation_group;
      const bHas = !!b.formation_group;
      if (aHas && !bHas) return -1;
      if (!aHas && bHas) return 1;
      return 0;
    });

    sortedSkills.forEach(skill => {
      const norm = normalizeInstrument(skill.instrument);
      let target = songFormations.find(f => {
        if (skill.formation_group) return f.groupKey === skill.formation_group;
        return !f.members.some(m => normalizeInstrument(m.instrument) === norm);
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

    const poolFormations = [];
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
          const filledForInst = members.filter(s => normalizeInstrument(s.instrument) === normTarget).length;

          for(let k=0; k < c - filledForInst; k++) {
            let norm = i;
            if (i.toLowerCase().includes('guitar')) norm = 'E-Gitarre';
            else if (i.toLowerCase().includes('drum')) norm = 'E-Drums';
            else if (i.toLowerCase().includes('bass')) norm = 'E-Bass';
            else if (i.toLowerCase().includes('piano') || i.toLowerCase().includes('keys')) norm = 'E-Piano';
            missingInstruments.push(norm);
          }
        });
      });

      const isAlreadyFullId = groupKey.startsWith('pool_') || groupKey.startsWith('form_') || groupKey.startsWith('auto_') || groupKey.includes('-') || groupKey.length > 20;
      const formationId = isAlreadyFullId ? groupKey : `pool_${song.id}_${level}_${groupKey}`;

      poolFormations.push({
        id: formationId,
        song: song,
        members: members.map(m => ({ first_name: m.profiles?.first_name, instrument: m.instrument })),
        openSlots: missingInstruments.length,
        missingInstruments,
        type: 'pool',
        level
      });
    });

    console.log('\n--- SIMULATED POOL FORMATIONS ---');
    console.log(JSON.stringify(poolFormations, null, 2));

  } catch (err) {
    console.error(err);
  }
}

simulateMatching();
