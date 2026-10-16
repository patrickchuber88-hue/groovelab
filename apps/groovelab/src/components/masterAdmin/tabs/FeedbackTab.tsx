import React, { useState, useEffect, useMemo } from 'react';
import { 
  Lightbulb, Bug, Filter, Search, CheckCircle2, Clock, 
  Sparkles, RefreshCw, Send, Trash2, ShieldAlert, ShieldCheck, Check,
  ChevronRight, ExternalLink, Smartphone, Laptop, Eye, Tag, X, Megaphone, Loader2,
  Archive, MessageCircle, ArrowRight, Layers, Award, Scale, Target, Lock, Building,
  Zap, AlertTriangle, Timer
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { 
  PlatformFeedbackItem, FeedbackType, FeedbackStatus, 
  FEEDBACK_CATEGORIES, formatLegalHeroCredit,
  FEEDBACK_STATUSES, QUICK_RESPONSE_TEMPLATES, computeSlaTarget
} from '../../../config/feedbackConfig';

export interface FeedbackTabProps {
  onStartGhostMode?: (schoolId: string, schoolName: string, reason: string) => void;
}

export const FeedbackTab: React.FC<FeedbackTabProps> = ({ onStartGhostMode }) => {
  const [items, setItems] = useState<PlatformFeedbackItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<'all' | FeedbackType>('all');
  const [boardFilter, setBoardFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | FeedbackStatus>('all');
  const [slaFilter, setSlaFilter] = useState<'all' | 'critical' | 'active_sla' | 'fulfilled'>('all');
  const [selectedItem, setSelectedItem] = useState<PlatformFeedbackItem | null>(null);
  const [pendingStatus, setPendingStatus] = useState<FeedbackStatus | null>(null);
  const [currentResponseText, setCurrentResponseText] = useState<string>('');
  const [isSendingResponse, setIsSendingResponse] = useState<boolean>(false);
  const [tick, setTick] = useState<number>(0);

  // 30-Second Live SLA Clock Ticker
  useEffect(() => {
    const timer = setInterval(() => setTick(t => t + 1), 30000);
    return () => clearInterval(timer);
  }, []);

  // Release Announcement Modal State
  const [isReleaseModalOpen, setIsReleaseModalOpen] = useState<boolean>(false);
  const [releaseTitle, setReleaseTitle] = useState<string>('');
  const [releaseSummary, setReleaseSummary] = useState<string>('');
  const [releaseBadge, setReleaseBadge] = useState<string>('NEU');
  const [releaseCredit, setReleaseCredit] = useState<string>('');
  const [releasePlatform, setReleasePlatform] = useState<'all' | 'campus' | 'groovelab'>('all');
  const [isPublishing, setIsPublishing] = useState<boolean>(false);

  useEffect(() => {
    if (!isReleaseModalOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsReleaseModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isReleaseModalOpen]);

  const fetchFeedback = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('platform_feedback')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && Array.isArray(data)) {
        setItems(data as PlatformFeedbackItem[]);
      } else {
        setItems([]);
      }
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
      setPendingStatus(selectedItem.status);
    } else {
      setCurrentResponseText('');
      setPendingStatus(null);
    }
  }, [selectedItem?.id]);

  const handleSaveAdminResponse = async (id: string, responseText: string, newStatus?: FeedbackStatus) => {
    setIsSendingResponse(true);
    try {
      const now = new Date();
      const targetItem = items.find(i => i.id === id);
      let diffSec: number | null = null;
      if (targetItem?.created_at && !targetItem.admin_responded_at) {
        diffSec = Math.max(0, Math.floor((now.getTime() - new Date(targetItem.created_at).getTime()) / 1000));
      }

      const updateData: Partial<PlatformFeedbackItem> & { updated_at: string } = {
        admin_response: responseText.trim() || undefined,
        admin_responded_at: responseText.trim() ? now.toISOString() : undefined,
        first_response_seconds: diffSec ?? targetItem?.first_response_seconds ?? undefined,
        sla_fulfilled: true,
        is_user_read: false,
        updated_at: now.toISOString()
      };
      if (newStatus) {
        updateData.status = newStatus;
      }

      const { error } = await supabase
        .from('platform_feedback')
        .update(updateData)
        .eq('id', id);

      if (error) {
        throw new Error(error.message);
      }

      setItems(prev => prev.map(item => 
        item.id === id ? { ...item, ...updateData } : item
      ));

      if (selectedItem?.id === id) {
        setSelectedItem(prev => prev ? { ...prev, ...updateData } : null);
      }
      alert('Antwort erfolgreich gespeichert & SLA erfüllt! Der Nutzer sieht deine Rückmeldung ab sofort in seiner Ideenschmiede.');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Datenbankfehler';
      console.error('Error saving admin response:', err);
      alert(`Fehler beim Speichern der Antwort (Fail-Closed): ${msg}`);
    } finally {
      setIsSendingResponse(false);
    }
  };

  const handleLaunchGhostForFeedbackItem = (item: PlatformFeedbackItem) => {
    const schoolId = item.school_id || '';
    const schoolName = item.school_name || 'Musikschule';
    const ticketRef = item.ticket_number || `TICKET-${item.id.slice(-6).toUpperCase()}`;

    if (!schoolId) {
      alert('Für dieses Ticket ist keine gültige Mandanten-ID (school_id) hinterlegt.');
      return;
    }

    if (onStartGhostMode) {
      onStartGhostMode(schoolId, schoolName, ticketRef);
    } else {
      alert('Ghost-Support benötigt eine aktive 2FA Step-Up-Verifikation über das Haupt-Cockpit.');
    }
  };

  const handleUpdateNotes = async (id: string, notes: string) => {
    try {
      const { error } = await supabase
        .from('platform_feedback')
        .update({ admin_notes: notes, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw new Error(error.message);

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
      const { error } = await supabase
        .from('platform_feedback')
        .delete()
        .eq('id', id);

      if (error) throw new Error(error.message);

      setItems(prev => prev.filter(item => item.id !== id));
      if (selectedItem?.id === id) setSelectedItem(null);
    } catch (err) {
      console.error('Error deleting feedback:', err);
      alert('Fehler beim Löschen.');
    }
  };

  // Open Release Modal prefilled from an item
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
          ? `Deine Idee ist jetzt live! Wir haben deinen Vorschlag für „${releaseTitle.trim()}“ erfolgreich umgesetzt und im aktuellen Update-Briefing gewürdigt (${releaseCredit.trim()}). Vielen Dank für deinen wertvollen Beitrag zu Campus-Groovelab!`
          : `Deine Idee ist jetzt live! Wir haben deinen Vorschlag für „${releaseTitle.trim()}“ erfolgreich umgesetzt. Vielen Dank für deinen wertvollen Beitrag zu Campus-Groovelab!`;

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

        // If submitter user_id is known, push a direct system message with distinct system/admin sender_id
        if (selectedItem.user_id) {
          try {
            const { data: sessionData } = await supabase.auth.getUser();
            const adminSenderId = sessionData?.user?.id && sessionData.user.id !== selectedItem.user_id
              ? sessionData.user.id
              : null;

            await supabase.from('campus_direct_messages').insert({
              recipient_id: selectedItem.user_id,
              sender_id: adminSenderId,
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
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unbekannter Fehler';
      console.error('Error publishing announcement:', err);
      alert(`Fehler beim Veröffentlichen: ${msg}`);
    } finally {
      setIsPublishing(false);
    }
  };

  // SLA KPI Metrics (Memoized, Dynamic & Zero-Fake)
  const {
    avgResponseMinutes,
    slaCompliancePct,
    openSlaCount,
    criticalSlaCount,
    totalCount,
    bugsCount,
    ideasCount
  } = useMemo(() => {
    const answeredWithSla = items.filter(i => Boolean(i.admin_responded_at));
    const responseTimes = answeredWithSla.map(i =>
      Math.max(0, (new Date(i.admin_responded_at!).getTime() - new Date(i.created_at).getTime()) / 60000)
    );
    const avgResp = responseTimes.length > 0
      ? Math.round(responseTimes.reduce((acc, v) => acc + v, 0) / responseTimes.length)
      : null;

    const openSla = items.filter(i => {
      if (i.admin_responded_at || i.status === 'done') return false;
      const target = computeSlaTarget(i.created_at);
      return target.isWithinBusinessHours && !target.isExpired;
    }).length;

    const critSla = items.filter(i => {
      if (i.admin_responded_at || i.status === 'done') return false;
      const target = computeSlaTarget(i.created_at);
      return target.urgencyLevel === 'critical';
    }).length;

    const expiredOpenCount = items.filter(i => {
      if (i.admin_responded_at || i.status === 'done') return false;
      const target = computeSlaTarget(i.created_at);
      return target.isExpired;
    }).length;

    const withinSlaAnswered = responseTimes.filter(m => m <= 60).length;
    const totalEvaluated = responseTimes.length + expiredOpenCount;
    const slaPct = totalEvaluated > 0
      ? ((withinSlaAnswered / totalEvaluated) * 100).toFixed(1)
      : '100';

    return {
      avgResponseMinutes: avgResp,
      slaCompliancePct: slaPct,
      openSlaCount: openSla,
      criticalSlaCount: critSla,
      totalCount: items.length,
      bugsCount: items.filter(i => i.type === 'bug' && i.status !== 'done').length,
      ideasCount: items.filter(i => i.type === 'feature_idea' && i.status !== 'done').length
    };
  }, [items, tick]);

  // Filter & SLA-Priority Sorting (Memoized)
  const filteredItems = useMemo(() => items.filter(item => {
    if (typeFilter !== 'all' && item.type !== typeFilter) return false;
    if (boardFilter !== 'all' && item.board_id !== boardFilter) return false;
    if (statusFilter !== 'all' && item.status !== statusFilter) return false;
    if (slaFilter !== 'all') {
      const sla = computeSlaTarget(item.created_at, item.admin_responded_at);
      if (slaFilter === 'critical' && sla.urgencyLevel !== 'critical') return false;
      if (slaFilter === 'active_sla' && (sla.urgencyLevel === 'fulfilled' || sla.urgencyLevel === 'after_hours')) return false;
      if (slaFilter === 'fulfilled' && sla.urgencyLevel !== 'fulfilled') return false;
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchContent = item.content?.toLowerCase().includes(q);
      const matchSchool = item.school_name?.toLowerCase().includes(q);
      const matchUser = item.user_name?.toLowerCase().includes(q);
      const matchTag = item.smart_tags?.some(t => t.toLowerCase().includes(q));
      const matchTicket = item.ticket_number?.toLowerCase().includes(q);
      if (!matchContent && !matchSchool && !matchUser && !matchTag && !matchTicket) return false;
    }
    return true;
  }).sort((a, b) => {
    const slaA = computeSlaTarget(a.created_at, a.admin_responded_at);
    const slaB = computeSlaTarget(b.created_at, b.admin_responded_at);
    
    // Unanswered critical first, then warnings, then normals, then after-hours, then fulfilled
    const weightMap: Record<string, number> = {
      critical: 1,
      warning: 2,
      normal: 3,
      after_hours: 4,
      fulfilled: 5
    };
    const diff = (weightMap[slaA.urgencyLevel] || 99) - (weightMap[slaB.urgencyLevel] || 99);
    if (diff !== 0) return diff;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  }), [items, typeFilter, boardFilter, statusFilter, slaFilter, searchQuery, tick]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '100%' }}>
      {/* Top Metrics Cards with Tier-1 SLA Barometer */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '14px' }}>
        <div style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '16px',
          padding: '16px 18px',
          boxShadow: '0 2px 8px rgba(15, 23, 42, 0.02)'
        }}>
          <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600 }}>Gesamt-Tickets</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#0f172a', marginTop: '4px' }}>{totalCount}</div>
        </div>

        {/* 60-Minute SLA Compliance Card */}
        <div style={{
          background: '#ecfdf5',
          border: 'none',
          borderRadius: '16px',
          padding: '16px 18px',
          boxShadow: 'none'
        }}>
          <div style={{ fontSize: '0.78rem', color: '#059669', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '5px' }}>
            <Zap size={14} /> 60-Min. SLA Quote
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 950, color: '#065f46', marginTop: '4px' }}>
            {slaCompliancePct}%{' '}
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#059669' }}>
              {avgResponseMinutes !== null ? `(Ø ${avgResponseMinutes} Min.)` : '(0 Überschreitungen)'}
            </span>
          </div>
        </div>

        {/* Active SLA Fristen Card */}
        <div style={{
          background: criticalSlaCount > 0 ? '#fef2f2' : '#ffffff',
          border: criticalSlaCount > 0 ? 'none' : '1px solid #e2e8f0',
          borderRadius: '16px',
          padding: '16px 18px',
          boxShadow: '0 2px 8px rgba(15, 23, 42, 0.02)'
        }}>
          <div style={{ fontSize: '0.78rem', color: criticalSlaCount > 0 ? '#b91c1c' : '#d97706', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '5px' }}>
            <Timer size={14} /> Offene SLA-Tickets
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 950, color: criticalSlaCount > 0 ? '#dc2626' : '#d97706', marginTop: '4px' }}>
            {criticalSlaCount > 0 ? `${criticalSlaCount} Kritisch` : `${openSlaCount} aktiv`}
          </div>
        </div>

        <div style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '16px',
          padding: '16px 18px',
          boxShadow: '0 2px 8px rgba(15, 23, 42, 0.02)'
        }}>
          <div style={{ fontSize: '0.78rem', color: '#ea4335', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '5px' }}>
            <Bug size={14} /> Offene Fehlerberichte
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#ea4335', marginTop: '4px' }}>{bugsCount}</div>
        </div>

        <div style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '16px',
          padding: '16px 18px',
          boxShadow: '0 2px 8px rgba(15, 23, 42, 0.02)'
        }}>
          <div style={{ fontSize: '0.78rem', color: '#ca8a04', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '5px' }}>
            <Lightbulb size={14} /> Neue App-Ideen
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#ca8a04', marginTop: '4px' }}>{ideasCount}</div>
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
              placeholder="Ticket #, Schule, Inhalt suchen..."
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

          {/* SLA Filter Dropdown */}
          <select
            value={slaFilter}
            onChange={(e) => setSlaFilter(e.target.value as 'all' | 'critical' | 'active_sla' | 'fulfilled')}
            style={{
              padding: '8px 12px',
              borderRadius: '10px',
              border: slaFilter !== 'all' ? 'none' : '1px solid #cbd5e1',
              background: slaFilter !== 'all' ? '#f0fdf4' : '#ffffff',
              color: slaFilter !== 'all' ? '#15803d' : '#334155',
              fontSize: '0.85rem',
              fontWeight: 700
            }}
          >
            <option value="all">Alle SLA-Stati</option>
            <option value="critical">SLA Dringend (&lt; 15 Min.)</option>
            <option value="active_sla">SLA Aktiv (&lt; 60 Min.)</option>
            <option value="fulfilled">SLA Erfüllt (Beantwortet)</option>
          </select>

          {/* Type Filter */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as 'all' | FeedbackType)}
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
            <option value="support_request">Nur Support</option>
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
            onChange={(e) => setStatusFilter(e.target.value as 'all' | FeedbackStatus)}
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
          type="button"
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
                  role="button"
                  tabIndex={0}
                  onClick={() => setSelectedItem(item)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setSelectedItem(item);
                    }
                  }}
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
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '3px 8px',
                        borderRadius: '6px',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        backgroundColor: item.type === 'support_request' ? '#ecfeff' : (isBug ? '#fee2e2' : '#fef3c7'),
                        color: item.type === 'support_request' ? '#0891b2' : (isBug ? '#b91c1c' : '#92400e'),
                        border: 'none'
                      }}>
                        {item.type === 'support_request' ? <ShieldCheck size={12} /> : (isBug ? <Bug size={12} /> : <Lightbulb size={12} />)}
                        {item.type === 'support_request' ? 'Ghost-Support' : (isBug ? 'Fehler' : 'Idee')}
                      </span>

                      {/* Ticket Number */}
                      <span style={{
                        fontSize: '0.72rem',
                        fontWeight: 800,
                        color: '#64748b',
                        fontFamily: 'monospace'
                      }}>
                        #{item.ticket_number || ('CG-SUP-' + item.id.slice(-5).toUpperCase())}
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
                          border: 'none'
                        }}>
                          <ShieldCheck size={10} />
                          Freigabe
                        </span>
                      )}

                      <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#475569' }}>
                        • {item.board_name}
                      </span>
                    </div>

                    {/* Status Badge & Dynamic SLA Badge */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {(() => {
                        const sla = computeSlaTarget(item.created_at, item.admin_responded_at);
                        return (
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '3px 8px',
                            borderRadius: '100px',
                            fontSize: '0.68rem',
                            fontWeight: 800,
                            backgroundColor: sla.badgeBg,
                            color: sla.badgeColor,
                            border: 'none'
                          }}>
                            <Zap size={10} />
                            <span>{sla.label}</span>
                          </span>
                        );
                      })()}

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
                            border: 'none'
                          }}>
                            {stMeta.label}
                          </span>
                        );
                      })()}
                    </div>
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
                          boxShadow: 'none'
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
                {selectedItem.type === 'support_request' ? <ShieldCheck size={20} color="#0f172a" /> : (selectedItem.type === 'bug' ? <Bug size={20} color="#0f172a" /> : <Lightbulb size={20} color="#0f172a" />)}
                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#0f172a' }}>
                  {selectedItem.type === 'support_request' ? 'Ghost-Support-Ticket' : (selectedItem.type === 'bug' ? 'Fehlermeldung Detail' : 'App-Idee Detail')}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedItem(null)}
                aria-label="Schließen"
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#94a3b8' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Live SLA Frist & Target Banner */}
            {(() => {
              const sla = computeSlaTarget(selectedItem.created_at, selectedItem.admin_responded_at);
              return (
                <div style={{
                  background: sla.urgencyLevel === 'critical' ? '#fef2f2' : (sla.urgencyLevel === 'fulfilled' ? '#f0fdf4' : '#f8fafc'),
                  border: 'none',
                  borderRadius: '14px',
                  padding: '12px 16px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.02)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      background: sla.badgeBg,
                      color: sla.badgeColor,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      <Zap size={16} />
                    </div>
                    <div>
                      <div style={{ fontSize: '0.82rem', fontWeight: 900, color: sla.badgeColor }}>
                        {sla.label}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '1px' }}>
                        {sla.displayTarget}
                      </div>
                    </div>
                  </div>

                  <span style={{
                    fontSize: '0.72rem',
                    fontWeight: 800,
                    padding: '4px 10px',
                    borderRadius: '8px',
                    background: '#ffffff',
                    border: '1px solid #cbd5e1',
                    color: '#334155',
                    fontFamily: 'monospace'
                  }}>
                    #{selectedItem.ticket_number || ('CG-SUP-' + selectedItem.id.slice(-5).toUpperCase())}
                  </span>
                </div>
              );
            })()}

            {/* Ghost Support Action Hero Card in Inspector */}
            {(selectedItem.grant_ghost_access || selectedItem.type === 'support_request') && (
              <div style={{
                background: 'linear-gradient(135deg, #f0fdf4 0%, #ecfeff 100%)',
                border: 'none',
                borderRadius: '14px',
                padding: '14px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                boxShadow: 'none'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <ShieldCheck size={16} color="#475569" />
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
                    boxShadow: 'none',
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
                Ticket-Status &amp; Lifecycle (wird beim Speichern übernommen):
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '6px' }}>
                {FEEDBACK_STATUSES.map(st => {
                  const isCurrent = (pendingStatus || selectedItem.status) === st.id;
                  return (
                    <button
                      key={st.id}
                      type="button"
                      onClick={() => setPendingStatus(st.id)}
                      style={{
                        padding: '7px 10px',
                        borderRadius: '10px',
                        border: isCurrent ? 'none' : '1px solid #cbd5e1',
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

            {/* Quick-Response Composer & Editable Templates */}
            <div style={{
              background: '#f8fafc',
              borderRadius: '14px',
              padding: '14px',
              border: '1.5px solid #e2e8f0',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <MessageCircle size={16} color="#0f172a" />
                  <span style={{ fontSize: '0.80rem', fontWeight: 800, color: '#0f172a' }}>
                    Offizielle Rückmeldung an den Nutzer (In-App)
                  </span>
                </div>
                {selectedItem.admin_responded_at && (
                  <span style={{ fontSize: '0.68rem', color: selectedItem.is_user_read ? '#16a34a' : '#d97706', fontWeight: 700 }}>
                    {selectedItem.is_user_read ? 'Gesehen' : 'Neu (Ungelesen)'}
                  </span>
                )}
              </div>

              {/* Template Snippets: Clicking loads text & pre-selects status (no auto-send) */}
              <div>
                <div style={{ fontSize: '0.70rem', fontWeight: 900, color: '#059669', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Zap size={12} color="#475569" /> ANTWORT-VORLAGEN (Klick fügt Text ein &amp; wählt Status vor):
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {QUICK_RESPONSE_TEMPLATES.map(tpl => {
                    const isSlaTouch = tpl.category === 'sla_first_touch';
                    const isSelected = currentResponseText === tpl.text;
                    let bg = '#ffffff';
                    let textCol = '#334155';

                    if (isSlaTouch) {
                      bg = isSelected ? '#d1fae5' : '#ecfdf5';
                      textCol = '#065f46';
                    } else if (tpl.category === 'positive') {
                      bg = isSelected ? '#ecfdf5' : '#f0fdf4';
                      textCol = '#059669';
                    } else if (tpl.category === 'info') {
                      bg = isSelected ? '#dbeafe' : '#eff6ff';
                      textCol = '#1d4ed8';
                    } else if (tpl.category === 'legal') {
                      bg = isSelected ? '#fee2e2' : '#fef2f2';
                      textCol = '#b91c1c';
                    } else if (tpl.category === 'scope') {
                      bg = isSelected ? '#e2e8f0' : '#f8fafc';
                      textCol = '#475569';
                    }

                    return (
                      <button
                        key={tpl.id}
                        type="button"
                        onClick={() => {
                          setCurrentResponseText(tpl.text);
                          setPendingStatus(tpl.status);
                        }}
                        style={{
                          padding: '6px 10px',
                          borderRadius: '8px',
                          border: 'none',
                          background: bg,
                          color: textCol,
                          fontSize: '0.72rem',
                          fontWeight: 750,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          boxShadow: isSelected ? '0 2px 6px rgba(0,0,0,0.06)' : 'none',
                          transition: 'all 0.15s ease'
                        }}
                        title={`Klicken, um diesen Text ins Textfeld einzufügen und Status "${FEEDBACK_STATUSES.find(s => s.id === tpl.status)?.label}" vorzuwählen`}
                      >
                        {isSlaTouch && <Zap size={12} color="#475569" />}
                        {tpl.category === 'legal' && <Scale size={12} color="#475569" />}
                        {tpl.category === 'scope' && <Target size={12} color="#64748b" />}
                        {tpl.category === 'positive' && <Sparkles size={12} color="#475569" />}
                        {tpl.category === 'info' && <Lightbulb size={12} color="#475569" />}
                        <span>{tpl.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Editable Textarea */}
              <textarea
                rows={4}
                value={currentResponseText}
                onChange={(e) => setCurrentResponseText(e.target.value)}
                placeholder="Vorlage oben anklicken zum Einfügen oder Text hier frei verfassen & anpassen..."
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '10px',
                  border: '1.5px solid #cbd5e1',
                  fontSize: '0.84rem',
                  color: '#0f172a',
                  lineHeight: 1.5,
                  boxSizing: 'border-box',
                  resize: 'vertical'
                }}
              />

              {/* Action Bar with Target Status and Send Button */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                <div style={{ fontSize: '0.74rem', color: '#64748b' }}>
                  Ziel-Status nach Absenden: <strong style={{ color: '#0f172a' }}>{FEEDBACK_STATUSES.find(s => s.id === (pendingStatus || selectedItem.status))?.label}</strong>
                </div>

                <button
                  type="button"
                  disabled={isSendingResponse || !currentResponseText.trim()}
                  onClick={() => handleSaveAdminResponse(selectedItem.id, currentResponseText, pendingStatus || selectedItem.status)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '9px 18px',
                    borderRadius: '10px',
                    border: 'none',
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    color: '#ffffff',
                    fontSize: '0.80rem',
                    fontWeight: 800,
                    cursor: (isSendingResponse || !currentResponseText.trim()) ? 'not-allowed' : 'pointer',
                    opacity: (!currentResponseText.trim()) ? 0.6 : 1,
                    boxShadow: 'none',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {isSendingResponse ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
                  <span>{isSendingResponse ? 'Wird gespeichert...' : 'Antwort speichern & SLA erfüllen'}</span>
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
                  boxShadow: 'none'
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
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Update im Briefing-Dashboard veröffentlichen"
          onClick={() => setIsReleaseModalOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 999999,
            backgroundColor: 'rgba(15, 23, 42, 0.7)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px'
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
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
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Megaphone size={20} color="#0f172a" />
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>
                  Update im Briefing-Dashboard veröffentlichen
                </h3>
              </div>
              <button
                type="button"
                aria-label="Schließen"
                onClick={() => setIsReleaseModalOpen(false)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}
              >
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
                  placeholder="z.B. Realisiert dank einer Idee aus dem Partner-Netzwerk"
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
                    onChange={(e) => setReleasePlatform(e.target.value as 'all' | 'campus' | 'groovelab')}
                    style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', boxSizing: 'border-box' }}
                  >
                    <option value="all">Alle (Campus &amp; GrooveLab)</option>
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
