import React, { useState, useEffect } from 'react';
import { Sparkles, X, Trophy, Megaphone } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { PlatformAnnouncement } from '../../config/feedbackConfig';

interface UpdateAnnouncementHeroProps {
  userId?: string;
  activePlatform?: 'campus' | 'groovelab' | 'all' | string;
}

export const UpdateAnnouncementHero: React.FC<UpdateAnnouncementHeroProps> = ({
  userId,
  activePlatform = 'all'
}) => {
  const [announcement, setAnnouncement] = useState<PlatformAnnouncement | null>(null);
  const [isDismissed, setIsDismissed] = useState<boolean>(true);

  useEffect(() => {
    const fetchLatestAnnouncement = async () => {
      try {
        const { data, error } = await supabase
          .from('platform_announcements')
          .select('*')
          .eq('is_published', true)
          .order('created_at', { ascending: false })
          .limit(1);

        if (error) throw error;
        if (data && data.length > 0) {
          const item = data[0] as PlatformAnnouncement;
          
          // Check platform target
          if (item.target_platform !== 'all' && item.target_platform !== activePlatform) {
            return;
          }

          // Check if already dismissed locally
          const dismissKey = `cg_dismissed_announcement_${item.id}_${userId || 'anon'}`;
          const isHidden = typeof window !== 'undefined' && localStorage.getItem(dismissKey) === 'true';

          if (!isHidden) {
            setAnnouncement(item);
            setIsDismissed(false);
          }
        }
      } catch (err) {
        console.error('Error loading latest announcement:', err);
      }
    };

    fetchLatestAnnouncement();
  }, [userId, activePlatform]);

  const handleDismiss = () => {
    if (announcement) {
      const dismissKey = `cg_dismissed_announcement_${announcement.id}_${userId || 'anon'}`;
      if (typeof window !== 'undefined') {
        localStorage.setItem(dismissKey, 'true');
      }
      setIsDismissed(true);
    }
  };

  if (!announcement || isDismissed) return null;

  return (
    <div style={{
      background: '#ffffff',
      borderRadius: '20px',
      border: '1px solid #e2e8f0',
      boxShadow: '0 8px 24px -4px rgba(0,0,0,0.06)',
      padding: '20px 24px',
      marginBottom: '24px',
      position: 'relative',
      overflow: 'hidden',
      animation: 'fadeIn 0.3s ease-in-out'
    }}>
      {/* Top Tag & Close button */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px',
            padding: '3px 10px',
            borderRadius: '9999px',
            fontSize: '0.74rem',
            fontWeight: 800,
            background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
            color: '#1d4ed8',
            border: '1px solid #bfdbfe'
          }}>
            <Sparkles size={12} />
            {announcement.badge_tag || 'NEU IN CAMPUS-GROOVELAB'}
          </span>
          <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
            {new Date(announcement.created_at).toLocaleDateString('de-DE')}
          </span>
        </div>

        <button
          onClick={handleDismiss}
          style={{
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '50%',
            width: '28px',
            height: '28px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: '#64748b'
          }}
          title="Verstanden & Schließen"
        >
          <X size={14} />
        </button>
      </div>

      {/* Title */}
      <h3 style={{
        margin: '0 0 8px',
        fontSize: '1.15rem',
        fontWeight: 800,
        color: '#0f172a',
        letterSpacing: '-0.01em'
      }}>
        {announcement.title}
      </h3>

      {/* Summary */}
      <p style={{
        margin: '0 0 16px',
        fontSize: '0.92rem',
        color: '#334155',
        lineHeight: 1.5
      }}>
        {announcement.summary}
      </p>

      {/* Helden-Moment Credit Badge */}
      {announcement.hero_credit && (
        <div style={{
          background: 'linear-gradient(135deg, #fefce8 0%, #fef9c3 100%)',
          border: '1px solid #fef08a',
          borderRadius: '12px',
          padding: '10px 14px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}>
          <div style={{
            width: '28px',
            height: '28px',
            borderRadius: '50%',
            backgroundColor: '#facc15',
            color: '#713f12',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <Trophy size={15} />
          </div>
          <div style={{ fontSize: '0.84rem', fontWeight: 700, color: '#854d0e' }}>
            {announcement.hero_credit}
          </div>
        </div>
      )}
    </div>
  );
};
