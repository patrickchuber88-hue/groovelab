export interface BandAvatarItem {
  id: string;
  url: string;
  size: number;
}

export interface AvatarItem {
  id: string;
  url: string;
}

export interface StudentAvatarItem {
  id: string;
  url: string;
  category: string;
}

export const BAND_AVATARS: BandAvatarItem[] = [
  // 20 New 3D Studio Band Avatars (Alternating sizes/types matching the student avatar style)
  { id: 'band_avatar_new_01', url: '/avatars/band_avatar_new_01.png', size: 3 },
  { id: 'band_avatar_new_02', url: '/avatars/band_avatar_new_02.png', size: 3 },
  { id: 'band_avatar_new_03', url: '/avatars/band_avatar_new_03.png', size: 3 },
  { id: 'band_avatar_new_04', url: '/avatars/band_avatar_new_04.png', size: 3 },
  { id: 'band_avatar_new_05', url: '/avatars/band_avatar_new_05.png', size: 4 },
  { id: 'band_avatar_new_06', url: '/avatars/band_avatar_new_06.png', size: 4 },
  { id: 'band_avatar_new_07', url: '/avatars/band_avatar_new_07.png', size: 5 },
  { id: 'band_avatar_new_08', url: '/avatars/band_avatar_new_08.png', size: 5 },
  { id: 'band_avatar_new_09', url: '/avatars/band_avatar_new_09.png', size: 4 },
  { id: 'band_avatar_new_10', url: '/avatars/band_avatar_new_10.png', size: 3 },
  { id: 'band_avatar_new_11', url: '/avatars/band_avatar_new_11.png', size: 3 },
  { id: 'band_avatar_new_12', url: '/avatars/band_avatar_new_12.png', size: 3 },
  { id: 'band_avatar_new_13', url: '/avatars/band_avatar_new_13.png', size: 4 },
  { id: 'band_avatar_new_14', url: '/avatars/band_avatar_new_14.png', size: 4 },
  { id: 'band_avatar_new_15', url: '/avatars/band_avatar_new_15.png', size: 5 },
  { id: 'band_avatar_new_16', url: '/avatars/band_avatar_new_16.png', size: 4 },
  { id: 'band_avatar_new_17', url: '/avatars/band_avatar_new_17.png', size: 3 },
  { id: 'band_avatar_new_18', url: '/avatars/band_avatar_new_18.png', size: 4 },
  { id: 'band_avatar_new_19', url: '/avatars/band_avatar_new_19.png', size: 5 },
  { id: 'band_avatar_new_20', url: '/avatars/band_avatar_new_20.png', size: 3 },

  { id: 'band_kids_formation_light_1', url: '/avatars/band_kids_formation_light_1.png', size: 5 },
  { id: 'band_kids_formation_light_2', url: '/avatars/band_kids_formation_light_2.png', size: 5 },
  { id: 'band_kids_formation_light_3', url: '/avatars/band_kids_formation_light_3.png', size: 5 },
  { id: 'band_kids_formation_light_4', url: '/avatars/band_kids_formation_light_4.png', size: 5 },
  { id: 'band_kids_formation_1', url: '/avatars/band_kids_formation_1.png', size: 5 },
  { id: 'band_kids_formation_2', url: '/avatars/band_kids_formation_2.png', size: 5 },
  { id: 'band_kids_formation_3', url: '/avatars/band_kids_formation_3.png', size: 5 },
  { id: 'band_kids_formation_4', url: '/avatars/band_kids_formation_4.png', size: 5 },
  { id: 'band_kids_duo', url: '/avatars/band_kids_duo.png', size: 2 },
  { id: 'band_kids_trio', url: '/avatars/band_kids_trio.png', size: 3 },
  { id: 'band_kids_quartet', url: '/avatars/band_kids_quartet.png', size: 4 },
  { id: 'band_kids_quintet', url: '/avatars/band_kids_quintet.png', size: 5 },
  { id: 'band_kids_groovelab', url: '/avatars/band_kids_groovelab.png', size: 4 },
  
  // Teen Rock / Alternative / Indie
  { id: 'band_teen_alternative_rock', url: '/avatars/band_teen_alternative_rock.png', size: 4 },
  { id: 'band_teen_grunge_trio', url: '/avatars/band_teen_grunge_trio.png', size: 3 },
  { id: 'band_teen_hard_rock', url: '/avatars/band_teen_hard_rock.png', size: 4 },
  { id: 'band_teen_indie_pop', url: '/avatars/band_teen_indie_pop.png', size: 4 },
  { id: 'band_teen_indie_trio', url: '/avatars/band_teen_indie_trio.png', size: 3 },
  { id: 'band_teen_metal_quintet', url: '/avatars/band_teen_metal_quintet.png', size: 5 },
  { id: 'band_teen_modern_pop', url: '/avatars/band_teen_modern_pop.png', size: 4 },
  { id: 'band_teen_pop_duo', url: '/avatars/band_teen_pop_duo.png', size: 2 },
  { id: 'band_teen_quad_instrumental_1', url: '/avatars/band_teen_quad_instrumental_1.png', size: 4 },
  { id: 'band_teen_quad_instrumental_2', url: '/avatars/band_teen_quad_instrumental_2.png', size: 4 },
  { id: 'band_teen_quintet_vocals_1', url: '/avatars/band_teen_quintet_vocals_1.png', size: 5 },
  { id: 'band_teen_quintet_vocals_2', url: '/avatars/band_teen_quintet_vocals_2.png', size: 5 },
  { id: 'band_avatar_acoustic_duo', url: '/avatars/band_avatar_acoustic_duo.png', size: 2 },
  { id: 'band_neon_rock_1', url: '/avatars/band_neon_rock_1.png', size: 4 },

  // Dynamic Group Avatars
  { id: '3_1', url: '/band_avatar_3_musicians_1_1777469162449.png', size: 3 },
  { id: '3_2', url: '/band_avatar_3_musicians_2_1777469216449.png', size: 3 },
  { id: '3_3', url: '/band_avatar_3_musicians_3_1777469286463.png', size: 3 },
  { id: '4_1', url: '/band_avatar_4_musicians_1_1777469178768.png', size: 4 },
  { id: '4_2', url: '/band_avatar_4_musicians_2_1777469299351.png', size: 4 },
  { id: '4_3', url: '/band_avatar_4_musicians_3_1777469315500.png', size: 4 },
  { id: '5_1', url: '/band_avatar_5_musicians_1_1777469193682.png', size: 5 },
  { id: '5_2', url: '/band_avatar_5_musicians_2_1777469330208.png', size: 5 },
  { id: '5_3', url: '/band_avatar_5_musicians_3_1777469343103.png', size: 5 },
  
  // Classic Bands
  { id: 'band_pop_1', url: '/avatars/band_pop_1.png', size: 3 },
  { id: 'band_rock_1', url: '/avatars/band_rock_1.png', size: 4 },
  { id: 'band_trio_1', url: '/avatars/band_trio_1.png', size: 3 },
  { id: 'band_duo_1', url: '/avatars/band_duo_1.png', size: 2 },
  { id: 'band_quartet_1', url: '/avatars/band_quartet_1.png', size: 4 },
  { id: 'band_quintet_1', url: '/avatars/band_quintet_1.png', size: 5 },
];

export const CAMPUS_AVATARS: AvatarItem[] = [
  { id: 'avatar_blockfloete', url: '/avatars/blockfloete_avatar.png' },
  { id: 'avatar_bariton', url: '/avatars/bariton_avatar.png' },
  { id: 'avatar_cello', url: '/avatars/cello_avatar_new.png' },
  { id: 'avatar_ebass', url: '/avatars/ebass_avatar.png' },
  { id: 'avatar_egitarre', url: '/avatars/egitarre_avatar.png' },
  { id: 'avatar_gitarre', url: '/avatars/gitarre_avatar_new.png' },
  { id: 'avatar_horn', url: '/avatars/horn_avatar_new.png' },
  { id: 'avatar_klarinette', url: '/avatars/klarinette_avatar_new.png' },
  { id: 'avatar_klavier', url: '/avatars/klavier_avatar_new.png' },
  { id: 'avatar_kontrabass', url: '/avatars/kontrabass_avatar.png' },
  { id: 'avatar_oboe', url: '/avatars/oboe_avatar.png' },
  { id: 'avatar_posaune', url: '/avatars/posaune_avatar.png' },
  { id: 'avatar_querfloete', url: '/avatars/querfloete_avatar.png' },
  { id: 'avatar_saxophon', url: '/avatars/saxophon_avatar_new.png' },
  { id: 'avatar_schlagzeug', url: '/avatars/schlagzeug_avatar.png' },
  { id: 'avatar_trompete', url: '/avatars/trompete_avatar_new.png' },
  { id: 'avatar_violine', url: '/avatars/violine_avatar_new.png' },
  { id: 'avatar_vocals', url: '/avatars/gesang_avatar.png' }
];

export const STUDENT_AVATARS: StudentAvatarItem[] = [
  // E-Gitarre (15)
  { id: 'student_boy_guitar_1', url: '/avatars/student_boy_black_guitar.png', category: 'E-Gitarre' },
  { id: 'student_girl_guitar_1', url: '/avatars/student_girl_blonde_guitar.png', category: 'E-Gitarre' },
  { id: 'student_boy_blonde_guitar', url: '/avatars/student_boy_blonde_guitar.png', category: 'E-Gitarre' },
  { id: 'student_girl_black_guitar', url: '/avatars/student_girl_black_guitar.png', category: 'E-Gitarre' },
  { id: 'student_eguitar_alt', url: '/avatars/student_eguitar_1.png', category: 'E-Gitarre' },
  { id: 'bandstyle_boy_eguitar', url: '/avatars/bandstyle_boy_eguitar.png', category: 'E-Gitarre' },
  { id: 'bandstyle_girl_eguitar', url: '/avatars/bandstyle_girl_eguitar.png', category: 'E-Gitarre' },
  { id: 'teen_boy_eguitar_realistic', url: '/avatars/teen_boy_eguitar_realistic.png', category: 'E-Gitarre' },
  { id: 'teen_girl_eguitar_focused', url: '/avatars/teen_girl_eguitar_focused.png', category: 'E-Gitarre' },
  { id: 'teen_boy_eguitar_17', url: '/avatars/teen_boy_eguitar_17.png', category: 'E-Gitarre' },
  { id: 'teen_boy_acoustic_guitar', url: '/avatars/teen_boy_acoustic_guitar.png', category: 'E-Gitarre' },
  { id: 'teen_girl_acoustic_guitar', url: '/avatars/teen_girl_acoustic_guitar.png', category: 'E-Gitarre' },
  { id: 'student_eguitar_new_1', url: '/avatars/student_eguitar_new_1.png', category: 'E-Gitarre' },
  { id: 'student_eguitar_new_2', url: '/avatars/student_eguitar_new_2.png', category: 'E-Gitarre' },
  { id: 'student_eguitar_new_3', url: '/avatars/student_eguitar_new_3.png', category: 'E-Gitarre' },

  // E-Piano / Keyboard (15)
  { id: 'student_boy_piano_1', url: '/avatars/student_boy_black_piano.png', category: 'E-Piano' },
  { id: 'student_girl_piano_1', url: '/avatars/student_girl_black_piano.png', category: 'E-Piano' },
  { id: 'student_piano_alt', url: '/avatars/student_piano_1.png', category: 'E-Piano' },
  { id: 'student_boy_piano_2', url: '/avatars/student_boy_piano_2.png', category: 'E-Piano' },
  { id: 'student_girl_piano_2', url: '/avatars/student_girl_piano_2.png', category: 'E-Piano' },
  { id: 'student_girl_lightbrown_piano', url: '/avatars/student_girl_lightbrown_piano.png', category: 'E-Piano' },
  { id: 'student_boy_lightbrown_piano', url: '/avatars/student_boy_lightbrown_piano.png', category: 'E-Piano' },
  { id: 'student_boy_keyboard_1', url: '/avatars/student_boy_keyboard_1.png', category: 'E-Piano' },
  { id: 'student_boy_producer_1', url: '/avatars/student_boy_producer_1.png', category: 'E-Piano' },
  { id: 'student_tech_1', url: '/avatars/student_tech_1.png', category: 'E-Piano' },
  { id: 'bandstyle_boy_epiano', url: '/avatars/bandstyle_boy_epiano.png', category: 'E-Piano' },
  { id: 'bandstyle_girl_epiano', url: '/avatars/bandstyle_girl_epiano.png', category: 'E-Piano' },
  { id: 'avatar_boy_piano', url: '/avatar_boy_piano.jpg', category: 'E-Piano' },
  { id: 'avatar_girl_piano', url: '/avatar_girl_piano.jpg', category: 'E-Piano' },
  { id: 'student_epiano_new_1', url: '/avatars/student_epiano_new_1.png', category: 'E-Piano' },

  // E-Drums (15)
  { id: 'student_boy_drums_1', url: '/avatars/student_boy_black_drums.png', category: 'E-Drum' },
  { id: 'student_girl_drums_1', url: '/avatars/student_girl_blonde_drums.png', category: 'E-Drum' },
  { id: 'student_boy_blonde_drums', url: '/avatars/student_boy_blonde_drums.png', category: 'E-Drum' },
  { id: 'student_girl_black_drums', url: '/avatars/student_girl_black_drums.png', category: 'E-Drum' },
  { id: 'student_drums_alt', url: '/avatars/student_drums_1.png', category: 'E-Drum' },
  { id: 'student_boy_drums_2', url: '/avatars/student_boy_drums_2.png', category: 'E-Drum' },
  { id: 'student_girl_drums_2', url: '/avatars/student_girl_drums_2.png', category: 'E-Drum' },
  { id: 'student_boy_drums_3', url: '/avatars/student_boy_drums_3.png', category: 'E-Drum' },
  { id: 'student_girl_drums_3', url: '/avatars/student_girl_drums_3.png', category: 'E-Drum' },
  { id: 'bandstyle_boy_edrums', url: '/avatars/bandstyle_boy_edrums.png', category: 'E-Drum' },
  { id: 'bandstyle_girl_edrums', url: '/avatars/bandstyle_girl_edrums.png', category: 'E-Drum' },
  { id: 'avatar_boy_drums', url: '/avatar_boy_drums.jpg', category: 'E-Drum' },
  { id: 'avatar_girl_drums', url: '/avatar_girl_drums.jpg', category: 'E-Drum' },
  { id: 'student_edrums_new_1', url: '/avatars/student_edrums_new_1.png', category: 'E-Drum' },
  { id: 'student_edrums_new_2', url: '/avatars/student_edrums_new_2.png', category: 'E-Drum' },

  // E-Bass (15)
  { id: 'student_girl_bass_1', url: '/avatars/student_girl_black_bass.png', category: 'E-Bass' },
  { id: 'student_bass_alt', url: '/avatars/student_bass_1.png', category: 'E-Bass' },
  { id: 'student_girl_ebass_1', url: '/avatars/student_girl_ebass_1.png', category: 'E-Bass' },
  { id: 'bandstyle_boy_ebass', url: '/avatars/bandstyle_boy_ebass.png', category: 'E-Bass' },
  { id: 'bandstyle_girl_ebass', url: '/avatars/bandstyle_girl_ebass.png', category: 'E-Bass' },
  { id: 'avatar_boy_bass', url: '/avatar_boy_bass.jpg', category: 'E-Bass' },
  { id: 'avatar_girl_bass', url: '/avatar_girl_bass.jpg', category: 'E-Bass' },
  { id: 'student_ebass_new_1', url: '/avatars/student_ebass_new_1.png', category: 'E-Bass' },
  { id: 'student_ebass_new_2', url: '/avatars/student_ebass_new_2.png', category: 'E-Bass' },
  { id: 'student_ebass_new_3', url: '/avatars/student_ebass_new_3.png', category: 'E-Bass' },
  { id: 'student_ebass_new_4', url: '/avatars/student_ebass_new_4.png', category: 'E-Bass' },
  { id: 'student_ebass_new_5', url: '/avatars/student_ebass_new_5.png', category: 'E-Bass' },
  { id: 'student_ebass_new_6', url: '/avatars/student_ebass_new_6.png', category: 'E-Bass' },
  { id: 'student_ebass_new_7', url: '/avatars/student_ebass_new_7.png', category: 'E-Bass' },
  { id: 'student_ebass_new_8', url: '/avatars/student_ebass_new_8.png', category: 'E-Bass' },

  // Gesang (15)
  { id: 'student_boy_vocals_1', url: '/avatars/student_boy_red_vocals.png', category: 'Gesang' },
  { id: 'student_girl_vocals_1', url: '/avatars/student_girl_red_vocals.png', category: 'Gesang' },
  { id: 'student_boy_vocals_new', url: '/avatars/student_boy_vocals_1.png', category: 'Gesang' },
  { id: 'student_girl_vocals_new', url: '/avatars/student_girl_vocals_1.png', category: 'Gesang' },
  { id: 'student_vocals_alt', url: '/avatars/student_vocals_1.png', category: 'Gesang' },
  { id: 'student_vocals_new_2', url: '/avatars/student_vocals_new_2.png', category: 'Gesang' },
  { id: 'student_vocals_new_3', url: '/avatars/student_vocals_new_3.png', category: 'Gesang' },
  { id: 'student_vocals_new_4', url: '/avatars/student_vocals_new_4.png', category: 'Gesang' },
  { id: 'student_vocals_new_5', url: '/avatars/student_vocals_new_5.png', category: 'Gesang' },
  { id: 'student_vocals_new_6', url: '/avatars/student_vocals_new_6.png', category: 'Gesang' },
  { id: 'student_vocals_new_7', url: '/avatars/student_vocals_new_7.png', category: 'Gesang' },
  { id: 'student_vocals_new_8', url: '/avatars/student_vocals_new_8.png', category: 'Gesang' },
  { id: 'student_vocals_new_9', url: '/avatars/student_vocals_new_9.png', category: 'Gesang' },
  { id: 'student_vocals_new_10', url: '/avatars/student_vocals_new_10.png', category: 'Gesang' },
  { id: 'student_vocals_new_11', url: '/avatars/student_vocals_new_11.png', category: 'Gesang' },

  // Allgemein / Sonstige
  { id: 'avatar_boy_general', url: '/avatar_boy.jpg', category: 'Sonstige' },
  { id: 'avatar_girl_general', url: '/avatar_girl.jpg', category: 'Sonstige' }
];

export const TEACHER_AVATARS: AvatarItem[] = [
  { id: 'teacher_male', url: '/avatar_teacher_male.jpg' },
  { id: 'teacher_female', url: '/avatar_teacher_female.jpg' },
  { id: 'teacher_expert', url: '/avatar_teacher_expert.jpg' },
  { id: 'teacher_drums', url: '/avatar_teacher_drums.jpg' },
  { id: 'teacher_drummer', url: '/avatar_teacher_drummer.jpg' },
  { id: 'teacher_gold_glasses', url: '/avatar_teacher_gold_glasses.jpg' },
  { id: 'teacher_senior', url: '/avatar_teacher_senior.jpg' },
  { id: 'teacher_clean', url: '/avatar_teacher_clean.jpg' },
];
