import { useState, useRef, useEffect } from 'react';
import { supabase } from '../../../../lib/supabase';
import { Student } from '../../meisterwerk.types';

interface UseMeisterwerkMatchGameProps {
  student: Student;
  selectedActiveSongId?: string | null;
  progressItems?: any[];
  awardCampusXP?: (xp: number, reason: string) => Promise<void>;
  awardSticker?: (stickerId: string) => void;
  topicName?: string;
  isTeacherMode?: boolean;
}

export function useMeisterwerkMatchGame({
  student,
  selectedActiveSongId,
  progressItems,
  awardCampusXP,
  awardSticker
}: UseMeisterwerkMatchGameProps) {
  const [isMatchModeEnabled, setIsMatchModeEnabled] = useState<boolean>(false);
  const [isMatchRevealed, setIsMatchRevealed] = useState<boolean>(false);
  const [isMatchSuccessful, setIsMatchSuccessful] = useState<boolean>(false);
  const [showMatchConfetti, setShowMatchConfetti] = useState<boolean>(false);
  const [matchFeedbackToast, setMatchFeedbackToast] = useState<string | null>(null);

  const [studentRating, setStudentRating] = useState<number>(0);
  const [studentRatingUpdatedAt, setStudentRatingUpdatedAt] = useState<string | null>(null);
  const [isStudentRatingCommitted, setIsStudentRatingCommitted] = useState<boolean>(false);

  const [lastMatchedAt, setLastMatchedAt] = useState<string | null>(null);
  const [lastMatchedTeacherPercent, setLastMatchedTeacherPercent] = useState<number | null>(null);
  const [lastMatchedStudentPercent, setLastMatchedStudentPercent] = useState<number | null>(null);
  const [matchHistory, setMatchHistory] = useState<any[]>([]);

  const [showdownState, setShowdownState] = useState<{
    isRunning: boolean;
    step: 'countdown' | 'revealing' | 'matched';
    currentTeacherVal: number;
    currentStudentVal: number;
  } | null>(null);

  // Sync with selectedActiveSongId
  useEffect(() => {
    if (!selectedActiveSongId || !student?.id) return;

    try {
      const savedHist = localStorage.getItem(`song_match_history_${student.id}_${selectedActiveSongId}`);
      if (savedHist) {
        setMatchHistory(JSON.parse(savedHist));
      } else {
        setMatchHistory([]);
      }

      const savedLastMatched = localStorage.getItem(`song_last_matched_at_${student.id}_${selectedActiveSongId}`);
      setLastMatchedAt(savedLastMatched || null);

      const savedTeach = localStorage.getItem(`song_last_matched_teacher_percent_${student.id}_${selectedActiveSongId}`);
      setLastMatchedTeacherPercent(savedTeach ? Number(savedTeach) : null);

      const savedStud = localStorage.getItem(`song_last_matched_student_percent_${student.id}_${selectedActiveSongId}`);
      setLastMatchedStudentPercent(savedStud ? Number(savedStud) : null);

      const savedCommitted = localStorage.getItem(`song_student_rating_committed_${student.id}_${selectedActiveSongId}`);
      setIsStudentRatingCommitted(savedCommitted === 'true');
    } catch {}
  }, [selectedActiveSongId, student?.id]);

  const handleToggleMatchMode = () => {
    setIsMatchModeEnabled(prev => !prev);
    setIsMatchRevealed(false);
  };

  const handleStudentRatingChange = (newVal: number) => {
    setStudentRating(newVal);
    const nowIso = new Date().toISOString();
    setStudentRatingUpdatedAt(nowIso);

    if (selectedActiveSongId && student?.id) {
      try {
        localStorage.setItem(`song_student_rating_${student.id}_${selectedActiveSongId}`, String(newVal));
        localStorage.setItem(`song_student_rating_updated_at_${student.id}_${selectedActiveSongId}`, nowIso);
      } catch {}
    }
  };

  const handleCommitStudentRating = async () => {
    setIsStudentRatingCommitted(true);
    if (selectedActiveSongId && student?.id) {
      try {
        localStorage.setItem(`song_student_rating_committed_${student.id}_${selectedActiveSongId}`, 'true');
        if (!String(selectedActiveSongId).startsWith('temp-')) {
          await supabase
            .from('user_song_skills')
            .update({
              student_rating: studentRating,
              student_rating_updated_at: new Date().toISOString(),
              is_student_rating_committed: true
            })
            .eq('id', selectedActiveSongId);
        }
      } catch {}
    }
  };

  const finalizeMatchResult = async (
    teacherPercent: number,
    studPercent: number,
    isTier1: boolean,
    isTier2: boolean,
    isTier3: boolean,
    tier: 'tier1' | 'tier2' | 'tier3',
    isSuccess: boolean,
    xpWon: number,
    nowIso: string,
    songTitle: string
  ) => {
    setShowdownState(prev => prev ? {
      ...prev,
      isRunning: false,
      currentTeacherVal: teacherPercent,
      currentStudentVal: studPercent
    } : null);

    setLastMatchedAt(nowIso);
    setLastMatchedTeacherPercent(teacherPercent);
    setLastMatchedStudentPercent(studPercent);
    setIsMatchSuccessful(isSuccess);
    setIsMatchRevealed(true);

    const newEntry = {
      matched_at: nowIso,
      teacher_percent: teacherPercent,
      student_percent: studPercent,
      xp_amount: xpWon,
      tier
    };
    const updatedHistory = [...matchHistory.filter(h => h.matched_at !== nowIso), newEntry].slice(0, 3);
    setMatchHistory(updatedHistory);

    try {
      if (selectedActiveSongId && student?.id) {
        localStorage.setItem(`song_last_matched_at_${student.id}_${selectedActiveSongId}`, nowIso);
        localStorage.setItem(`song_last_matched_teacher_percent_${student.id}_${selectedActiveSongId}`, String(teacherPercent));
        localStorage.setItem(`song_last_matched_student_percent_${student.id}_${selectedActiveSongId}`, String(studPercent));
        localStorage.setItem(`song_is_match_successful_${student.id}_${selectedActiveSongId}`, String(isSuccess));
        localStorage.setItem(`song_match_history_${student.id}_${selectedActiveSongId}`, JSON.stringify(updatedHistory));

        if (!String(selectedActiveSongId).startsWith('temp-')) {
          await supabase
            .from('user_song_skills')
            .update({
              last_matched_at: nowIso,
              last_matched_teacher_percent: teacherPercent,
              last_matched_student_percent: studPercent,
              is_match_successful: isSuccess,
              teacher_rating_updated_at: nowIso,
              match_history: updatedHistory
            })
            .eq('id', selectedActiveSongId);
        }
      }
    } catch (e) {
      console.error('Error saving match result:', e);
    }

    // Realtime Broadcast
    try {
      const topicName = `realtime_student_progress_${student.id}`;
      const payload = {
        songTitle,
        tier,
        xpAmount: xpWon,
        teacherPercent,
        studentPercent: studPercent,
        matchedAt: nowIso,
        matchNumber: updatedHistory.length
      };
      const existing = supabase.getChannels().find(
        (c: any) => c.topic === `realtime:${topicName}` || c.topic === topicName
      );
      if (existing && (existing.state === 'joined' || existing.state === 'joining')) {
        existing.send({
          type: 'broadcast',
          event: 'song-matched',
          payload
        });
      } else {
        const channel = supabase.channel(topicName);
        channel.subscribe(async (status) => {
          if (status === 'SUBSCRIBED') {
            await channel.send({
              type: 'broadcast',
              event: 'song-matched',
              payload
            });
            setTimeout(() => supabase.removeChannel(channel), 1500);
          }
        });
      }
    } catch (bcErr) {
      console.warn('Realtime broadcast error:', bcErr);
    }

    // Notification
    try {
      await supabase.from('notifications').insert({
        user_id: student.id,
        title: isTier1 ? '🎯 Volltreffer! Meister-Ohr freigeschaltet!' : (isTier2 ? '✨ Super Gehör! +25 XP gesammelt!' : '🚀 Neues Song-Match mit deiner Lehrkraft!'),
        message: `Für "${songTitle}": Du hast +${xpWon} Campus-XP erhalten! (Meilenstein ${updatedHistory.length}/3)`,
        type: 'song_match',
        is_read: false,
        created_at: nowIso
      });
    } catch {}

    // XP & Toast
    if (isTier1) {
      setShowMatchConfetti(true);
      setTimeout(() => setShowMatchConfetti(false), 4500);
      if (awardCampusXP) await awardCampusXP(50, 'Meister-Ohr Volltreffer');
      setMatchFeedbackToast(`🎯 VOLLTREFFER! +50 Campus-XP & Meister-Ohr freigeschaltet! (Match ${updatedHistory.length}/3)`);
      setTimeout(() => setMatchFeedbackToast(null), 4500);
      awardSticker?.('meister_ohr');
    } else if (isTier2) {
      setShowMatchConfetti(true);
      setTimeout(() => setShowMatchConfetti(false), 4000);
      if (awardCampusXP) await awardCampusXP(25, 'Super Gehör Match');
      setMatchFeedbackToast(`✨ SUPER GEHÖR! +25 Campus-XP gesammelt! (Match ${updatedHistory.length}/3)`);
      setTimeout(() => setMatchFeedbackToast(null), 4500);
    } else {
      if (awardCampusXP) await awardCampusXP(5, 'Weiter-Rocker Motivations-Bonus');
      setMatchFeedbackToast(`🚀 WEITER-ROCKER! +5 Campus-XP fürs Mitmachen & Weitermachen! (Match ${updatedHistory.length}/3)`);
      setTimeout(() => setMatchFeedbackToast(null), 4500);
    }
  };

  const handleCheckMatch = (teacherPercent: number, songTitle: string = 'Song') => {
    const studVal = studentRating;
    const diff = Math.abs(teacherPercent - studVal);
    const isTier1 = diff <= 10;
    const isTier2 = diff <= 20;
    const isTier3 = diff > 20;
    const tier = isTier1 ? 'tier1' : isTier2 ? 'tier2' : 'tier3';
    const xpWon = isTier1 ? 50 : isTier2 ? 25 : 5;
    const isSuccess = isTier1 || isTier2;
    const nowIso = new Date().toISOString();

    setShowdownState({
      isRunning: true,
      step: 'countdown',
      currentTeacherVal: 0,
      currentStudentVal: 0
    });

    // Animate showdown
    setTimeout(() => {
      setShowdownState(prev => prev ? { ...prev, step: 'revealing' } : null);

      let stepCount = 0;
      const totalSteps = 24;
      const interval = setInterval(() => {
        stepCount++;
        const factor = stepCount / totalSteps;
        setShowdownState(prev => prev ? {
          ...prev,
          currentTeacherVal: Math.round(teacherPercent * factor),
          currentStudentVal: Math.round(studVal * factor)
        } : null);

        if (stepCount >= totalSteps) {
          clearInterval(interval);
          finalizeMatchResult(teacherPercent, studVal, isTier1, isTier2, isTier3, tier, isSuccess, xpWon, nowIso, songTitle);
        }
      }, 50);
    }, 1200);
  };

  return {
    isMatchModeEnabled,
    isMatchRevealed,
    isMatchSuccessful,
    showMatchConfetti,
    matchFeedbackToast,
    studentRating,
    studentRatingUpdatedAt,
    isStudentRatingCommitted,
    lastMatchedAt,
    lastMatchedTeacherPercent,
    lastMatchedStudentPercent,
    matchHistory,
    showdownState,
    handleToggleMatchMode,
    handleStudentRatingChange,
    handleCommitStudentRating,
    handleCheckMatch,
    finalizeMatchResult
  };
}
