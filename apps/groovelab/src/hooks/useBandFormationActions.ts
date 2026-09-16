import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { generateRandomBandName } from '../utils/bandNameGenerator';

export interface UseBandFormationParams {
  user: any;
  loading: boolean;
  userBands: any[];
  userSongs: any[];
  wallSongs: any[];
  activeStudentTab: string;
  selectedBandForGateway: any;
  showBandProfile: boolean;
  fetchDashboardData?: (userId: string, isInitial?: boolean) => Promise<void> | void;
}

export interface UseBandFormationReturn {
  studentActivity: any[];
  setStudentActivity: React.Dispatch<React.SetStateAction<any[]>>;
  showBandNaming: boolean;
  setShowBandNaming: React.Dispatch<React.SetStateAction<boolean>>;
  namingTarget: { song: any; form: any } | null;
  setNamingTarget: React.Dispatch<React.SetStateAction<{ song: any; form: any } | null>>;
  showBandConsent: boolean;
  setShowBandConsent: React.Dispatch<React.SetStateAction<boolean>>;
  consentTarget: { song: any; form: any } | null;
  setConsentTarget: React.Dispatch<React.SetStateAction<{ song: any; form: any } | null>>;
  showEditBand: boolean;
  setShowEditBand: React.Dispatch<React.SetStateAction<boolean>>;
  isJoiningVocal: string | null;
  setIsJoiningVocal: React.Dispatch<React.SetStateAction<string | null>>;
  isJoiningGuest: string | null;
  setIsJoiningGuest: React.Dispatch<React.SetStateAction<string | null>>;
  showTeacherVocalPicker: string | null;
  setShowTeacherVocalPicker: React.Dispatch<React.SetStateAction<string | null>>;
  externalVocalists: any[];
  setExternalVocalists: React.Dispatch<React.SetStateAction<any[]>>;
  editingBand: any;
  setEditingBand: React.Dispatch<React.SetStateAction<any>>;
  restoredBandId: string | null;
  suggestingSkill: any;
  setSuggestingSkill: React.Dispatch<React.SetStateAction<any>>;
  exclusiveProposal: boolean;
  setExclusiveProposal: React.Dispatch<React.SetStateAction<boolean>>;
  matchingLevelFilter: 'all' | 'starter' | 'pro';
  setMatchingLevelFilter: React.Dispatch<React.SetStateAction<'all' | 'starter' | 'pro'>>;
  pendingFounding: any | null;
  setPendingFounding: React.Dispatch<React.SetStateAction<any | null>>;
  showFoundingModal: boolean;
  setShowFoundingModal: React.Dispatch<React.SetStateAction<boolean>>;
  foundingName: string;
  setFoundingName: React.Dispatch<React.SetStateAction<string>>;
  foundingLanguage: 'de' | 'en';
  setFoundingLanguage: React.Dispatch<React.SetStateAction<'de' | 'en'>>;
  selectedCoachId: string;
  setSelectedCoachId: React.Dispatch<React.SetStateAction<string>>;
  lastAutoTriggeredFormId: string | null;
  setLastAutoTriggeredFormId: React.Dispatch<React.SetStateAction<string | null>>;
  updateAutoTriggerId: (id: string | null) => void;
  ignoredFoundingIds: React.MutableRefObject<string[]>;
  gatewayJustClosed: React.MutableRefObject<boolean>;
  lastWriteTimeRef: React.MutableRefObject<number>;
  dismissSuggestion: (songSkillId: string) => void;
}

export const useBandFormationActions = ({
  user,
  loading,
  userBands,
  userSongs,
  wallSongs,
  activeStudentTab,
  selectedBandForGateway,
  showBandProfile,
  fetchDashboardData
}: UseBandFormationParams): UseBandFormationReturn => {
  const [studentActivity, setStudentActivity] = useState<any[]>([]);
  const [showBandNaming, setShowBandNaming] = useState(false);
  const [namingTarget, setNamingTarget] = useState<{ song: any; form: any } | null>(null);
  const [showBandConsent, setShowBandConsent] = useState(false);
  const [consentTarget, setConsentTarget] = useState<{ song: any; form: any } | null>(null);
  const [showEditBand, setShowEditBand] = useState(false);
  const [isJoiningVocal, setIsJoiningVocal] = useState<string | null>(null);
  const [isJoiningGuest, setIsJoiningGuest] = useState<string | null>(null);
  const [showTeacherVocalPicker, setShowTeacherVocalPicker] = useState<string | null>(null);
  const [externalVocalists, setExternalVocalists] = useState<any[]>([]);
  const [editingBand, setEditingBand] = useState<any>(null);
  const [restoredBandId] = useState<string | null>(() => localStorage.getItem('groovelab_selected_band_id'));

  const [suggestingSkill, setSuggestingSkill] = useState<any>(null);
  const [exclusiveProposal, setExclusiveProposal] = useState<boolean>(true);
  const [matchingLevelFilter, setMatchingLevelFilter] = useState<'all' | 'starter' | 'pro'>('all');
  const [pendingFounding, setPendingFounding] = useState<any | null>(null);
  const [showFoundingModal, setShowFoundingModal] = useState(false);
  const [foundingName, setFoundingName] = useState('');
  const [foundingLanguage, setFoundingLanguage] = useState<'de' | 'en'>('de');
  const [selectedCoachId, setSelectedCoachId] = useState<string>('');
  const [lastAutoTriggeredFormId, setLastAutoTriggeredFormId] = useState<string | null>(() => sessionStorage.getItem('groovelab_last_form_id'));

  const updateAutoTriggerId = useCallback((id: string | null) => {
    setLastAutoTriggeredFormId(id);
    if (id) sessionStorage.setItem('groovelab_last_form_id', id);
    else sessionStorage.removeItem('groovelab_last_form_id');
  }, []);

  useEffect(() => {
    if (showFoundingModal && !foundingName) {
      setFoundingName(generateRandomBandName(foundingLanguage));
    } else if (!showFoundingModal) {
      setFoundingName('');
    }
  }, [showFoundingModal, foundingLanguage]);

  const ignoredFoundingIds = useRef<string[]>([]);
  const gatewayJustClosed = useRef<boolean>(false);
  const lastWriteTimeRef = useRef<number>(0);

  const dismissSuggestion = useCallback((songSkillId: string) => {
    if (!user?.id) return;
    const storageKey = `groovelab_prompted_${user.id}`;
    const promptedIds = JSON.parse(localStorage.getItem(storageKey) || '[]');
    if (!promptedIds.includes(songSkillId)) {
      promptedIds.push(songSkillId);
      localStorage.setItem(storageKey, JSON.stringify(promptedIds));
    }

    // Also mark the specific song as ignored for auto-founding trigger
    if (suggestingSkill?.song_id) {
      const inst = (suggestingSkill.instrument || '').toLowerCase();
      localStorage.setItem(`groovelab_founding_ignored_${user.id}_${suggestingSkill.song_id}_${inst}`, 'true');
    }
    if (suggestingSkill?.songs?.id) {
      const inst = (suggestingSkill.instrument || '').toLowerCase();
      localStorage.setItem(`groovelab_founding_ignored_${user.id}_${suggestingSkill.songs.id}_${inst}`, 'true');
    }

    console.log('[DEBUG-Groovelab] setSuggestingSkill(null) in dismissSuggestion');
    setSuggestingSkill(null);
    setSelectedCoachId('');
  }, [user?.id, suggestingSkill]);

  // Auto-trigger Band Founding Modal when formation is complete
  useEffect(() => {
    if (loading || !user || suggestingSkill || selectedBandForGateway || pendingFounding || showBandProfile || gatewayJustClosed.current) return;

    // 1. Auto-trigger: If user is in a band and mastered a new skill, suggest it to their band first
    if (userBands.length > 0) {
      const stageReadySkills = userSongs.filter((s: any) => s.is_stage_ready && s.instrument !== 'Vocals');

      for (const skill of stageReadySkills) {
        const inst = (skill.instrument || '').toLowerCase();
        const isIgnored = localStorage.getItem(`groovelab_founding_ignored_${user.id}_${skill.song_id}_${inst}`);
        if (isIgnored) continue;

        // Has it already been suggested/added to ANY of their bands?
        const alreadyInBand = userBands.some((b: any) =>
          b.song_id === skill.song_id ||
          (b.band_songs || []).some((bs: any) => bs.song_id === skill.song_id || bs.songs?.id === skill.song_id)
        );

        if (!alreadyInBand) {
          console.log('[AutoTrigger] Suggesting skill to band:', skill.title);
          console.log('[DEBUG-Groovelab] setSuggestingSkill (suggest to band) in auto-trigger', skill.title);
          setSuggestingSkill({
            ...skill,
            songs: { id: skill.song_id, title: skill.title }
          });
          return;
        }
      }
    }
  }, [wallSongs, activeStudentTab, user, userBands, userSongs, suggestingSkill, selectedBandForGateway, pendingFounding, showBandProfile, loading]);

  // Safety check: If suggestingSkill is set but userBands loads and indicates
  // that the song is already suggested or active in their band, dismiss the popup immediately.
  useEffect(() => {
    if (suggestingSkill && !suggestingSkill.formation_group && user && userBands.length > 0) {
      const targetSongId = suggestingSkill.song_id || suggestingSkill.songs?.id;
      if (targetSongId) {
        const alreadyInBand = userBands.some((b: any) =>
          b.song_id === targetSongId ||
          (b.band_songs || []).some((bs: any) => bs.song_id === targetSongId || bs.songs?.id === targetSongId)
        );
        if (alreadyInBand) {
          console.log('[AutoTrigger] Automatically dismissing congratulations modal since song is already in band repertoire:', targetSongId);
          console.log('[DEBUG-Groovelab] setSuggestingSkill(null) inside safety check effect!');
          setSuggestingSkill(null);
        }
      }
    }
  }, [userBands, suggestingSkill, user]);

  // Safety check for Band Founding: If suggestingSkill is set for band founding (with formation_group),
  // query Supabase directly to check if a band already exists for this group or if the user is already in a band for this song.
  useEffect(() => {
    if (suggestingSkill && suggestingSkill.formation_group && user) {
      const targetSongId = suggestingSkill.song_id || suggestingSkill.songs?.id;
      const targetGroup = suggestingSkill.formation_group;

      const checkDbForExistingBand = async () => {
        try {
          // 1. Check if a band already exists for this formation group in the database
          const { data: existingBands } = await supabase
            .from('bands')
            .select('id, name, status')
            .eq('formation_group', targetGroup)
            .in('status', ['forming', 'active']);

          if (existingBands && existingBands.length > 0) {
            console.log('[SafetyCheck] Band already exists in DB for group:', targetGroup);
            setSuggestingSkill(null);
            fetchDashboardData?.(user.id, false);
            return;
          }

          // 2. Check if this student is already in a band for this song
          if (targetSongId) {
            const { data: memberships } = await supabase
              .from('band_members')
              .select('id, bands(id, status, song_id)')
              .eq('user_id', user.id);

            const alreadyInBand = (memberships || []).some((m: any) =>
              m.bands &&
              ['forming', 'active'].includes(m.bands.status) &&
              m.bands.song_id === targetSongId
            );

            if (alreadyInBand) {
              console.log('[SafetyCheck] Student is already in a band for this song in DB:', targetSongId);
              setSuggestingSkill(null);
              fetchDashboardData?.(user.id, false);
            }
          }
        } catch (err) {
          console.error('[SafetyCheck] Error checking database for existing band:', err);
        }
      };

      checkDbForExistingBand();
    }
  }, [suggestingSkill, user, fetchDashboardData]);

  return {
    studentActivity,
    setStudentActivity,
    showBandNaming,
    setShowBandNaming,
    namingTarget,
    setNamingTarget,
    showBandConsent,
    setShowBandConsent,
    consentTarget,
    setConsentTarget,
    showEditBand,
    setShowEditBand,
    isJoiningVocal,
    setIsJoiningVocal,
    isJoiningGuest,
    setIsJoiningGuest,
    showTeacherVocalPicker,
    setShowTeacherVocalPicker,
    externalVocalists,
    setExternalVocalists,
    editingBand,
    setEditingBand,
    restoredBandId,
    suggestingSkill,
    setSuggestingSkill,
    exclusiveProposal,
    setExclusiveProposal,
    matchingLevelFilter,
    setMatchingLevelFilter,
    pendingFounding,
    setPendingFounding,
    showFoundingModal,
    setShowFoundingModal,
    foundingName,
    setFoundingName,
    foundingLanguage,
    setFoundingLanguage,
    selectedCoachId,
    setSelectedCoachId,
    lastAutoTriggeredFormId,
    setLastAutoTriggeredFormId,
    updateAutoTriggerId,
    ignoredFoundingIds,
    gatewayJustClosed,
    lastWriteTimeRef,
    dismissSuggestion,
  };
};
