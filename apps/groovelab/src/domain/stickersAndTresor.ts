// Domain definitions for Stickers, Gamification & Audio Tresor Storage Status

export const ALL_STICKERS = [
  // Meilensteine / Üben (Einmalig)
  { id: 'fleiss-pionier', emoji: '🐝', title: 'Fleiß-Pionier', desc: '20 Minuten fokussiert geübt und musiziert!', equiv: 'Klasse Start! Regelmäßiges Üben legt das Fundament für deinen Klang.', color: '#34a853', bg: 'rgba(52, 168, 83, 0.1)', auto: true, category: 'ueben', rarity: 'common', rarityLabel: 'Standard', multi: false },
  { id: 'uebe-meister', emoji: '🦉', title: 'Übe-Meister', desc: '100 Minuten konzentriert am Instrument gearbeitet!', equiv: 'Starke Routine: Deine Koordination, Rhythmik und Spieltechnik wachsen spürbar.', color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.1)', auto: true, category: 'ueben', rarity: 'rare', rarityLabel: 'Selten', multi: false },
  { id: 'uebe-legende', emoji: '👑', title: 'Übe-Legende', desc: '500 Minuten engagierte Übezeit gemeistert!', equiv: 'Echte Ausdauer: Du beherrschst deine Stücke mit musikalischer Sicherheit und Ausdruck.', color: '#af52de', bg: 'rgba(175, 82, 222, 0.1)', auto: true, category: 'ueben', rarity: 'epic', rarityLabel: 'Episch', multi: false },
  { id: 'uebe-grossmeister', emoji: '🏆', title: 'Übe-Großmeister', desc: 'Grandiose 1.500 Minuten Übezeit gemeistert!', equiv: 'Höchste Meisterschaft: Dein Instrument ist dein zweites Zuhause – souverän im Klang und Ausdruck.', color: '#eab308', bg: 'rgba(234, 179, 8, 0.15)', auto: true, category: 'ueben', rarity: 'legendary', rarityLabel: 'Legendär', multi: false },

  // XP (Einmalig)
  { id: 'xp-sammler', emoji: '⭐', title: 'XP-Sammler', desc: '100 XP durch fleißige Unterrichts- und Übe-Einheiten gesammelt!', equiv: 'Erste Erfolge: Du erreichst deine wöchentlichen Aufgaben mit Begeisterung.', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.1)', auto: true, category: 'xp', rarity: 'common', rarityLabel: 'Standard', multi: false },
  { id: 'xp-champion', emoji: '🎖️', title: 'XP-Champion', desc: '500 XP gesammelt – kontinuierlicher Fortschritt im Unterricht!', equiv: 'Konstanter Fleiß: Du setzt Aufgaben und musikalische Herausforderungen zielstrebig um.', color: '#ec4899', bg: 'rgba(236, 72, 153, 0.1)', auto: true, category: 'xp', rarity: 'rare', rarityLabel: 'Selten', multi: false },
  { id: 'xp-meister', emoji: '🌌', title: 'XP-Meister', desc: '1.500 XP erreicht – herausragender Einsatz im Musikschuljahr!', equiv: 'Fortgeschrittenes Niveau: Du meisterst Theorie, Gehörbildung und Spielpraxis mit Bravour.', color: '#6366f1', bg: 'rgba(99, 102, 241, 0.1)', auto: true, category: 'xp', rarity: 'epic', rarityLabel: 'Episch', multi: false },
  { id: 'xp-legende', emoji: '💎', title: 'XP-Legende', desc: '3.500 XP gesammelt – das höchste musikalische Engagement-Level!', equiv: 'Spitzenleistung: Vorbildlicher Lernwille und meisterhafte musikalische Entwicklung.', color: '#3c0d93', bg: 'rgba(60, 13, 147, 0.15)', auto: true, category: 'xp', rarity: 'legendary', rarityLabel: 'Legendär', multi: false },

  // Streaks (Einmalig)
  { id: 'dranbleiber', emoji: '🔥', title: 'Dranbleiber', desc: '3 Tage hintereinander am Instrument geübt!', equiv: 'Kurze, tägliche Einheiten festigen Bewegungsabläufe und Notenlesen am besten.', color: '#f97316', bg: 'rgba(249, 115, 22, 0.1)', auto: true, category: 'streaks', rarity: 'common', rarityLabel: 'Standard', multi: false },
  { id: 'wochen-held', emoji: '📆', title: 'Wochen-Held', desc: '7 Tage lückenlose Übe-Streak gemeistert!', equiv: 'Klasse Gewohnheit: Tägliches Spielen macht aus Üben echte Spielfreude.', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.1)', auto: true, category: 'streaks', rarity: 'rare', rarityLabel: 'Selten', multi: false },
  { id: 'streak-koenig', emoji: '⚡', title: 'Streak-König', desc: '21 Tage ununterbrochen geübt und musiziert!', equiv: '3 Wochen Kontinuität: Deine musikalische Routine ist fest im Alltag verankert.', color: '#eab308', bg: 'rgba(234, 179, 8, 0.1)', auto: true, category: 'streaks', rarity: 'epic', rarityLabel: 'Episch', multi: false },
  { id: 'streak-kaiser', emoji: '👑', title: 'Streak-Kaiser', desc: 'Ein voller Monat tägliche Übe-Disziplin (30 Tage Streak)!', equiv: 'Höchste Disziplin: Du hast die goldene Regel des Musizierens verinnerlicht – Beständigkeit führt zur Meisterschaft.', color: '#7c2d12', bg: 'rgba(124, 45, 18, 0.15)', auto: true, category: 'streaks', rarity: 'legendary', rarityLabel: 'Legendär', multi: false },

  // Songs (Einmalig)
  { id: 'erster-erfolg', emoji: '🎵', title: 'Erster Erfolg', desc: 'Dein erstes Musikstück zu 100% gemeistert!', equiv: 'Vom ersten bis zum letzten Takt im Timing und mit allen Noten souverän gespielt.', color: '#06b6d4', bg: 'rgba(6, 182, 212, 0.1)', auto: true, category: 'songs', rarity: 'common', rarityLabel: 'Standard', multi: false },
  { id: 'song-sammler', emoji: '📚', title: 'Song-Sammler', desc: '3 Stücke komplett und bühnenreif im Repertoire!', equiv: 'Dein Repertoire wächst: Genug Stoff für deinen ersten kleinen Vorspiel-Auftritt.', color: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.1)', auto: true, category: 'songs', rarity: 'rare', rarityLabel: 'Selten', multi: false },
  { id: 'repertoire-riese', emoji: '🦖', title: 'Repertoire-Riese', desc: '5 Songs zu 100% beherrscht und abrufbereit!', equiv: 'Ein solides Konzert-Set: Verschiedene Tempi, Rhythmen und Stile sicher im Griff.', color: '#34a853', bg: 'rgba(52, 168, 83, 0.1)', auto: true, category: 'songs', rarity: 'epic', rarityLabel: 'Episch', multi: false },
  { id: 'repertoire-gigant', emoji: '🐉', title: 'Repertoire-Gigant', desc: '10 Songs vollständig gemeistert – ein ganzes Konzertprogramm!', equiv: 'Umfangreiches Repertoire auf Auftritts-Niveau – musikalisch vielseitig und spieltechnisch reif.', color: '#137333', bg: 'rgba(19, 115, 51, 0.15)', auto: true, category: 'songs', rarity: 'legendary', rarityLabel: 'Legendär', multi: false },

  // Spezielle Auszeichnungen (Mehrfach vergebbar)
  { id: 'stage-star', emoji: '🎤', title: 'Bühnen-Star', desc: 'Erfolgreicher Live-Auftritt oder Vorspiel vor Publikum!', equiv: 'Bühnenpräsenz bewiesen: Lampenfieber überwunden und das Publikum mit Musik begeistert.', color: '#a855f7', bg: 'rgba(168, 85, 247, 0.1)', auto: false, category: 'spezial', rarity: 'epic', rarityLabel: 'Episch', multi: true },
  { id: 'song-master', emoji: '🏆', title: 'Song-Master', desc: 'Diesen Song mit 100% Präzision, Dynamik und Ausdruck gemeistert!', equiv: 'Bühnenreife Leistung: Rhythmus, Phrasierung und Klangvorstellung perfekt vereint.', color: '#eab308', bg: 'rgba(234, 179, 8, 0.1)', auto: false, category: 'spezial', rarity: 'rare', rarityLabel: 'Selten', multi: true },
  { id: 'creative-mind', emoji: '💡', title: 'Kreativ-Kopf', desc: 'Eigene Komposition, Improvisation oder kreative Song-Arrangements erschaffen!', equiv: 'Eigenständiger Musikergeist: Mut zur eigenen musikalischen Handschrift und kreativen Gestaltung.', color: '#db2777', bg: 'rgba(219, 39, 119, 0.1)', auto: false, category: 'spezial', rarity: 'epic', rarityLabel: 'Episch', multi: true },
  { id: 'extra-mile', emoji: '🚀', title: 'Extra-Meile', desc: 'Zusatzaufgaben, schwere Passagen oder zweite Stimmen freiwillig erarbeitet!', equiv: 'Hohe Eigenmotivation: Du nimmst neue Herausforderungen selbstständig an und wächst daran.', color: '#2563eb', bg: 'rgba(37, 99, 235, 0.1)', auto: false, category: 'spezial', rarity: 'rare', rarityLabel: 'Selten', multi: true }
];

export interface StickerUnlockContext {
  practiceMinutes?: number;
  xp?: number;
  streakDays?: number;
  masteredSongsCount?: number;
  progressItems?: Array<{
    id?: string;
    topic_name?: string;
    title?: string;
    status?: string;
    progress_percent?: number;
    homework_notes?: string;
    teacher_notes?: string;
    updated_at?: string;
    [key: string]: any;
  }>;
  simulatedStickers?: Record<string, { count: number; details: { topic: string; date: string }[] }>;
}

export interface StickerUnlockResult {
  isUnlocked: boolean;
  progressText: string;
  count: number;
  details: { topic: string; date: string }[];
}

export const getUnifiedStickerStatus = (
  sticker: (typeof ALL_STICKERS)[0],
  ctx: StickerUnlockContext
): StickerUnlockResult => {
  const {
    practiceMinutes = 0,
    xp = 0,
    streakDays = 0,
    progressItems = [],
    simulatedStickers = {}
  } = ctx;

  // 1. Gather any explicit teacher awards from progressItems (homework_notes contains STICKER:<id>|<topic>|<date>)
  const awardedDetails: { topic: string; date: string }[] = [];
  progressItems.forEach(item => {
    if (item.homework_notes) {
      try {
        const notesArray = item.homework_notes.startsWith('[') && item.homework_notes.endsWith(']')
          ? JSON.parse(item.homework_notes)
          : [item.homework_notes];

        if (Array.isArray(notesArray)) {
          notesArray.forEach((note: string) => {
            if (note.startsWith('STICKER:')) {
              const content = note.substring(8);
              const parts = content.split('|');
              const sId = parts[0];
              if (sId === sticker.id) {
                const topic = parts[1] || 'Allgemein';
                const date = parts[2] ? new Date(parts[2]).toLocaleDateString('de-DE') : 'Unbekannt';
                awardedDetails.push({ topic, date });
              }
            }
          });
        }
      } catch (e) {
        // ignore JSON parse errors
      }
    }
  });

  // 2. Add any simulated sticker entries
  if (simulatedStickers[sticker.id] && simulatedStickers[sticker.id].count > 0) {
    simulatedStickers[sticker.id].details.forEach(d => awardedDetails.push(d));
  }

  // 3. For song-related stickers (category === 'songs', song-master, stage-star), extract actual mastered songs
  if (sticker.category === 'songs' || sticker.id === 'song-master' || sticker.id === 'stage-star') {
    const masteredSongs = progressItems.filter(item => {
      const t = (item.topic_name || '').toLowerCase().trim();
      return !t.includes(' - seite ') && t !== 'test' && t !== 'test - test' && t !== 'test-test' && (item.status === 'MASTERED' || item.progress_percent === 100);
    });
    masteredSongs.forEach(item => {
      const topicName = (item.topic_name || item.title || '').replace(/\s*\([^)]*\)\s*$/, '').trim() || 'Song';
      const dateStr = item.updated_at ? new Date(item.updated_at).toLocaleDateString('de-DE') : 'Meilenstein erreicht';
      const alreadyPresent = awardedDetails.some(d => d.topic.toLowerCase().trim() === topicName.toLowerCase().trim());
      if (!alreadyPresent) {
        awardedDetails.push({ topic: topicName, date: dateStr });
      }
    });
  }

  const explicitAwardCount = awardedDetails.length;

  // 4. Calculate effective mastered song count across both explicit context count and progressItems
  const masteredSongsFromItemsCount = progressItems.filter(item => {
    const t = (item.topic_name || '').toLowerCase().trim();
    return !t.includes(' - seite ') && t !== 'test' && t !== 'test - test' && t !== 'test-test' && (item.status === 'MASTERED' || item.progress_percent === 100);
  }).length;
  const effectiveMasteredSongsCount = Math.max(ctx.masteredSongsCount || 0, masteredSongsFromItemsCount, (sticker.category === 'songs' && explicitAwardCount > 0 ? explicitAwardCount : 0));

  // 5. Evaluate threshold / milestone criteria
  let isMilestoneUnlocked = false;
  let progressText = '';
  let autoDetailTopic = '';

  if (sticker.category === 'ueben') {
    const target = sticker.id === 'fleiss-pionier' ? 20 : sticker.id === 'uebe-meister' ? 100 : sticker.id === 'uebe-legende' ? 500 : 1500;
    isMilestoneUnlocked = practiceMinutes >= target;
    const remaining = Math.max(1, target - practiceMinutes);
    if (isMilestoneUnlocked) {
      progressText = `${target} Min. geübt`;
    } else if (remaining <= 30) {
      progressText = `Nur noch ${remaining} Min. Üben 🚀`;
    } else if (remaining <= 90) {
      progressText = `Noch ${remaining} Min. Üben ✨`;
    } else if (target >= 1000) {
      progressText = 'Geheime Meister-Legende 🏆';
    } else if (target >= 500) {
      progressText = 'Großes Fleiß-Ziel 🌟';
    } else {
      progressText = `Noch ${remaining} Min. Üben`;
    }
    autoDetailTopic = `${target} Min. konzentriert geübt`;
  } else if (sticker.category === 'xp') {
    const target = sticker.id === 'xp-sammler' ? 100 : sticker.id === 'xp-champion' ? 500 : sticker.id === 'xp-meister' ? 1500 : 3500;
    isMilestoneUnlocked = xp >= target;
    const remaining = Math.max(1, target - xp);
    if (isMilestoneUnlocked) {
      progressText = `${target} XP erreicht`;
    } else if (remaining <= 50) {
      progressText = `Nur noch ${remaining} XP ⭐`;
    } else if (remaining <= 200) {
      progressText = `Noch ${remaining} XP ✨`;
    } else if (target >= 3000) {
      progressText = 'Geheime Legende 💎';
    } else if (target >= 1000) {
      progressText = 'Zauber-Meilenstein 🌌';
    } else {
      progressText = 'Fleißig XP sammeln ⭐';
    }
    autoDetailTopic = `${target} XP Meilenstein erreicht`;
  } else if (sticker.category === 'streaks') {
    const target = sticker.id === 'dranbleiber' ? 3 : sticker.id === 'wochen-held' ? 7 : sticker.id === 'streak-koenig' ? 21 : 30;
    isMilestoneUnlocked = streakDays >= target;
    const remaining = Math.max(1, target - streakDays);
    if (isMilestoneUnlocked) {
      progressText = `${target} Tage Streak`;
    } else if (target <= 7) {
      progressText = `Noch ${remaining} ${remaining === 1 ? 'Tag' : 'Tage'} Streak 🔥`;
    } else if (target === 21) {
      progressText = '3 Wochen Routine ⚡';
    } else {
      progressText = 'Königs-Disziplin 👑';
    }
    autoDetailTopic = `${target} Tage ununterbrochene Streak`;
  } else if (sticker.category === 'songs') {
    const target = sticker.id === 'erster-erfolg' ? 1 : sticker.id === 'song-sammler' ? 3 : sticker.id === 'repertoire-riese' ? 5 : 10;
    isMilestoneUnlocked = effectiveMasteredSongsCount >= target;
    const remaining = Math.max(1, target - effectiveMasteredSongsCount);
    if (isMilestoneUnlocked) {
      progressText = `${target} ${target === 1 ? 'Song' : 'Songs'} gemeistert`;
    } else if (remaining === 1) {
      progressText = 'Noch 1 Song meistern 🎵';
    } else if (target >= 10) {
      progressText = 'Konzertprogramm 🐉';
    } else {
      progressText = `Noch ${remaining} Songs meistern`;
    }
    autoDetailTopic = `${target} ${target === 1 ? 'Song' : 'Songs'} zu 100% gemeistert`;
  } else {
    // category === 'spezial'
    progressText = 'Von Lehrkraft vergeben 🏆';
  }

  const isUnlocked = explicitAwardCount > 0 || isMilestoneUnlocked;
  const count = explicitAwardCount > 0 ? explicitAwardCount : (isMilestoneUnlocked ? 1 : 0);

  const finalDetails = [...awardedDetails];
  if (isMilestoneUnlocked && finalDetails.length === 0 && autoDetailTopic) {
    finalDetails.push({ topic: autoDetailTopic, date: 'Meilenstein erreicht' });
  }

  return {
    isUnlocked,
    progressText: isUnlocked ? (progressText || 'Freigeschaltet') : progressText,
    count,
    details: finalDetails
  };
};

export const getUnifiedStickersMap = (ctx: StickerUnlockContext) => {
  const result: Record<string, StickerUnlockResult> = {};
  ALL_STICKERS.forEach(st => {
    result[st.id] = getUnifiedStickerStatus(st, ctx);
  });
  return result;
};

export const isInternalMetadataNote = (text: any): boolean => {
  if (!text) return true;
  const str = typeof text === 'string' ? text : JSON.stringify(text);
  const lower = str.toLowerCase().trim();
  const clean = str.replace(/^[•\-\*\s\[\]"'\(\)]+/, '').trim().toLowerCase();
  
  return (
    lower.includes('latency:') ||
    lower.includes('latency_calibration:') ||
    clean.startsWith('audio:') ||
    clean.startsWith('sticker:') ||
    clean.startsWith('loop:') ||
    clean.startsWith('system:') ||
    clean.startsWith('feedback:') ||
    clean.startsWith('student_note_') ||
    clean.startsWith('student_question:') ||
    clean.startsWith('❓ frage für den unterricht:') ||
    clean.startsWith('frage für den unterricht:') ||
    clean.startsWith('hausaufgabe kw ') ||
    clean.startsWith('rhythm_score:') ||
    clean === 'inhalte in der premium-version freischalten' ||
    clean === 'null' ||
    clean === 'undefined' ||
    clean === '[]' ||
    clean === '{}' ||
    clean.length === 0
  );
};

export const cleanNotesText = (text: string | null | undefined): string => {
  if (!text) return '';
  let raw = text;
  if (raw.startsWith('[') || raw.startsWith('{')) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        raw = parsed.join('\n');
      } else {
        raw = String(parsed);
      }
    } catch {}
  }
  return raw
    .split('\n')
    .filter(line => !isInternalMetadataNote(line))
    .map(line => line.replace(/^[•\-\*\s]+/, '').trim())
    .filter(Boolean)
    .join('\n')
    .trim();
};

/**
 * Filters notes specifically for a student in a group or duo setting.
 * - General notes (not starting with @) are shown to everyone.
 * - Notes starting with @Name: (matching student's first name, case-insensitive) or @Alle: are shown to this student.
 * - Notes starting with @OtherName: (where OtherName does not match) are filtered out for this student.
 */
export const filterNotesForStudent = (text: string | null | undefined, studentFirstName?: string): string => {
  const cleaned = cleanNotesText(text);
  if (!cleaned || !studentFirstName) return cleaned;
  
  const firstNameLower = studentFirstName.trim().toLowerCase();
  
  return cleaned
    .split('\n')
    .filter(line => {
      const trimmed = line.trim();
      if (!trimmed.startsWith('@')) return true; // General note
      
      const colonIdx = trimmed.indexOf(':');
      if (colonIdx === -1) return true;
      
      const tagTarget = trimmed.substring(1, colonIdx).trim().toLowerCase();
      if (tagTarget === 'alle' || tagTarget === 'all' || tagTarget === 'gruppe') return true;
      
      return tagTarget === firstNameLower;
    })
    .join('\n')
    .trim();
};

export const checkIsAudioTresorActive = (studentObj?: any): boolean => {
  const rawSch = studentObj?.schools || studentObj?.school;
  const sch = Array.isArray(rawSch) ? rawSch[0] : rawSch;
  const sId = studentObj?.school_id || (studentObj as any)?.schoolId || sch?.id || (typeof window !== 'undefined' ? (localStorage.getItem('groovelab_school_id') || localStorage.getItem('campus_school_id') || localStorage.getItem('groovelab_last_school_id')) : null);

  if (typeof window !== 'undefined') {
    // 1. Direct school overrides (from live Secretary / Admin booking)
    try {
      const overridesStr = localStorage.getItem('groovelab_school_overrides') || localStorage.getItem('campus_school_overrides');
      if (overridesStr) {
        const overrides = JSON.parse(overridesStr);
        if (sId && overrides[sId] !== undefined) {
          const addonGb = Number(overrides[sId].storage_addon_gb ?? -1);
          if (addonGb === 0) return false;
          if (addonGb > 0 && overrides[sId].storage_addon_status !== 'cancelled') {
            return true;
          }
        }
        if (sId && overrides[sId] && Number(overrides[sId].storage_addon_gb || 0) === 0) {
          return false;
        }
        const allEntries = Object.values(overrides) as any[];
        const activeEntry = allEntries.find(e => Number(e.storage_addon_gb || 0) > 0 && e.storage_addon_status !== 'cancelled');
        if (activeEntry && !sId) {
          return true;
        }
      }
    } catch (e) {}

    // 2. Direct storage flags & school-specific storage keys
    if (localStorage.getItem('groovelab_storage_addon_active') === 'false' || localStorage.getItem('campus_storage_addon_active') === 'false') {
      return false;
    }
    if (localStorage.getItem('groovelab_storage_addon_active') === 'true' || localStorage.getItem('campus_storage_addon_active') === 'true') {
      return true;
    }
    if (sId) {
      const schoolKeyGb = Number(localStorage.getItem(`groovelab_storage_addon_gb_${sId}`) || localStorage.getItem(`campus_storage_addon_gb_${sId}`) || 0);
      if (schoolKeyGb > 0) return true;
    }
    const storedGb = Number(localStorage.getItem('groovelab_storage_addon_gb') || localStorage.getItem('campus_storage_addon_gb') || 0);
    if (storedGb > 0) return true;
  }

  if (sch && Number(sch.storage_addon_gb || 0) > 0 && sch.storage_addon_status !== 'cancelled') {
    return true;
  }
  if (studentObj && Number(studentObj.storage_addon_gb || 0) > 0 && studentObj.storage_addon_status !== 'cancelled') {
    return true;
  }

  // 3. Invariant check: Flagship music schools (e.g. Musäk Bad Säckingen) have 20 GB Audio-Tresor booked by contract
  const schoolName = (studentObj?.school_name || sch?.name || (typeof window !== 'undefined' ? (localStorage.getItem('campus_school_name') || localStorage.getItem('groovelab_school_name')) : '')) || '';
  if (schoolName && (schoolName.toLowerCase().includes('bad säckingen') || schoolName.toLowerCase().includes('musäk'))) {
    return true;
  }

  return false;
};
