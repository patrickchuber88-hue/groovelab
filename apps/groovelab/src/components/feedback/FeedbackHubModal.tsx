import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  X, Bug, Lightbulb, Mic, MicOff, Check, AlertCircle, Sparkles, 
  Send, ShieldCheck, ChevronDown, ChevronUp, MessageCircle, Clock, 
  Search, Archive, CheckCircle2, RefreshCw, Zap, ArrowLeft,
  Loader2, Calendar, BookOpen,
  Music, Users, CreditCard, Settings, Layers, Lock, Mail, Library
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { 
  FeedbackType, HeroOptInType, 
  getAvailableCategoriesForRole, formatLegalHeroCredit,
  FEEDBACK_STATUSES, PlatformFeedbackItem, computeSlaTarget,
  formatSlaCountdown
} from '../../config/feedbackConfig';
import { useDictationInput } from '../../hooks/useVoiceToText';

const renderCategoryIcon = (iconName: string, size = 13, color = 'currentColor') => {
  switch (iconName) {
    case 'Calendar': return <Calendar size={size} color={color} />;
    case 'BookOpen': return <BookOpen size={size} color={color} />;
    case 'Music': return <Music size={size} color={color} />;
    case 'Users': return <Users size={size} color={color} />;
    case 'CreditCard': return <CreditCard size={size} color={color} />;
    case 'Settings': return <Settings size={size} color={color} />;
    case 'Mail': return <Mail size={size} color={color} />;
    case 'Library': return <Library size={size} color={color} />;
    default: return <Layers size={size} color={color} />;
  }
};

const renderStatusIcon = (statusId: string, size = 12, color = 'currentColor') => {
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
  // Navigation: 'submit' vs 'my_feedback'
  const [activeModalTab, setActiveModalTab] = useState<'submit' | 'my_feedback'>('submit');
  const [myFeedbackItems, setMyFeedbackItems] = useState<PlatformFeedbackItem[]>([]);
  const [loadingMyFeedback, setLoadingMyFeedback] = useState<boolean>(false);

  // Form State
  const [feedbackType, setFeedbackType] = useState<FeedbackType>('feature_idea');
  const [grantGhostAccess, setGrantGhostAccess] = useState<boolean>(false);
  const [selectedBoardId, setSelectedBoardId] = useState<string>('homework');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [content, setContent] = useState<string>('');
  const [heroOptIn, setHeroOptIn] = useState<HeroOptInType>('anonymous');
  const [showLegalDetails, setShowLegalDetails] = useState<boolean>(false);

  // Dropdown Popover Toggles
  const [isTypeDropdownOpen, setIsTypeDropdownOpen] = useState<boolean>(false);
  const [isBoardDropdownOpen, setIsBoardDropdownOpen] = useState<boolean>(false);
  const typeDropdownRef = useRef<HTMLDivElement>(null);
  const boardDropdownRef = useRef<HTMLDivElement>(null);

  // Canonical Voice dictation engine
  const [speechError, setSpeechError] = useState<string | null>(null);
  const {
    isListening: isRecording,
    isSupported: speechSupported,
    toggleListening: toggleDictation,
    stopListening: stopDictation,
    error: dictationError,
  } = useDictationInput({
    value: content,
    onChange: setContent
  });

  // Student pseudonymization helper (GDPR Article 8 & KUG § 22 compliant)
  const studentPseudonym = useMemo(() => {
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
  const [submittedTicket, setSubmittedTicket] = useState<PlatformFeedbackItem | null>(null);
  const [countdownSeconds, setCountdownSeconds] = useState<number>(3600);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const availableCategories = useMemo(() => getAvailableCategoriesForRole(userRole), [userRole]);
  const currentCategory = useMemo(() => {
    return availableCategories.find(c => c.id === selectedBoardId) || availableCategories[0];
  }, [availableCategories, selectedBoardId]);

  // Theme color based on module (Campus green, Groovelab yellow, Admin red)
  const accentColor = activePlatform === 'groovelab' 
    ? '#facc15' 
    : (userRole === 'admin' || userRole === 'secretary' || activePlatform === 'admin_desk')
      ? '#ea4335'
      : '#34a853';

  // Live SLA Countdown Interval for Active Submission
  useEffect(() => {
    if (!isSubmitted || !submittedTicket) return;
    const updateTimer = () => {
      const target = computeSlaTarget(submittedTicket.created_at);
      setCountdownSeconds(Math.max(0, target.secondsRemaining));
    };
    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [isSubmitted, submittedTicket]);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (typeDropdownRef.current && !typeDropdownRef.current.contains(e.target as Node)) {
        setIsTypeDropdownOpen(false);
      }
      if (boardDropdownRef.current && !boardDropdownRef.current.contains(e.target as Node)) {
        setIsBoardDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
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

      // 4. Query Supabase
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
        // Table fallback
      }

      setMyFeedbackItems(localItems);
    } catch (e) {
      console.error('Error fetching my feedback:', e);
    } finally {
      setLoadingMyFeedback(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      if (userId) {
        fetchMyFeedback();
      }
      setIsSubmitted(false);
      setErrorMessage(null);
      setContent('');
      setSelectedTags([]);
      setActiveModalTab('submit');
      setIsTypeDropdownOpen(false);
      setIsBoardDropdownOpen(false);
      setShowLegalDetails(false);
      
      if (activePlatform === 'groovelab' && availableCategories.some(c => c.id === 'bands')) {
        setSelectedBoardId('bands');
      } else if (availableCategories.length > 0 && !availableCategories.some(c => c.id === selectedBoardId)) {
        setSelectedBoardId(availableCategories[0].id);
      }
    } else {
      stopDictation();
    }
  }, [isOpen, userId, activePlatform]);

  const unreadResponseCount = useMemo(() => {
    return myFeedbackItems.filter(it => it.admin_response && it.is_user_read === false).length;
  }, [myFeedbackItems]);

  const toggleTag = (tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) {
      setErrorMessage('Bitte beschreibe dein Anliegen kurz im Textfeld.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    if (isRecording) {
      stopDictation();
    }

    const metadata = {
      os: typeof navigator !== 'undefined' ? navigator.platform : 'unknown',
      browser: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
      viewport: typeof window !== 'undefined' ? `${window.innerWidth}x${window.innerHeight}` : 'unknown',
      app_version: 'v2.6.0',
      current_route: typeof window !== 'undefined' ? window.location.pathname : 'dashboard'
    };

    const sanitizedName = userRole === 'student' ? studentPseudonym : (userName || null);
    const localId = 'fb_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8);
    const nowIso = new Date().toISOString();
    const ticketNumber = 'CG-SUP-' + Math.random().toString(36).substring(2, 8).toUpperCase();

    const newFeedbackItem: PlatformFeedbackItem = {
      id: localId,
      ticket_number: ticketNumber,
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

    // 1. Optimistic Local Persistence (Zero Data Loss)
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

    setSubmittedTicket(newFeedbackItem);
    setIsSubmitted(true);
    setIsSubmitting(false);
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 99999,
      backgroundColor: 'rgba(15, 23, 42, 0.55)',
      backdropFilter: 'blur(16px)',
      WebkitBackdropFilter: 'blur(16px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '16px',
      boxSizing: 'border-box'
    }}>
      <div 
        role="dialog"
        aria-modal="true"
        aria-label="Ideenschmiede & Support"
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '24px',
          width: '94%',
          maxWidth: '840px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 24px 60px -15px rgba(15, 23, 42, 0.22), 0 0 1px rgba(0, 0, 0, 0.1)',
          border: '1px solid rgba(226, 232, 240, 0.95)',
          overflow: 'hidden',
          fontFamily: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
        }}
      >
        {/* ─── Ultra-Sleek Zen Header ─── */}
        <div style={{
          padding: '18px 24px',
          borderBottom: '1px solid #f1f5f9',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: '#ffffff',
          flexShrink: 0
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '34px',
              height: '34px',
              borderRadius: '10px',
              backgroundColor: `${accentColor}14`,
              color: accentColor,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              <Lightbulb size={18} strokeWidth={2.4} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em', lineHeight: 1.2 }}>
                Ideenschmiede
              </h2>
              <p style={{ margin: 0, fontSize: '0.74rem', color: '#64748b', fontWeight: 500 }}>
                Gemeinsam Campus-Groovelab weiterentwickeln
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {activeModalTab === 'submit' ? (
              <button
                type="button"
                onClick={() => {
                  setActiveModalTab('my_feedback');
                  fetchMyFeedback();
                }}
                style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '100px',
                  padding: '5px 11px',
                  fontSize: '0.74rem',
                  fontWeight: 700,
                  color: '#475569',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 0.15s ease'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.background = '#f1f5f9';
                  e.currentTarget.style.borderColor = '#cbd5e1';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#f8fafc';
                  e.currentTarget.style.borderColor = '#e2e8f0';
                }}
              >
                <span>Meine Ideen ({myFeedbackItems.length})</span>
                {unreadResponseCount > 0 && (
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#ef4444' }} />
                )}
                <span style={{ opacity: 0.6 }}>→</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setActiveModalTab('submit')}
                style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '100px',
                  padding: '5px 11px',
                  fontSize: '0.74rem',
                  fontWeight: 700,
                  color: '#475569',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  transition: 'all 0.15s ease'
                }}
              >
                <ArrowLeft size={12} />
                <span>Neues Anliegen</span>
              </button>
            )}

            <button
              onClick={onClose}
              disabled={isSubmitting}
              aria-label="Schließen"
              style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: '#64748b',
                transition: 'all 0.15s ease',
                flexShrink: 0
              }}
              onMouseOver={(e) => e.currentTarget.style.background = '#f1f5f9'}
              onMouseLeave={(e) => e.currentTarget.style.background = '#f8fafc'}
            >
              <X size={15} />
            </button>
          </div>
        </div>

        {/* ─── Body Area ─── */}
        <div style={{
          padding: '20px 24px',
          overflowY: 'auto',
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          background: '#ffffff'
        }}>
          {activeModalTab === 'my_feedback' ? (
            /* ─── SUB-VIEW: Meine Einreichungen ─── */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.74rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Bisherige Einreichungen ({myFeedbackItems.length})
                </span>
                <button
                  type="button"
                  onClick={fetchMyFeedback}
                  disabled={loadingMyFeedback}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '3px 8px',
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0',
                    background: '#ffffff',
                    color: '#64748b',
                    fontSize: '0.70rem',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  <RefreshCw size={10} className={loadingMyFeedback ? 'animate-spin' : ''} />
                  <span>Aktualisieren</span>
                </button>
              </div>

              {loadingMyFeedback ? (
                <div style={{ padding: '36px', textAlign: 'center', color: '#94a3b8' }}>
                  <Loader2 size={22} className="animate-spin" style={{ margin: '0 auto 6px' }} />
                  <p style={{ margin: 0, fontSize: '0.80rem' }}>Lade deine Beiträge...</p>
                </div>
              ) : myFeedbackItems.length === 0 ? (
                <div style={{
                  padding: '36px 20px',
                  textAlign: 'center',
                  background: '#f8fafc',
                  borderRadius: '16px',
                  border: '1px dashed #cbd5e1',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '10px'
                }}>
                  <div style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    backgroundColor: '#e2e8f0',
                    color: '#64748b',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <Lightbulb size={20} />
                  </div>
                  <div>
                    <h4 style={{ margin: 0, fontSize: '0.92rem', fontWeight: 800, color: '#0f172a' }}>
                      Noch keine Einreichungen
                    </h4>
                    <p style={{ margin: '3px 0 0', fontSize: '0.78rem', color: '#64748b' }}>
                      Du hast bisher noch keine Ideen oder Fehlerberichte eingereicht.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveModalTab('submit')}
                    style={{
                      marginTop: '4px',
                      padding: '7px 14px',
                      borderRadius: '8px',
                      border: 'none',
                      background: accentColor,
                      color: '#ffffff',
                      fontSize: '0.78rem',
                      fontWeight: 800,
                      cursor: 'pointer'
                    }}
                  >
                    Jetzt erste Idee einreichen
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '420px', overflowY: 'auto' }}>
                  {myFeedbackItems.map(item => {
                    const statusMeta = FEEDBACK_STATUSES.find(s => s.id === item.status) || FEEDBACK_STATUSES[0];
                    const slaTarget = computeSlaTarget(item.created_at, item.admin_responded_at);

                    return (
                      <div
                        key={item.id}
                        style={{
                          background: '#ffffff',
                          border: '1px solid #e2e8f0',
                          borderRadius: '14px',
                          padding: '12px 14px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '8px',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '6px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '2px 7px',
                              borderRadius: '6px',
                              background: item.type === 'bug' ? '#fee2e2' : (item.type === 'support_request' ? '#ecfeff' : '#fef3c7'),
                              color: item.type === 'bug' ? '#b91c1c' : (item.type === 'support_request' ? '#0891b2' : '#b45309'),
                              fontSize: '0.70rem',
                              fontWeight: 800
                            }}>
                              {item.type === 'bug' ? <Bug size={11} /> : (item.type === 'support_request' ? <Zap size={11} /> : <Lightbulb size={11} />)}
                              {item.type === 'bug' ? 'Fehler' : (item.type === 'support_request' ? 'Support' : 'Idee')}
                            </span>
                            <span style={{ fontSize: '0.70rem', color: '#64748b', fontWeight: 600 }}>
                              • {item.ticket_number || ''} • {item.board_name} • {new Date(item.created_at).toLocaleDateString('de-DE')}
                            </span>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '3px',
                              padding: '2px 7px',
                              borderRadius: '100px',
                              background: slaTarget.badgeBg,
                              color: slaTarget.badgeColor,
                              fontSize: '0.66rem',
                              fontWeight: 800
                            }}>
                              <Zap size={9} />
                              <span>{slaTarget.label}</span>
                            </span>

                            <div style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '2px 8px',
                              borderRadius: '100px',
                              background: statusMeta.badgeBg,
                              color: statusMeta.badgeColor,
                              fontSize: '0.70rem',
                              fontWeight: 800
                            }}>
                              {renderStatusIcon(item.status, 11, statusMeta.badgeColor)}
                              <span>{statusMeta.label}</span>
                            </div>
                          </div>
                        </div>

                        <div style={{
                          background: '#f8fafc',
                          padding: '9px 11px',
                          borderRadius: '8px',
                          fontSize: '0.80rem',
                          color: '#334155',
                          lineHeight: 1.4,
                          whiteSpace: 'pre-wrap',
                          border: '1px solid #f1f5f9'
                        }}>
                          {item.content}
                        </div>

                        {item.admin_response ? (
                          <div style={{
                            background: '#f0f9ff',
                            borderRadius: '10px',
                            padding: '10px 12px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '4px',
                            border: 'none'
                          }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                <MessageCircle size={13} color="#0284c7" />
                                <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#0369a1' }}>
                                  Rückmeldung der Plattform-Entwickler
                                </span>
                              </div>
                              {item.admin_responded_at && (
                                <span style={{ fontSize: '0.66rem', color: '#0284c7', fontWeight: 600 }}>
                                  {new Date(item.admin_responded_at).toLocaleDateString('de-DE')}
                                </span>
                              )}
                            </div>
                            <div style={{ fontSize: '0.80rem', color: '#0f172a', lineHeight: 1.4, fontWeight: 600 }}>
                              {item.admin_response}
                            </div>
                          </div>
                        ) : (
                          <div style={{ fontSize: '0.70rem', color: '#94a3b8', fontStyle: 'italic' }}>
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
            /* ─── SUB-VIEW: Ticket Eingereicht & SLA Countdown ─── */
            <div style={{
              padding: '24px 16px',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '14px',
              background: '#ffffff'
            }}>
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                background: '#10b981',
                padding: '5px 12px',
                borderRadius: '100px',
                color: '#ffffff',
                fontSize: '0.72rem',
                fontWeight: 800,
                letterSpacing: '0.04em'
              }}>
                <Check size={13} strokeWidth={3} />
                <span>TICKET #{submittedTicket?.ticket_number || 'CG-SUP-ACTIVE'} ERFOLGREICH ERFASST</span>
              </div>

              {/* Digital Countdown Box */}
              <div style={{
                background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
                borderRadius: '18px',
                padding: '18px 24px',
                color: '#ffffff',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                width: '100%',
                maxWidth: '380px',
                boxSizing: 'border-box'
              }}>
                {(() => {
                  const target = submittedTicket ? computeSlaTarget(submittedTicket.created_at) : null;
                  const formatted = formatSlaCountdown(countdownSeconds);
                  const isNight = !target?.isWithinBusinessHours;

                  return (
                    <>
                      <span style={{
                        fontSize: '0.70rem',
                        fontWeight: 800,
                        color: isNight ? '#94a3b8' : '#34d399',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em'
                      }}>
                        {isNight ? '🌙 Nacht- & Ruhezeit-Modus' : '⚡ 60-Minuten Express-SLA'}
                      </span>

                      <div style={{
                        fontSize: '2.2rem',
                        fontWeight: 900,
                        fontFamily: 'monospace',
                        color: isNight ? '#38bdf8' : '#4ade80',
                        letterSpacing: '-0.02em',
                        marginTop: '4px',
                        display: 'flex',
                        alignItems: 'baseline',
                        gap: '6px'
                      }}>
                        <span>{formatted.timeString}</span>
                        <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#94a3b8' }}>
                          {formatted.unit}
                        </span>
                      </div>

                      <span style={{ fontSize: '0.72rem', color: '#cbd5e1', marginTop: '4px', fontWeight: 500 }}>
                        {isNight 
                          ? `Garantierte Antwort: ${target?.displayTarget || 'Nächster Werktag 10:00 Uhr'}`
                          : 'Garantierte qualifizierte Rückmeldung innerhalb von 60 Minuten'}
                      </span>
                    </>
                  );
                })()}
              </div>

              <div style={{ display: 'flex', gap: '8px', width: '100%', maxWidth: '380px', marginTop: '4px' }}>
                <button
                  type="button"
                  onClick={() => {
                    setActiveModalTab('my_feedback');
                    setIsSubmitted(false);
                    setContent('');
                    setSelectedTags([]);
                  }}
                  style={{
                    flex: 1,
                    padding: '10px',
                    borderRadius: '10px',
                    border: 'none',
                    background: accentColor,
                    color: '#ffffff',
                    fontSize: '0.80rem',
                    fontWeight: 800,
                    cursor: 'pointer'
                  }}
                >
                  Zu meinen Beiträgen
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsSubmitted(false);
                    setContent('');
                    setSelectedTags([]);
                    onClose();
                  }}
                  style={{
                    padding: '10px 16px',
                    borderRadius: '10px',
                    border: '1px solid #cbd5e1',
                    background: '#ffffff',
                    color: '#475569',
                    fontSize: '0.80rem',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  Fertig
                </button>
              </div>
            </div>
          ) : (
            /* ─── PRIMARY ZEN VIEW: Das vereinfachte Eingabe-Formular ─── */
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              
              {/* Row 1: Dual Inline Selectors (Type + Board) */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  {/* 1. Anliegen-Typ Segmented Switch */}
                  <div style={{
                    display: 'flex',
                    background: '#f1f5f9',
                    padding: '3px',
                    borderRadius: '12px',
                    gap: '3px'
                  }}>
                    {[
                      { id: 'feature_idea', label: 'Idee & Wunsch', icon: Lightbulb, color: accentColor },
                      { id: 'bug', label: 'Fehler melden', icon: Bug, color: '#ea4335' },
                      { id: 'support_request', label: 'Express-Support (60m)', icon: Zap, color: '#0891b2' },
                    ].map(opt => {
                      const Icon = opt.icon;
                      const isSel = feedbackType === opt.id;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => {
                            setFeedbackType(opt.id as FeedbackType);
                            if (opt.id === 'support_request') setGrantGhostAccess(true);
                          }}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '6px 12px',
                            borderRadius: '9px',
                            border: 'none',
                            background: isSel ? '#ffffff' : 'transparent',
                            color: isSel ? '#0f172a' : '#64748b',
                            fontSize: '0.78rem',
                            fontWeight: isSel ? 800 : 600,
                            cursor: 'pointer',
                            boxShadow: isSel ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          <Icon size={13} color={isSel ? opt.color : '#64748b'} strokeWidth={isSel ? 2.5 : 2} />
                          <span>{opt.label}</span>
                        </button>
                      );
                    })}
                  </div>

                  <span style={{ fontSize: '0.76rem', color: '#94a3b8', fontWeight: 600, margin: '0 2px' }}>in</span>

                  {/* 2. Bereich / Board Inline Pill */}
                  <div ref={boardDropdownRef} style={{ position: 'relative' }}>
                    <button
                      type="button"
                      onClick={() => {
                        setIsBoardDropdownOpen(prev => !prev);
                        setIsTypeDropdownOpen(false);
                      }}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '6px 12px',
                        borderRadius: '10px',
                        border: '1px solid #e2e8f0',
                        background: '#f8fafc',
                        color: '#0f172a',
                        fontSize: '0.78rem',
                        fontWeight: 750,
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                      onMouseOver={(e) => e.currentTarget.style.borderColor = '#cbd5e1'}
                      onMouseLeave={(e) => e.currentTarget.style.borderColor = '#e2e8f0'}
                    >
                      {renderCategoryIcon(currentCategory?.iconName || 'Layers', 13, '#64748b')}
                      <span>{currentCategory?.shortName || 'Bereich'}</span>
                      <ChevronDown size={12} color="#64748b" />
                    </button>

                    {isBoardDropdownOpen && (
                      <div style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        marginTop: '4px',
                        width: '260px',
                        maxHeight: '300px',
                        overflowY: 'auto',
                        background: '#ffffff',
                        borderRadius: '12px',
                        border: '1px solid #e2e8f0',
                        boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1), 0 0 1px rgba(0,0,0,0.1)',
                        padding: '4px',
                        zIndex: 100,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '2px'
                      }}>
                        {availableCategories.map(cat => {
                          const isSel = selectedBoardId === cat.id;
                          return (
                            <button
                              key={cat.id}
                              type="button"
                              onClick={() => {
                                setSelectedBoardId(cat.id);
                                setSelectedTags([]);
                                setIsBoardDropdownOpen(false);
                              }}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                padding: '7px 10px',
                                borderRadius: '8px',
                                border: 'none',
                                background: isSel ? '#f1f5f9' : 'transparent',
                                color: isSel ? '#0f172a' : '#475569',
                                fontSize: '0.78rem',
                                fontWeight: isSel ? 800 : 600,
                                cursor: 'pointer',
                                textAlign: 'left',
                                width: '100%'
                              }}
                              onMouseOver={(e) => e.currentTarget.style.background = '#f8fafc'}
                              onMouseLeave={(e) => e.currentTarget.style.background = isSel ? '#f1f5f9' : 'transparent'}
                            >
                              <span style={{ color: isSel ? accentColor : '#64748b' }}>
                                {renderCategoryIcon(cat.iconName, 13, 'currentColor')}
                              </span>
                              <span style={{ flex: 1 }}>{cat.shortName}</span>
                              {isSel && <Check size={12} color="#0f172a" strokeWidth={3} />}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                {/* 60m SLA Pill Indicator (Subtle & Quiet) */}
                {(feedbackType === 'support_request' || feedbackType === 'bug') && (
                  <span style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '4px 10px',
                    borderRadius: '100px',
                    background: '#ecfdf5',
                    color: '#065f46',
                    fontSize: '0.72rem',
                    fontWeight: 800
                  }}>
                    <Zap size={11} color="#059669" />
                    <span>60m SLA Garantie</span>
                  </span>
                )}
              </div>

              {/* Optional Ghost Access Toggle (Only for bug/support) */}
              {(feedbackType === 'support_request' || feedbackType === 'bug') && (
                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  cursor: 'pointer',
                  padding: '6px 10px',
                  borderRadius: '10px',
                  background: grantGhostAccess ? '#f0fdf4' : '#f8fafc',
                  border: grantGhostAccess ? '1px solid #bbf7d0' : '1px solid #e2e8f0',
                  transition: 'all 0.15s ease'
                }}>
                  <input
                    type="checkbox"
                    checked={grantGhostAccess}
                    onChange={(e) => setGrantGhostAccess(e.target.checked)}
                    style={{ width: '14px', height: '14px', accentColor: '#16a34a', cursor: 'pointer' }}
                  />
                  <div style={{ fontSize: '0.74rem', color: grantGhostAccess ? '#166534' : '#64748b', fontWeight: 600 }}>
                    Support-Diagnose & temporären Ghost-Zugriff für 7 Tage gestatten
                  </div>
                </label>
              )}

              {/* Row 2: Main Textarea (The Visual Hero) */}
              <div style={{ position: 'relative' }}>
                <textarea
                  rows={5}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder={
                    feedbackType === 'feature_idea'
                      ? 'Was würde deinen Schul- oder Unterrichtsalltag noch einfacher machen? Beschreibe deine Idee...'
                      : feedbackType === 'bug'
                        ? 'Was genau ist passiert? Beschreibe kurz das Fehlerbild...'
                        : 'Wie können wir dir direkt helfen? Beschreibe dein Anliegen...'
                  }
                  style={{
                    width: '100%',
                    padding: '14px 16px 42px 16px',
                    borderRadius: '16px',
                    border: '1.5px solid #e2e8f0',
                    fontSize: '0.90rem',
                    fontFamily: 'inherit',
                    color: '#0f172a',
                    boxSizing: 'border-box',
                    resize: 'none',
                    outline: 'none',
                    minHeight: '150px',
                    lineHeight: 1.55,
                    transition: 'border-color 0.15s, box-shadow 0.15s'
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = accentColor;
                    e.currentTarget.style.boxShadow = `0 0 0 3px ${accentColor}18`;
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = '#e2e8f0';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                />

                {/* Floating Micro-Pill: Dictate Button & Character Counter */}
                <div style={{
                  position: 'absolute',
                  bottom: '8px',
                  left: '12px',
                  right: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  pointerEvents: 'none'
                }}>
                  <span style={{ fontSize: '0.68rem', color: '#94a3b8', fontWeight: 600 }}>
                    {content.length > 0 ? `${content.length} Zeichen` : ''}
                  </span>

                  <button
                    type="button"
                    onClick={toggleDictation}
                    style={{
                      pointerEvents: 'auto',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px',
                      padding: '4px 10px',
                      borderRadius: '100px',
                      border: isRecording ? '1px solid #ef4444' : '1px solid #cbd5e1',
                      background: isRecording ? '#fee2e2' : 'rgba(255, 255, 255, 0.94)',
                      color: isRecording ? '#dc2626' : '#475569',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
                      transition: 'all 0.15s ease'
                    }}
                    title={isRecording ? 'Diktat beenden' : 'Per Spracheingabe diktieren'}
                  >
                    {isRecording ? (
                      <>
                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#dc2626' }} />
                        <MicOff size={11} />
                        <span>Höre zu...</span>
                      </>
                    ) : (
                      <>
                        <Mic size={11} color="#64748b" />
                        <span>Diktieren</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {(speechError || dictationError) && (
                <p style={{ margin: '-6px 0 0', fontSize: '0.72rem', color: '#ef4444', fontWeight: 600 }}>
                  {speechError || dictationError}
                </p>
              )}

              {/* Row 3: Smart Tags (Compact Chips, Only If Category Has Tags) */}
              {currentCategory && currentCategory.tags.length > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '0.68rem', fontWeight: 750, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em', marginRight: '3px' }}>
                    Themen:
                  </span>
                  {currentCategory.tags.map((tag) => {
                    const isTagSelected = selectedTags.includes(tag);
                    return (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => toggleTag(tag)}
                        style={{
                          padding: '3px 8px',
                          borderRadius: '6px',
                          border: isTagSelected ? `1px solid ${accentColor}` : '1px solid #e2e8f0',
                          background: isTagSelected ? `${accentColor}18` : '#f8fafc',
                          color: isTagSelected ? (accentColor === '#facc15' ? '#854d0e' : accentColor) : '#64748b',
                          fontSize: '0.70rem',
                          fontWeight: isTagSelected ? 800 : 600,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '3px',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        {isTagSelected && <Check size={10} strokeWidth={3} />}
                        <span>{tag}</span>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Error Message */}
              {errorMessage && (
                <div style={{
                  padding: '8px 12px',
                  borderRadius: '8px',
                  backgroundColor: '#fee2e2',
                  color: '#b91c1c',
                  fontSize: '0.78rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}>
                  <AlertCircle size={14} />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* ─── Row 4: Multi-Tier Legal Governance (100% Wasserdicht & Flüsterleise) ─── */}
              <div style={{
                paddingTop: '8px',
                borderTop: '1px solid #f1f5f9',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: 1 }}>
                    <ShieldCheck size={14} color={accentColor} style={{ flexShrink: 0 }} />
                    <span style={{ fontSize: '0.72rem', color: '#64748b', lineHeight: 1.3 }}>
                      Freiwillige & unentgeltliche Einreichung (§§ 31 ff. UrhG). Vertrauliche interne Bearbeitung (DSGVO). Keine Drittgeheimnisse.
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowLegalDetails(prev => !prev)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: accentColor === '#facc15' ? '#854d0e' : accentColor,
                      fontSize: '0.70rem',
                      fontWeight: 750,
                      cursor: 'pointer',
                      padding: 0,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '2px',
                      flexShrink: 0,
                      textDecoration: 'underline'
                    }}
                  >
                    <span>{showLegalDetails ? 'Schließen' : 'Details'}</span>
                    {showLegalDetails ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                  </button>
                </div>

                {/* Expandable 4-Pillar Legal Compliance Sheet */}
                {showLegalDetails && (
                  <div style={{
                    padding: '10px 12px',
                    background: '#f8fafc',
                    borderRadius: '10px',
                    border: '1px solid #e2e8f0',
                    fontSize: '0.68rem',
                    color: '#475569',
                    lineHeight: 1.45,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px'
                  }}>
                    <div>
                      <strong>1. Unentgeltliche Rechteeinräumung (§§ 31 ff., 39 UrhG):</strong> Mit der Einreichung räumst du dem Plattformbetreiber ein unentgeltliches, zeitlich, räumlich und inhaltlich unbeschränktes Recht ein, deinen Vorschlag für die Weiterentwicklung und Verwertung von Campus-Groovelab zu nutzen. Ein Anspruch auf Umsetzung oder Vergütung (§ 32 UrhG) ist ausgeschlossen.
                    </div>
                    <div>
                      <strong>2. Vertraulichkeit & interner Ideenschutz (Art. 5 & 6 DSGVO):</strong> Dein Feedback wird ausschließlich intern zur Optimierung von Campus-Groovelab verarbeitet. Es erfolgt keine Weitergabe von Namen, Schuldaten oder Kontaktdaten an Dritte oder die Öffentlichkeit. Status-Updates zu deinem Anliegen erhältst du direkt in deinem geschützten Account unter „Meine Ideen“.
                    </div>
                    <div>
                      <strong>3. Verbot von Drittdaten (§§ 1 ff. GeschGehG):</strong> Es ist untersagt, vertrauliche Geschäftsgeheimnisse oder personenbezogene Daten dritter Personen (fremde Noten, Krankheitsdaten gem. Art. 9 DSGVO, Kontoverbindungen) einzutragen.
                    </div>
                    <div>
                      <strong>4. Lokale Spracherkennung (§ 25 TDDDG):</strong> Die Spracheingabe verarbeitet Audiodaten lokal im Browser. Es werden keine Sprachaufnahmen auf Servern gespeichert.
                    </div>
                  </div>
                )}
              </div>

              {/* ─── Row 6: Bottom Action Buttons ─── */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '8px', marginTop: '2px' }}>
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isSubmitting}
                  style={{
                    padding: '8px 14px',
                    borderRadius: '9px',
                    border: '1px solid #cbd5e1',
                    background: '#ffffff',
                    color: '#475569',
                    fontSize: '0.80rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseOver={(e) => e.currentTarget.style.background = '#f8fafc'}
                  onMouseLeave={(e) => e.currentTarget.style.background = '#ffffff'}
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !content.trim()}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 18px',
                    borderRadius: '9px',
                    border: 'none',
                    background: (!content.trim() || isSubmitting) ? '#94a3b8' : accentColor,
                    color: accentColor === '#facc15' ? '#0f172a' : '#ffffff',
                    fontSize: '0.80rem',
                    fontWeight: 800,
                    cursor: (!content.trim() || isSubmitting) ? 'not-allowed' : 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {isSubmitting ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
                  <span>{isSubmitting ? 'Wird gesendet...' : 'Einreichen'}</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
