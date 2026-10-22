import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';
import { useMeisterwerkTts } from '../meisterwerk/hooks/useMeisterwerkTts';

interface UseStudentFeedProps {
  studentId: string;
  studentUser: any;
}

export function useStudentFeed({
  studentId,
  studentUser
}: UseStudentFeedProps) {
  const [campusFeedAnnouncements, setCampusFeedAnnouncements] = useState<any[]>([]);
  const [classFeedPosts, setClassFeedPosts] = useState<any[]>([]);
  const [classFeedInteractions, setClassFeedInteractions] = useState<any[]>([]);
  const [feedInteractions, setFeedInteractions] = useState<any[]>([]);

  // 🛡️ 0,1% Goldstandard: Kanonische Meisterwerk-TTS Engine einbinden (Parität zu MeisterwerkDocumentTab & QrAuthoritativeHomeworkSection)
  const tts = useMeisterwerkTts();

  const [draftAllowTts, setDraftAllowTts] = useState<boolean | null>(() => {
    return studentUser?.parent_allow_tts ?? true;
  });

  // Fetch Announcements
  const fetchAnnouncements = useCallback(async () => {
    const schoolId = studentUser?.school_id;
    if (!schoolId) return;

    try {
      const { data } = await supabase
        .from('campus_announcements')
        .select('*, users(first_name, last_name, photo_url)')
        .eq('school_id', schoolId)
        .order('created_at', { ascending: false });

      if (data) {
        const parsed = data.map((ann: any) => ({
          id: ann.id,
          title: ann.title,
          content: ann.message,
          target_type: ann.target_type || 'all',
          category: ann.category || 'general',
          is_emergency: ann.is_emergency || false,
          attachment_url: ann.attachment_url || null,
          created_at: ann.created_at,
          user: ann.users
        }));
        setCampusFeedAnnouncements(parsed.filter((ann: any) => ann.target_type === 'all' || ann.target_type === 'students'));
      }
    } catch (e) {
      console.warn('Announcements fetch warning:', e);
    }
  }, [studentUser?.school_id]);

  useEffect(() => {
    fetchAnnouncements();
  }, [fetchAnnouncements]);

  const handleReactToPost = async (postId: string, emoji: string) => {
    try {
      const existing = feedInteractions.find(i => i.post_id === postId && i.user_id === studentId && i.emoji_unicode === emoji);
      if (existing) {
        await supabase
          .from('feed_interactions')
          .delete()
          .eq('id', existing.id);
        setFeedInteractions(prev => prev.filter(i => i.id !== existing.id));
      } else {
        const { data } = await supabase
          .from('feed_interactions')
          .insert({
            post_type: 'campus',
            post_id: postId,
            user_id: studentId,
            interaction_type: 'like',
            emoji_unicode: emoji
          })
          .select()
          .single();

        if (data) {
          setFeedInteractions(prev => [...prev, data]);
        }
      }
    } catch (err) {
      console.error('Error reacting to post:', err);
    }
  };

  const handleSubmitClassFeedInteraction = async (postId: string, type: 'poll_vote' | 'quiz_answer', selectedOption: number, isCorrect?: boolean) => {
    try {
      const existing = classFeedInteractions.find(i => i.post_id === postId && i.user_id === studentId);
      if (existing) {
        alert('Du hast auf diesen Beitrag bereits geantwortet.');
        return;
      }

      const { data, error } = await supabase
        .from('feed_interactions')
        .insert({
          post_type: 'class',
          post_id: postId,
          user_id: studentId,
          interaction_type: type,
          selected_option: selectedOption,
          is_correct: isCorrect ?? null
        })
        .select()
        .single();

      if (error) throw error;
      if (data) {
        setClassFeedInteractions(prev => [...prev, data]);
      }
    } catch (err: any) {
      console.error(err);
      alert('Fehler beim Speichern der Antwort: ' + err.message);
    }
  };

  return {
    campusFeedAnnouncements,
    setCampusFeedAnnouncements,
    classFeedPosts,
    setClassFeedPosts,
    classFeedInteractions,
    setClassFeedInteractions,
    feedInteractions,
    setFeedInteractions,
    handleReactToPost,
    handleSubmitClassFeedInteraction,
    activeTtsKey: tts.activeTtsKey,
    setActiveTtsKey: tts.setActiveTtsKey,
    isTtsSpeaking: tts.isTtsSpeaking,
    ttsStatusText: tts.ttsStatusText,
    draftAllowTts,
    setDraftAllowTts,
    handleSpeakText: tts.handleSpeakText,
    handleStopSpeaking: tts.handleStopSpeaking,
    handleSetTtsMode: tts.handleSetTtsMode,
    buildCompleteWeeklyHomeworkSpeechPhrases: tts.buildCompleteWeeklyHomeworkSpeechPhrases,
    ttsMode: tts.ttsMode
  };
}
