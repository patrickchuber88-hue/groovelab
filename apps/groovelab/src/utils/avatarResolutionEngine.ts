/**
 * avatarResolutionEngine.ts
 * 
 * Monolith Goldstandard SSOT Avatar Resolution Engine for Campus-Groovelab.
 * Zero external framework dependencies: Node.js, TSX, and Vite compatible.
 * 
 * Rules:
 * - Neutral music room avatar is strictly last-resort emergency fallback.
 * - Only used if:
 *   1. Subject is explicitly non-instrument (MFE, Musikgarten, Musiktheorie, Gehörbildung, Chor, Ensemble).
 *   2. Instrument is an exotic instrument without a 3D avatar (Didgeridoo, Panflöte, etc.).
 * - Instruments with 3D avatars (Guitar, Piano, Drums, Bass, Vocals, Trumpet, etc.) ALWAYS get their dedicated 3D avatar.
 * - Cascade: Student explicit -> Teacher -> Schedules -> Fail-closed guitar avatar.
 */

export const isGenericInstrument = (inst: string | null | undefined): boolean => {
  if (!inst) return true;
  const clean = String(inst).trim().toLowerCase();
  return (
    !clean ||
    clean === 'allgemein' ||
    clean === 'musiker' ||
    clean === 'schüler' ||
    clean === 'schueler' ||
    clean === 'instrument' ||
    clean === 'ohne zuweisung' ||
    clean === 'ohne' ||
    clean === 'nicht festgelegt' ||
    clean === 'nicht zugeordnet' ||
    clean === 'keine angabe' ||
    clean === 'keine' ||
    clean === 'unbekannt' ||
    clean === 'none' ||
    clean === 'null' ||
    clean === 'undefined'
  );
};

export const isExplicitNonInstrumentSubject = (subject: string | null | undefined): boolean => {
  if (!subject) return false;
  const s = String(subject).toLowerCase().trim();
  return (
    s.includes('früherziehung') ||
    s.includes('frueherziehung') ||
    s.includes('mfe') ||
    s.includes('musikgarten') ||
    s.includes('musikkäfer') ||
    s.includes('musiktheorie') ||
    s.includes('gehörbildung') ||
    s.includes('gehoerbildung') ||
    s.includes('rhythmik') ||
    s.includes('ensemble')
  );
};

export const hasDedicated3DAvatar = (instrument: string | null | undefined): boolean => {
  if (!instrument || isGenericInstrument(instrument)) return false;
  const inst = String(instrument).toLowerCase().trim();
  return (
    inst.includes('guitar') || inst.includes('gitarre') || inst.includes('ukulele') ||
    inst.includes('bass') ||
    inst.includes('drum') || inst.includes('schlagzeug') || inst.includes('percussion') || inst.includes('cajon') || inst.includes('marimba') || inst.includes('xylophon') ||
    inst.includes('piano') || inst.includes('keys') || inst.includes('klavier') || inst.includes('keyboard') || inst.includes('flügel') || inst.includes('akkordeon') || inst.includes('accordion') || inst.includes('synthesizer') || inst.includes('synth') ||
    inst.includes('vocal') || inst.includes('gesang') || inst.includes('stimme') || inst.includes('singer') || inst.includes('chor') ||
    inst.includes('trompete') || inst.includes('trumpet') || inst.includes('tuba') || inst.includes('flügelhorn') || inst.includes('kornett') ||
    inst.includes('posaune') || inst.includes('trombone') ||
    inst.includes('waldhorn') || inst.includes('horn') ||
    inst.includes('cello') || inst.includes('violoncello') ||
    inst.includes('geige') || inst.includes('violin') || inst.includes('violine') || inst.includes('bratsche') || inst.includes('viola') || inst.includes('harfe') || inst.includes('harp') ||
    inst.includes('klarinette') || inst.includes('clarinet') || inst.includes('fagott') || inst.includes('bassoon') ||
    inst.includes('flöte') || inst.includes('floete') || inst.includes('flute') ||
    inst.includes('saxofon') || inst.includes('saxophone') || inst.includes('sax') ||
    inst.includes('bariton') || inst.includes('baritone') || inst.includes('euphonium') ||
    inst.includes('oboe')
  );
};

export const getInstrumentAvatarUrl = (instrument: string | null | undefined): string => {
  if (!instrument) return '/avatars/neutral_instrument_avatar.png';
  const inst = instrument.toLowerCase().trim();
  if (inst.includes('e-gitarre')) return '/avatars/egitarre_avatar.png';
  if (inst.includes('ukulele')) return '/avatars/gitarre_avatar_new.png';
  if (inst.includes('guitar') || inst.includes('gitarre')) return '/avatars/gitarre_avatar_new.png';
  if (inst.includes('e-bass')) return '/avatars/ebass_avatar.png';
  if (inst.includes('kontrabass') || inst.includes('double bass')) return '/avatars/kontrabass_avatar.png';
  if (inst.includes('bass')) return '/avatars/bass_avatar.png';
  if (inst.includes('drum') || inst.includes('schlagzeug') || inst.includes('percussion') || inst.includes('cajon') || inst.includes('marimba') || inst.includes('xylophon')) return '/avatars/schlagzeug_avatar.png';
  if (inst.includes('piano') || inst.includes('keys') || inst.includes('klavier') || inst.includes('keyboard') || inst.includes('flügel') || inst.includes('akkordeon') || inst.includes('accordion') || inst.includes('synthesizer') || inst.includes('synth')) return '/avatars/klavier_avatar_new.png';
  if (inst.includes('vocal') || inst.includes('gesang') || inst.includes('stimme') || inst.includes('singer') || inst.includes('chor')) return '/avatars/gesang_avatar.png';
  if (inst.includes('trompete') || inst.includes('trumpet') || inst.includes('tuba') || inst.includes('flügelhorn') || inst.includes('kornett')) return '/avatars/trompete_avatar_new.png';
  if (inst.includes('posaune') || inst.includes('trombone')) return '/avatars/posaune_avatar.png';
  if (inst.includes('waldhorn') || inst.includes('horn')) return '/avatars/horn_avatar_new.png';
  if (inst.includes('cello') || inst.includes('violoncello')) return '/avatars/cello_avatar_new.png';
  if (inst.includes('geige') || inst.includes('violin') || inst.includes('violine') || inst.includes('bratsche') || inst.includes('viola') || inst.includes('harfe') || inst.includes('harp')) return '/avatars/violine_avatar_new.png';
  if (inst.includes('klarinette') || inst.includes('clarinet') || inst.includes('fagott') || inst.includes('bassoon')) return '/avatars/klarinette_avatar_new.png';
  if (inst.includes('blockflöte') || inst.includes('recorder') || inst.includes('blockfloete')) return '/avatars/blockfloete_avatar.png';
  if (inst.includes('querflöte') || inst.includes('flute') || inst.includes('flöte') || inst.includes('floete')) return '/avatars/querfloete_avatar.png';
  if (inst.includes('saxofon') || inst.includes('saxophone') || inst.includes('sax')) return '/avatars/saxophon_avatar_new.png';
  if (inst.includes('bariton') || inst.includes('baritone') || inst.includes('euphonium')) return '/avatars/bariton_avatar.png';
  if (inst.includes('oboe')) return '/avatars/oboe_avatar.png';
  return '/avatars/neutral_instrument_avatar.png';
};

export const getDefaultMusicianAvatarUrl = (instrument: string | null | undefined, role: string | null | undefined): string => {
  const isTeacher = (role || '').toLowerCase() === 'teacher' || (role || '').toLowerCase() === 'admin';
  if (isTeacher) return '/avatar_ghost.jpg';
  
  if (!instrument) return '/avatars/student_eguitar_1.png';
  const inst = instrument.toLowerCase().trim();
  if (inst.includes('guitar') || inst.includes('gitarre')) return '/avatars/student_boy_black_guitar.png';
  if (inst.includes('bass')) return '/avatars/student_boy_black_bass.png';
  if (inst.includes('drum') || inst.includes('schlagzeug')) return '/avatars/student_boy_black_drums.png';
  if (inst.includes('piano') || inst.includes('keys') || inst.includes('klavier') || inst.includes('keyboard')) return '/avatars/student_boy_black_piano.png';
  if (inst.includes('vocal') || inst.includes('gesang') || inst.includes('stimme') || inst.includes('singer')) return '/avatars/student_boy_red_vocals.png';
  return '/avatars/student_eguitar_1.png';
};

export const getInstrumentTypeKey = (instrument: string | null | undefined): string => {
  if (!instrument) return 'guitarist';
  const inst = instrument.toLowerCase().trim();
  if (inst.includes('guitar') || inst.includes('gitarre')) return 'guitarist';
  if (inst.includes('bass')) return 'bassist';
  if (inst.includes('drum') || inst.includes('schlagzeug')) return 'drummer';
  if (inst.includes('piano') || inst.includes('keys') || inst.includes('klavier') || inst.includes('keyboard')) return 'pianist';
  if (inst.includes('vocal') || inst.includes('gesang') || inst.includes('stimme') || inst.includes('singer')) return 'vocalist';
  return 'guitarist';
};

export const getEffectiveInstrument = (
  user: any,
  fallbackTeacherOrTeachersList?: any,
  schedules?: any[]
): string => {
  if (!user) return '';

  // 1. Direct explicit student instrument attributes
  if (user.main_instrument && !isGenericInstrument(user.main_instrument)) {
    return String(user.main_instrument).split(',')[0].trim();
  }
  if (user.resolved_instrument && !isGenericInstrument(user.resolved_instrument)) {
    return String(user.resolved_instrument).split(',')[0].trim();
  }
  if (user.instrument && !isGenericInstrument(user.instrument)) {
    return String(user.instrument).split(',')[0].trim();
  }
  if (user.groovelab_instrument && !isGenericInstrument(user.groovelab_instrument)) {
    return String(user.groovelab_instrument).split(',')[0].trim();
  }
  if (user.subject && !isGenericInstrument(user.subject)) {
    return String(user.subject).split(',')[0].trim();
  }

  // 2. Embedded teacher profile on student
  if (user.teacher?.instrument && !isGenericInstrument(user.teacher.instrument)) {
    return String(user.teacher.instrument).split(',')[0].trim();
  }
  if (user.teacher?.subject && !isGenericInstrument(user.teacher.subject)) {
    return String(user.teacher.subject).split(',')[0].trim();
  }
  if (user.teacher?.expertise && !isGenericInstrument(user.teacher.expertise)) {
    return String(user.teacher.expertise).split(',')[0].trim();
  }

  // 3. Fallback teacher or teacher list lookup
  if (fallbackTeacherOrTeachersList) {
    if (Array.isArray(fallbackTeacherOrTeachersList)) {
      const assignedTeacher = fallbackTeacherOrTeachersList.find((t: any) => t.id === user.teacher_id);
      if (assignedTeacher?.instrument && !isGenericInstrument(assignedTeacher.instrument)) {
        return String(assignedTeacher.instrument).split(',')[0].trim();
      }
      if (assignedTeacher?.subject && !isGenericInstrument(assignedTeacher.subject)) {
        return String(assignedTeacher.subject).split(',')[0].trim();
      }
      if (assignedTeacher?.expertise && !isGenericInstrument(assignedTeacher.expertise)) {
        return String(assignedTeacher.expertise).split(',')[0].trim();
      }
    } else if (typeof fallbackTeacherOrTeachersList === 'object') {
      const t = fallbackTeacherOrTeachersList;
      if (t.instrument && !isGenericInstrument(t.instrument)) {
        return String(t.instrument).split(',')[0].trim();
      }
      if (t.subject && !isGenericInstrument(t.subject)) {
        return String(t.subject).split(',')[0].trim();
      }
      if (t.expertise && !isGenericInstrument(t.expertise)) {
        return String(t.expertise).split(',')[0].trim();
      }
    }
  }

  // 4. Schedules lookup
  if (Array.isArray(schedules) && schedules.length > 0 && user.id) {
    const studentSchedule = schedules.find((s: any) => s.student_id === user.id);
    if (studentSchedule) {
      if (studentSchedule.instrument && !isGenericInstrument(studentSchedule.instrument)) {
        return String(studentSchedule.instrument).split(',')[0].trim();
      }
      if (studentSchedule.subject && !isGenericInstrument(studentSchedule.subject)) {
        return String(studentSchedule.subject).split(',')[0].trim();
      }
      if (studentSchedule.teacher?.instrument && !isGenericInstrument(studentSchedule.teacher.instrument)) {
        return String(studentSchedule.teacher.instrument).split(',')[0].trim();
      }
    }
  }

  // 5. Inspect photo_url if it points to an instrument avatar
  if (user.photo_url) {
    const p = String(user.photo_url).toLowerCase();
    if (p.includes('gitarre') || p.includes('guitar')) return 'Gitarre';
    if (p.includes('klavier') || p.includes('piano')) return 'Klavier';
    if (p.includes('schlagzeug') || p.includes('drum')) return 'Schlagzeug';
    if (p.includes('bass')) return 'Bass';
    if (p.includes('gesang') || p.includes('vocal')) return 'Gesang';
    if (p.includes('trompete') || p.includes('trumpet')) return 'Trompete';
    if (p.includes('posaune') || p.includes('trombone')) return 'Posaune';
    if (p.includes('horn')) return 'Horn';
    if (p.includes('cello')) return 'Cello';
    if (p.includes('violine') || p.includes('violin') || p.includes('geige')) return 'Violine';
    if (p.includes('klarinette') || p.includes('clarinet')) return 'Klarinette';
    if (p.includes('querfloete') || p.includes('flute') || p.includes('floete')) return 'Querflöte';
    if (p.includes('saxophon') || p.includes('sax')) return 'Saxophon';
    if (p.includes('blockfloete') || p.includes('recorder')) return 'Blockflöte';
    if (p.includes('bariton') || p.includes('baritone')) return 'Bariton';
    if (p.includes('oboe')) return 'Oboe';
  }

  return '';
};

export const resolveCampusStudentAvatar = (
  user: any,
  fallbackTeacherOrTeachersList?: any,
  schedules?: any[]
): string => {
  if (!user) return '/avatars/gitarre_avatar_new.png';

  const role = (user.role || '').toLowerCase();
  const roles = Array.isArray(user.roles) ? user.roles.map((r: any) => String(r).toLowerCase()) : [];
  const isExplicitTeacher = role === 'teacher' || user.isTeacherContext === true || user.isTeacher === true || user.activeWorkspace === 'teacher';
  const isExplicitStudent = role === 'student';

  if (!isExplicitTeacher && !isExplicitStudent) {
    if (role === 'admin' || role === 'secretary' || roles.includes('admin') || roles.includes('secretary')) {
      return '/campus_login_hero.png';
    }
  }

  // 1. Direct photo_url if it already points to a 3D instrument avatar
  if (user.photo_url && (
    user.photo_url.includes('gitarre_avatar') ||
    user.photo_url.includes('egitarre_avatar') ||
    user.photo_url.includes('bass_avatar') ||
    user.photo_url.includes('ebass_avatar') ||
    user.photo_url.includes('schlagzeug_avatar') ||
    user.photo_url.includes('klavier_avatar') ||
    user.photo_url.includes('gesang_avatar') ||
    user.photo_url.includes('trompete_avatar') ||
    user.photo_url.includes('posaune_avatar') ||
    user.photo_url.includes('saxophon_avatar') ||
    user.photo_url.includes('klarinette_avatar') ||
    user.photo_url.includes('querfloete_avatar') ||
    user.photo_url.includes('blockfloete_avatar') ||
    user.photo_url.includes('violine_avatar') ||
    user.photo_url.includes('cello_avatar') ||
    user.photo_url.includes('horn_avatar') ||
    user.photo_url.includes('bariton_avatar') ||
    user.photo_url.includes('oboe_avatar')
  )) {
    return user.photo_url;
  }

  // 2. Resolve effective instrument across student, teacher, and schedule bookings
  const effectiveInst = getEffectiveInstrument(user, fallbackTeacherOrTeachersList, schedules);

  if (effectiveInst && !isGenericInstrument(effectiveInst)) {
    // Non-instrument subjects (MFE, Musikgarten, Musiktheorie, Ensemble) get neutral avatar
    if (isExplicitNonInstrumentSubject(effectiveInst)) {
      return '/avatars/neutral_instrument_avatar.png';
    }
    // Instruments with 3D avatars get their respective avatar
    if (hasDedicated3DAvatar(effectiveInst)) {
      return getInstrumentAvatarUrl(effectiveInst);
    }
    // Exotic instruments without 3D avatars get neutral avatar
    return '/avatars/neutral_instrument_avatar.png';
  }

  // 3. Check for explicit non-instrument subjects on raw user attributes
  if (
    isExplicitNonInstrumentSubject(user.instrument) ||
    isExplicitNonInstrumentSubject(user.subject) ||
    isExplicitNonInstrumentSubject(user.resolved_instrument)
  ) {
    return '/avatars/neutral_instrument_avatar.png';
  }

  // 4. Fail-closed fallback: guitar avatar for music school students (never neutral room!)
  return '/avatars/gitarre_avatar_new.png';
};

/**
 * Resolves the musician avatar for a teacher/coach in GrooveLab.
 * - Prioritizes chosen musician avatars (custom photo or 3D instrument avatar from TeacherSettingsView).
 * - Strictly filters out /campus_login_hero.png.
 * - Falls back to /avatar_ghost.jpg (the ghost musician avatar).
 */
export const resolveGrooveLabTeacherAvatar = (user?: any, src?: string | null): string => {
  if (!user && !src) return '/avatar_ghost.jpg';

  // 1. Direct explicit valid src (custom upload or selected avatar)
  if (src && src !== '/campus_login_hero.png') {
    return src;
  }

  // 2. User avatar_url attribute
  if (user?.avatar_url && user.avatar_url !== '/campus_login_hero.png') {
    return user.avatar_url;
  }

  // 3. User photo_url attribute
  if (user?.photo_url && user.photo_url !== '/campus_login_hero.png') {
    return user.photo_url;
  }

  // 4. Fallback: ghost musician avatar
  return '/avatar_ghost.jpg';
};

