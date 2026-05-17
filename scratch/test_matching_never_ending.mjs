import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const env = fs.readFileSync('.env.local', 'utf-8');
const url = env.match(/VITE_SUPABASE_URL=(.*)/)[1].trim();
const key = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1].trim();
const supabase = createClient(url, key);

const schoolId = '11111111-1111-1111-1111-111111111111';
const userId = 'c4fa4738-5964-4019-a17a-f94db52ada87'; // Schüler 3

function normalizeInstrument(inst) {
  if (!inst) return 'Unknown';
  const lower = inst.toLowerCase();
  if (lower === 'guitar' || lower === 'e-gitarre') return 'E-Gitarre';
  if (lower === 'bass' || lower === 'e-bass') return 'E-Bass';
  if (lower === 'drums' || lower === 'e-drums') return 'E-Drums';
  if (lower === 'piano' || lower === 'keys' || lower === 'e-piano') return 'E-Piano';
  if (lower === 'vocals' || lower === 'gesang' || lower === 'voice') return 'Vocals';
  return inst;
}

async function run() {
  const [wallRes, membersRes, formingBandsRes] = await Promise.all([
    supabase.from('songs').select(`
      id, artist, title, media_link, instrumentation,
      user_song_skills (
        id, song_id, instrument, difficulty_level, is_stage_ready, user_id, created_at, formation_group,
        profiles:users!user_song_skills_user_id_fkey(first_name, photo_url, school_id)
      ),
      band_songs (
        id, band_id, status, is_exclusive, difficulty_level,
        bands (id, name, photo_url, school_id),
        band_song_slots (
          id, user_id, instrument, status,
          profiles:users!band_song_slots_user_id_fkey(first_name, photo_url)
        )
      )
    `).eq('school_id', schoolId),
    supabase.from('band_members').select('user_id, bands!inner(id, status, song_id, school_id, band_songs(song_id, status))').eq('bands.school_id', schoolId),
    supabase.from('bands').select('*, band_members(*, profiles:users(id, first_name, photo_url)), band_songs(*, band_song_slots(*))').eq('school_id', schoolId)
  ]);

  if (wallRes.error) {
    console.error('wallRes error:', wallRes.error);
    return;
  }

  const schoolSkillsMap = {};
  (wallRes.data || []).forEach((song) => {
    (song.user_song_skills || []).forEach((skill) => {
      if (!schoolSkillsMap[skill.user_id]) schoolSkillsMap[skill.user_id] = [];
      schoolSkillsMap[skill.user_id].push(skill);
    });
  });

  const formingBands = formingBandsRes.data || [];
  const processedWall = [];

  const song = (wallRes.data || []).find(s => s.id === '236af073-afe1-41e5-93a2-32dcfbbed8b6');
  if (!song) {
    console.error('Song Never Ending not found in wallRes!');
    return;
  }

  console.log('--- RUNNING DIAGNOSTIC FOR NEVER ENDING ---');
  console.log('Title:', song.title);
  console.log('Instrumentation:', song.instrumentation);
  console.log('Skills count:', song.user_song_skills?.length);

  const instrumentation = song?.instrumentation || { Guitar: 1, Bass: 1, Drums: 1, Keys: 0 };
  const requiredInsts = {};
  Object.entries(instrumentation).forEach(([inst, count]) => {
    const lower = inst.toLowerCase();
    if (lower === 'vocals' || lower === 'gesang') return;
    let key = inst;
    if (lower === 'guitar' || lower === 'e-gitarre') key = 'E-Gitarre';
    else if (lower === 'bass' || lower === 'e-bass') key = 'E-Bass';
    else if (lower === 'drums' || lower === 'e-drums') key = 'E-Drums';
    else if (lower === 'piano' || lower === 'keys' || lower === 'e-piano') key = 'E-Piano';
    requiredInsts[key] = Math.max(requiredInsts[key] || 0, count);
  });

  const schoolSkills = (song?.user_song_skills || []);

  ['starter', 'original'].forEach(level => {
    const levelSkills = schoolSkills.filter((s) => 
      (s?.difficulty_level || 'original') === level && 
      (s.is_stage_ready || (s.progress_percent || 0) >= 100)
    );
    
    console.log(`\n[Level: ${level}]`);
    console.log(`Level Skills:`, levelSkills.map(s => ({ user_id: s.profiles?.first_name || s.user_id, ready: s.is_stage_ready, progress: s.progress_percent })));

    const formationsList = [];

    const availableMusicians = levelSkills.filter((skill) => {
      const inBandProject = (song.band_songs || []).some((bs) => {
        const slots = bs.band_song_slots || [];
        const inSlot = slots.some((sl) => sl.user_id === skill.user_id);
        if (inSlot) return true;
        
        const band = formingBands.find((b) => b.id === bs.band_id);
        return (band?.band_members || []).some((bm) => bm.user_id === skill.user_id);
      });
      
      return !inBandProject;
    });

    console.log(`Available Musicians:`, availableMusicians.map(s => s.profiles?.first_name || s.user_id));

    // 2.5 Add existing Band Proposals
    const projectsForThisSongMap = new Map();
    (song.band_songs || []).forEach((p) => {
      if (p.band_id) projectsForThisSongMap.set(p.band_id, p);
    });
    
    formingBands.filter((b) => b.song_id === song.id).forEach((b) => {
      if (!projectsForThisSongMap.has(b.id)) {
        projectsForThisSongMap.set(b.id, {
          id: `forming_${b.id}`,
          band_id: b.id,
          status: 'forming',
          bands: b,
          band_song_slots: []
        });
      }
    });

    const projectsForThisSong = Array.from(projectsForThisSongMap.values());
    console.log(`Projects for this song count:`, projectsForThisSong.length);

    projectsForThisSong.forEach((bs) => {
      if (bs.status === 'mastered') {
        console.log(`- Project ${bs.id} skipped (status is mastered)`);
        return;
      }
      const bsLevel = bs.difficulty_level || 'original';
      if (bsLevel !== level) {
        console.log(`- Project ${bs.id} skipped (level mismatch: bsLevel=${bsLevel}, level=${level})`);
        return;
      }
      
      const band = formingBands.find((b) => b.id === bs.band_id) || bs.bands;
      if (!band) {
        console.log(`- Project ${bs.id} skipped (no band)`);
        return;
      }
      if (band.school_id !== schoolId) {
        console.log(`- Project ${bs.id} skipped (school_id mismatch)`);
        return;
      }

      const isUserBandMember = (band.band_members || []).some((m) => m.user_id === userId);
      console.log(`- Project ${bs.id} (band: ${band.name}), status: ${bs.status}, isUserBandMember: ${isUserBandMember}`);

      if (bs.status === 'proposal' && !isUserBandMember) {
        const bMembers = band.band_members || [];
        if (bMembers.length === 0) return;
        
        const allApproved = bMembers.every((bm) => {
          const bmInst = normalizeInstrument(bm.instrument);
          if (bmInst === 'Vocals') return true;
          const userSkills = schoolSkillsMap[bm.user_id] || [];
          return userSkills.some((sk) => 
            sk.song_id === song.id && 
            normalizeInstrument(sk.instrument) === bmInst && 
            (sk.is_stage_ready || (sk.progress_percent || 0) >= 100)
          );
        });
        
        if (!allApproved) {
          console.log(`  -> Proposal hidden for public (not all approved)`);
          return;
        }
      }

      const slots = bs.band_song_slots || [];
      const members = [];
      const addedUserIds = new Set();

      slots.filter((sl) => sl.user_id).forEach((sl) => {
        if (addedUserIds.has(sl.user_id)) return;
        addedUserIds.add(sl.user_id);
        
        const prof = Array.isArray(sl.profiles) ? sl.profiles[0] : sl.profiles;
        const normalizedMemberInst = normalizeInstrument(sl.instrument);

        const skills = schoolSkillsMap[sl.user_id] || [];
        const slPart = sl.part_number || 1;
        const isMastered = skills.some((sk) => 
          sk.song_id === song.id && 
          normalizeInstrument(sk.instrument) === normalizedMemberInst && 
          (sk.part_number || 1) === slPart &&
          (sk.is_stage_ready || (sk.progress_percent || 0) >= 100)
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

      const coreBand = formingBands.find((b) => b.id === bs.band_id);
      let instCount = {};
      members.forEach((m) => {
        instCount[m.instrument] = Math.max(instCount[m.instrument] || 0, m.part_number || 1);
      });

      (coreBand?.band_members || []).forEach((bm) => {
        if (addedUserIds.has(bm.user_id)) return;
        addedUserIds.add(bm.user_id);
        
        const prof = bm.profiles ? (Array.isArray(bm.profiles) ? bm.profiles[0] : bm.profiles) : null;
        const normalizedMemberInst = normalizeInstrument(bm.instrument);

        if (prof) {
          const nextPart = (instCount[normalizedMemberInst] || 0) + 1;
          instCount[normalizedMemberInst] = nextPart;

          const skills = schoolSkillsMap[bm.user_id] || [];
          const isMastered = skills.some((sk) => 
            sk.song_id === song.id && 
            normalizeInstrument(sk.instrument) === normalizedMemberInst && 
            (sk.part_number || 1) === nextPart &&
            (sk.is_stage_ready || (sk.progress_percent || 0) >= 100)
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

      const totalRequired = Object.entries(requiredInsts).reduce((acc, [inst, count]) => {
        return acc + count;
      }, 0);

      const instrumentalists = members.filter((m) => {
        const low = (m.instrument || '').toLowerCase();
        return !low.includes('vocals') && !low.includes('gesang');
      }).length;

      console.log(`  -> Instrumentalists: ${instrumentalists}, Required: ${totalRequired}`);

      if (instrumentalists >= totalRequired) {
        if (!(bs.status === 'proposal' && isUserBandMember)) {
          console.log(`  -> Skiped: instrumentalists >= totalRequired`);
          return;
        }
      }

      formationsList.push({
        id: `band_${bs.id}`,
        originBand: band,
        bandSongId: bs.id,
        status: bs.status,
        members,
        level
      });
    });

    const levelFormations = formationsList.map(form => {
      const isComplete = Object.keys(requiredInsts).every(inst => {
        const needed = requiredInsts[inst] || 0;
        if (needed === 0) return true;
        const normTarget = normalizeInstrument(inst);
        const matchingCount = form.members.filter((m) => normalizeInstrument(m.instrument) === normTarget).length;
        return matchingCount >= needed;
      });
      return { ...form, isComplete };
    });

    console.log(`Formations count:`, levelFormations.length);

    if (levelFormations.length > 0) {
      processedWall.push({
        id: `${song.id}_${level}`,
        title: song.title,
        formations: levelFormations,
        level
      });
    }
  });

  console.log(`\nFinal processedWall count:`, processedWall.length);
  processedWall.forEach(ws => {
    console.log(`- Song: ${ws.title}, Level: ${ws.level}, Formations count: ${ws.formations.length}`);
  });
}

run();
