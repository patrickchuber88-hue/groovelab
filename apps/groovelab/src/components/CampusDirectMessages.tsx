import React, { useState, useEffect, useRef } from 'react';
import { 
  Send, 
  Search, 
  MessageSquare, 
  User, 
  ArrowLeft, 
  Check, 
  Clock, 
  Inbox,
  Plus,
  X
} from 'lucide-react';
import { supabase } from '../lib/supabase';

const getInstrumentAvatarUrl = (instrument: string | null | undefined): string => {
  if (!instrument) return '/avatars/gitarre_avatar_new.png';
  const inst = instrument.toLowerCase();
  if (inst.includes('e-gitarre')) return '/avatars/egitarre_avatar.png';
  if (inst.includes('guitar') || inst.includes('gitarre')) return '/avatars/gitarre_avatar_new.png';
  if (inst.includes('e-bass')) return '/avatars/ebass_avatar.png';
  if (inst.includes('kontrabass') || inst.includes('double bass')) return '/avatars/kontrabass_avatar.png';
  if (inst.includes('bass')) return '/avatars/bass_avatar.png';
  if (inst.includes('drum') || inst.includes('schlagzeug')) return '/avatars/schlagzeug_avatar.png';
  if (inst.includes('piano') || inst.includes('keys') || inst.includes('klavier') || inst.includes('keyboard')) return '/avatars/klavier_avatar_new.png';
  if (inst.includes('vocal') || inst.includes('gesang') || inst.includes('stimme') || inst.includes('singer')) return '/avatars/gesang_avatar.png';
  if (inst.includes('trompete') || inst.includes('trumpet')) return '/avatars/trompete_avatar_new.png';
  if (inst.includes('posaune') || inst.includes('trombone')) return '/avatars/posaune_avatar.png';
  if (inst.includes('horn')) return '/avatars/horn_avatar_new.png';
  if (inst.includes('cello')) return '/avatars/cello_avatar_new.png';
  if (inst.includes('geige') || inst.includes('violin') || inst.includes('violine')) return '/avatars/violine_avatar_new.png';
  if (inst.includes('klarinette') || inst.includes('clarinet')) return '/avatars/klarinette_avatar_new.png';
  if (inst.includes('querflöte') || inst.includes('flute')) return '/avatars/querfloete_avatar.png';
  if (inst.includes('saxofon') || inst.includes('saxophone') || inst.includes('sax')) return '/avatars/saxophon_avatar_new.png';
  if (inst.includes('blockflöte') || inst.includes('recorder') || inst.includes('blockfloete')) return '/avatars/blockfloete_avatar.png';
  if (inst.includes('bariton') || inst.includes('baritone')) return '/avatars/bariton_avatar.png';
  if (inst.includes('oboe')) return '/avatars/oboe_avatar.png';
  return '/avatars/gitarre_avatar_new.png';
};

const resolveCampusAvatar = (u: any): string => {
  if (!u) return '/avatar_ghost.jpg';
  const role = (u.role || '').toLowerCase();
  const roles = Array.isArray(u.roles) ? u.roles.map((r: any) => String(r).toLowerCase()) : [];
  
  if (role === 'admin' || role === 'secretary' || roles.includes('admin') || roles.includes('secretary')) {
    return '/campus_login_hero.png';
  }
  
  if (role === 'student') {
    const studentInstrument = u.instrument || 'Nicht festgelegt';
    const inst = studentInstrument.toLowerCase().trim();
    if (inst.includes('guitar') || inst.includes('gitarre')) {
      if (u.photo_url && (u.photo_url.includes('egitarre_avatar') || u.photo_url.includes('gitarre_avatar_new'))) {
        return u.photo_url;
      }
      return '/avatars/gitarre_avatar_new.png';
    }
    return getInstrumentAvatarUrl(studentInstrument);
  } else {
    // Teachers
    return getInstrumentAvatarUrl(u.instrument);
  }
};

interface CampusDirectMessagesProps {
  user: any;
  schoolUsers: any[];
  campusMessages: any[];
  onSendMessage: (recipientId: string, content: string) => Promise<void>;
  onMarkAsRead: (senderId: string) => Promise<void>;
  selectedRecipient: any;
  setSelectedRecipient: (recipient: any) => void;
  studentToTeacherChat?: boolean;
}

export default function CampusDirectMessages({
  user,
  schoolUsers,
  campusMessages,
  onSendMessage,
  onMarkAsRead,
  selectedRecipient,
  setSelectedRecipient,
  studentToTeacherChat = true
}: CampusDirectMessagesProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [typedMessage, setTypedMessage] = useState('');
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [newChatSearch, setNewChatSearch] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [chatChannel, setChatChannel] = useState<'personal' | 'system'>('personal');

  useEffect(() => {
    setChatChannel('personal');
  }, [selectedRecipient]);

  const isSystemMessage = (msg: any) => {
    if (msg.occurrence_id) return true;
    const content = msg.content || '';
    if (content.includes('Unterrichtstermin') || 
        content.includes('Termin wurde') || 
        content.includes('Termin storniert') || 
        content.includes('Termin bestätigt') ||
        content.includes('regulären Termin') ||
        content.includes('verschoben von:') ||
        content.includes('wieder auf deinen ursprünglichen') ||
        content.includes('abgesagt.')) {
      return true;
    }
    return false;
  };
  
  const isStudent = user?.role?.toLowerCase() === 'student';

  // Get potential chat partners
  // Students chat ONLY with their assigned teacher, or anyone they have a message history with.
  // Teachers/admins chat with students in their school.
  const chatPartners = schoolUsers.filter(u => {
    if (u.id === user.id) return false;
    if (selectedRecipient && u.id === selectedRecipient.id) return true;
    if (isStudent) {
      const isAssignedTeacher = u.id === user.teacher_id;
      const hasHistory = campusMessages.some(m => 
        (m.sender_id === user.id && m.recipient_id === u.id) ||
        (m.sender_id === u.id && m.recipient_id === user.id)
      );
      return (u.role === 'teacher' || u.role === 'admin') && (isAssignedTeacher || hasHistory);
    } else {
      if (user.role?.toLowerCase() === 'teacher') {
        const isAssignedStudent = u.teacher_id === user.id;
        const hasHistory = campusMessages.some(m => 
          (m.sender_id === user.id && m.recipient_id === u.id) ||
          (m.sender_id === u.id && m.recipient_id === user.id)
        );
        return u.role === 'student' && (isAssignedStudent || hasHistory);
      }
      return u.role === 'student';
    }
  });

  // Filter partners based on search
  const filteredPartners = chatPartners.filter(p => 
    `${p.first_name} ${p.last_name || ''}`.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Group messages for each partner to find the last message and unread count
  const partnersWithMetadata = filteredPartners.map(partner => {
    const threadMessages = campusMessages.filter(m => 
      (m.sender_id === user.id && m.recipient_id === partner.id) ||
      (m.sender_id === partner.id && m.recipient_id === user.id)
    );

    const lastMessage = threadMessages[threadMessages.length - 1];
    const unreadCount = threadMessages.filter(m => 
      m.sender_id === partner.id && m.recipient_id === user.id && !m.is_read
    ).length;

    return {
      ...partner,
      lastMessage,
      unreadCount,
      lastMessageTime: lastMessage ? new Date(lastMessage.created_at) : null
    };
  }).sort((a, b) => {
    // Sort by unread messages first, then by last message time
    if (a.unreadCount !== b.unreadCount) return b.unreadCount - a.unreadCount;
    if (!a.lastMessageTime) return 1;
    if (!b.lastMessageTime) return -1;
    return b.lastMessageTime.getTime() - a.lastMessageTime.getTime();
  });

  // Auto-scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (selectedRecipient) {
      scrollToBottom();
      // Mark messages as read when opening chat
      const unreadFromRecipient = campusMessages.some(m => 
        m.sender_id === selectedRecipient.id && m.recipient_id === user.id && !m.is_read
      );
      if (unreadFromRecipient) {
        onMarkAsRead(selectedRecipient.id);
      }
    }
  }, [selectedRecipient, campusMessages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!typedMessage.trim() || !selectedRecipient) return;
    
    const messageText = typedMessage.trim();
    setTypedMessage('');
    await onSendMessage(selectedRecipient.id, messageText);
    setTimeout(scrollToBottom, 50);
  };

  // Get active messages in the current thread
  const activeThreadMessages = selectedRecipient
    ? campusMessages.filter(m => 
        (m.sender_id === user.id && m.recipient_id === selectedRecipient.id) ||
        (m.sender_id === selectedRecipient.id && m.recipient_id === user.id)
      )
    : [];

  const filteredThreadMessages = activeThreadMessages.filter(msg => {
    const isSys = isSystemMessage(msg);
    return chatChannel === 'system' ? isSys : !isSys;
  });

  return (
    <div className="animation-slide-up" style={{ 
      padding: '24px 10px 10px 10px', 
      display: 'flex', 
      gap: '24px', 
      height: 'calc(100vh - 140px)', 
      minHeight: '700px',
      fontFamily: '"Outfit", "Inter", sans-serif'
    }}>
      {/* Left Pane: Partners / Chats List */}
      <div className="glass-panel" style={{ 
        background: 'white', 
        borderRadius: '24px', 
        width: '380px', 
        display: 'flex', 
        flexDirection: 'column', 
        overflow: 'hidden', 
        border: '1px solid #f1f5f9',
        boxShadow: '0 10px 30px rgba(0,0,0,0.02)',
        flexShrink: 0
      }}>
        {/* Search & Header */}
        <div style={{ padding: '24px', borderBottom: '1px solid #f1f5f9', background: '#f8fafc', display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h2 style={{ fontSize: '28px', fontWeight: 900, color: '#1e293b', margin: '0' }}>Direct Chat</h2>
              <p style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', marginTop: '2px' }}>
                {isStudent ? 'Kommunikation mit deinen Lehrern' : 'Kommunikation mit deinen Schülern'}
              </p>
            </div>
            {(!isStudent || studentToTeacherChat) && (
              <button 
                onClick={() => setShowNewChatModal(true)}
                style={{
                  background: '#16a34a',
                  color: 'white',
                  border: 'none',
                  borderRadius: '10px',
                  padding: '6px 12px',
                  fontSize: '0.78rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  boxShadow: '0 2px 8px rgba(22, 163, 74, 0.2)'
                }}
                className="hover-scale"
                type="button"
              >
                <Plus size={14} />
                <span>Neu</span>
              </button>
            )}
          </div>
          
          <div style={{ position: 'relative' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input 
              type="text" 
              placeholder={isStudent ? "Lehrkraft suchen..." : "Schüler suchen..."}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px 10px 38px',
                borderRadius: '12px',
                border: '1px solid #e2e8f0',
                background: 'white',
                fontSize: '0.85rem',
                fontWeight: 600,
                outline: 'none',
                transition: 'border 0.2s'
              }}
            />
          </div>
        </div>

        {/* Partners List */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px' }} className="custom-scrollbar">
          {partnersWithMetadata.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '200px', color: '#94a3b8', textAlign: 'center', padding: '20px' }}>
              <User size={36} style={{ color: '#cbd5e1', marginBottom: '8px' }} />
              <div style={{ fontSize: '0.85rem', fontWeight: 800 }}>Keine Chatpartner gefunden</div>
            </div>
          ) : (
            partnersWithMetadata.map(partner => {
              const isSelected = selectedRecipient?.id === partner.id;
              
              return (
                <button
                  key={partner.id}
                  onClick={() => setSelectedRecipient(partner)}
                  className="hover-scale-mini"
                  style={{
                    width: '100%',
                    padding: '14px 16px',
                    borderRadius: '16px',
                    background: isSelected ? 'linear-gradient(135deg, #f0fdf4, #dcfce7)' : 'transparent',
                    border: '1px solid transparent',
                    cursor: 'pointer',
                    marginBottom: '6px',
                    transition: 'all 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    textAlign: 'left'
                  }}
                >
                  <div style={{ position: 'relative' }}>
                    <img 
                      src={resolveCampusAvatar(partner)} 
                      alt=""
                      style={{ width: '42px', height: '42px', borderRadius: '50%', objectFit: 'cover', border: '2px solid white', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}
                    />
                    {partner.unreadCount > 0 && (
                      <div style={{
                        position: 'absolute',
                        bottom: '-2px',
                        right: '-2px',
                        background: '#ef4444',
                        color: 'white',
                        borderRadius: '50%',
                        width: '18px',
                        height: '18px',
                        fontSize: '0.65rem',
                        fontWeight: 900,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: '2px solid white',
                        boxShadow: '0 2px 5px rgba(239, 68, 68, 0.3)'
                      }}>
                        {partner.unreadCount}
                      </div>
                    )}
                  </div>

                  <div style={{ flex: 1, overflow: 'hidden' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                      <span style={{ fontWeight: 800, fontSize: '0.9rem', color: isSelected ? '#14532d' : '#1e293b' }}>
                        {partner.first_name} {partner.last_name || ''}
                      </span>
                      {partner.lastMessage && (
                        <span style={{ fontSize: '0.65rem', fontWeight: 600, color: '#94a3b8' }}>
                          {new Date(partner.lastMessage.created_at).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })}
                        </span>
                      )}
                    </div>
                    
                    <p style={{
                      fontSize: '0.75rem',
                      fontWeight: partner.unreadCount > 0 ? 800 : 500,
                      color: partner.unreadCount > 0 ? '#1e293b' : '#64748b',
                      margin: '2px 0 0 0',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}>
                      {partner.lastMessage ? partner.lastMessage.content : 'Keine Nachrichten.'}
                    </p>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Right Pane: Chat Window */}
      <div className="glass-panel" style={{ 
        flex: 1, 
        background: 'white', 
        borderRadius: '24px', 
        display: 'flex', 
        flexDirection: 'column', 
        overflow: 'hidden', 
        border: '1px solid #f1f5f9',
        boxShadow: '0 10px 30px rgba(0,0,0,0.02)'
      }}>
        {selectedRecipient ? (
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%', flex: 1 }}>
            {/* Header */}
            <div style={{ padding: '20px 32px', borderBottom: '1px solid #f1f5f9', background: '#f8fafc', display: 'flex', alignItems: 'center', gap: '16px' }}>
              <img 
                src={resolveCampusAvatar(selectedRecipient)} 
                alt=""
                style={{ width: '44px', height: '44px', borderRadius: '50%', objectFit: 'cover', border: '2px solid white', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}
              />
              <div>
                <h4 style={{ fontSize: '1rem', fontWeight: 900, color: '#1e293b', margin: '0' }}>
                  {selectedRecipient.first_name} {selectedRecipient.last_name || ''}
                </h4>
                <span style={{
                  fontSize: '0.65rem',
                  fontWeight: 900,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  background: selectedRecipient.role === 'student' ? '#f0fdf4' : '#fee2e2',
                  color: selectedRecipient.role === 'student' ? '#16a34a' : '#ef4444',
                  padding: '2px 8px',
                  borderRadius: '6px',
                  display: 'inline-block',
                  marginTop: '4px'
                }}>
                  {selectedRecipient.role === 'student' ? 'Schüler' : 'Lehrer'}
                </span>
              </div>
            </div>

            {/* Channel Tabs Selector */}
            <div style={{ display: 'flex', borderBottom: '1px solid #f1f5f9', background: '#f8fafc', padding: '4px 16px' }}>
              <button
                onClick={() => setChatChannel('personal')}
                style={{
                  padding: '10px 16px',
                  border: 'none',
                  background: 'transparent',
                  borderBottom: chatChannel === 'personal' ? '3px solid #16a34a' : '3px solid transparent',
                  color: chatChannel === 'personal' ? '#16a34a' : '#64748b',
                  fontWeight: 800,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <span>💬</span>
                <span>Persönlicher Chat</span>
              </button>
              <button
                onClick={() => setChatChannel('system')}
                style={{
                  padding: '10px 16px',
                  border: 'none',
                  background: 'transparent',
                  borderBottom: chatChannel === 'system' ? '3px solid #16a34a' : '3px solid transparent',
                  color: chatChannel === 'system' ? '#16a34a' : '#64748b',
                  fontWeight: 800,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <span>🤖</span>
                <span>System-Chat</span>
              </button>
            </div>

            {/* Message History */}
            <div style={{ 
              flex: 1, 
              padding: '32px', 
              overflowY: 'auto', 
              display: 'flex', 
              flexDirection: 'column', 
              gap: '16px',
              background: '#fafbfc'
            }} className="custom-scrollbar">
              {filteredThreadMessages.length === 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, color: '#cbd5e1', gap: '8px' }}>
                  <MessageSquare size={40} style={{ strokeWidth: 1.5 }} />
                  <span style={{ fontSize: '0.85rem', fontWeight: 800 }}>
                    {chatChannel === 'system' 
                      ? 'Keine automatischen Systemnachrichten vorhanden.' 
                      : 'Beginne das Gespräch! Schicke deine erste Nachricht.'}
                  </span>
                </div>
              ) : (
                filteredThreadMessages.map(msg => {
                  const isSelf = msg.sender_id === user.id;
                  
                  return (
                    <div 
                      key={msg.id}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: isSelf ? 'flex-end' : 'flex-start',
                        maxWidth: '75%',
                        alignSelf: isSelf ? 'flex-end' : 'flex-start',
                        gap: '4px'
                      }}
                    >
                      <div 
                        style={{
                          padding: '12px 18px',
                          borderRadius: isSelf ? '20px 20px 4px 20px' : '20px 20px 20px 4px',
                          background: isSelf ? 'linear-gradient(135deg, #16a34a, #15803d)' : 'white',
                          color: isSelf ? 'white' : '#1e293b',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
                          border: isSelf ? 'none' : '1px solid #f1f5f9',
                          fontSize: '0.9rem',
                          fontWeight: 500,
                          lineHeight: '1.5',
                          whiteSpace: 'pre-wrap',
                          wordBreak: 'break-word'
                        }}
                      >
                        {msg.content}
                      </div>
                      
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.65rem', fontWeight: 700, color: '#cbd5e1' }}>
                        <span>
                          {new Date(msg.created_at).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        {isSelf && (
                          <Check size={12} color={msg.is_read ? '#10b981' : '#cbd5e1'} strokeWidth={3} />
                        )}
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Composer / System disclaimer */}
            {chatChannel === 'system' ? (
              <div style={{ padding: '20px 32px', borderTop: '1px solid #f1f5f9', background: '#f8fafc', color: '#64748b', fontSize: '0.82rem', fontWeight: 700, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                <span>🤖 Automatisierter System-Chat. Antworten werden im persönlichen Chat gesendet.</span>
                <button 
                  type="button"
                  onClick={() => setChatChannel('personal')}
                  style={{ background: '#dcfce7', border: 'none', color: '#16a34a', padding: '8px 16px', borderRadius: '12px', fontWeight: 800, fontSize: '0.78rem', cursor: 'pointer', transition: 'all 0.2s' }}
                  onMouseOver={e => e.currentTarget.style.background = '#bbf7d0'}
                  onMouseOut={e => e.currentTarget.style.background = '#dcfce7'}
                >
                  Zum persönlichen Chat
                </button>
              </div>
            ) : (
              <form onSubmit={handleSend} style={{ padding: '24px 32px', borderTop: '1px solid #f1f5f9', background: '#f8fafc', display: 'flex', gap: '12px' }}>
                <input 
                  type="text" 
                  placeholder="Deine Nachricht..."
                  value={typedMessage}
                  onChange={e => setTypedMessage(e.target.value)}
                  style={{
                    flex: 1,
                    padding: '14px 20px',
                    borderRadius: '16px',
                    border: '1px solid #e2e8f0',
                    background: 'white',
                    fontSize: '0.9rem',
                    fontWeight: 600,
                    outline: 'none',
                    boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)'
                  }}
                />
                <button
                  type="submit"
                  style={{
                    background: 'linear-gradient(135deg, #16a34a, #15803d)',
                    color: 'white',
                    border: 'none',
                    width: '48px',
                    height: '48px',
                    borderRadius: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(22, 163, 74, 0.3)',
                    transition: 'all 0.2s'
                  }}
                  className="hover-scale"
                >
                  <Send size={18} />
                </button>
              </form>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, padding: '40px', textAlign: 'center', background: '#fafbfc' }}>
            <div style={{ 
              width: '80px', 
              height: '80px', 
              borderRadius: '50%', 
              background: 'white', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              boxShadow: '0 10px 25px rgba(0,0,0,0.03)',
              marginBottom: '24px'
            }}>
              <Inbox size={36} style={{ strokeWidth: 1.5, color: '#16a34a' }} />
            </div>
            <h3 style={{ fontSize: '1.3rem', fontWeight: 900, color: '#1e293b', marginBottom: '8px' }}>Willkommen im Chat</h3>
            <p style={{ fontSize: '0.95rem', color: '#64748b', maxWidth: '360px', lineHeight: 1.6, margin: '0' }}>
              Wähle einen Gesprächspartner aus der Liste aus, um einen Chat zu starten oder fortzusetzen.
            </p>
          </div>
        )}
      </div>

      {showNewChatModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          zIndex: 4000,
          background: 'rgba(242, 242, 247, 0.65)',
          backdropFilter: 'blur(20px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}>
          <div className="glass-panel animation-slide-up" style={{
            background: 'rgba(255, 255, 255, 0.95)',
            padding: '28px',
            borderRadius: '24px',
            maxWidth: '460px',
            width: '100%',
            maxHeight: '80vh',
            overflowY: 'auto',
            position: 'relative',
            border: '1px solid rgba(0, 0, 0, 0.05)',
            boxShadow: '0 30px 60px rgba(0, 0, 0, 0.08)',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}>
            <button 
              onClick={() => {
                setShowNewChatModal(false);
                setNewChatSearch('');
              }} 
              style={{
                position: 'absolute',
                top: 20,
                right: 20,
                background: 'rgba(0,0,0,0.05)',
                border: 'none',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: '#64748b'
              }}
              type="button"
            >
              <X size={16} />
            </button>

            <h3 style={{ fontSize: '1.25rem', fontWeight: 900, color: '#1e293b', margin: '0 0 4px 0' }}>
              Neue Nachricht ({
                schoolUsers.filter(u => {
                  if (u.id === user.id) return false;
                  if (isStudent) {
                    return u.role === 'teacher' || u.role === 'admin';
                  } else {
                    if (user.role?.toLowerCase() === 'teacher') {
                      return u.role === 'student' && u.teacher_id === user.id;
                    }
                    return u.role === 'student';
                  }
                }).length
              })
            </h3>
            
            <div style={{ position: 'relative' }}>
              <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              <input 
                type="text" 
                placeholder={isStudent ? "Lehrer suchen..." : "Schüler suchen..."}
                value={newChatSearch}
                onChange={e => setNewChatSearch(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px 10px 38px',
                  borderRadius: '12px',
                  border: '1px solid #e2e8f0',
                  background: 'white',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', overflowY: 'auto', maxHeight: '45vh', paddingRight: '4px' }}>
              {schoolUsers
                .filter(u => {
                  if (u.id === user.id) return false;
                  if (isStudent) {
                    return u.role === 'teacher' || u.role === 'admin';
                  } else {
                    if (user.role?.toLowerCase() === 'teacher') {
                      return u.role === 'student' && u.teacher_id === user.id;
                    }
                    return u.role === 'student';
                  }
                })
                .filter(u => `${u.first_name || ''} ${u.last_name || ''}`.toLowerCase().includes(newChatSearch.toLowerCase()))
                .map(u => {
                  const avatarSrc = resolveCampusAvatar(u);
                  return (
                    <button
                      key={u.id}
                      onClick={() => {
                        setSelectedRecipient(u);
                        setShowNewChatModal(false);
                        setNewChatSearch('');
                      }}
                      style={{
                        padding: '10px 14px',
                        borderRadius: '14px',
                        border: '1px solid #f1f5f9',
                        background: 'white',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'all 0.2s',
                        width: '100%',
                        boxSizing: 'border-box'
                      }}
                      className="hover-scale-mini"
                      type="button"
                    >
                      <img 
                        src={avatarSrc} 
                        style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover' }} 
                      />
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontWeight: 800, color: '#1e293b', fontSize: '0.85rem' }}>{u.first_name} {u.last_name}</span>
                        <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>{u.instrument || (u.role === 'teacher' ? 'Lehrer' : 'Schüler')}</span>
                      </div>
                    </button>
                  );
                })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
