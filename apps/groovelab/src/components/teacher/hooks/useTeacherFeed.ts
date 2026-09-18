import { useState, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';

export interface UseTeacherFeedProps {
  userId: string;
  teacher: any;
  onRefresh?: () => Promise<void> | void;
}

export function useTeacherFeed({
  userId,
  teacher,
  onRefresh
}: UseTeacherFeedProps) {
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [allSubmissions, setAllSubmissions] = useState<any[]>([]);
  const [showAllSubmissions, setShowAllSubmissions] = useState(false);

  const [adminFeedbackRequests, setAdminFeedbackRequests] = useState<any[]>([]);
  const [adminFeedbackResponses, setAdminFeedbackResponses] = useState<any[]>([]);
  const [campusFeedAnnouncements, setCampusFeedAnnouncements] = useState<any[]>([]);
  const [feedInteractions, setFeedInteractions] = useState<any[]>([]);
  const [teacherFeedTab, setTeacherFeedTab] = useState<'campus' | 'class'>('campus');
  const [classFeedPosts, setClassFeedPosts] = useState<any[]>([]);
  const [classFeedInteractions, setClassFeedInteractions] = useState<any[]>([]);

  const [openAnnouncementDetailModal, setOpenAnnouncementDetailModal] = useState<any | null>(null);
  const [questionnaireAnswers, setQuestionnaireAnswers] = useState<Record<string, string>>({});
  const [submittingFeedback, setSubmittingFeedback] = useState(false);
  const [responseTextInput, setResponseTextInput] = useState('');
  const [respondingToRequestId, setRespondingToRequestId] = useState<string | null>(null);
  const [adminFeedbackTab, setAdminFeedbackTab] = useState<'open' | 'done'>('open');

  const [studentQuestions, setStudentQuestions] = useState<any[]>([]);

  const handleApproveSubmission = useCallback(async (subId: string) => {
    try {
      const { data: sub } = await supabase
        .from('user_song_skills')
        .select('user_id, song_id, instrument, difficulty_level, songs(title)')
        .eq('id', subId)
        .single();
      
      const { error: appErr } = await supabase
        .from('user_song_skills')
        .update({ is_pending_approval: false, is_stage_ready: true, verified_by_id: userId })
        .eq('id', subId);

      if (appErr) {
        alert('Fehler bei der Freigabe: ' + appErr.message);
        return;
      }
      
      if (sub) {
        const songTitle = Array.isArray((sub as any).songs) ? ((sub as any).songs[0] as any)?.title : ((sub as any).songs as any)?.title;
        const channel = supabase.channel(`realtime_student_progress_${sub.user_id}`);
        const safetyTimeout = setTimeout(() => {
          supabase.removeChannel(channel);
        }, 5000);

        channel.subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            channel.send({
              type: 'broadcast',
              event: 'challenge-approved',
              payload: {
                songId: sub.song_id,
                songTitle: songTitle || 'Song',
                instrument: sub.instrument,
                difficultyLevel: sub.difficulty_level
              }
            });
            clearTimeout(safetyTimeout);
            setTimeout(() => supabase.removeChannel(channel), 1000);
          }
        });

        const { data: memberships } = await supabase.from('band_members').select('band_id').eq('user_id', sub.user_id);
        
        if (memberships && memberships.length > 0) {
          const bandIds = memberships.map(m => m.band_id);
          const { data: existingBandSongs } = await supabase
            .from('band_songs')
            .select('band_id')
            .in('band_id', bandIds)
            .eq('song_id', sub.song_id);
            
          const bandsWithSong = new Set(existingBandSongs?.map(bs => bs.band_id) || []);
          
          const { data: assignedSlots } = await supabase
            .from('band_song_slots')
            .select('band_songs(band_id)')
            .eq('user_id', sub.user_id)
            .eq('band_songs.song_id', sub.song_id);
          
          const bandsWhereAlreadyAssigned = new Set((assignedSlots || []).map((s: any) => 
            Array.isArray(s.band_songs) ? s.band_songs[0]?.band_id : s.band_songs?.band_id
          ).filter(Boolean));

          const hasEligibleBands = bandIds.some(id => !bandsWithSong.has(id) && !bandsWhereAlreadyAssigned.has(id));
          
          if (hasEligibleBands) {
            await supabase.from('users').update({ 
              pending_repertoire_proposal: {
                song_id: sub.song_id,
                difficulty_level: sub.difficulty_level,
                instrument: sub.instrument
              }
            }).eq('id', sub.user_id);
          }
        }
      }
      
      if (onRefresh) onRefresh();
    } catch (err: any) {
      console.error('Failed to approve submission:', err);
      alert('Fehler bei der Freigabe: ' + (err?.message || 'Unbekannter Fehler'));
    }
  }, [userId, onRefresh]);

  const handleRejectSubmission = useCallback(async (subId: string) => {
    try {
      const { error: rejErr } = await supabase
        .from('user_song_skills')
        .update({ is_pending_approval: false, progress_percent: 85 })
        .eq('id', subId);

      if (rejErr) {
        alert('Fehler beim Ablehnen: ' + rejErr.message);
        return;
      }
      if (onRefresh) onRefresh();
    } catch (err: any) {
      console.error('Failed to reject submission:', err);
      alert('Fehler beim Ablehnen: ' + (err?.message || 'Unbekannter Fehler'));
    }
  }, [onRefresh]);

  const handleSubmitFeedbackResponse = useCallback(async (requestId: string) => {
    const request = adminFeedbackRequests.find(r => r.id === requestId);
    const isQuestionnaire = request && request.questions && request.questions.length > 0;
    
    let finalResponseText = '';
    if (isQuestionnaire) {
      const answersObj: Record<string, string> = {};
      let hasAnyAnswer = false;
      request.questions.forEach((q: any) => {
        const qKey = typeof q === 'string' ? q : q.text;
        const ans = (questionnaireAnswers[qKey] || '').trim();
        answersObj[qKey] = ans;
        if (ans) hasAnyAnswer = true;
      });
      if (!hasAnyAnswer) {
        alert('Bitte beantworte mindestens eine Frage.');
        return;
      }
      finalResponseText = JSON.stringify(answersObj);
    } else {
      if (!responseTextInput.trim()) return;
      finalResponseText = responseTextInput.trim();
    }

    setSubmittingFeedback(true);
    try {
      const { error } = await supabase
        .from('campus_feedback_responses')
        .insert({
          request_id: requestId,
          teacher_id: userId,
          response_text: finalResponseText
        });

      if (error) throw error;
      
      setResponseTextInput('');
      setQuestionnaireAnswers({});
      setRespondingToRequestId(null);
      setAdminFeedbackTab('done');
      alert('Rückmeldung erfolgreich übermittelt! Vielen Dank.');
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error(err);
      alert('Fehler beim Übermitteln der Rückmeldung.');
    } finally {
      setSubmittingFeedback(false);
    }
  }, [adminFeedbackRequests, questionnaireAnswers, responseTextInput, userId, onRefresh]);

  const handleMarkRequestAsDone = useCallback(async (requestId: string) => {
    setSubmittingFeedback(true);
    try {
      const { error } = await supabase
        .from('campus_feedback_responses')
        .insert({
          request_id: requestId,
          teacher_id: userId,
          response_text: 'Erledigt'
        });

      if (error) throw error;
      
      setRespondingToRequestId(null);
      setAdminFeedbackTab('done');
      alert('Aufgabe als erledigt markiert!');
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error(err);
      alert('Fehler beim Markieren als erledigt.');
    } finally {
      setSubmittingFeedback(false);
    }
  }, [userId, onRefresh]);

  const handleReactToPost = useCallback(async (postId: string, emoji: string, type: 'campus' | 'class' = 'campus') => {
    try {
      const list = type === 'campus' ? feedInteractions : classFeedInteractions;
      const existing = list.find(i => i.post_id === postId && i.user_id === userId && i.emoji_unicode === emoji);
      if (existing) {
        await supabase
          .from('feed_interactions')
          .delete()
          .eq('id', existing.id);
      } else {
        await supabase
          .from('feed_interactions')
          .insert({
            post_type: type,
            post_id: postId,
            user_id: userId,
            interaction_type: 'like',
            emoji_unicode: emoji
          });
      }
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error(err);
    }
  }, [feedInteractions, classFeedInteractions, userId, onRefresh]);

  return {
    submissions,
    setSubmissions,
    allSubmissions,
    setAllSubmissions,
    showAllSubmissions,
    setShowAllSubmissions,
    adminFeedbackRequests,
    setAdminFeedbackRequests,
    adminFeedbackResponses,
    setAdminFeedbackResponses,
    campusFeedAnnouncements,
    setCampusFeedAnnouncements,
    feedInteractions,
    setFeedInteractions,
    teacherFeedTab,
    setTeacherFeedTab,
    classFeedPosts,
    setClassFeedPosts,
    classFeedInteractions,
    setClassFeedInteractions,
    openAnnouncementDetailModal,
    setOpenAnnouncementDetailModal,
    questionnaireAnswers,
    setQuestionnaireAnswers,
    submittingFeedback,
    responseTextInput,
    setResponseTextInput,
    respondingToRequestId,
    setRespondingToRequestId,
    adminFeedbackTab,
    setAdminFeedbackTab,
    studentQuestions,
    setStudentQuestions,
    handleApproveSubmission,
    handleRejectSubmission,
    handleSubmitFeedbackResponse,
    handleMarkRequestAsDone,
    handleReactToPost
  };
}
