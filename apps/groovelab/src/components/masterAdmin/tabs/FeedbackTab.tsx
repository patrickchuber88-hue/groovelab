import React, { useState, useEffect } from 'react';
import { 
  Lightbulb, Bug, Filter, Search, CheckCircle2, Clock, 
  Sparkles, RefreshCw, Send, Trash2, ShieldAlert, ShieldCheck, Check,
  ChevronRight, ExternalLink, Smartphone, Laptop, Eye, Tag, X, Megaphone, Loader2,
  Archive, MessageCircle, ArrowRight, Layers, Award, Scale, Target, Lock, Building
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { 
  PlatformFeedbackItem, FeedbackType, FeedbackStatus, 
  FEEDBACK_CATEGORIES, formatLegalHeroCredit,
  FEEDBACK_STATUSES, QUICK_RESPONSE_TEMPLATES
} from '../../../config/feedbackConfig';

export const FeedbackTab: React.FC = () => {
  const [items, setItems] = useState<PlatformFeedbackItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<'all' | FeedbackType>('all');
  const [boardFilter, setBoardFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | FeedbackStatus>('all');
  const [selectedItem, setSelectedItem] = useState<PlatformFeedbackItem | null>(null);
  const [currentResponseText, setCurrentResponseText] = useState<string>('');
  const [isSendingResponse, setIsSendingResponse] = useState<boolean>(false);

  // Release Announcement Modal State
  const [isReleaseModalOpen, setIsReleaseModalOpen] = useState<boolean>(false);
  const [releaseTitle, setReleaseTitle] = useState<string>('');
  const [releaseSummary, setReleaseSummary] = useState<string>('');
  const [releaseBadge, setReleaseBadge] = useState<string>('NEU');
  const [releaseCredit, setReleaseCredit] = useState<string>('');
  const [releasePlatform, setReleasePlatform] = useState<'all' | 'campus' | 'groovelab'>('all');
  const [isPublishing, setIsPublishing] = useState<boolean>(false);

  const fetchFeedback = async () => {
    setLoading(true);
    try {
      let combined: PlatformFeedbackItem[] = [];

      // 1. Load from localStorage first (immediate local visibility)
      try {
        const localData = localStorage.getItem('cg_local_platform_feedback');
        if (localData) {
          combined = JSON.parse(localData);
        }
      } catch (e) {}

      // 2. Load from Supabase (if table exists)
      try {
        const { data, error } = await supabase
          .from('platform_feedback')
          .select('*')
          .order('created_at', { ascending: false });

        if (!error && data) {
          const remoteIds = new Set(data.map((d: any) => d.id));
          const onlyLocal = combined.filter(c => !remoteIds.has(c.id));
          combined = [...data, ...onlyLocal];
        }
      } catch (err) {
        console.warn('Supabase platform_feedback query note:', err);
      }

      setItems(combined);
    } catch (err) {
      console.error('Error fetching platform feedback:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFeedback();
  }, []);

  useEffect(() => {
    if (selectedItem) {
      setCurrentResponseText(selectedItem.admin_response || '');
    } else {
      setCurrentResponseText('');
    }
  }, [selectedItem?.id]);

  const handleSaveAdminResponse = async (id: string, responseText: string, newStatus?: FeedbackStatus) => {
    setIsSendingResponse(true);
    try {
      const updateData: any = {
        admin_response: responseText.trim() || null,
        admin_responded_at: responseText.trim() ? new Date().toISOString() : null,
        is_user_read: false,
        updated_at: new Date().toISOString()
      };
      if (newStatus) {
        updateData.status = newStatus;
      }

      // 1. Update in local responses store for instant client sync
      try {
        const localResponses = JSON.parse(localStorage.getItem('cg_local_feedback_responses') || '{}');
        localResponses[id] = { ...updateData };
        localStorage.setItem('cg_local_feedback_responses', JSON.stringify(localResponses));

        const globalData = JSON.parse(localStorage.getItem('cg_local_platform_feedback') || '[]');
        const updatedGlobal = globalData.map((it: any) => it.id === id ? { ...it, ...updateData } : it);
        localStorage.setItem('cg_local_platform_feedback', JSON.stringify(updatedGlobal));
      } catch (e) {}

      // 2. Update in Supabase
      try {
        const { error } = await supabase
          .from('platform_feedback')
          .update(updateData)
          .eq('id', id);

        if (error) console.warn('Supabase remote response update note:', error.message);
      } catch (e) {}

      setItems(prev => prev.map(item => 
        item.id === id ? { ...item, ...updateData } : item
      ));

      if (selectedItem?.id === id) {
        setSelectedItem(prev => prev ? { ...prev, ...updateData } : null);
      }
      alert('Antwort erfolgreich gespeichert! Der Nutzer sieht deine Rückmeldung ab sofort in seiner Ideenschmiede.');
    } catch (err: any) {
      console.error('Error saving admin response:', err);
      alert(`Fehler beim Speichern der Antwort: ${err.message}`);
    } finally {
      setIsSendingResponse(false);
    }
  };

  const handleLaunchGhostForFeedbackItem = (item: PlatformFeedbackItem) => {
    const schoolId = item.school_id || '';
    const targetUserId = item.target_user_id || item.user_id || '';
    const userRole = item.user_role || 'teacher';
    const userName = item.user_name || 'Nutzer';
    
    // Save audit
    try {
      const existingAuditRaw = localStorage.getItem('campus_ghost_audit_trail');
      const existingAudit = existingAuditRaw ? JSON.parse(existingAuditRaw) : [];
      const newLog = {
        id: `GHA-TICKET-${Date.now()}`,
        timestamp: new Date().toISOString(),
        schoolId,
        schoolName: item.school_name || 'Musikschule',
        role: userRole,
        targetUserId,
        targetUserName: userName,
        ticketId: item.id,
        operator: 'Patrick Huber (MasterAdmin)',
        status: 'TICKET_SUPPORT_LAUNCHED'
      };
      localStorage.setItem('campus_ghost_audit_trail', JSON.stringify([newLog, ...existingAudit].slice(0, 50)));
    } catch (e) {}

    const schoolParam = schoolId ? `&school_id=${schoolId}` : '';
    const userParam = targetUserId ? `&ghost_user_id=${targetUserId}` : '';
    const url = `${window.location.origin}/?support_ghost=true${schoolParam}${userParam}&ticket_id=${item.id}&role=${userRole}&ts=${Date.now()}`;
    window.open(url, '_blank');
  };

  const handleUpdateStatus = async (id: string, newStatus: FeedbackStatus) => {
    try {
      const updateData = { status: newStatus, updated_at: new Date().toISOString() };

      // Local storage sync
      try {
        const localResponses = JSON.parse(localStorage.getItem('cg_local_feedback_responses') || '{}');
        localResponses[id] = { ...(localResponses[id] || {}), ...updateData };
        localStorage.setItem('cg_local_feedback_responses', JSON.stringify(localResponses));

        const globalData = JSON.parse(localStorage.getItem('cg_local_platform_feedback') || '[]');
        const updatedGlobal = globalData.map((it: any) => it.id === id ? { ...it, ...updateData } : it);
        localStorage.setItem('cg_local_platform_feedback', JSON.stringify(updatedGlobal));
      } catch (e) {}

      // Remote Supabase update
      try {
        await supabase
          .from('platform_feedback')
          .update(updateData)
          .eq('id', id);
      } catch (e) {}
      
      setItems(prev => prev.map(item => 
        item.id === id ? { ...item, status: newStatus } : item
      ));

      if (selectedItem?.id === id) {
        setSelectedItem(prev => prev ? { ...prev, status: newStatus } : null);
      }
    } catch (err) {
      console.error('Error updating feedback status:', err);
      alert('Fehler beim Aktualisieren des Status.');
    }
  };

  const handleUpdateNotes = async (id: string, notes: string) => {
    try {
      // Local storage sync
      try {
        const globalData = JSON.parse(localStorage.getItem('cg_local_platform_feedback') || '[]');
        const updatedGlobal = globalData.map((it: any) => it.id === id ? { ...it, admin_notes: notes } : it);
        localStorage.setItem('cg_local_platform_feedback', JSON.stringify(updatedGlobal));
      } catch (e) {}

      // Remote Supabase update
      try {
        await supabase
          .from('platform_feedback')
          .update({ admin_notes: notes, updated_at: new Date().toISOString() })
          .eq('id', id);
      } catch (e) {}

      setItems(prev => prev.map(item => 
        item.id === id ? { ...item, admin_notes: notes } : item
      ));
    } catch (err) {
      console.error('Error updating admin notes:', err);
    }
  };

  const handleDeleteFeedback = async (id: string) => {
    if (!confirm('Möchtest du dieses Feedback-Ticket wirklich löschen?')) return;
    try {
      // Delete from localStorage
      try {
        const globalData = JSON.parse(localStorage.getItem('cg_local_platform_feedback') || '[]');
        const updatedGlobal = globalData.filter((it: any) => it.id !== id);
        localStorage.setItem('cg_local_platform_feedback', JSON.stringify(updatedGlobal));

        const localResponses = JSON.parse(localStorage.getItem('cg_local_feedback_responses') || '{}');
        delete localResponses[id];
        localStorage.setItem('cg_local_feedback_responses', JSON.stringify(localResponses));
      } catch (e) {}

      // Delete from Supabase
      try {
        await supabase
          .from('platform_feedback')
          .delete()
          .eq('id', id);
      } catch (e) {}

      setItems(prev => prev.filter(item => item.id !== id));
      if (selectedItem?.id === id) setSelectedItem(null);
    } catch (err) {
      console.error('Error deleting feedback:', err);
      alert('Fehler beim Löschen.');
    }
  };

  // Open Release Modal prefilled from an item (GDPR & UrhG verified)
  const openReleaseModal = (item: PlatformFeedbackItem) => {
    const legalCredit = formatLegalHeroCredit(
      item.user_role,
      item.user_name,
      item.school_name,
      item.hero_opt_in
    );
    const credit = legalCredit ? `Realisiert dank: ${legalCredit}` : '';

    setReleaseTitle(item.smart_tags[0] ? `${item.smart_tags[0]}` : item.board_name);
    setReleaseSummary(item.content);
    setReleaseBadge('NEU');
    setReleaseCredit(credit);
    setReleasePlatform(item.active_platform === 'groovelab' ? 'groovelab' : (item.active_platform === 'campus' ? 'campus' : 'all'));
    setIsReleaseModalOpen(true);
  };

  const handlePublishAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!releaseTitle.trim() || !releaseSummary.trim()) {
      alert('Bitte Titel und Beschreibung ausfüllen.');
      return;
    }

    setIsPublishing(true);
    try {
      const { error: annErr } = await supabase
        .from('platform_announcements')
        .insert({
          source_feedback_id: selectedItem?.id || null,
          title: releaseTitle.trim(),
          summary: releaseSummary.trim(),
          badge_tag: releaseBadge.trim() || 'NEU',
          hero_credit: releaseCredit.trim() || null,
          target_platform: releasePlatform,
          is_published: true
        });

      if (annErr) throw annErr;

      // Mark feedback as done & announcement created + generate official developer shout
      if (selectedItem) {
        const heroNotice = releaseCredit.trim() 
          ? `🎉 Deine Idee ist jetzt live! Wir haben deinen Vorschlag für „${releaseTitle.trim()}“ erfolgreich umgesetzt und im aktuellen Update-Briefing gewürdigt (${releaseCredit.trim()}). Vielen Dank für deinen wertvollen Beitrag zu Campus-Groovelab!`
          : `🎉 Deine Idee ist jetzt live! Wir haben deinen Vorschlag für „${releaseTitle.trim()}“ erfolgreich umgesetzt. Vielen Dank für deinen wertvollen Beitrag zu Campus-Groovelab!`;

        await supabase
          .from('platform_feedback')
          .update({
            status: 'done',
            is_announcement_created: true,
            admin_response: heroNotice,
            admin_responded_at: new Date().toISOString(),
            is_user_read: false,
            updated_at: new Date().toISOString()
          })
          .eq('id', selectedItem.id);

        // If submitter user_id is known, push a direct system message
        if (selectedItem.user_id) {
          try {
            await supabase.from('campus_direct_messages').insert({
              recipient_id: selectedItem.user_id,
              sender_id: selectedItem.user_id,
              content: heroNotice,
              is_system: true,
              message_type: 'helden_moment_reward'
            });
          } catch (dmErr) {
            console.warn('Direct message notification note:', dmErr);
          }
        }

        setItems(prev => prev.map(it => 
          it.id === selectedItem.id ? { 
            ...it, 
            status: 'done', 
            is_announcement_created: true,
            admin_response: heroNotice,
            admin_responded_at: new Date().toISOString(),
            is_user_read: false
          } : it
        ));
      }

      setIsReleaseModalOpen(false);
      alert('Helden-Moment Update erfolgreich veröffentlicht! Es erscheint ab sofort auf den Briefing-Dashboards.');
    } catch (err: any) {
      console.error('Error publishing announcement:', err);
      alert(`Fehler beim Veröffentlichen: ${err.message}`);
    } finally {
      setIsPublishing(false);
    }
  };

  // Filter items
  const filteredItems = items.filter(item => {
    if (typeFilter !== 'all' && item.type !== typeFilter) return false;
    if (boardFilter !== 'all' && item.board_id !== boardFilter) return false;
    if (statusFilter !== 'all' && item.status !== statusFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchContent = item.content?.toLowerCase().includes(q);
      const matchSchool = item.school_name?.toLowerCase().includes(q);
      const matchUser = item.user_name?.toLowerCase().includes(q);
      const matchTag = item.smart_tags?.some(t => t.toLowerCase().includes(q));
      if (!matchContent && !matchSchool && !matchUser && !matchTag) return false;
    }
    return true;
  });

  // Metrics
  const totalCount = items.length;
  const bugsCount = items.filter(i => i.type === 'bug' && i.status !== 'done').length;
  const ideasCount = items.filter(i => i.type === 'feature_idea' && i.status !== 'done').length;
  const doneCount = items.filter(i => i.status === 'done').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '100%' }}>
      {/* Top Metrics Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
        <div style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '16px',
          padding: '16px 20px',
          boxShadow: '0 2px 8px rgba(15, 23, 42, 0.02)',
          transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
        }}
        onMouseOver={(e) => {
          e.currentTarget.style.transform = 'translateY(-1px)';
          e.currentTarget.style.boxShadow = '0 4px 14px rgba(15, 23, 42, 0.05)';
        }}
        onMouseOut={(e) => {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = '0 2px 8px rgba(15, 23, 42, 0.02)';
        }}
        >
          <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>Gesamt-Tickets</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0f172a', marginTop: '4px' }}>{totalCount}</div>
        </div>
        <div style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '16px',
          padding: '16px 20px',
          boxShadow: '0 2px 8px rgba(15, 23, 42, 0.02)',
          transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
        }}
        onMouseOver={(e) => {
          e.currentTarget.style.transform = 'translateY(-1px)';
          e.currentTarget.style.boxShadow = '0 4px 14px rgba(234, 67, 53, 0.08)';
        }}
        onMouseOut={(e) => {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = '0 2px 8px rgba(15, 23, 42, 0.02)';
        }}
        >
          <div style={{ fontSize: '0.8rem', color: '#ea4335', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Bug size={14} /> Offene Fehlerberichte
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#ea4335', marginTop: '4px' }}>{bugsCount}</div>
        </div>
        <div style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '16px',
          padding: '16px 20px',
          boxShadow: '0 2px 8px rgba(15, 23, 42, 0.02)',
          transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
        }}
        onMouseOver={(e) => {
          e.currentTarget.style.transform = 'translateY(-1px)';
          e.currentTarget.style.boxShadow = '0 4px 14px rgba(202, 138, 4, 0.08)';
        }}
        onMouseOut={(e) => {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = '0 2px 8px rgba(15, 23, 42, 0.02)';
        }}
        >
          <div style={{ fontSize: '0.8rem', color: '#ca8a04', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Lightbulb size={14} /> Neue App-Ideen
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#ca8a04', marginTop: '4px' }}>{ideasCount}</div>
        </div>
        <div style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '16px',
          padding: '16px 20px',
          boxShadow: '0 2px 8px rgba(15, 23, 42, 0.02)',
          transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
        }}
        onMouseOver={(e) => {
          e.currentTarget.style.transform = 'translateY(-1px)';
          e.currentTarget.style.boxShadow = '0 4px 14px rgba(22, 163, 74, 0.08)';
        }}
        onMouseOut={(e) => {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = '0 2px 8px rgba(15, 23, 42, 0.02)';
        }}
        >
          <div style={{ fontSize: '0.8rem', color: '#16a34a', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Sparkles size={14} /> Umgesetzte Updates
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#16a34a', marginTop: '4px' }}>{doneCount}</div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div style={{
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '16px',
        padding: '16px',
        display: 'flex',
        flexWrap: 'wrap',
        gap: '12px',
        alignItems: 'center',
        justifyContent: 'space-between',
        boxShadow: '0 2px 8px rgba(15, 23, 42, 0.02)'
      }}>
        {/* Left: Search & Filter Tabs */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center' }}>
          <div style={{ position: 'relative', minWidth: '240px' }}>
            <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Suchen nach Schule, Tag, Inhalt..."
              style={{
                width: '100%',
                padding: '8px 12px 8px 36px',
                borderRadius: '10px',
                border: '1px solid #cbd5e1',
                fontSize: '0.85rem',
                outline: 'none'
              }}
            />
          </div>

          {/* Type Filter */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as any)}
            style={{
              padding: '8px 12px',
              borderRadius: '10px',
              border: '1px solid #cbd5e1',
              fontSize: '0.85rem',
              background: '#ffffff',
              color: '#334155'
            }}
          >
            <option value="all">Alle Typen</option>
            <option value="feature_idea">Nur Ideen</option>
            <option value="bug">Nur Fehler</option>
          </select>

          {/* Board Filter */}
          <select
            value={boardFilter}
            onChange={(e) => setBoardFilter(e.target.value)}
            style={{
              padding: '8px 12px',
              borderRadius: '10px',
              border: '1px solid #cbd5e1',
              fontSize: '0.85rem',
              background: '#ffffff',
              color: '#334155'
            }}
          >
            <option value="all">Alle Boards</option>
            {FEEDBACK_CATEGORIES.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            style={{
              padding: '8px 12px',
              borderRadius: '10px',
              border: '1px solid #cbd5e1',
              fontSize: '0.85rem',
              background: '#ffffff',
              color: '#334155'
            }}
          >
            <option value="all">Alle Status</option>
            {FEEDBACK_STATUSES.map(st => (
              <option key={st.id} value={st.id}>{st.label}</option>
            ))}
          </select>
        </div>

        {/* Right: Refresh Button */}
        <button
          onClick={fetchFeedback}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 14px',
            borderRadius: '10px',
            border: '1px solid #cbd5e1',
            background: '#ffffff',
            color: '#475569',
            fontSize: '0.85rem',
            fontWeight: 700,
            cursor: 'pointer',
            boxShadow: '0 2px 6px rgba(0, 0, 0, 0.02)',
            transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.borderColor = '#94a3b8';
            e.currentTarget.style.transform = 'translateY(-1px)';
            e.currentTarget.style.boxShadow = '0 4px 10px rgba(0, 0, 0, 0.05)';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.borderColor = '#cbd5e1';
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 2px 6px rgba(0, 0, 0, 0.02)';
          }}
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          <span>Aktualisieren</span>
        </button>
      </div>

      {/* Main Grid: Ticket List (Left) & Detail Inspector (Right) */}
      <div style={{ display: 'grid', gridTemplateColumns: selectedItem ? '1.2fr 1fr' : '1fr', gap: '20px' }}>
        {/* Ticket List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {loading && items.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
              <Loader2 size={28} className="animate-spin" style={{ margin: '0 auto 12px' }} />
              Feedback-Daten werden geladen...
            </div>
          ) : filteredItems.length === 0 ? (
            <div style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '16px',
              padding: '48px 24px',
              textAlign: 'center',
              color: '#64748b'
            }}>
              <Lightbulb size={36} color="#cbd5e1" style={{ margin: '0 auto 12px' }} />
              <div style={{ fontWeight: 700, fontSize: '1rem', color: '#1e293b' }}>Keine Tickets gefunden</div>
              <p style={{ fontSize: '0.85rem', marginTop: '4px' }}>Passe deine Filter an oder warte auf neue Ideen der Community.</p>
            </div>
          ) : (
            filteredItems.map((item) => {
              const isSelected = selectedItem?.id === item.id;
              const isBug = item.type === 'bug';
              return (
                <div
                  key={item.id}
                  onClick={() => setSelectedItem(item)}
                  style={{
                    background: '#ffffff',
                    border: isSelected ? '2px solid #3b82f6' : '1px solid #e2e8f0',
                    borderRadius: '16px',
                    padding: '16px',
                    cursor: 'pointer',
                    transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                    boxShadow: isSelected ? '0 4px 14px rgba(59, 130, 246, 0.12)' : '0 1px 3px rgba(0,0,0,0.02)'
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.transform = 'translateY(-1px)';
                    if (!isSelected) e.currentTarget.style.boxShadow = '0 4px 12px rgba(15, 23, 42, 0.05)';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    if (!isSelected) e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.02)';
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '3px 8px',
                        borderRadius: '6px',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        backgroundColor: item.type === 'support_request' ? '#ecfeff' : (isBug ? '#fee2e2' : '#fef3c7'),
                        color: item.type === 'support_request' ? '#0891b2' : (isBug ? '#b91c1c' : '#92400e')
                      }}>
                        {item.type === 'support_request' ? <ShieldCheck size={12} /> : (isBug ? <Bug size={12} /> : <Lightbulb size={12} />)}
                        {item.type === 'support_request' ? 'Ghost-Support' : (isBug ? 'Fehler' : 'Idee')}
                      </span>

                      {item.grant_ghost_access && (
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '3px',
                          padding: '2px 7px',
                          borderRadius: '100px',
                          fontSize: '0.68rem',
                          fontWeight: 800,
                          backgroundColor: '#f0fdf4',
                          color: '#16a34a',
                          border: '1px solid #bbf7d0'
                        }}>
                          <ShieldCheck size={10} />
                          Freigabe aktiv
                        </span>
                      )}

                      <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#475569' }}>
                        {item.board_name}
                      </span>
                    </div>

                    {/* Status Badge */}
                    {(() => {
                      const stMeta = FEEDBACK_STATUSES.find(s => s.id === item.status) || FEEDBACK_STATUSES[0];
                      return (
                        <span style={{
                          padding: '3px 8px',
                          borderRadius: '9999px',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          backgroundColor: stMeta.badgeBg,
                          color: stMeta.badgeColor,
                          border: '1px solid rgba(0,0,0,0.06)'
                        }}>
                          {stMeta.label}
                        </span>
                      );
                    })()}
                  </div>

                  {/* Content snippet */}
                  <p style={{
                    margin: '10px 0 8px',
                    fontSize: '0.88rem',
                    color: '#1e293b',
                    lineHeight: 1.4,
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden'
                  }}>
                    {item.content}
                  </p>

                  {/* 1-Click Launch Inline Shortcut for Support Requests */}
                  {(item.grant_ghost_access || item.type === 'support_request') && (
                    <div style={{ marginTop: '8px', marginBottom: '8px' }}>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleLaunchGhostForFeedbackItem(item);
                        }}
                        style={{
                          background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                          color: '#ffffff',
                          border: 'none',
                          borderRadius: '8px',
                          padding: '6px 12px',
                          fontSize: '0.74rem',
                          fontWeight: 800,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          boxShadow: '0 2px 6px rgba(2, 132, 199, 0.25)'
                        }}
                      >
                        <ShieldCheck size={12} />
                        <span>Als {item.user_name || 'Nutzer'} ({item.user_role}) einloggen</span>
                      </button>
                    </div>
                  )}

                  {/* Smart Tags & Submitter footer */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginTop: '10px' }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                      {item.smart_tags?.map(t => (
                        <span key={t} style={{
                          fontSize: '0.68rem',
                          background: '#f1f5f9',
                          color: '#475569',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          fontWeight: 500
                        }}>
                          #{t}
                        </span>
                      ))}
                    </div>

                    <div style={{ fontSize: '0.74rem', color: '#64748b' }}>
                      <strong>{item.school_name || 'Musikschule'}</strong> • {new Date(item.created_at).toLocaleDateString('de-DE')}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Detail Inspector Panel */}
        {selectedItem && (
          <div style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '16px',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            position: 'sticky',
            top: '20px',
            height: 'fit-content',
            maxHeight: 'calc(100vh - 120px)',
            overflowY: 'auto'
          }}>
            {/* Inspector Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9', paddingBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {selectedItem.type === 'support_request' ? <ShieldCheck size={20} color="#0891b2" /> : (selectedItem.type === 'bug' ? <Bug size={20} color="#ea4335" /> : <Lightbulb size={20} color="#ca8a04" />)}
                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#0f172a' }}>
                  {selectedItem.type === 'support_request' ? 'Ghost-Support-Ticket' : (selectedItem.type === 'bug' ? 'Fehlermeldung Detail' : 'App-Idee Detail')}
                </h3>
              </div>
              <button
                onClick={() => setSelectedItem(null)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#94a3b8' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Ghost Support Action Hero Card in Inspector */}
            {(selectedItem.grant_ghost_access || selectedItem.type === 'support_request') && (
              <div style={{
                background: 'linear-gradient(135deg, #f0fdf4 0%, #ecfeff 100%)',
                border: '1.5px solid #a5f3fc',
                borderRadius: '14px',
                padding: '14px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                boxShadow: '0 4px 12px rgba(8, 145, 178, 0.08)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <ShieldCheck size={16} color="#0891b2" />
                    <span style={{ fontSize: '0.80rem', fontWeight: 800, color: '#0e7490' }}>
                      Autorisierter Ghost-Support aktiv
                    </span>
                  </div>
                  <span style={{
                    fontSize: '0.66rem',
                    fontWeight: 800,
                    background: '#ffffff',
                    color: '#0891b2',
                    border: '1px solid #a5f3fc',
                    padding: '2px 7px',
                    borderRadius: '100px'
                  }}>
                    7 Tage gültig
                  </span>
                </div>
                <div style={{ fontSize: '0.74rem', color: '#155e75', lineHeight: 1.4 }}>
                  Nutzer <strong>{selectedItem.user_name || 'Unbekannt'}</strong> ({selectedItem.user_role}) an der Schule <strong>{selectedItem.school_name || 'Schule'}</strong> hat den Support-Zugriff zur Störungsbehebung autorisiert.
                </div>
                <button
                  type="button"
                  onClick={() => handleLaunchGhostForFeedbackItem(selectedItem)}
                  style={{
                    marginTop: '4px',
                    background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '10px',
                    padding: '10px 14px',
                    fontSize: '0.82rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    boxShadow: '0 4px 12px rgba(2, 132, 199, 0.3)',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-1px)'}
                  onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                >
                  <ShieldCheck size={16} />
                  <span>Als {selectedItem.user_name || 'Nutzer'} im Ghost-Modus einloggen</span>
                </button>
              </div>
            )}

            {/* Submitter & Telemetry Box */}
            <div style={{ background: '#f8fafc', borderRadius: '12px', padding: '12px', fontSize: '0.8rem', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div><strong>Absender:</strong> {selectedItem.user_name || 'Unbekannt'} ({selectedItem.user_role})</div>
              <div><strong>Musikschule:</strong> {selectedItem.school_name || 'Keine Angabe'}</div>
              <div><strong>Plattform:</strong> {selectedItem.active_platform} • Board: {selectedItem.board_name}</div>
              <div><strong>Helden-Opt-In:</strong> {
                selectedItem.hero_opt_in === 'full' ? 'Vollständiger Name & Schule' :
                selectedItem.hero_opt_in === 'school_only' ? 'Nur Musikschule' : 'Anonym'
              }</div>
              {selectedItem.metadata && (
                <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '4px', borderTop: '1px dashed #cbd5e1', paddingTop: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Laptop size={12} color="#64748b" /> {selectedItem.metadata.os} • {selectedItem.metadata.viewport} • {selectedItem.metadata.app_version}
                </div>
              )}
            </div>

            {/* Content Full Text */}
            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '6px' }}>
                Nachricht / Beschreibung:
              </div>
              <div style={{
                background: '#ffffff',
                border: '1px solid #cbd5e1',
                borderRadius: '10px',
                padding: '12px',
                fontSize: '0.88rem',
                color: '#0f172a',
                lineHeight: 1.5,
                whiteSpace: 'pre-wrap'
              }}>
                {selectedItem.content}
              </div>
            </div>

            {/* Status Change & Admin Actions */}
            <div>
              <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '8px' }}>
                Ticket-Status & Lifecycle:
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '6px' }}>
                {FEEDBACK_STATUSES.map(st => {
                  const isCurrent = selectedItem.status === st.id;
                  return (
                    <button
                      key={st.id}
                      onClick={() => handleUpdateStatus(selectedItem.id, st.id)}
                      style={{
                        padding: '7px 10px',
                        borderRadius: '10px',
                        border: isCurrent ? `2px solid ${st.badgeColor}` : '1px solid #cbd5e1',
                        background: isCurrent ? st.badgeBg : '#ffffff',
                        color: isCurrent ? st.badgeColor : '#475569',
                        fontSize: '0.74rem',
                        fontWeight: isCurrent ? 800 : 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      {st.id === 'inbox' && <Clock size={13} />}
                      {st.id === 'in_review' && <Search size={13} />}
                      {st.id === 'planned' && <Sparkles size={13} />}
                      {st.id === 'in_progress' && <Layers size={13} />}
                      {st.id === 'done' && <CheckCircle2 size={13} />}
                      {st.id === 'declined' && <Archive size={13} />}
                      <span>{st.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Quick-Response Composer (Closed Loop) */}
            <div style={{
              background: '#f8fafc',
              borderRadius: '14px',
              padding: '14px',
              border: '1.5px solid #e2e8f0',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <MessageCircle size={16} color="#0284c7" />
                  <span style={{ fontSize: '0.80rem', fontWeight: 800, color: '#0f172a' }}>
                    Offizielle Rückmeldung an den Nutzer (In-App)
                  </span>
                </div>
                {selectedItem.admin_responded_at && (
                  <span style={{ fontSize: '0.68rem', color: selectedItem.is_user_read ? '#16a34a' : '#d97706', fontWeight: 700 }}>
                    {selectedItem.is_user_read ? '✓ Gesehen' : '● Neu (Ungelesen)'}
                  </span>
                )}
              </div>

              {/* 1-Click Template Snippets */}
              <div>
                <div style={{ fontSize: '0.68rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '8px' }}>
                  1-Klick Antwort-Vorlagen (Status-Kopplung aktiv):
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {QUICK_RESPONSE_TEMPLATES.map(tpl => {
                    let bg = '#ffffff';
                    let border = '#cbd5e1';
                    let textCol = '#334155';
                    let hoverBorder = '#94a3b8';

                    if (tpl.category === 'positive') {
                      bg = '#f0fdf4';
                      border = '#bbf7d0';
                      textCol = '#15803d';
                      hoverBorder = '#86efac';
                    } else if (tpl.category === 'info') {
                      bg = '#eff6ff';
                      border = '#bfdbfe';
                      textCol = '#1d4ed8';
                      hoverBorder = '#93c5fd';
                    } else if (tpl.category === 'legal') {
                      bg = '#fef2f2';
                      border = '#fecaca';
                      textCol = '#b91c1c';
                      hoverBorder = '#fca5a5';
                    } else if (tpl.category === 'scope') {
                      bg = '#f8fafc';
                      border = '#cbd5e1';
                      textCol = '#475569';
                      hoverBorder = '#94a3b8';
                    }

                    return (
                      <button
                        key={tpl.id}
                        type="button"
                        onClick={() => {
                          setCurrentResponseText(tpl.text);
                          handleUpdateStatus(selectedItem.id, tpl.status);
                        }}
                        style={{
                          padding: '5px 9px',
                          borderRadius: '8px',
                          border: `1px solid ${border}`,
                          background: bg,
                          color: textCol,
                          fontSize: '0.71rem',
                          fontWeight: 750,
                          cursor: 'pointer',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                          transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                        onMouseOver={(e) => {
                          e.currentTarget.style.borderColor = hoverBorder;
                          e.currentTarget.style.transform = 'translateY(-1px)';
                          e.currentTarget.style.boxShadow = '0 3px 8px rgba(0,0,0,0.06)';
                        }}
                        onMouseOut={(e) => {
                          e.currentTarget.style.borderColor = border;
                          e.currentTarget.style.transform = 'translateY(0)';
                          e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.02)';
                        }}
                        title={`Vorlage einfügen und Status automatisch auf "${FEEDBACK_STATUSES.find(s => s.id === tpl.status)?.label}" setzen`}
                      >
                        {tpl.category === 'legal' && <Scale size={12} color="#64748b" />}
                        {tpl.category === 'scope' && <Target size={12} color="#64748b" />}
                        {tpl.category === 'positive' && <Sparkles size={12} color="#64748b" />}
                        {tpl.category === 'info' && <Lightbulb size={12} color="#64748b" />}
                        <span>{tpl.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <textarea
                rows={3}
                value={currentResponseText}
                onChange={(e) => setCurrentResponseText(e.target.value)}
                placeholder="Schreibe eine persönliche, wertschätzende Rückmeldung an den Einreicher..."
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: '10px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.82rem',
                  color: '#0f172a',
                  lineHeight: 1.45,
                  boxSizing: 'border-box',
                  resize: 'vertical'
                }}
              />

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button
                  type="button"
                  disabled={isSendingResponse}
                  onClick={() => handleSaveAdminResponse(selectedItem.id, currentResponseText)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 16px',
                    borderRadius: '10px',
                    border: 'none',
                    background: '#0284c7',
                    color: '#ffffff',
                    fontSize: '0.78rem',
                    fontWeight: 800,
                    cursor: isSendingResponse ? 'not-allowed' : 'pointer',
                    boxShadow: '0 2px 8px rgba(2, 132, 199, 0.3)'
                  }}
                >
                  {isSendingResponse ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
                  <span>{isSendingResponse ? 'Wird gespeichert...' : 'Antwort für Nutzer freischalten'}</span>
                </button>
              </div>
            </div>

            {/* Internal Admin Notes */}
            <div>
              <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '6px' }}>
                Interne Entwickler-Notizen (Nur Team):
              </label>
              <textarea
                rows={2}
                defaultValue={selectedItem.admin_notes || ''}
                onBlur={(e) => handleUpdateNotes(selectedItem.id, e.target.value)}
                placeholder="Jira-Ticket, technische Details, interne Notizen..."
                style={{
                  width: '100%',
                  padding: '8px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.8rem',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            {/* Release Announcement Button (Helden-Moment Generator) */}
            <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <button
                type="button"
                onClick={() => openReleaseModal(selectedItem)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  padding: '12px',
                  borderRadius: '12px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                  color: '#ffffff',
                  fontSize: '0.88rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(37, 99, 235, 0.25)'
                }}
              >
                <Sparkles size={16} />
                <span>Als Update im Briefing veröffentlichen</span>
              </button>

              <button
                type="button"
                onClick={() => handleDeleteFeedback(selectedItem.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  padding: '8px',
                  borderRadius: '8px',
                  border: 'none',
                  background: 'transparent',
                  color: '#dc2626',
                  fontSize: '0.75rem',
                  cursor: 'pointer'
                }}
              >
                <Trash2 size={13} />
                <span>Ticket unwiderruflich löschen</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Release Modal Dialog */}
      {isReleaseModalOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          zIndex: 999999,
          backgroundColor: 'rgba(15, 23, 42, 0.7)',
          backdropFilter: 'blur(6px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px'
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '20px',
            width: '100%',
            maxWidth: '540px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            border: '1px solid #e2e8f0',
            overflow: 'hidden',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Megaphone size={20} color="#2563eb" />
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>
                  Update im Briefing-Dashboard veröffentlichen
                </h3>
              </div>
              <button onClick={() => setIsReleaseModalOpen(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}>
                <X size={18} color="#64748b" />
              </button>
            </div>

            <form onSubmit={handlePublishAnnouncement} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                  Feature-Titel:
                </label>
                <input
                  type="text"
                  value={releaseTitle}
                  onChange={(e) => setReleaseTitle(e.target.value)}
                  placeholder="z.B. Multi-Track Export im Play-Along Studio"
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                  Kurzbeschreibung für Nutzer:
                </label>
                <textarea
                  rows={3}
                  value={releaseSummary}
                  onChange={(e) => setReleaseSummary(e.target.value)}
                  placeholder="Beschreibe kurz, was neu ist und wie es funktioniert..."
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                  <Award size={14} color="#64748b" /> Helden-Moment (Ehren-Nennung):
                </label>
                <input
                  type="text"
                  value={releaseCredit}
                  onChange={(e) => setReleaseCredit(e.target.value)}
                  placeholder="z.B. Realisiert dank der Idee von Severin Landenberger (Musikschule SoundArt)"
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', boxSizing: 'border-box', background: '#f8fafc' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                    Badge Tag:
                  </label>
                  <input
                    type="text"
                    value={releaseBadge}
                    onChange={(e) => setReleaseBadge(e.target.value)}
                    style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                    Ziel-Plattform:
                  </label>
                  <select
                    value={releasePlatform}
                    onChange={(e) => setReleasePlatform(e.target.value as any)}
                    style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', boxSizing: 'border-box' }}
                  >
                    <option value="all">Alle (Campus & GrooveLab)</option>
                    <option value="campus">Nur Campus</option>
                    <option value="groovelab">Nur GrooveLab</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setIsReleaseModalOpen(false)}
                  style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#ffffff' }}
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  disabled={isPublishing}
                  style={{
                    padding: '8px 20px',
                    borderRadius: '8px',
                    border: 'none',
                    background: '#2563eb',
                    color: '#ffffff',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  {isPublishing ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
                  <span>Jetzt live schalten</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
