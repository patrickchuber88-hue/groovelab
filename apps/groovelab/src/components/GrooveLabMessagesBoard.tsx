import React, { useState, useEffect, useMemo } from 'react';
import { 
  Megaphone, 
  School, 
  Users, 
  Search, 
  Plus, 
  ArrowLeft, 
  Trash2, 
  Check, 
  CheckCircle, 
  Inbox, 
  Mail, 
  Send,
  X,
  ShieldCheck
} from 'lucide-react';
import { StudioAvatar } from './StudioAvatar';

interface GrooveLabMessagesBoardProps {
  user: any;
  schoolUsers: any[];
  announcements: any[];
  studentMessages?: any[];
  onPostAnnouncement: (title: string, message: string, targetType: string, targetUserIds: string[]) => Promise<void>;
  onDeleteAnnouncement?: (id: string) => Promise<void>;
  onAcknowledgeMessage?: (messageId: string) => Promise<void>;
}

export default function GrooveLabMessagesBoard({
  user,
  schoolUsers = [],
  announcements = [],
  studentMessages = [],
  onPostAnnouncement,
  onDeleteAnnouncement,
  onAcknowledgeMessage
}: GrooveLabMessagesBoardProps) {
  const [isMobile, setIsMobile] = useState<boolean>(
    typeof window !== 'undefined' ? window.innerWidth <= 768 : false
  );
  
  const [filterType, setFilterType] = useState<'all' | 'school' | 'band'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedMessage, setSelectedMessage] = useState<any | null>(null);
  const [isComposing, setIsComposing] = useState<boolean>(false);
  const [deletedIds, setDeletedIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(`groovelab_deleted_messages_${user?.id}`);
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  // Composer State (for Teachers & Admins)
  const [composerTitle, setComposerTitle] = useState<string>('');
  const [composerMessage, setComposerMessage] = useState<string>('');
  const [composerTarget, setComposerTarget] = useState<'all' | 'students' | 'teachers' | 'specific'>('all');
  const [selectedTargetIds, setSelectedTargetIds] = useState<string[]>([]);
  const [recipientSearchText, setRecipientSearchText] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  useEffect(() => {
    const handleResize = () => {
      const mobileViewport = window.innerWidth <= 768 || document.querySelector('.sim-viewport-mobile, .sim-viewport-portrait') !== null;
      setIsMobile(mobileViewport);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isTeacherOrAdmin = useMemo(() => {
    const role = (user?.role || '').toLowerCase();
    const roles = Array.isArray(user?.roles) ? user.roles.map((r: any) => String(r).toLowerCase()) : [];
    return role === 'admin' || role === 'teacher' || roles.includes('admin') || roles.includes('teacher');
  }, [user]);

  // Combine and format messages list
  const allFormattedMessages = useMemo(() => {
    const combined: any[] = [];

    // 1. Process announcements (school/global announcements)
    announcements.forEach((ann: any) => {
      if (deletedIds.includes(ann.id)) return;
      
      let parsedTitle = 'Mitteilung';
      let parsedBody = ann.content;
      let targetType = 'all';
      let targetUserIds: string[] = [];

      try {
        const parsed = JSON.parse(ann.content);
        if (parsed.title) parsedTitle = parsed.title;
        if (parsed.message) parsedBody = parsed.message;
        if (parsed.target_type) targetType = parsed.target_type;
        if (parsed.target_user_ids) targetUserIds = parsed.target_user_ids;
      } catch (e) {
        // Raw text content fallback
      }

      // Check if user is recipient
      let isForUser = true;
      if (targetType === 'students' && !isTeacherOrAdmin) isForUser = user?.role === 'student';
      if (targetType === 'teachers' && user?.role === 'student') isForUser = false;
      if (targetType === 'specific') isForUser = targetUserIds.includes(user?.id) || isTeacherOrAdmin;

      if (isForUser) {
        combined.push({
          id: ann.id,
          rawObject: ann,
          type: ann.type || (targetType === 'band' ? 'band' : 'school'),
          title: parsedTitle,
          content: parsedBody,
          senderName: ann.sender_name || (ann.sender ? `${ann.sender.first_name} ${ann.sender.last_name || ''}`.trim() : 'Musikschule'),
          senderAvatar: ann.sender?.photo_url || '/avatar_ghost.jpg',
          createdAt: ann.created_at || new Date().toISOString(),
          readBy: ann.read_by || [],
          targetType,
          targetUserIds,
          isAnnouncement: true
        });
      }
    });

    // 2. Process studentMessages (if passed separately)
    studentMessages.forEach((msg: any) => {
      if (deletedIds.includes(msg.id)) return;
      if (combined.some(c => c.id === msg.id)) return;

      combined.push({
        id: msg.id,
        rawObject: msg,
        type: msg.type || 'school',
        title: msg.title || 'Nachricht',
        content: msg.content || '',
        senderName: msg.sender_name || (msg.sender ? `${msg.sender.first_name} ${msg.sender.last_name || ''}`.trim() : 'Coach'),
        senderAvatar: msg.sender?.photo_url || '/avatar_ghost.jpg',
        createdAt: msg.created_at || new Date().toISOString(),
        readBy: msg.read_by || [],
        isAnnouncement: false
      });
    });

    // Sort descending by creation date
    return combined.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [announcements, studentMessages, deletedIds, user, isTeacherOrAdmin]);

  // Filter messages by tab & search query
  const filteredMessages = useMemo(() => {
    return allFormattedMessages.filter(msg => {
      if (filterType === 'school' && msg.type !== 'school') return false;
      if (filterType === 'band' && msg.type !== 'band') return false;
      if (searchQuery.trim() !== '') {
        const q = searchQuery.toLowerCase();
        const matchesTitle = msg.title.toLowerCase().includes(q);
        const matchesContent = msg.content.toLowerCase().includes(q);
        const matchesSender = msg.senderName.toLowerCase().includes(q);
        return matchesTitle || matchesContent || matchesSender;
      }
      return true;
    });
  }, [allFormattedMessages, filterType, searchQuery]);

  // Auto-mark message as read when opened
  const handleSelectMessage = (msg: any) => {
    setSelectedMessage(msg);
    setIsComposing(false);
    
    // Mark as read if unread
    if (msg && !msg.readBy.includes(user?.id)) {
      if (onAcknowledgeMessage) {
        onAcknowledgeMessage(msg.id);
      }
      msg.readBy = [...msg.readBy, user?.id];
    }
  };

  const handleHideMessageForSelf = (id: string) => {
    const updated = [...deletedIds, id];
    setDeletedIds(updated);
    try {
      localStorage.setItem(`groovelab_deleted_messages_${user?.id}`, JSON.stringify(updated));
    } catch (e) {
      console.error('Error saving deleted messages', e);
    }
    if (selectedMessage?.id === id) {
      setSelectedMessage(null);
    }
  };

  const handlePostSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!composerTitle.trim() || !composerMessage.trim()) return;

    setIsSubmitting(true);
    try {
      await onPostAnnouncement(
        composerTitle.trim(),
        composerMessage.trim(),
        composerTarget,
        selectedTargetIds
      );
      setComposerTitle('');
      setComposerMessage('');
      setComposerTarget('all');
      setSelectedTargetIds([]);
      setIsComposing(false);
    } catch (err) {
      console.error('[GrooveLabMessagesBoard] Post error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="animation-slide-up" style={{
      padding: isMobile ? '0 16px' : '0 32px 32px 32px',
      display: 'flex',
      gap: isMobile ? '0' : '24px',
      height: isMobile ? 'calc(100vh - 120px)' : 'calc(100vh - 140px)',
      minHeight: isMobile ? 'auto' : '700px',
      marginTop: isMobile ? '8px' : '14px',
      fontFamily: '"Outfit", "Inter", sans-serif',
      boxSizing: 'border-box',
      width: '100%'
    }}>
      {/* LEFT PANE: Posteingangs-Liste */}
      <div className="glass-panel" style={{
        background: 'white',
        borderRadius: isMobile ? '20px' : '24px',
        width: isMobile && (selectedMessage || isComposing) ? '0px' : isMobile ? '100%' : '380px',
        display: isMobile && (selectedMessage || isComposing) ? 'none' : 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        border: '1px solid #f1f5f9',
        boxShadow: '0 10px 30px rgba(0,0,0,0.02)',
        flexShrink: 0,
        transition: 'all 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)'
      }}>
        {/* Header of Mailbox */}
        <div style={{ 
          padding: isMobile ? '20px 20px 14px 20px' : '24px', 
          borderBottom: '1px solid #f1f5f9', 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '14px', 
          background: '#fefce8' // Soft GrooveLab yellow tint header
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ fontSize: isMobile ? '1.5rem' : '1.75rem', fontWeight: 900, color: '#1e293b', margin: '0' }}>
                Nachrichten
              </h3>
              <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#ca8a04', marginTop: '2px' }}>
                {filteredMessages.length} Mitteilungen • GrooveLab
              </div>
            </div>

            {isTeacherOrAdmin && (
              <button
                onClick={() => {
                  setIsComposing(true);
                  setSelectedMessage(null);
                }}
                style={{
                  background: '#eab308',
                  color: '#1e293b',
                  border: 'none',
                  width: '42px',
                  height: '42px',
                  borderRadius: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(234, 179, 8, 0.3)'
                }}
                className="hover-scale"
                title="Neue Mitteilung verfassen"
              >
                <Plus size={22} strokeWidth={2.5} />
              </button>
            )}
          </div>

          {/* Search Field */}
          <div style={{ position: 'relative', width: '100%' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#a1a1aa' }} />
            <input
              type="text"
              placeholder="Nachrichten durchsuchen..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px 10px 38px',
                borderRadius: '12px',
                border: '1px solid #fef08a',
                background: 'white',
                fontSize: '0.85rem',
                fontWeight: 600,
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
          </div>

          {/* Filter Pills (GrooveLab Yellow Identity) */}
          <div style={{ display: 'flex', background: 'white', borderRadius: '12px', padding: '3px', gap: '2px', border: '1px solid #fef08a' }}>
            <button
              onClick={() => setFilterType('all')}
              style={{
                flex: 1,
                padding: '8px',
                border: 'none',
                background: filterType === 'all' ? '#eab308' : 'transparent',
                color: filterType === 'all' ? '#1e293b' : '#64748b',
                borderRadius: '9px',
                fontSize: '0.8rem',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                transition: 'all 0.2s'
              }}
            >
              <Megaphone size={14} /> Alle
            </button>
            <button
              onClick={() => setFilterType('school')}
              style={{
                flex: 1,
                padding: '8px',
                border: 'none',
                background: filterType === 'school' ? '#eab308' : 'transparent',
                color: filterType === 'school' ? '#1e293b' : '#64748b',
                borderRadius: '9px',
                fontSize: '0.8rem',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                transition: 'all 0.2s'
              }}
            >
              <School size={14} /> Schule
            </button>
            <button
              onClick={() => setFilterType('band')}
              style={{
                flex: 1,
                padding: '8px',
                border: 'none',
                background: filterType === 'band' ? '#eab308' : 'transparent',
                color: filterType === 'band' ? '#1e293b' : '#64748b',
                borderRadius: '9px',
                fontSize: '0.8rem',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                transition: 'all 0.2s'
              }}
            >
              <Users size={14} /> Bands
            </button>
          </div>
        </div>

        {/* Scrollable List of Messages (with 120px Mobile Safety Clearance) */}
        <div style={{ 
          flex: 1, 
          overflowY: 'auto', 
          padding: isMobile ? '16px 16px 120px 16px' : '16px', 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '10px' 
        }} className="custom-scrollbar">
          {filteredMessages.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, padding: '40px 20px', color: '#94a3b8', textAlign: 'center' }}>
              <Inbox size={44} style={{ strokeWidth: 1.5, color: '#fde047', marginBottom: '12px' }} />
              <div style={{ fontSize: '0.95rem', fontWeight: 900, color: '#475569' }}>Posteingang leer</div>
              <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: '4px' }}>
                {filterType === 'school' ? 'Keine Ankündigungen der Musikschule.' : filterType === 'band' ? 'Keine Nachrichten aus deinen Bands.' : 'Du bist auf dem neuesten Stand!'}
              </div>
            </div>
          ) : (
            filteredMessages.map((msg) => {
              const isRead = msg.readBy.includes(user?.id);
              const isSelected = selectedMessage?.id === msg.id;

              return (
                <div
                  key={msg.id}
                  onClick={() => handleSelectMessage(msg)}
                  style={{
                    padding: '16px',
                    borderRadius: '16px',
                    background: isSelected ? '#fefce8' : isRead ? '#ffffff' : '#fefce8',
                    border: isSelected ? '2px solid #eab308' : '1px solid #fef08a',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                    transition: 'all 0.2s',
                    position: 'relative',
                    boxShadow: isSelected ? '0 4px 15px rgba(234, 179, 8, 0.15)' : '0 2px 6px rgba(0,0,0,0.02)'
                  }}
                  className="hover-scale-mini"
                >
                  {/* Unread Glow Dot */}
                  {!isRead && (
                    <div style={{
                      position: 'absolute',
                      top: '16px',
                      right: '16px',
                      width: '10px',
                      height: '10px',
                      borderRadius: '50%',
                      background: '#eab308',
                      boxShadow: '0 0 10px #eab308'
                    }} />
                  )}

                  {/* Type Badge & Date */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingRight: '16px' }}>
                    <span style={{
                      fontSize: '0.68rem',
                      fontWeight: 900,
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                      background: msg.type === 'school' ? '#fee2e2' : '#fefce8',
                      color: msg.type === 'school' ? '#dc2626' : '#ca8a04',
                      padding: '3px 8px',
                      borderRadius: '6px',
                      border: msg.type === 'school' ? '1px solid #fecaca' : '1px solid #fef08a'
                    }}>
                      {msg.type === 'school' ? '📢 Schule' : '🎵 Band'}
                    </span>
                    <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#94a3b8', marginLeft: 'auto' }}>
                      {new Date(msg.createdAt).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })}
                    </span>
                  </div>

                  {/* Title */}
                  <h4 style={{
                    fontSize: '0.92rem',
                    fontWeight: isRead ? 700 : 900,
                    color: isSelected ? '#a16207' : '#1e293b',
                    margin: '0',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    paddingRight: '16px'
                  }}>
                    {msg.title}
                  </h4>

                  {/* Preview */}
                  <p style={{
                    fontSize: '0.78rem',
                    color: isSelected ? '#854d0e' : '#64748b',
                    margin: '0',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                    lineHeight: '1.4',
                    fontWeight: isRead ? 500 : 700
                  }}>
                    {msg.content}
                  </p>

                  {/* Sender Avatar & Name */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                    <div style={{ width: '20px', height: '20px', borderRadius: '50%', overflow: 'hidden', background: '#fef08a', flexShrink: 0 }}>
                      <StudioAvatar src={msg.senderAvatar} />
                    </div>
                    <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#475569' }}>
                      {msg.senderName}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* RIGHT PANE: Message Details or Mobile Fullscreen Composer */}
      <div className="glass-panel" style={{
        background: 'white',
        borderRadius: isMobile ? '20px' : '24px',
        flex: 1,
        width: isMobile && (selectedMessage || isComposing) ? '100%' : 'auto',
        display: isMobile && (!selectedMessage && !isComposing) ? 'none' : 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        border: '1px solid #f1f5f9',
        boxShadow: '0 10px 30px rgba(0,0,0,0.02)'
      }}>
        {isComposing ? (
          /* MOBILE FULLSCREEN COMPOSER MODE (Teachers & Admins) */
          <form onSubmit={handlePostSubmit} style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            {/* Header */}
            <div style={{ padding: isMobile ? '16px 20px' : '24px 32px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fefce8' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                {isMobile && (
                  <button
                    type="button"
                    onClick={() => setIsComposing(false)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '6px', color: '#1e293b' }}
                  >
                    <ArrowLeft size={22} />
                  </button>
                )}
                <div>
                  <h3 style={{ fontSize: isMobile ? '1.15rem' : '1.3rem', fontWeight: 900, color: '#1e293b', margin: '0' }}>
                    Neue Mitteilung verfassen
                  </h3>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#ca8a04', marginTop: '2px' }}>
                    GrooveLab Community Benachrichtigung
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setIsComposing(false)}
                  style={{
                    background: 'transparent',
                    color: '#64748b',
                    border: 'none',
                    padding: '8px 14px',
                    borderRadius: '12px',
                    fontWeight: 700,
                    fontSize: '0.85rem',
                    cursor: 'pointer'
                  }}
                >
                  Verwerfen
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !composerTitle.trim() || !composerMessage.trim()}
                  style={{
                    background: isSubmitting || !composerTitle.trim() || !composerMessage.trim() ? '#e2e8f0' : '#eab308',
                    color: isSubmitting || !composerTitle.trim() || !composerMessage.trim() ? '#94a3b8' : '#1e293b',
                    border: 'none',
                    padding: '8px 20px',
                    borderRadius: '12px',
                    fontWeight: 900,
                    fontSize: '0.88rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    boxShadow: '0 4px 12px rgba(234, 179, 8, 0.3)'
                  }}
                  className="hover-scale"
                >
                  <Send size={16} /> Senden
                </button>
              </div>
            </div>

            {/* Compose Fields with 120px Mobile Bottom Safety Clearance */}
            <div style={{ flex: 1, overflowY: 'auto', padding: isMobile ? '20px 20px 120px 20px' : '32px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Target Pills */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#ca8a04', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Empfängerkreis</label>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={() => { setComposerTarget('all'); setSelectedTargetIds([]); }}
                    style={{
                      padding: '8px 16px',
                      borderRadius: '10px',
                      border: 'none',
                      background: composerTarget === 'all' ? '#eab308' : '#fefce8',
                      color: composerTarget === 'all' ? '#1e293b' : '#64748b',
                      fontSize: '0.85rem',
                      fontWeight: 800,
                      cursor: 'pointer'
                    }}
                  >
                    Alle Nutzer
                  </button>
                  <button
                    type="button"
                    onClick={() => { setComposerTarget('students'); setSelectedTargetIds([]); }}
                    style={{
                      padding: '8px 16px',
                      borderRadius: '10px',
                      border: 'none',
                      background: composerTarget === 'students' ? '#eab308' : '#fefce8',
                      color: composerTarget === 'students' ? '#1e293b' : '#64748b',
                      fontSize: '0.85rem',
                      fontWeight: 800,
                      cursor: 'pointer'
                    }}
                  >
                    Nur Schüler
                  </button>
                  <button
                    type="button"
                    onClick={() => { setComposerTarget('teachers'); setSelectedTargetIds([]); }}
                    style={{
                      padding: '8px 16px',
                      borderRadius: '10px',
                      border: 'none',
                      background: composerTarget === 'teachers' ? '#eab308' : '#fefce8',
                      color: composerTarget === 'teachers' ? '#1e293b' : '#64748b',
                      fontSize: '0.85rem',
                      fontWeight: 800,
                      cursor: 'pointer'
                    }}
                  >
                    Nur Lehrer
                  </button>
                  <button
                    type="button"
                    onClick={() => { setComposerTarget('specific'); setSelectedTargetIds([]); }}
                    style={{
                      padding: '8px 16px',
                      borderRadius: '10px',
                      border: 'none',
                      background: composerTarget === 'specific' ? '#eab308' : '#fefce8',
                      color: composerTarget === 'specific' ? '#1e293b' : '#64748b',
                      fontSize: '0.85rem',
                      fontWeight: 800,
                      cursor: 'pointer'
                    }}
                  >
                    Einzelauswahl ({selectedTargetIds.length})
                  </button>
                </div>
              </div>

              {/* Specific user selection */}
              {composerTarget === 'specific' && (
                <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '16px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <input
                    placeholder="Empfänger suchen..."
                    value={recipientSearchText}
                    onChange={e => setRecipientSearchText(e.target.value)}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.85rem', fontWeight: 600 }}
                  />
                  <div style={{ maxHeight: '160px', overflowY: 'auto', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {(() => {
                      const activeGrooveLabStudents = schoolUsers.filter(u => {
                        const isStudent = (u.role || '').toLowerCase() === 'student';
                        const isGrooveActive = Boolean(u.is_groovelab_active || u.isGroovelabActive);
                        const isActive = u.is_active !== false;
                        const matchesSearch = `${u.first_name || ''} ${u.last_name || ''}`.toLowerCase().includes(recipientSearchText.toLowerCase());
                        return isStudent && isGrooveActive && isActive && matchesSearch && u.id !== user?.id;
                      });

                      if (activeGrooveLabStudents.length === 0) {
                        return (
                          <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#94a3b8', padding: '8px 4px' }}>
                            Keine aktiven GrooveLab-Schüler gefunden.
                          </div>
                        );
                      }

                      return activeGrooveLabStudents.map(u => {
                        const isSel = selectedTargetIds.includes(u.id);
                        return (
                          <button
                            key={u.id}
                            type="button"
                            onClick={() => {
                              if (isSel) setSelectedTargetIds(selectedTargetIds.filter(id => id !== u.id));
                              else setSelectedTargetIds([...selectedTargetIds, u.id]);
                            }}
                            style={{
                              padding: '6px 14px',
                              borderRadius: '20px',
                              border: 'none',
                              background: isSel ? '#eab308' : 'white',
                              color: isSel ? '#1e293b' : '#64748b',
                              fontSize: '0.8rem',
                              fontWeight: 800,
                              cursor: 'pointer',
                              boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                            }}
                          >
                            {u.first_name} {u.last_name || ''} {isSel ? '✓' : '+'}
                          </button>
                        );
                      });
                    })()}
                  </div>
                </div>
              )}

              {/* Subject Title Input */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#ca8a04', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Betreff / Titel</label>
                <input
                  type="text"
                  required
                  placeholder="z.B. GrooveLab Probenänderung für Samstag"
                  value={composerTitle}
                  onChange={e => setComposerTitle(e.target.value)}
                  style={{
                    padding: '14px 16px',
                    borderRadius: '12px',
                    border: '1px solid #fef08a',
                    background: '#fefce8',
                    fontWeight: 700,
                    fontSize: '0.95rem',
                    outline: 'none',
                    color: '#1e293b'
                  }}
                />
              </div>

              {/* Message Content Textarea */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#ca8a04', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Inhalt</label>
                <textarea
                  required
                  placeholder="Schreibe deine GrooveLab Nachricht hier..."
                  value={composerMessage}
                  onChange={e => setComposerMessage(e.target.value)}
                  style={{
                    padding: '16px',
                    borderRadius: '12px',
                    border: '1px solid #fef08a',
                    background: '#fefce8',
                    fontWeight: 500,
                    fontSize: '0.95rem',
                    resize: 'none',
                    flex: 1,
                    minHeight: '160px',
                    outline: 'none',
                    lineHeight: 1.6,
                    color: '#1e293b'
                  }}
                />
              </div>
            </div>
          </form>
        ) : selectedMessage ? (
          /* MESSAGE DETAIL VIEW MODE */
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            {/* Header (with Mobile Back Button) */}
            <div style={{ padding: isMobile ? '16px 20px' : '24px 32px', borderBottom: '1px solid #f1f5f9', background: '#fefce8', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <button
                  onClick={() => setSelectedMessage(null)}
                  style={{
                    background: 'white',
                    border: '1px solid #fef08a',
                    padding: '8px 14px',
                    borderRadius: '12px',
                    color: '#1e293b',
                    fontSize: '0.85rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                  className="hover-scale-mini"
                >
                  <ArrowLeft size={18} /> Zurück
                </button>

                <span style={{
                  fontSize: '0.72rem',
                  fontWeight: 900,
                  padding: '4px 10px',
                  borderRadius: '100px',
                  background: selectedMessage.type === 'school' ? '#fee2e2' : '#fefce8',
                  color: selectedMessage.type === 'school' ? '#dc2626' : '#ca8a04',
                  border: selectedMessage.type === 'school' ? '1px solid #fecaca' : '1px solid #fef08a'
                }}>
                  {selectedMessage.type === 'school' ? '📢 Schule' : '🎵 Band'}
                </span>
              </div>

              <button
                onClick={() => handleHideMessageForSelf(selectedMessage.id)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#ef4444',
                  cursor: 'pointer',
                  padding: '8px',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontWeight: 800,
                  fontSize: '0.82rem'
                }}
                className="hover-scale"
              >
                <Trash2 size={16} /> Für mich ausblenden
              </button>
            </div>

            {/* Message Body Content (with 120px Mobile Bottom Clearance) */}
            <div style={{ flex: 1, overflowY: 'auto', padding: isMobile ? '24px 20px 120px 20px' : '40px' }} className="custom-scrollbar">
              <h2 style={{ fontSize: isMobile ? '1.35rem' : '1.65rem', fontWeight: 900, color: '#1e293b', margin: '0 0 20px 0', lineHeight: 1.3 }}>
                {selectedMessage.title}
              </h2>

              {/* Sender Details */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', borderBottom: '1px solid #f1f5f9', paddingBottom: '20px', marginBottom: '28px' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '50%', overflow: 'hidden', background: '#fef08a', flexShrink: 0 }}>
                  <StudioAvatar src={selectedMessage.senderAvatar} />
                </div>
                <div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 900, color: '#1e293b' }}>
                    {selectedMessage.senderName}
                  </div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#ca8a04', marginTop: '2px' }}>
                    {new Date(selectedMessage.createdAt).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })} Uhr
                  </div>
                </div>
              </div>

              {/* Main Content Text Card */}
              <div style={{
                fontSize: '1rem',
                color: '#334155',
                lineHeight: 1.7,
                fontWeight: 500,
                whiteSpace: 'pre-wrap',
                background: '#f8fafc',
                padding: '24px',
                borderRadius: '16px',
                border: '1px solid #f1f5f9'
              }}>
                {selectedMessage.content}
              </div>

              {/* Auto-Read Feedback Badge */}
              <div style={{ marginTop: '32px', display: 'flex', alignItems: 'center', gap: '8px', color: '#16a34a', fontSize: '0.85rem', fontWeight: 800, padding: '12px 18px', background: '#f0fdf4', borderRadius: '12px', border: '1px solid #bbf7d0', width: 'fit-content' }}>
                <CheckCircle size={18} strokeWidth={2.5} /> Nachricht gelesen & verstanden
              </div>
            </div>
          </div>
        ) : (
          /* EMPTY DESKTOP PLACEHOLDER STATE */
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', padding: '40px', textAlign: 'center', background: '#fafafa' }}>
            <div style={{
              width: '80px',
              height: '80px',
              borderRadius: '24px',
              background: '#fefce8',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 10px 25px rgba(0,0,0,0.03)',
              marginBottom: '20px'
            }}>
              <Mail size={38} style={{ strokeWidth: 1.5, color: '#eab308' }} />
            </div>
            <h3 style={{ fontSize: '1.3rem', fontWeight: 900, color: '#1e293b', marginBottom: '8px' }}>Willkommen im GrooveLab Postfach</h3>
            <p style={{ fontSize: '0.95rem', color: '#64748b', maxWidth: '340px', lineHeight: 1.6, margin: '0 0 24px 0' }}>
              Wähle eine Mitteilung aus der Liste aus, um ihren Inhalt anzuzeigen, oder verfasse eine neue Nachricht.
            </p>
            {isTeacherOrAdmin && (
              <button
                onClick={() => setIsComposing(true)}
                style={{
                  background: '#eab308',
                  color: '#1e293b',
                  border: 'none',
                  padding: '12px 24px',
                  borderRadius: '14px',
                  fontWeight: 900,
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 15px rgba(234, 179, 8, 0.3)'
                }}
                className="hover-scale"
              >
                <Plus size={18} strokeWidth={2.5} /> Neue Mitteilung verfassen
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
