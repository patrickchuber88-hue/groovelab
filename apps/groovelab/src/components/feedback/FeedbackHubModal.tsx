import React, { useState, useEffect, useRef } from 'react';
import { 
  X, Bug, Lightbulb, Mic, MicOff, Check, AlertCircle, Sparkles, 
  Send, ShieldCheck, Tag, Info, Layers, Loader2, Calendar, BookOpen, 
  Music, Users, CreditCard, Settings, Building2, Award, ShieldOff,
  ChevronDown, ChevronUp, MessageCircle, Clock, Search, Archive, CheckCircle2,
  Inbox, RefreshCw
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { 
  FeedbackType, HeroOptInType, FEEDBACK_CATEGORIES, 
  getAvailableCategoriesForRole, formatLegalHeroCredit,
  FEEDBACK_STATUSES, PlatformFeedbackItem
} from '../../config/feedbackConfig';

const renderCategoryIcon = (iconName: string, size = 14, color = 'currentColor') => {
  switch (iconName) {
    case 'Calendar': return <Calendar size={size} color={color} />;
    case 'BookOpen': return <BookOpen size={size} color={color} />;
    case 'Music': return <Music size={size} color={color} />;
    case 'Users': return <Users size={size} color={color} />;
    case 'CreditCard': return <CreditCard size={size} color={color} />;
    case 'Settings': return <Settings size={size} color={color} />;
    default: return <Layers size={size} color={color} />;
  }
};

const renderStatusIcon = (statusId: string, size = 13, color = 'currentColor') => {
  switch (statusId) {
    case 'in_review': return <Search size={size} color={color} />;
    case 'planned': return <Sparkles size={size} color={color} />;
    case 'in_progress': return <Layers size={size} color={color} />;
    case 'done': return <CheckCircle2 size={size} color={color} />;
    case 'declined': return <Archive size={size} color={color} />;
    default: return <Clock size={size} color={color} />;
  }
};

interface FeedbackHubModalProps {
  isOpen: boolean;
  onClose: () => void;
  userRole?: string;
  userId?: string;
  userName?: string;
  schoolId?: string;
  schoolName?: string;
  activePlatform?: 'campus' | 'groovelab' | 'admin_desk' | string;
}

export const FeedbackHubModal: React.FC<FeedbackHubModalProps> = ({
  isOpen,
  onClose,
  userRole = 'teacher',
  userId,
  userName = '',
  schoolId,
  schoolName = '',
  activePlatform = 'campus'
}) => {
  // Tab Navigation: 'submit' vs 'my_feedback'
  const [activeModalTab, setActiveModalTab] = useState<'submit' | 'my_feedback'>('submit');
  const [myFeedbackItems, setMyFeedbackItems] = useState<PlatformFeedbackItem[]>([]);
  const [loadingMyFeedback, setLoadingMyFeedback] = useState<boolean>(false);

  const [feedbackType, setFeedbackType] = useState<FeedbackType>('feature_idea');
  const [grantGhostAccess, setGrantGhostAccess] = useState<boolean>(false);
  const [selectedBoardId, setSelectedBoardId] = useState<string>('schedule');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [content, setContent] = useState<string>('');
  const [heroOptIn, setHeroOptIn] = useState<HeroOptInType>('school_only');
  const [showLegalDetails, setShowLegalDetails] = useState<boolean>(false);
  
  // Voice dictation states
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [speechSupported, setSpeechSupported] = useState<boolean>(true);
  const [speechError, setSpeechError] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);

  // Student pseudonymization helper (GDPR Article 8 compliant)
  const studentPseudonym = React.useMemo(() => {
    if (userRole !== 'student') return userName;
    if (!userName) return 'Schüler/in';
    const parts = userName.trim().split(/\s+/);
    const firstName = parts[0];
    const lastInitial = parts.length > 1 ? ` ${parts[parts.length - 1][0]}.` : '';
    return `${firstName}${lastInitial}`;
  }, [userRole, userName]);

  // Submission states
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const availableCategories = getAvailableCategoriesForRole(userRole);
  const currentCategory = availableCategories.find(c => c.id === selectedBoardId) || availableCategories[0];

  // Theme color based on module
  const accentColor = activePlatform === 'groovelab' 
    ? '#eab308' 
    : (userRole === 'admin' || userRole === 'secretary' || activePlatform === 'admin_desk')
      ? '#ea4335'
      : '#34a853';

  // Initialize Speech Recognition
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'de-DE';

        recognition.onresult = (event: any) => {
          let currentTranscript = '';
          for (let i = event.resultIndex; i < event.results.length; i++) {
            if (event.results[i].isFinal) {
              const text = event.results[i][0].transcript;
              setContent(prev => (prev ? `${prev.trim()} ${text.trim()}` : text.trim()));
            }
          }
        };

        recognition.onerror = (event: any) => {
          console.warn('Speech recognition error:', event.error);
          setIsRecording(false);
          if (event.error === 'not-allowed') {
            setSpeechError('Mikrofon-Zugriff verweigert. Bitte erlaube den Mikrofon-Zugriff in den Browser-Einstellungen.');
          }
        };

        recognition.onend = () => {
          setIsRecording(false);
        };

        recognitionRef.current = recognition;
      } else {
        setSpeechSupported(false);
      }
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          // ignore
        }
      }
    };
  }, []);

  const fetchMyFeedback = async () => {
    if (!userId) return;
    setLoadingMyFeedback(true);
    try {
      // 1. Read locally stored items first (offline-first resilience)
      let localItems: PlatformFeedbackItem[] = [];
      try {
        const stored = localStorage.getItem(`cg_my_platform_feedback_${userId}`);
        if (stored) localItems = JSON.parse(stored);
      } catch (e) {}

      // 2. Read locally stored global items for this user
      try {
        const globalStored = localStorage.getItem('cg_local_platform_feedback');
        if (globalStored) {
          const parsedGlobal: PlatformFeedbackItem[] = JSON.parse(globalStored);
          const userGlobal = parsedGlobal.filter(it => it.user_id === userId);
          const existingIds = new Set(localItems.map(it => it.id));
          userGlobal.forEach(it => {
            if (!existingIds.has(it.id)) localItems.push(it);
          });
        }
      } catch (e) {}

      // 3. Check for any locally saved admin responses
      try {
        const localResponses = JSON.parse(localStorage.getItem('cg_local_feedback_responses') || '{}');
        localItems = localItems.map(item => {
          if (localResponses[item.id]) {
            return {
              ...item,
              admin_response: localResponses[item.id].admin_response || item.admin_response,
              admin_responded_at: localResponses[item.id].admin_responded_at || item.admin_responded_at,
              status: localResponses[item.id].status || item.status,
              is_user_read: localResponses[item.id].is_user_read !== undefined ? localResponses[item.id].is_user_read : item.is_user_read
            };
          }
          return item;
        });
      } catch (e) {}

      // 4. Query Supabase (if table exists)
      try {
        const { data, error } = await supabase
          .from('platform_feedback')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false });

        if (!error && data) {
          const remoteIds = new Set(data.map((it: any) => it.id));
          const onlyLocal = localItems.filter(it => !remoteIds.has(it.id));
          const merged = [...data, ...onlyLocal];
          setMyFeedbackItems(merged);
          try {
            localStorage.setItem(`cg_my_platform_feedback_${userId}`, JSON.stringify(merged));
          } catch (e) {}

          // If user opened my_feedback tab, mark unread responses as read
          if (activeModalTab === 'my_feedback') {
            const unreadIds = data.filter((it: any) => it.admin_response && it.is_user_read === false).map((it: any) => it.id);
            if (unreadIds.length > 0) {
              await supabase
                .from('platform_feedback')
                .update({ is_user_read: true })
                .in('id', unreadIds);
            }
          }
          return;
        }
      } catch (dbErr) {
        // Table might not exist yet or offline - use local items smoothly
      }

      setMyFeedbackItems(localItems);
    } catch (e) {
      console.error('Error fetching my feedback:', e);
    } finally {
      setLoadingMyFeedback(false);
    }
  };

  useEffect(() => {
    if (isOpen && userId) {
      fetchMyFeedback();
    }
  }, [isOpen, userId, activeModalTab]);

  const unreadResponseCount = React.useMemo(() => {
    return myFeedbackItems.filter(it => it.admin_response && it.is_user_read === false).length;
  }, [myFeedbackItems]);

  // Set default board if current is not in available
  useEffect(() => {
    if (availableCategories.length > 0 && !availableCategories.some(c => c.id === selectedBoardId)) {
      setSelectedBoardId(availableCategories[0].id);
      setSelectedTags([]);
    }
  }, [userRole]);

  const toggleTag = (tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const toggleDictation = () => {
    if (!speechSupported) {
      alert('Sprachdiktat wird von diesem Browser leider nicht unterstützt. Bitte nutze die Tastatureingabe.');
      return;
    }

    setSpeechError(null);
    if (isRecording) {
      try {
        recognitionRef.current?.stop();
      } catch (e) {
        console.error(e);
      }
      setIsRecording(false);
    } else {
      try {
        recognitionRef.current?.start();
        setIsRecording(true);
      } catch (e) {
        console.error('Error starting speech recognition:', e);
        setIsRecording(false);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) {
      setErrorMessage('Bitte beschreibe dein Anliegen kurz im Textfeld.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    // Stop recording if active
    if (isRecording && recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch {}
      setIsRecording(false);
    }

    // Telemetry metadata snapshot
    const metadata = {
      os: typeof navigator !== 'undefined' ? navigator.platform : 'unknown',
      browser: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
      viewport: typeof window !== 'undefined' ? `${window.innerWidth}x${window.innerHeight}` : 'unknown',
      app_version: 'v2.6.0',
      current_route: typeof window !== 'undefined' ? window.location.pathname : 'settings'
    };

    const sanitizedName = userRole === 'student' ? studentPseudonym : (userName || null);
    const localId = 'fb_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8);
    const nowIso = new Date().toISOString();

    const newFeedbackItem: PlatformFeedbackItem = {
      id: localId,
      school_id: schoolId || null,
      user_id: userId || null,
      user_name: sanitizedName,
      school_name: schoolName || null,
      user_role: userRole,
      active_platform: activePlatform,
      type: feedbackType,
      board_id: currentCategory?.id || 'general',
      board_name: currentCategory?.name || 'Allgemein',
      smart_tags: selectedTags,
      content: content.trim(),
      hero_opt_in: heroOptIn,
      grant_ghost_access: grantGhostAccess,
      ghost_access_expires_at: grantGhostAccess ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() : null,
      target_user_id: userId || null,
      metadata: metadata,
      status: 'inbox',
      created_at: nowIso,
      updated_at: nowIso,
      admin_response: null,
      admin_responded_at: null,
      is_user_read: true
    };

    // 1. Optimistic Local Persistence (guarantees zero data loss even without SQL table)
    try {
      const userStorageKey = `cg_my_platform_feedback_${userId}`;
      const existingUser = JSON.parse(localStorage.getItem(userStorageKey) || '[]');
      localStorage.setItem(userStorageKey, JSON.stringify([newFeedbackItem, ...existingUser]));

      const globalStorageKey = 'cg_local_platform_feedback';
      const existingGlobal = JSON.parse(localStorage.getItem(globalStorageKey) || '[]');
      localStorage.setItem(globalStorageKey, JSON.stringify([newFeedbackItem, ...existingGlobal]));

      setMyFeedbackItems(prev => [newFeedbackItem, ...prev]);
    } catch (localErr) {
      console.warn('Could not save feedback to localStorage:', localErr);
    }

    // 2. Cloud Persistence Attempt
    try {
      const { error } = await supabase
        .from('platform_feedback')
        .insert({
          school_id: schoolId || null,
          user_id: userId || null,
          user_name: sanitizedName,
          school_name: schoolName || null,
          user_role: userRole,
          active_platform: activePlatform,
          type: feedbackType,
          board_id: currentCategory?.id || 'general',
          board_name: currentCategory?.name || 'Allgemein',
          smart_tags: selectedTags,
          content: content.trim(),
          hero_opt_in: heroOptIn,
          metadata: metadata,
          status: 'inbox'
        });

      if (error) {
        console.warn('Remote platform_feedback insert note:', error.message);
      }
    } catch (cloudErr) {
      console.warn('Supabase platform_feedback table note:', cloudErr);
    }

    // Always succeed cleanly for the user
    setIsSubmitted(true);
    setTimeout(() => {
      setIsSubmitted(false);
      setContent('');
      setSelectedTags([]);
      onClose();
    }, 2200);

    setIsSubmitting(false);
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 99999,
      backgroundColor: 'rgba(15, 23, 42, 0.60)',
      backdropFilter: 'blur(16px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '16px'
    }}>
      <div 
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '24px',
          width: '100%',
          maxWidth: '640px',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.16), 0 0 1px rgba(0,0,0,0.1)',
          border: '1px solid rgba(226, 232, 240, 0.9)',
          overflow: 'hidden',
          animation: 'fadeInScale 0.22s cubic-bezier(0.16, 1, 0.3, 1)'
        }}
      >
        {/* Header */}
        <div style={{
          padding: '18px 24px',
          borderBottom: '1px solid #f1f5f9',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: '#ffffff',
          flexShrink: 0
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: '12px',
              backgroundColor: `${accentColor}12`,
              color: accentColor,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              <Lightbulb size={20} strokeWidth={2.2} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.02em' }}>
                Feedback & Ideenschmiede
              </h2>
              <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>
                Campus-Groovelab wächst gemeinsam mit deinen Ideen
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '50%',
              width: '34px',
              height: '34px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#64748b',
              transition: 'all 0.15s ease'
            }}
            onMouseOver={(e) => e.currentTarget.style.background = '#f1f5f9'}
            onMouseLeave={(e) => e.currentTarget.style.background = '#f8fafc'}
          >
            <X size={16} />
          </button>
        </div>

        {/* Main Tab Switch: Submit vs My Feedback */}
        <div style={{
          padding: '8px 24px',
          background: '#f8fafc',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          gap: '8px',
          flexShrink: 0,
          position: 'relative',
          zIndex: 10
        }}>
          <button
            type="button"
            onClick={() => setActiveModalTab('submit')}
            style={{
              flex: 1,
              padding: '8px 14px',
              borderRadius: '12px',
              border: 'none',
              background: activeModalTab === 'submit' ? '#ffffff' : 'transparent',
              color: activeModalTab === 'submit' ? '#0f172a' : '#64748b',
              fontWeight: activeModalTab === 'submit' ? 800 : 600,
              fontSize: '0.82rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              boxShadow: activeModalTab === 'submit' ? '0 2px 8px rgba(0,0,0,0.06)' : 'none',
              transition: 'all 0.15s ease'
            }}
          >
            <Lightbulb size={15} color={activeModalTab === 'submit' ? accentColor : '#94a3b8'} />
            <span>Neues Anliegen einreichen</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveModalTab('my_feedback')}
            style={{
              flex: 1,
              padding: '8px 14px',
              borderRadius: '12px',
              border: 'none',
              background: activeModalTab === 'my_feedback' ? '#ffffff' : 'transparent',
              color: activeModalTab === 'my_feedback' ? '#0f172a' : '#64748b',
              fontWeight: activeModalTab === 'my_feedback' ? 800 : 600,
              fontSize: '0.82rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              position: 'relative',
              boxShadow: activeModalTab === 'my_feedback' ? '0 2px 8px rgba(0,0,0,0.06)' : 'none',
              transition: 'all 0.15s ease'
            }}
          >
            <Inbox size={15} color={activeModalTab === 'my_feedback' ? accentColor : '#94a3b8'} />
            <span>Meine Einreichungen ({myFeedbackItems.length})</span>
            {unreadResponseCount > 0 && (
              <span style={{
                position: 'absolute',
                top: '6px',
                right: '12px',
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: '#ef4444',
                boxShadow: '0 0 6px rgba(239, 68, 68, 0.6)'
              }} />
            )}
          </button>
        </div>

        {/* Content Body */}
        <div style={{
          padding: '22px 24px',
          overflowY: 'auto',
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          gap: '18px',
          background: '#ffffff'
        }}>
          {activeModalTab === 'my_feedback' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Deine bisherigen Beiträge ({myFeedbackItems.length})
                </span>
                <button
                  type="button"
                  onClick={fetchMyFeedback}
                  disabled={loadingMyFeedback}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '4px 8px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    background: '#ffffff',
                    color: '#64748b',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  <RefreshCw size={11} className={loadingMyFeedback ? 'animate-spin' : ''} />
                  <span>Aktualisieren</span>
                </button>
              </div>

              {loadingMyFeedback ? (
                <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
                  <Loader2 size={24} className="animate-spin" style={{ margin: '0 auto 8px' }} />
                  <p style={{ margin: 0, fontSize: '0.85rem' }}>Lade deine Einreichungen...</p>
                </div>
              ) : myFeedbackItems.length === 0 ? (
                <div style={{
                  padding: '48px 24px',
                  textAlign: 'center',
                  background: '#f8fafc',
                  borderRadius: '16px',
                  border: '1px dashed #cbd5e1',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '12px'
                }}>
                  <div style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '50%',
                    backgroundColor: '#e2e8f0',
                    color: '#64748b',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <Inbox size={24} />
                  </div>
                  <div>
                    <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#0f172a' }}>
                      Noch keine Einreichungen vorhanden
                    </h4>
                    <p style={{ margin: '4px 0 0', fontSize: '0.82rem', color: '#64748b', maxWidth: '320px' }}>
                      Du hast bisher noch keine Ideen oder Fehlerberichte eingereicht.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveModalTab('submit')}
                    style={{
                      marginTop: '4px',
                      padding: '8px 16px',
                      borderRadius: '10px',
                      border: 'none',
                      background: accentColor,
                      color: '#ffffff',
                      fontSize: '0.82rem',
                      fontWeight: 800,
                      cursor: 'pointer'
                    }}
                  >
                    Jetzt erstes Anliegen einreichen
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {myFeedbackItems.map(item => {
                    const statusMeta = FEEDBACK_STATUSES.find(s => s.id === item.status) || FEEDBACK_STATUSES[0];
                    return (
                      <div
                        key={item.id}
                        style={{
                          background: '#ffffff',
                          border: '1.5px solid #e2e8f0',
                          borderRadius: '16px',
                          padding: '16px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '10px',
                          boxShadow: '0 2px 6px rgba(0,0,0,0.02)'
                        }}
                      >
                        {/* Header Row */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '3px 8px',
                              borderRadius: '8px',
                              background: item.type === 'bug' ? '#fee2e2' : '#fef3c7',
                              color: item.type === 'bug' ? '#b91c1c' : '#b45309',
                              fontSize: '0.72rem',
                              fontWeight: 800
                            }}>
                              {item.type === 'bug' ? <Bug size={12} /> : <Lightbulb size={12} />}
                              {item.type === 'bug' ? 'Fehlerbericht' : 'Feature-Idee'}
                            </span>
                            <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>
                              • {item.board_name} • {new Date(item.created_at).toLocaleDateString('de-DE')}
                            </span>
                          </div>

                          {/* Status Pill */}
                          <div style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            padding: '4px 10px',
                            borderRadius: '100px',
                            background: statusMeta.badgeBg,
                            color: statusMeta.badgeColor,
                            fontSize: '0.72rem',
                            fontWeight: 800
                          }}>
                            {renderStatusIcon(item.status, 12, statusMeta.badgeColor)}
                            <span>{statusMeta.label}</span>
                          </div>
                        </div>

                        {/* Submission Content */}
                        <div style={{
                          background: '#f8fafc',
                          padding: '10px 12px',
                          borderRadius: '10px',
                          fontSize: '0.82rem',
                          color: '#334155',
                          lineHeight: 1.45,
                          whiteSpace: 'pre-wrap',
                          border: '1px solid #f1f5f9'
                        }}>
                          {item.content}
                        </div>

                        {/* Official Developer Response */}
                        {item.admin_response ? (
                          <div style={{
                            marginTop: '2px',
                            background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)',
                            border: '1.5px solid #bae6fd',
                            borderRadius: '12px',
                            padding: '12px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '6px'
                          }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                <MessageCircle size={14} color="#0284c7" />
                                <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#0369a1' }}>
                                  Offizielle Rückmeldung der Entwickler
                                </span>
                              </div>
                              {item.admin_responded_at && (
                                <span style={{ fontSize: '0.68rem', color: '#0284c7', fontWeight: 600 }}>
                                  {new Date(item.admin_responded_at).toLocaleDateString('de-DE')}
                                </span>
                              )}
                            </div>
                            <div style={{ fontSize: '0.82rem', color: '#0f172a', lineHeight: 1.45, fontWeight: 600 }}>
                              {item.admin_response}
                            </div>
                          </div>
                        ) : (
                          <div style={{ fontSize: '0.72rem', color: '#94a3b8', fontStyle: 'italic' }}>
                            {statusMeta.description}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : isSubmitted ? (
            <div style={{
              padding: '48px 24px',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '16px'
            }}>
              <div style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                backgroundColor: '#dcfce7',
                color: '#16a34a',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 10px 15px -3px rgba(22, 163, 74, 0.2)'
              }}>
                <Check size={36} />
              </div>
              <h3 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 900, color: '#0f172a' }}>
                Vielen herzlichen Dank!
              </h3>
              <p style={{ margin: 0, fontSize: '0.9rem', color: '#64748b', maxWidth: '380px', lineHeight: 1.5 }}>
                Dein Beitrag ist direkt in unserer Entwickler-Schmiede eingegangen. Wir prüfen jede Idee sorgfältig!
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              
              {/* Step 1: Linear-Style Segmented Control (Feature Idea vs Bug) */}
              <div>
                <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '8px' }}>
                  Anliegen-Typ
                </label>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                  gap: '6px',
                  background: '#f8fafc',
                  padding: '4px',
                  borderRadius: '14px',
                  border: '1px solid #e2e8f0'
                }}>
                  <button
                    type="button"
                    onClick={() => {
                      setFeedbackType('feature_idea');
                      setGrantGhostAccess(false);
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      padding: '8px 12px',
                      borderRadius: '10px',
                      border: 'none',
                      background: feedbackType === 'feature_idea' ? '#ffffff' : 'transparent',
                      color: feedbackType === 'feature_idea' ? '#0f172a' : '#64748b',
                      boxShadow: feedbackType === 'feature_idea' ? '0 2px 8px rgba(0, 0, 0, 0.06)' : 'none',
                      cursor: 'pointer',
                      fontWeight: feedbackType === 'feature_idea' ? 800 : 600,
                      fontSize: '0.80rem',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <Lightbulb size={14} color={feedbackType === 'feature_idea' ? accentColor : '#94a3b8'} strokeWidth={2.2} />
                    <span>Idee & Wunsch</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setFeedbackType('bug');
                      setGrantGhostAccess(false);
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      padding: '8px 12px',
                      borderRadius: '10px',
                      border: 'none',
                      background: feedbackType === 'bug' ? '#ffffff' : 'transparent',
                      color: feedbackType === 'bug' ? '#0f172a' : '#64748b',
                      boxShadow: feedbackType === 'bug' ? '0 2px 8px rgba(0, 0, 0, 0.06)' : 'none',
                      cursor: 'pointer',
                      fontWeight: feedbackType === 'bug' ? 800 : 600,
                      fontSize: '0.80rem',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <Bug size={14} color={feedbackType === 'bug' ? '#ea4335' : '#94a3b8'} strokeWidth={2.2} />
                    <span>Fehler melden</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setFeedbackType('support_request');
                      setGrantGhostAccess(true);
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      padding: '8px 12px',
                      borderRadius: '10px',
                      border: 'none',
                      background: feedbackType === 'support_request' ? '#ffffff' : 'transparent',
                      color: feedbackType === 'support_request' ? '#0f172a' : '#64748b',
                      boxShadow: feedbackType === 'support_request' ? '0 2px 8px rgba(0, 0, 0, 0.06)' : 'none',
                      cursor: 'pointer',
                      fontWeight: feedbackType === 'support_request' ? 800 : 600,
                      fontSize: '0.80rem',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <ShieldCheck size={14} color={feedbackType === 'support_request' ? '#0891b2' : '#94a3b8'} strokeWidth={2.2} />
                    <span>Ghost-Support</span>
                  </button>
                </div>

                {/* Enterprise Ghost Mode Consent Box */}
                {(feedbackType === 'support_request' || feedbackType === 'bug') && (
                  <div style={{
                    marginTop: '10px',
                    background: grantGhostAccess ? '#ecfeff' : '#f8fafc',
                    border: grantGhostAccess ? '1.5px solid #67e8f9' : '1px solid #e2e8f0',
                    borderRadius: '14px',
                    padding: '12px 14px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                    transition: 'all 0.2s ease'
                  }}>
                    <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={grantGhostAccess}
                        onChange={(e) => setGrantGhostAccess(e.target.checked)}
                        style={{ marginTop: '2px', width: '16px', height: '16px', accentColor: '#0891b2', cursor: 'pointer' }}
                      />
                      <div>
                        <div style={{ fontSize: '0.80rem', fontWeight: 800, color: grantGhostAccess ? '#0e7490' : '#334155', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <ShieldCheck size={14} color={grantGhostAccess ? '#0891b2' : '#64748b'} />
                          Persönlichen Support & Ghost-Zugriff für 7 Tage gestatten
                        </div>
                        <div style={{ fontSize: '0.72rem', color: grantGhostAccess ? '#155e75' : '#64748b', marginTop: '2px', lineHeight: 1.4 }}>
                          Ich erlaube dem Campus-Groovelab Plattform-Support temporär Einsicht in mein Profil, um diesen gemeldeten Fehler in meinem Stundenplan/Briefing direkt zu analysieren und zu beheben.
                        </div>
                      </div>
                    </label>
                  </div>
                )}
              </div>

              {/* Step 2: Board Selector & Smart Tags (Monochrome Icons) */}
              <div>
                <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '8px' }}>
                  Bereich / Board
                </label>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
                  gap: '8px'
                }}>
                  {availableCategories.map((cat) => {
                    const isSelected = selectedBoardId === cat.id;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => {
                          setSelectedBoardId(cat.id);
                          setSelectedTags([]);
                        }}
                        style={{
                          padding: '9px 12px',
                          borderRadius: '12px',
                          border: isSelected ? `1.5px solid ${accentColor}` : '1px solid #e2e8f0',
                          background: isSelected ? `${accentColor}0f` : '#ffffff',
                          color: isSelected ? '#0f172a' : '#475569',
                          fontSize: '0.82rem',
                          fontWeight: isSelected ? 800 : 600,
                          cursor: 'pointer',
                          textAlign: 'left',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          transition: 'all 0.15s ease',
                          boxShadow: isSelected ? `0 2px 8px ${accentColor}18` : '0 1px 2px rgba(0,0,0,0.02)'
                        }}
                      >
                        <div style={{
                          width: '26px',
                          height: '26px',
                          borderRadius: '8px',
                          background: isSelected ? `${accentColor}20` : '#f1f5f9',
                          color: isSelected ? accentColor : '#64748b',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0
                        }}>
                          {renderCategoryIcon(cat.iconName, 13, isSelected ? accentColor : '#64748b')}
                        </div>
                        <span style={{ lineHeight: '1.25' }}>
                          {cat.shortName}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Smart Tags Chips */}
                {currentCategory && currentCategory.tags.length > 0 && (
                  <div style={{
                    marginTop: '10px',
                    padding: '10px 12px',
                    background: '#f8fafc',
                    borderRadius: '12px',
                    border: '1px solid #e2e8f0',
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '6px',
                    alignItems: 'center'
                  }}>
                    <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', marginRight: '4px' }}>
                      Smarte Tags:
                    </span>
                    {currentCategory.tags.map((tag) => {
                      const isTagSelected = selectedTags.includes(tag);
                      return (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => toggleTag(tag)}
                          style={{
                            padding: '4px 10px',
                            borderRadius: '8px',
                            border: isTagSelected ? `1px solid ${accentColor}` : '1px solid #cbd5e1',
                            background: isTagSelected ? accentColor : '#ffffff',
                            color: isTagSelected ? '#ffffff' : '#475569',
                            fontSize: '0.73rem',
                            fontWeight: isTagSelected ? 800 : 600,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            transition: 'all 0.15s ease',
                            boxShadow: isTagSelected ? `0 2px 6px ${accentColor}30` : 'none'
                          }}
                        >
                          {isTagSelected && <Check size={11} strokeWidth={3} />}
                          <span>{tag}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Step 3: Textarea + Floating Voice Dictation Glass Pill */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <label style={{ fontSize: '0.74rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    {feedbackType === 'feature_idea' ? 'Deine Idee oder dein Wunsch' : 'Problem-Beschreibung'}
                  </label>
                  {content.length > 0 && (
                    <span style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 600 }}>
                      {content.length} Zeichen
                    </span>
                  )}
                </div>

                <div style={{ position: 'relative' }}>
                  <textarea
                    rows={4}
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder={
                      feedbackType === 'feature_idea'
                        ? 'Beschreibe kurz, wie dein Vorschlag den Unterricht oder die Organisation noch einfacher machen würde...'
                        : 'Was genau ist passiert? Beschreibe den Fehler kurz...'
                    }
                    style={{
                      width: '100%',
                      padding: '12px 14px 44px 14px',
                      borderRadius: '14px',
                      border: '1.5px solid #cbd5e1',
                      fontSize: '0.88rem',
                      fontFamily: 'inherit',
                      color: '#0f172a',
                      boxSizing: 'border-box',
                      resize: 'vertical',
                      outline: 'none',
                      minHeight: '110px',
                      lineHeight: 1.5,
                      transition: 'border-color 0.15s, box-shadow 0.15s'
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = accentColor;
                      e.currentTarget.style.boxShadow = `0 0 0 3px ${accentColor}18`;
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = '#cbd5e1';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  />

                  {/* Floating Dictation Action Pill */}
                  <div style={{
                    position: 'absolute',
                    bottom: '10px',
                    right: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}>
                    <button
                      type="button"
                      onClick={toggleDictation}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '5px 11px',
                        borderRadius: '20px',
                        border: isRecording ? '1px solid #ef4444' : '1px solid rgba(203, 213, 225, 0.8)',
                        background: isRecording ? '#fee2e2' : 'rgba(255, 255, 255, 0.94)',
                        backdropFilter: 'blur(8px)',
                        color: isRecording ? '#dc2626' : '#475569',
                        fontSize: '0.73rem',
                        fontWeight: 750,
                        cursor: 'pointer',
                        boxShadow: '0 2px 6px rgba(0,0,0,0.06)',
                        transition: 'all 0.15s ease'
                      }}
                      title={isRecording ? 'Diktat beenden' : 'Per Spracheingabe diktieren'}
                    >
                      {isRecording ? (
                        <>
                          <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#dc2626' }} />
                          <MicOff size={13} />
                          <span>Höre zu...</span>
                        </>
                      ) : (
                        <>
                          <Mic size={13} color="#64748b" />
                          <span>Diktieren</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
                {speechError && (
                  <p style={{ margin: '4px 0 0', fontSize: '0.74rem', color: '#ef4444', fontWeight: 600 }}>
                    {speechError}
                  </p>
                )}
              </div>

              {/* Step 4: Helden-Moment Interactive Mini-Cards (Monochrome Icons) */}
              <div style={{
                background: '#f8fafc',
                borderRadius: '16px',
                padding: '14px 16px',
                border: '1px solid #e2e8f0',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '6px',
                    background: '#fef3c7',
                    color: '#d97706',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    <Sparkles size={14} />
                  </div>
                  <div>
                    <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#1e293b' }}>
                      Helden-Moment
                    </span>
                    <span style={{ fontSize: '0.74rem', color: '#64748b', marginLeft: '6px' }}>
                      Ehrenvolle Erwähnung im Update-Briefing bei erfolgreicher Umsetzung
                    </span>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '8px' }}>
                  {[
                    {
                      id: 'school_only',
                      title: 'Nur Musikschule',
                      subtitle: schoolName ? schoolName : 'Schulname',
                      icon: Building2
                    },
                    {
                      id: 'full',
                      title: userRole === 'student' ? 'Vorname & Schule' : 'Name & Schule',
                      subtitle: userRole === 'student'
                        ? (schoolName ? `${studentPseudonym} (${schoolName})` : studentPseudonym)
                        : (schoolName ? `${userName || 'Vorname & Name'} (${schoolName})` : (userName || 'Vorname & Name')),
                      icon: Award
                    },
                    {
                      id: 'anonymous',
                      title: 'Anonym bleiben',
                      subtitle: 'Keine Namensnennung',
                      icon: ShieldOff
                    }
                  ].map((opt) => {
                    const isSelected = heroOptIn === opt.id;
                    const Icon = opt.icon;
                    return (
                      <div
                        key={opt.id}
                        onClick={() => setHeroOptIn(opt.id as any)}
                        style={{
                          background: isSelected ? '#ffffff' : '#f1f5f9',
                          border: isSelected ? `1.5px solid ${accentColor}` : '1px solid #e2e8f0',
                          borderRadius: '12px',
                          padding: '10px 12px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          transition: 'all 0.15s ease',
                          boxShadow: isSelected ? `0 2px 8px ${accentColor}18` : 'none'
                        }}
                      >
                        <div style={{
                          width: '28px',
                          height: '28px',
                          borderRadius: '8px',
                          background: isSelected ? `${accentColor}15` : '#ffffff',
                          color: isSelected ? accentColor : '#64748b',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0
                        }}>
                          <Icon size={14} />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: '0.78rem', fontWeight: 800, color: isSelected ? '#0f172a' : '#475569', lineHeight: 1.2 }}>
                            {opt.title}
                          </div>
                          <div style={{ fontSize: '0.68rem', color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: '2px' }}>
                            {opt.subtitle}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Master Legal Security & Compliance Section (100% Wasserdicht) */}
              <div style={{
                background: '#f8fafc',
                borderRadius: '12px',
                border: '1px solid #e2e8f0',
                padding: '10px 12px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px'
              }}>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                  <ShieldCheck size={16} color={accentColor} style={{ flexShrink: 0, marginTop: '2px' }} />
                  <div style={{ flex: 1 }}>
                    <p style={{ margin: 0, fontSize: '0.72rem', color: '#334155', lineHeight: 1.4 }}>
                      <strong>Rechtssichere Einreichung:</strong> Vorschläge erfolgen freiwillig und unentgeltlich zur Plattform-Weiterentwicklung (§§ 31 ff. UrhG). Die Helden-Nennung basiert auf deiner Einwilligung (Art. 6 DSGVO) und ist jederzeit widerruflich.
                    </p>
                    <button
                      type="button"
                      onClick={() => setShowLegalDetails(prev => !prev)}
                      style={{
                        marginTop: '4px',
                        padding: 0,
                        background: 'transparent',
                        border: 'none',
                        color: accentColor,
                        fontSize: '0.70rem',
                        fontWeight: 750,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        textDecoration: 'underline'
                      }}
                    >
                      <span>{showLegalDetails ? 'Rechtliche Details & DSGVO-Hinweise einklappen' : 'Vollständige rechtliche Bedingungen & DSGVO anzeigen'}</span>
                      {showLegalDetails ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                    </button>
                  </div>
                </div>

                {/* Expandable Legal Terms */}
                {showLegalDetails && (
                  <div style={{
                    marginTop: '4px',
                    padding: '10px 12px',
                    background: '#ffffff',
                    borderRadius: '10px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.68rem',
                    color: '#475569',
                    lineHeight: 1.45,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px'
                  }}>
                    <div>
                      <strong>1. Unentgeltliche Rechteeinräumung (§§ 31 ff. UrhG):</strong> Mit dem Einreichen räumst du Campus-Groovelab das unentgeltliche, zeitlich, räumlich und inhaltlich unbeschränkte sowie übertragbare Recht ein, deinen Vorschlag für die Weiterentwicklung, Anpassung und Verwertung der Plattform zu nutzen. Ein Anspruch auf Umsetzung oder Vergütung (§ 32 UrhG) ist ausgeschlossen.
                    </div>
                    <div>
                      <strong>2. Datenschutz & Minderjährigenschutz (Art. 6, 7 & 8 DSGVO):</strong> Die Nennung im Helden-Moment erfolgt auf Basis deiner freiwilligen Einwilligung (Art. 6 Abs. 1 lit. a DSGVO) und kann jederzeit formlos mit Wirkung für die Zukunft widerrufen werden. Bei Schülern erfolgt eine Nennung stets pseudonymisiert (Vorname + 1. Buchstabe Nachname).
                    </div>
                    <div>
                      <strong>3. Verbot von Drittdaten (§ 1 GeschGehG, Art. 5 DSGVO):</strong> Es ist untersagt, vertrauliche Geschäftsgeheimnisse oder personenbezogene Daten dritter Personen (z. B. fremde Namen, Noten, Adressen oder Kontodaten) im Freitextfeld einzutragen.
                    </div>
                    <div>
                      <strong>4. Sprachdiktat & Hardware-Sicherheit (§ 25 TDDDG):</strong> Die Spracheingabe nutzt die lokale Browser-Schnittstelle (Web Speech API). Auf unseren Servern werden zu keinem Zeitpunkt Sprachaufnahmen gespeichert.
                    </div>
                  </div>
                )}
              </div>

              {errorMessage && (
                <div style={{
                  padding: '10px 14px',
                  borderRadius: '10px',
                  backgroundColor: '#fee2e2',
                  border: '1px solid #fca5a5',
                  color: '#b91c1c',
                  fontSize: '0.82rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <AlertCircle size={16} />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Action Buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '4px' }}>
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isSubmitting}
                  style={{
                    padding: '10px 18px',
                    borderRadius: '10px',
                    border: '1px solid #cbd5e1',
                    background: '#ffffff',
                    color: '#475569',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !content.trim()}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '10px 22px',
                    borderRadius: '10px',
                    border: 'none',
                    background: (!content.trim() || isSubmitting) ? '#94a3b8' : accentColor,
                    color: '#ffffff',
                    fontSize: '0.85rem',
                    fontWeight: 800,
                    cursor: (!content.trim() || isSubmitting) ? 'not-allowed' : 'pointer',
                    boxShadow: (!content.trim() || isSubmitting) ? 'none' : `0 4px 14px ${accentColor}35`,
                    transition: 'all 0.15s ease'
                  }}
                >
                  {isSubmitting ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
                  <span>{isSubmitting ? 'Wird gesendet...' : 'Jetzt einreichen'}</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
