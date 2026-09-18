import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../../lib/supabase';
import { Student, SKILL_TAGS } from '../../meisterwerk.types';

interface UseMeisterwerkSkillsProps {
  student: Student;
  readOnly?: boolean;
  isTeacherTools?: boolean;
  onAutoSave?: (delayMs?: number) => void;
  onAwardXp?: (amount: number, reason: string) => void;
  notifyHomeworkChange?: () => void;
}

export function useMeisterwerkSkills({
  student,
  readOnly = false,
  isTeacherTools = false,
  onAutoSave,
  onAwardXp
}: UseMeisterwerkSkillsProps) {
  const [skillOverrides, setSkillOverrides] = useState<{ [key: string]: number }>(() => {
    try {
      if (student?.skill_radar_levels) {
        return student.skill_radar_levels;
      }
      const saved = localStorage.getItem(`groovelab_skill_overrides_${student?.id || 'default'}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') return parsed;
      }
      const pillarsSaved = localStorage.getItem(`student_pillars_${student?.id || 'default'}`);
      if (pillarsSaved) {
        const parsed = JSON.parse(pillarsSaved);
        if (parsed && typeof parsed === 'object') return parsed;
      }
      return {};
    } catch {
      return {};
    }
  });

  const [pendingTargetFocusTags, setPendingTargetFocusTags] = useState<string[]>([]);
  const [pendingFeedbackTags, setPendingFeedbackTags] = useState<string[]>([]);
  const [pendingFeedbackStatus, setPendingFeedbackStatus] = useState<'beherrscht' | 'in_entwicklung' | 'wiederholen' | null>(null);
  const [customTags, setCustomTags] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(`campus_custom_tags_${student?.id || 'default'}`);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [newCustomTagInput, setNewCustomTagInput] = useState('');

  // Reactive listener for external skill radar changes
  useEffect(() => {
    const handleSkillRadarChanged = (e: any) => {
      if (e.detail?.studentId && student?.id && e.detail.studentId === student.id) {
        if (e.detail.levels) {
          const lvls = e.detail.levels;
          setSkillOverrides({
            ...lvls,
            klang: lvls.klang || lvls.intonation || 1,
            intonation: lvls.klang || lvls.intonation || 1
          });
        }
        if (e.detail.weeklyFocus && e.detail.weeklyFocus !== 'ausgeglichen') {
          setPendingTargetFocusTags([e.detail.weeklyFocus]);
        }
      }
    };
    window.addEventListener('skill_radar_levels_changed', handleSkillRadarChanged);
    return () => window.removeEventListener('skill_radar_levels_changed', handleSkillRadarChanged);
  }, [student?.id]);

  const handleSetSkillLevel = (tagKey: string, targetLevel: number) => {
    if (readOnly && !isTeacherTools) return;
    const validLevel = Math.min(5, Math.max(1, targetLevel));
    setSkillOverrides(prev => {
      const updated = { ...prev, [tagKey]: validLevel };
      if (tagKey === 'klang') updated.intonation = validLevel;
      if (tagKey === 'intonation') updated.klang = validLevel;
      try {
        localStorage.setItem(`groovelab_skill_overrides_${student?.id || 'default'}`, JSON.stringify(updated));
        localStorage.setItem(`student_pillars_${student?.id || 'default'}`, JSON.stringify(updated));
      } catch {}

      if (student?.id) {
        window.dispatchEvent(new CustomEvent('skill_radar_levels_changed', {
          detail: { studentId: student.id, levels: updated, weeklyFocus: pendingTargetFocusTags[0] || 'ausgeglichen' }
        }));
        const payload = {
          ...updated,
          intonation: updated.klang || updated.intonation,
          weekly_focus: pendingTargetFocusTags[0] || 'ausgeglichen'
        };
        (student as any).skill_radar_levels = payload;
        supabase.from('users').update({ skill_radar_levels: payload }).eq('id', student.id).then(() => {});
      }

      return updated;
    });
    onAutoSave?.(350);
  };

  const handleImproveSkill = (tagKey: string) => {
    setSkillOverrides(prev => {
      const current = prev[tagKey] ?? 3;
      const nextLevel = Math.min(5, current + 1);
      const updated = { ...prev, [tagKey]: nextLevel };
      if (tagKey === 'klang') updated.intonation = nextLevel;
      if (tagKey === 'intonation') updated.klang = nextLevel;
      try {
        localStorage.setItem(`groovelab_skill_overrides_${student?.id || 'default'}`, JSON.stringify(updated));
        localStorage.setItem(`student_pillars_${student?.id || 'default'}`, JSON.stringify(updated));
      } catch {}

      if (student?.id) {
        window.dispatchEvent(new CustomEvent('skill_radar_levels_changed', {
          detail: { studentId: student.id, levels: updated, weeklyFocus: pendingTargetFocusTags[0] || 'ausgeglichen' }
        }));
        const payload = {
          ...updated,
          intonation: updated.klang || updated.intonation,
          weekly_focus: pendingTargetFocusTags[0] || 'ausgeglichen'
        };
        (student as any).skill_radar_levels = payload;
        supabase.from('users').update({ skill_radar_levels: payload }).eq('id', student.id).then(() => {});
      }

      return updated;
    });
    onAutoSave?.(350);
  };

  const handleTriggerSkillQuest = (tagKey: string) => {
    setPendingTargetFocusTags(prev => {
      let nextTags: string[];
      if (prev.includes(tagKey)) {
        nextTags = prev.filter(k => k !== tagKey);
      } else if (prev.length >= 2) {
        nextTags = [prev[1], tagKey];
      } else {
        nextTags = [...prev, tagKey];
      }

      if (student?.id) {
        window.dispatchEvent(new CustomEvent('skill_radar_levels_changed', {
          detail: { studentId: student.id, levels: skillOverrides, weeklyFocus: nextTags[0] || 'ausgeglichen' }
        }));
      }
      return nextTags;
    });
    onAutoSave?.(0);
  };

  const handleMasterAllSkills = () => {
    setSkillOverrides(prev => {
      const updated: { [k: string]: number } = { ...prev };
      const focusTags = pendingTargetFocusTags.length > 0 ? pendingTargetFocusTags : SKILL_TAGS.map(t => t.key);
      focusTags.forEach(tKey => {
        const currentLvl = prev[tKey] ?? 1;
        const nextLvl = Math.min(5, currentLvl + 1);
        updated[tKey] = nextLvl;
        const tagObj = SKILL_TAGS.find(t => t.key === tKey);
        if (tagObj?.legacyKey) updated[tagObj.legacyKey] = nextLvl;
      });
      if (updated.klang && !updated.intonation) updated.intonation = updated.klang;
      if (updated.intonation && !updated.klang) updated.klang = updated.intonation;

      try {
        localStorage.setItem(`groovelab_skill_overrides_${student?.id || 'default'}`, JSON.stringify(updated));
        localStorage.setItem(`student_pillars_${student?.id || 'default'}`, JSON.stringify(updated));
      } catch {}

      if (student?.id) {
        window.dispatchEvent(new CustomEvent('skill_radar_levels_changed', {
          detail: { studentId: student.id, levels: updated, weeklyFocus: pendingTargetFocusTags[0] || 'ausgeglichen' }
        }));
        const payload = {
          ...updated,
          intonation: updated.klang || updated.intonation || 5,
          weekly_focus: pendingTargetFocusTags[0] || 'ausgeglichen'
        };
        (student as any).skill_radar_levels = payload;
        supabase.from('users').update({ skill_radar_levels: payload }).eq('id', student.id).then(() => {});
      }
      return updated;
    });

    onAwardXp?.(100, 'Alle Skill-Säulen gesteigert');
  };

  const handleAddCustomTag = () => {
    const trimmed = newCustomTagInput.trim();
    if (!trimmed) return;
    const clean = trimmed.startsWith('#') ? trimmed : `#${trimmed}`;
    if (!customTags.includes(clean)) {
      const next = [...customTags, clean];
      setCustomTags(next);
      try {
        localStorage.setItem(`campus_custom_tags_${student?.id || 'default'}`, JSON.stringify(next));
      } catch {}
    }
    setNewCustomTagInput('');
  };

  const insertOrToggleTagInText = useCallback((currentText: string, tagToToggle: string): string => {
    const tag = tagToToggle.trim();
    if (currentText.includes(tag)) {
      return currentText.replace(new RegExp(`\\s*${tag}`, 'g'), '').trim();
    } else {
      return currentText ? `${currentText.trim()} ${tag}` : tag;
    }
  }, []);

  return {
    skillOverrides,
    setSkillOverrides,
    pendingTargetFocusTags,
    setPendingTargetFocusTags,
    pendingFeedbackTags,
    setPendingFeedbackTags,
    pendingFeedbackStatus,
    setPendingFeedbackStatus,
    customTags,
    newCustomTagInput,
    setNewCustomTagInput,
    handleSetSkillLevel,
    handleImproveSkill,
    handleTriggerSkillQuest,
    handleMasterAllSkills,
    handleAddCustomTag,
    insertOrToggleTagInText
  };
}
