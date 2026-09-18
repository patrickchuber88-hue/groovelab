import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';
import { synthesizeNeuralSpeech, playAudioBlob, stopNeuralSpeech, cleanTextForTts } from '../../../services/neuralTtsService';

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

  // TTS States
  const [activeTtsKey, setActiveTtsKey] = useState<string | null>(null);
  const [isTtsSpeaking, setIsTtsSpeaking] = useState(false);
  const [ttsStatusText, setTtsStatusText] = useState<string | null>(null);
  const [draftAllowTts, setDraftAllowTts] = useState<boolean | null>(() => {
    return studentUser?.parent_allow_tts ?? true;
  });
  const ttsSessionIdRef = useRef(0);

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

  // TTS Controls
  const handleStopSpeaking = useCallback(() => {
    ttsSessionIdRef.current += 1;
    stopNeuralSpeech();
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      try {
        window.speechSynthesis.resume();
      } catch {}
    }
    setIsTtsSpeaking(false);
    setActiveTtsKey(null);
    setTtsStatusText(null);
  }, []);

  const handleSpeakText = useCallback(async (textOrPhrases: string | string[], elementKey: string = 'global') => {
    if (isTtsSpeaking && activeTtsKey === elementKey) {
      handleStopSpeaking();
      return;
    }

    handleStopSpeaking();

    const normalizedInput = Array.isArray(textOrPhrases)
      ? textOrPhrases.map(p => cleanTextForTts(p)).join(' ')
      : cleanTextForTts(textOrPhrases);

    if (!normalizedInput.trim()) return;

    setIsTtsSpeaking(true);
    setActiveTtsKey(elementKey);

    try {
      const audioBlob = await synthesizeNeuralSpeech(normalizedInput, 'thorsten');
      if (audioBlob) {
        await playAudioBlob(audioBlob);
      } else if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        const utter = new SpeechSynthesisUtterance(normalizedInput);
        utter.lang = 'de-DE';
        utter.onend = () => {
          setIsTtsSpeaking(false);
          setActiveTtsKey(null);
        };
        window.speechSynthesis.speak(utter);
      }
    } catch {
      setIsTtsSpeaking(false);
      setActiveTtsKey(null);
    }
  }, [isTtsSpeaking, activeTtsKey, handleStopSpeaking]);

  const handleSetTtsMode = useCallback((mode: string) => {
    try {
      localStorage.setItem('campus_student_tts_mode', mode);
    } catch {}
  }, []);

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
    activeTtsKey,
    setActiveTtsKey,
    isTtsSpeaking,
    ttsStatusText,
    draftAllowTts,
    setDraftAllowTts,
    handleSpeakText,
    handleStopSpeaking,
    handleSetTtsMode
  };
}
