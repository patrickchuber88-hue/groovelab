import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const env = fs.readFileSync('/Users/patrickhuber/Documents/Antigravity Projects/Groovelab app/.env.local', 'utf-8');
const url = env.match(/VITE_SUPABASE_URL=(.*)/)[1].trim();
const key = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1].trim();
const supabase = createClient(url, key);

// Helper functions matching TeacherDashboard.tsx
function normalizeInstrument(inst) {
  if (!inst) return 'E-Gitarre';
  const i = inst.toLowerCase();
  if (i.includes('git') || i.includes('guitar')) return 'E-Gitarre';
  if (i.includes('drum') || i.includes('schlag')) return 'E-Drums';
  if (i.includes('bass')) return 'E-Bass';
  if (i.includes('pian') || i.includes('key') || i.includes('tast')) return 'E-Piano';
  if (i.includes('voc') || i.includes('sing') || i.includes('gesang')) return 'Vocals';
  return inst;
}

async function simulate() {
  const userId = '55555555-5555-5555-5555-555555555555'; // Patrick (Admin)
  console.log(`Simulating dashboard fetch for userId: ${userId}`);

  // 1. Info
  const { data: tData, error: tErr } = await supabase.from('users').select('*, schools(*)').eq('id', userId).single();
  if (tErr) {
    console.error("Error tData:", tErr);
    return;
  }
  console.log("tData school_id:", tData?.school_id);

  if (tData?.school_id) {
    // 3. Sessions
    const { data: sessData, error: sessErr } = await supabase
      .from('sessions')
      .select('*, users!inner(*), stations(*)')
      .is('check_out_time', null);
    
    if (sessErr) {
      console.error("Error sessData:", sessErr);
      return;
    }

    const schoolSess = (sessData || [])
      .filter(s => {
        const u = Array.isArray(s.users) ? s.users[0] : s.users;
        const isStaff = u?.role?.toLowerCase() === 'teacher' || u?.role?.toLowerCase() === 'admin';
        return u?.school_id === tData.school_id && (isStaff || s.gps_verified);
      })
      .map(s => ({
        ...s,
        users: Array.isArray(s.users) ? s.users[0] : s.users,
        stations: Array.isArray(s.stations) ? s.stations[0] : s.stations
      }));

    console.log(`trulyActive sessions count: ${schoolSess.length}`);

    // 6. Bands
    const { data: bData, error: bErr } = await supabase.from('bands').select('*, band_members(*, users(*)), band_songs(songs(*))').eq('school_id', tData.school_id).order('name');
    if (bErr) {
      console.error("Error bData:", bErr);
    }
    console.log(`allBands count: ${bData?.length || 0}`);

    // 9. Band-Matching
    const { data: wallData, error: wallErr } = await supabase
      .from('songs')
      .select(`
        id, artist, title, media_link, instrumentation,
        user_song_skills (
          id, song_id, progress_percent, instrument, part_number, difficulty_level, is_stage_ready, user_id, created_at, formation_group,
          profiles:users!user_song_skills_user_id_fkey(first_name, photo_url, school_id)
        )
      `)
      .eq('school_id', tData.school_id);

    if (wallErr) {
      console.error("Error wallData:", wallErr);
    }
    console.log(`wallData songs count: ${wallData?.length || 0}`);

    const { data: occupiedSlots, error: occErr } = await supabase
      .from('band_song_slots')
      .select('user_id, band_songs(song_id)');
    if (occErr) {
      console.error("Error occupiedSlots:", occErr);
    }
    console.log(`occupiedSlots count: ${occupiedSlots?.length || 0}`);

    // formingBands fetch
    const { data: formingBands, error: formErr } = await supabase
      .from('bands')
      .select('*, band_members(*, profiles:users(id, first_name, last_name, photo_url, created_at, birth_date)), songs(*), band_songs(*, songs(*), band_song_slots(*, profiles:users!user_id(id, first_name, last_name, photo_url, created_at, birth_date)))')
      .eq('school_id', tData.school_id)
      .in('status', ['forming', 'active']);

    if (formErr) {
      console.error("Error formingBands:", formErr);
    }
    console.log(`formingBands count: ${formingBands?.length || 0}`);

    // Construct schoolSkillsMap
    const schoolSkillsMap = {};
    (wallData || []).forEach(s => {
      (s.user_song_skills || []).forEach(skill => {
        if (!skill.song_id) skill.song_id = s.id;
        if (!schoolSkillsMap[skill.user_id]) schoolSkillsMap[skill.user_id] = [];
        schoolSkillsMap[skill.user_id].push(skill);
      });
    });
    console.log("schoolSkillsMap users with skills count:", Object.keys(schoolSkillsMap).length);

    // Calculate poolFormations
    const poolFormations = [];
    (wallData || []).forEach(song => {
      const instrumentation = song.instrumentation || { 'E-Gitarre': 1, 'E-Drums': 1, 'E-Bass': 1 };
      
      ['starter', 'original'].forEach(level => {
        const levelSkills = (song.user_song_skills || []).filter(s => {
          const prof = Array.isArray(s.profiles) ? s.profiles[0] : s.profiles;
          const isReady = (s.is_stage_ready || (s.progress_percent || 0) >= 100) && (s.difficulty_level || 'original') === level && prof?.school_id === tData.school_id;
          
          const isOccupied = (occupiedSlots || []).some(os => 
            os.user_id === s.user_id && (Array.isArray(os.band_songs) ? os.band_songs[0]?.song_id : os.band_songs?.song_id) === song.id
          );

          const isCoreBandMember = (formingBands || []).some(b => {
            const isMember = (b.band_members || []).some(bm => bm.user_id === s.user_id);
            const hasSong = (b.band_songs || []).some(bs => bs.song_id === song.id);
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
            return f.groupKey.startsWith('pool_') && !f.members.some(m => normalizeInstrument(m.instrument) === norm);
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
              const filledForInst = members.filter(s => {
                return normalizeInstrument(s.instrument) === normTarget;
              }).length;

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

          poolFormations.push({
            id: `pool_${song.id}_${level}_${groupKey}`,
            song: song,
            members,
            openSlots: missingInstruments.length,
            missingInstruments,
            type: 'pool',
            level
          });
        });
      });
    });
    console.log(`poolFormations calculated: ${poolFormations.length}`);

    // Calculate bandFormations
    const bandFormations = [];
    (formingBands || []).forEach(b => {
      const isUserBandMember = (b.band_members || []).some(m => m.user_id === userId);

      (b.band_songs || []).forEach(bs => {
        if (bs.status === 'mastered') return;
        const songObj = bs.songs;
        if (!songObj) return;

        if (bs.status === 'proposal' && !isUserBandMember) {
          const bMembers = b.band_members || [];
          if (bMembers.length === 0) return;
          
          const allApproved = bMembers.every(bm => {
            const bmInst = normalizeInstrument(bm.instrument);
            if (bmInst === 'Vocals') return true;
            const userSkills = schoolSkillsMap[bm.user_id] || [];
            return userSkills.some(sk => 
              sk.song_id === songObj.id && 
              normalizeInstrument(sk.instrument) === bmInst && 
              (sk.is_stage_ready || sk.progress_percent >= 100)
            );
          });
          
          if (!allApproved) return;
        }

        const slots = bs.band_song_slots || [];
        const members = [];
        const addedUserIds = new Set();
        const addedSlotKeys = new Set();

        slots.filter(sl => sl.user_id).forEach(sl => {
          const normalizedMemberInst = normalizeInstrument(sl.instrument);
          const slPart = sl.part_number || 1;
          const slotKey = `${sl.user_id}_${normalizedMemberInst}_${slPart}`;
          
          if (addedSlotKeys.has(slotKey)) return;
          addedSlotKeys.add(slotKey);
          addedUserIds.add(sl.user_id);
          
          const prof = Array.isArray(sl.profiles) ? sl.profiles[0] : sl.profiles;
          const skills = schoolSkillsMap[sl.user_id] || [];
          const isMastered = skills.some(sk => 
            sk.song_id === songObj.id && 
            normalizeInstrument(sk.instrument) === normalizedMemberInst && 
            (sk.part_number || 1) === slPart &&
            (sk.is_stage_ready || sk.progress_percent >= 100)
          );

          members.push({
            user_id: sl.user_id,
            first_name: prof?.first_name || 'Musiker',
            photo_url: prof?.photo_url,
            instrument: normalizedMemberInst,
            part_number: slPart,
            isFromBand: true,
            isMastered
          });
        });

        let instCount = {};
        members.forEach(m => {
          instCount[m.instrument] = Math.max(instCount[m.instrument] || 0, m.part_number || 1);
        });

        (b.band_members || []).forEach(bm => {
          if (addedUserIds.has(bm.user_id)) return;
          addedUserIds.add(bm.user_id);
          
          const prof = bm.profiles ? (Array.isArray(bm.profiles) ? bm.profiles[0] : bm.profiles) : null;
          const normalizedMemberInst = normalizeInstrument(bm.instrument);

          if (prof) {
            const nextPart = (instCount[normalizedMemberInst] || 0) + 1;
            instCount[normalizedMemberInst] = nextPart;

            const skills = schoolSkillsMap[bm.user_id] || [];
            const isMastered = skills.some(sk => 
              sk.song_id === songObj.id && 
              normalizeInstrument(sk.instrument) === normalizedMemberInst && 
              (sk.part_number || 1) === nextPart &&
              (sk.is_stage_ready || sk.progress_percent >= 100)
            );

            members.push({
              user_id: bm.user_id,
              first_name: prof.first_name || 'Musiker',
              photo_url: prof.photo_url,
              instrument: normalizedMemberInst,
              part_number: nextPart,
              isFromBand: true,
              isMastered
            });
          }
        });

        const requiredInsts = songObj.instrumentation || { 'E-Gitarre': 1, 'E-Drums': 1, 'E-Bass': 1, 'E-Piano': 1 };
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
            const filledCount = members.filter(m => {
              return normalizeInstrument(m.instrument) === normTarget;
            }).length;
            
            for(let k=0; k < c - filledCount; k++) {
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
    console.log(`bandFormations calculated: ${bandFormations.length}`);

    // Combine and sort
    const allMatching = [...bandFormations, ...poolFormations]
      .filter(f => f.openSlots >= 0)
      .sort((a, b) => a.openSlots - b.openSlots)
      .slice(0, 2);
    
    console.log("allMatching final count:", allMatching.length);
    allMatching.forEach(m => {
      console.log(`  -> Match Type: ${m.type} | Song: ${m.song?.title} | Open slots: ${m.openSlots} | Missing: ${m.missingInstruments.join(', ')}`);
    });

    // 10. Rehearsal Suggestions
    let userBandIds = [];
    const { data: memberOf } = await supabase.from('band_members').select('band_id').eq('user_id', userId);
    if (memberOf) userBandIds.push(...memberOf.map(m => m.band_id));
    const { data: coachOf } = await supabase.from('bands').select('id').eq('coach_id', userId);
    if (coachOf) userBandIds.push(...coachOf.map(b => b.id));
    userBandIds = [...new Set(userBandIds)];
    console.log("User band IDs for rehearsal suggestions:", userBandIds);

    const { data: bandsWithMembers } = await supabase
      .from('bands')
      .select('*, band_members(*)')
      .in('id', userBandIds);

    console.log(`bandsWithMembers count: ${bandsWithMembers?.length || 0}`);

    const allMemberIds = [];
    (bandsWithMembers || []).forEach(b => {
      (b.band_members || []).forEach(bm => allMemberIds.push(bm.user_id));
    });
    const uniqueMembers = [...new Set(allMemberIds)];
    console.log("Unique band members count:", uniqueMembers.length);

    if (uniqueMembers.length > 0) {
      const { data: planning } = await supabase
        .from('lab_planning')
        .select('*')
        .in('user_id', uniqueMembers);
      
      console.log(`lab_planning rows count: ${planning?.length || 0}`);
    }

    // 11. Open proposals (Planer)
    const userProposals = [];
    (formingBands || []).forEach(b => {
      const isUserBandMember = (b.band_members || []).some(m => m.user_id === userId);
      if (!isUserBandMember) return;
      
      (b.band_songs || []).forEach(bs => {
        if (bs.status === 'proposal') {
          const song = bs.songs || b.songs;
          if (!song) return;
          
          userProposals.push({
            id: `prop_${bs.id}`,
            songTitle: song.title
          });
        }
      });
    });
    console.log(`userProposals count: ${userProposals.length}`);
  }
}

simulate();
