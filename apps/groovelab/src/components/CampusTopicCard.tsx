import React, { useState, useRef, useMemo } from 'react';
import { 
  Send, 
  Smile, 
  ChevronDown, 
  ChevronUp, 
  Lock, 
  CheckCheck, 
  CornerDownRight, 
  Check, 
  Clock, 
  Sparkles,
  Music
} from 'lucide-react';
import { cleanChatMessageContent } from './CampusDirectMessages';

export const ALLOWED_TOPIC_EMOJIS = ['👍', '❤️', '🎵', '👏', '🔥', '🚀'] as const;
export type TopicEmojiType = typeof ALLOWED_TOPIC_EMOJIS[number];

export interface CampusTopicReaction {
  id?: string;
  message_id: string;
  user_id: string;
  emoji: string;
}

export interface CampusTopicCardProps {
  topic: any;
  replies: any[];
  currentUserId: string;
  isStudent: boolean;
  canReply: boolean;
  onSendReply: (topicId: string, content: string) => Promise<void>;
  onToggleReaction: (messageId: string, emoji: string) => Promise<void>;
  reactions: CampusTopicReaction[];
  resolveUserDisplayName: (user: any) => string;
  resolveUserAvatar: (user: any) => string;
  findUserById: (userId: string) => any;
  isMobile: boolean;
  isUnread?: boolean;
}

export const CampusTopicCard: React.FC<CampusTopicCardProps> = ({
  topic,
  replies = [],
  currentUserId,
  isStudent,
  canReply,
  onSendReply,
  onToggleReaction,
  reactions = [],
  resolveUserDisplayName,
  resolveUserAvatar,
  findUserById,
  isMobile,
  isUnread = false
}) => {
  const [replyText, setReplyText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showEmojiPickerFor, setShowEmojiPickerFor] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(true);
  const [isReplyInputFocused, setIsReplyInputFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const author = findUserById(topic.sender_id);
  const authorName = resolveUserDisplayName(author || { id: topic.sender_id });
  const authorAvatar = resolveUserAvatar(author);
  const isTeacherAuthor = author?.role === 'teacher' || (Array.isArray(author?.roles) && author.roles.includes('teacher'));

  // Reactions for the root topic
  const topicReactions = useMemo(() => {
    return reactions.filter(r => r.message_id === topic.id);
  }, [reactions, topic.id]);

  // Grouped reactions for root topic
  const groupedTopicReactions = useMemo(() => {
    const map = new Map<string, { count: number; hasReacted: boolean }>();
    for (const r of topicReactions) {
      const existing = map.get(r.emoji) || { count: 0, hasReacted: false };
      existing.count += 1;
      if (r.user_id === currentUserId) {
        existing.hasReacted = true;
      }
      map.set(r.emoji, existing);
    }
    return Array.from(map.entries());
  }, [topicReactions, currentUserId]);

  const handleSend = async () => {
    const text = replyText.trim();
    if (!text || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await onSendReply(topic.id, text);
      setReplyText('');
    } catch (err) {
      console.error('[CampusTopicCard] Reply error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickChip = (chipText: string) => {
    setReplyText(chipText);
    setTimeout(() => {
      inputRef.current?.focus();
    }, 50);
  };

  const quickChips = [
    '✓ Gesehen & danke!',
    '⏱️ Bin ca. 5 Min. später da',
    '🎵 Noten & Instrument dabei',
    '💚 Danke für das Verständnis!'
  ];

  const formatTime = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    if (isToday) {
      return date.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
    }
    return `${date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })} ${date.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}`;
  };

  // Collapse replies if more than 3
  const visibleReplies = isExpanded || replies.length <= 2 ? replies : replies.slice(-2);
  const hasHiddenReplies = !isExpanded && replies.length > 2;

  return (
    <article
      aria-labelledby={`topic-title-${topic.id}`}
      style={{
        background: '#ffffff',
        borderRadius: '16px',
        border: isUnread ? '1.5px solid #34a853' : '1px solid #e2e8f0',
        boxShadow: isUnread 
          ? '0 3px 12px rgba(52, 168, 83, 0.12)' 
          : '0 2px 6px rgba(15, 23, 42, 0.04)',
        padding: isMobile ? '12px 12px' : '16px 18px',
        marginBottom: '12px',
        position: 'relative',
        transition: 'all 0.2s ease',
        boxSizing: 'border-box'
      }}
    >
      {/* Unread Accent Indicator */}
      {isUnread && (
        <div style={{
          position: 'absolute',
          top: '12px',
          right: '12px',
          background: '#e6f4ea',
          color: '#166534',
          fontSize: '0.66rem',
          fontWeight: 900,
          padding: '2px 7px',
          borderRadius: '100px',
          letterSpacing: '0.03em',
          textTransform: 'uppercase'
        }}>
          Neu
        </div>
      )}

      {/* TOPIC HEADER: 30px Avatar, Name, Role Badge, Time */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
        <img
          src={authorAvatar}
          alt=""
          style={{
            width: '30px',
            height: '30px',
            borderRadius: '10px',
            objectFit: 'cover',
            background: '#f1f5f9',
            flexShrink: 0,
            border: '1px solid #e2e8f0'
          }}
          onError={e => {
            (e.target as HTMLImageElement).src = '/avatar_ghost.jpg';
          }}
        />

        <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'baseline', gap: '6px', flexWrap: 'wrap' }}>
          <span style={{
            fontSize: '0.86rem',
            fontWeight: 800,
            color: '#0f172a',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis'
          }}>
            {authorName}
          </span>

          {isTeacherAuthor && (
            <span style={{
              background: '#e6f4ea',
              color: '#166534',
              fontSize: '0.62rem',
              fontWeight: 800,
              padding: '1px 5px',
              borderRadius: '4px'
            }}>
              Lehrkraft
            </span>
          )}

          <span style={{ fontSize: '0.68rem', color: '#94a3b8', fontWeight: 600, marginLeft: 'auto' }}>
            {formatTime(topic.created_at)}
          </span>
        </div>
      </div>

      {/* TOPIC TITLE / BETREFF (Mandatory for Threads) */}
      <div style={{ marginBottom: '6px' }}>
        <h3
          id={`topic-title-${topic.id}`}
          style={{
            margin: 0,
            fontSize: '0.96rem',
            fontWeight: 900,
            color: '#0f172a',
            lineHeight: 1.3,
            wordBreak: 'break-word'
          }}
        >
          {topic.subject || 'Thema ohne Betreff'}
        </h3>
      </div>

      {/* TOPIC CONTENT */}
      <div style={{
        fontSize: '0.85rem',
        lineHeight: 1.45,
        color: '#334155',
        wordBreak: 'break-word',
        whiteSpace: 'pre-wrap',
        marginBottom: '10px'
      }}>
        {cleanChatMessageContent(topic.content)}
      </div>

      {/* EMOJI BAR & REACTION PILLS FOR ROOT TOPIC */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        flexWrap: 'wrap',
        marginBottom: replies.length > 0 ? '12px' : '8px',
        position: 'relative'
      }}>
        {/* Existing Reactions */}
        {groupedTopicReactions.map(([emoji, data]) => (
          <button
            key={emoji}
            type="button"
            onClick={() => onToggleReaction(topic.id, emoji)}
            aria-label={`Reaktion ${emoji} ${data.hasReacted ? 'entfernen' : 'hinzufügen'}`}
            style={{
              background: data.hasReacted ? '#dcfce7' : '#f8fafc',
              border: data.hasReacted ? '1px solid #86efac' : '1px solid #e2e8f0',
              borderRadius: '100px',
              padding: '2px 8px',
              fontSize: '0.74rem',
              fontWeight: 800,
              color: data.hasReacted ? '#166534' : '#475569',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              transition: 'all 0.15s ease'
            }}
          >
            <span>{emoji}</span>
            <span>{data.count}</span>
          </button>
        ))}

        {/* Reaction Trigger Button */}
        <div style={{ position: 'relative' }}>
          <button
            type="button"
            onClick={() => setShowEmojiPickerFor(showEmojiPickerFor === topic.id ? null : topic.id)}
            aria-label="Mit Emoji auf Thema reagieren"
            style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '100px',
              padding: '2px 7px',
              fontSize: '0.72rem',
              color: '#64748b',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '3px',
              transition: 'all 0.15s ease'
            }}
          >
            <Smile size={13} />
            <span style={{ fontWeight: 700 }}>+</span>
          </button>

          {/* Curated Didactic Emoji Dropdown (6 standard music-school emojis) */}
          {showEmojiPickerFor === topic.id && (
            <div
              style={{
                position: 'absolute',
                bottom: '100%',
                left: 0,
                marginBottom: '6px',
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '14px',
                padding: '4px 6px',
                boxShadow: '0 8px 20px rgba(0, 0, 0, 0.14)',
                display: 'flex',
                gap: '4px',
                zIndex: 100,
                animation: 'fadeInScale 0.12s ease'
              }}
            >
              {ALLOWED_TOPIC_EMOJIS.map(em => (
                <button
                  key={em}
                  type="button"
                  onClick={() => {
                    onToggleReaction(topic.id, em);
                    setShowEmojiPickerFor(null);
                  }}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '4px 6px',
                    fontSize: '1.1rem',
                    cursor: 'pointer',
                    transition: 'transform 0.1s ease',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                  className="hover-scale"
                >
                  {em}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* THREAD REPLIES CONTAINER (2px slim guide line on the left, zero width waste on mobile) */}
      {replies.length > 0 && (
        <div style={{
          borderLeft: '2px solid #e2e8f0',
          paddingLeft: isMobile ? '8px' : '12px',
          marginLeft: isMobile ? '2px' : '6px',
          marginBottom: '10px'
        }}>
          {/* Collapsible Button if more than 2 replies */}
          {replies.length > 2 && (
            <button
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#16a34a',
                fontSize: '0.74rem',
                fontWeight: 800,
                padding: '4px 0 8px 0',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              {isExpanded ? (
                <>
                  <ChevronUp size={14} />
                  <span>Antworten einklappen</span>
                </>
              ) : (
                <>
                  <ChevronDown size={14} />
                  <span>{replies.length - 2} frühere Antworten anzeigen</span>
                </>
              )}
            </button>
          )}

          {/* Reply List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {visibleReplies.map(reply => {
              const replyAuthor = findUserById(reply.sender_id);
              const rName = resolveUserDisplayName(replyAuthor || { id: reply.sender_id });
              const rAvatar = resolveUserAvatar(replyAuthor);
              const isRTeacher = replyAuthor?.role === 'teacher' || (Array.isArray(replyAuthor?.roles) && replyAuthor.roles.includes('teacher'));

              // Reactions for this specific reply
              const replyReactions = reactions.filter(r => r.message_id === reply.id);
              const groupedReplyReactions = (() => {
                const map = new Map<string, { count: number; hasReacted: boolean }>();
                for (const r of replyReactions) {
                  const existing = map.get(r.emoji) || { count: 0, hasReacted: false };
                  existing.count += 1;
                  if (r.user_id === currentUserId) existing.hasReacted = true;
                  map.set(r.emoji, existing);
                }
                return Array.from(map.entries());
              })();

              return (
                <div
                  key={reply.id}
                  style={{
                    background: '#f8fafc',
                    borderRadius: '12px',
                    padding: isMobile ? '8px 10px' : '10px 12px',
                    border: '1px solid #f1f5f9'
                  }}
                >
                  {/* Reply Header: 24px mini avatar */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <img
                      src={rAvatar}
                      alt=""
                      style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '8px',
                        objectFit: 'cover',
                        background: '#ffffff',
                        border: '1px solid #e2e8f0',
                        flexShrink: 0
                      }}
                      onError={e => {
                        (e.target as HTMLImageElement).src = '/avatar_ghost.jpg';
                      }}
                    />
                    <span style={{ fontSize: '0.80rem', fontWeight: 800, color: '#0f172a' }}>
                      {rName}
                    </span>
                    {isRTeacher && (
                      <span style={{
                        background: '#e6f4ea',
                        color: '#166534',
                        fontSize: '0.60rem',
                        fontWeight: 800,
                        padding: '1px 4px',
                        borderRadius: '4px'
                      }}>
                        Lehrkraft
                      </span>
                    )}
                    <span style={{ fontSize: '0.65rem', color: '#94a3b8', fontWeight: 600, marginLeft: 'auto' }}>
                      {formatTime(reply.created_at)}
                    </span>
                  </div>

                  {/* Reply Text */}
                  <div style={{
                    fontSize: '0.82rem',
                    lineHeight: 1.4,
                    color: '#334155',
                    wordBreak: 'break-word',
                    whiteSpace: 'pre-wrap'
                  }}>
                    {cleanChatMessageContent(reply.content)}
                  </div>

                  {/* Reply Emoji Reactions */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    flexWrap: 'wrap',
                    marginTop: '6px',
                    position: 'relative'
                  }}>
                    {groupedReplyReactions.map(([emoji, data]) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => onToggleReaction(reply.id, emoji)}
                        style={{
                          background: data.hasReacted ? '#dcfce7' : '#ffffff',
                          border: data.hasReacted ? '1px solid #86efac' : '1px solid #e2e8f0',
                          borderRadius: '100px',
                          padding: '1px 6px',
                          fontSize: '0.70rem',
                          fontWeight: 800,
                          color: data.hasReacted ? '#166534' : '#475569',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '3px'
                        }}
                      >
                        <span>{emoji}</span>
                        <span>{data.count}</span>
                      </button>
                    ))}

                    <div style={{ position: 'relative' }}>
                      <button
                        type="button"
                        onClick={() => setShowEmojiPickerFor(showEmojiPickerFor === reply.id ? null : reply.id)}
                        aria-label="Mit Emoji auf Antwort reagieren"
                        style={{
                          background: '#ffffff',
                          border: '1px solid #e2e8f0',
                          borderRadius: '100px',
                          padding: '1px 6px',
                          fontSize: '0.68rem',
                          color: '#64748b',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '2px'
                        }}
                      >
                        <Smile size={12} />
                        <span style={{ fontWeight: 700 }}>+</span>
                      </button>

                      {showEmojiPickerFor === reply.id && (
                        <div
                          style={{
                            position: 'absolute',
                            bottom: '100%',
                            left: 0,
                            marginBottom: '4px',
                            background: '#ffffff',
                            border: '1px solid #e2e8f0',
                            borderRadius: '12px',
                            padding: '3px 4px',
                            boxShadow: '0 6px 16px rgba(0, 0, 0, 0.12)',
                            display: 'flex',
                            gap: '3px',
                            zIndex: 100
                          }}
                        >
                          {ALLOWED_TOPIC_EMOJIS.map(em => (
                            <button
                              key={em}
                              type="button"
                              onClick={() => {
                                onToggleReaction(reply.id, em);
                                setShowEmojiPickerFor(null);
                              }}
                              style={{
                                background: 'transparent',
                                border: 'none',
                                borderRadius: '6px',
                                padding: '3px 5px',
                                fontSize: '0.95rem',
                                cursor: 'pointer'
                              }}
                            >
                              {em}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* INLINE REPLY INPUT (High density single row composer with didaktische Schnell-Chips) */}
      {canReply ? (
        <div style={{ marginTop: '8px' }}>
          {/* Focused / Active Didaktische Schnell-Chips */}
          {isReplyInputFocused && (
            <div style={{
              display: 'flex',
              gap: '6px',
              overflowX: 'auto',
              scrollbarWidth: 'none',
              msOverflowStyle: 'none',
              paddingBottom: '6px',
              marginBottom: '4px'
            }}>
              {quickChips.map(chip => (
                <button
                  key={chip}
                  type="button"
                  onClick={() => handleQuickChip(chip)}
                  style={{
                    background: '#f0fdf4',
                    border: '1px solid #bbf7d0',
                    color: '#166534',
                    borderRadius: '100px',
                    padding: '3px 10px',
                    fontSize: '0.72rem',
                    fontWeight: 800,
                    whiteSpace: 'nowrap',
                    cursor: 'pointer',
                    flexShrink: 0
                  }}
                  className="hover-scale-mini"
                >
                  {chip}
                </button>
              ))}
            </div>
          )}

          {/* Input Row */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: '#f8fafc',
            borderRadius: '12px',
            border: isReplyInputFocused ? '1.5px solid #16a34a' : '1px solid #e2e8f0',
            padding: '4px 6px 4px 12px',
            transition: 'border 0.15s ease'
          }}>
            <CornerDownRight size={14} style={{ color: '#94a3b8', flexShrink: 0 }} />
            <input
              ref={inputRef}
              type="text"
              placeholder="Auf dieses Thema antworten..."
              value={replyText}
              onChange={e => setReplyText(e.target.value)}
              onFocus={() => setIsReplyInputFocused(true)}
              onBlur={() => {
                // Short timeout to allow click on chips
                setTimeout(() => setIsReplyInputFocused(false), 200);
              }}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              disabled={isSubmitting}
              style={{
                flex: 1,
                border: 'none',
                background: 'transparent',
                outline: 'none',
                fontSize: '0.84rem',
                color: '#0f172a',
                fontWeight: 600,
                minWidth: 0
              }}
            />

            <button
              type="button"
              onClick={handleSend}
              disabled={isSubmitting || !replyText.trim()}
              aria-label="Antwort senden"
              style={{
                width: '30px',
                height: '30px',
                borderRadius: '8px',
                border: 'none',
                background: replyText.trim() ? '#16a34a' : '#cbd5e1',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: replyText.trim() ? 'pointer' : 'default',
                flexShrink: 0,
                transition: 'background 0.15s ease'
              }}
            >
              <Send size={13} style={{ transform: 'translateX(1px)' }} />
            </button>
          </div>
        </div>
      ) : (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          color: '#94a3b8',
          fontSize: '0.74rem',
          fontWeight: 700,
          marginTop: '6px'
        }}>
          <Lock size={13} />
          <span>Antworten in diesem Ankündigungskanal sind deaktiviert.</span>
        </div>
      )}
    </article>
  );
};
