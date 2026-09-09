import React from "react";
import {
  Award, Calendar, Clock, Library, Music, Shield,
  Star, TrendingUp, Users, X, Zap
} from "lucide-react";
import { PieChart as RechartsPieChart, Pie, Cell, Tooltip } from "recharts";
import { maskLastName } from "../../utils/nameHelper";

const getSimulatedNow = (): Date => {
  const simStr = typeof window !== "undefined" ? localStorage.getItem("groovelab_simulated_date") : null;
  if (!simStr) return new Date();
  const parts = simStr.split("-").map(Number);
  if (parts.length !== 3 || isNaN(parts[0])) return new Date();
  const baseSim = new Date(parts[0], parts[1] - 1, parts[2], 14, 0, 0);
  const simStartTime = Number(localStorage.getItem("groovelab_simulated_start_timestamp") || Date.now());
  const elapsedMinutes = Math.floor((Date.now() - simStartTime) / 60000);
  return new Date(baseSim.getTime() + elapsedMinutes * 60000);
};

export const ADMIN_INSTRUMENT_ICONS: Record<string, any> = { 
  "Guitar": "🎸", 
  "E-Gitarre": "🎸", 
  "Bass": "🎸", 
  "E-Bass": "🎸", 
  "Drums": "🥁", 
  "E-Drums": "🥁", 
  "Vocals": "🎤", 
  "Gesang": "🎤", 
  "Piano / Keys": "🎹", 
  "Piano": "🎹", 
  "Keys": "🎹", 
  "E-Piano": "🎹", 
  "Klavier": "🎹" 
};

export interface AdminStatsViewProps {
  activePlatform: string;
  admin: any;
  userId: string;
  students: any[];
  teachers: any[];
  stats: any;
  isMobile: boolean;
  showRealNames: boolean;
  showAddGoalForm: boolean;
  setShowAddGoalForm: (val: boolean) => void;
  newGoalTitle: string;
  setNewGoalTitle: (val: string) => void;
  newGoalMinutes: string;
  setNewGoalMinutes: (val: string) => void;
  newGoalDeadline: string;
  setNewGoalDeadline: (val: string) => void;
  handleAddGoal: (e: React.FormEvent) => Promise<void>;
  handleDeleteGoal: (goalId: string) => Promise<void>;
  resolveUserAvatar: (u: any, activePlatform?: string) => string;
}

export const AdminStatsView: React.FC<AdminStatsViewProps> = ({
  activePlatform,
  admin,
  userId,
  students,
  teachers,
  stats,
  isMobile,
  showRealNames,
  showAddGoalForm,
  setShowAddGoalForm,
  newGoalTitle,
  setNewGoalTitle,
  newGoalMinutes,
  setNewGoalMinutes,
  newGoalDeadline,
  setNewGoalDeadline,
  handleAddGoal,
  handleDeleteGoal,
  resolveUserAvatar
}) => {
  const brandColor = activePlatform === "campus" ? "#34a853" : (activePlatform === "groovelab" ? "#eab308" : "#ea4335");
    if (!stats) return (
      <div style={{ textAlign: 'center', padding: '60px' }}>
        <div style={{ fontSize: '1.2rem', color: '#64748b', fontWeight: 600 }}>Lade Statistiken...</div>
      </div>
    );

    const getExactLogSeconds = (log: any): number => {
      if (!log) return 0;
      if (typeof log.duration_seconds === 'number' && log.duration_seconds > 0) return log.duration_seconds;
      if (typeof log.duration_minutes === 'number' && log.duration_minutes > 0) return log.duration_minutes * 60;
      return 0;
    };

    const secondsToDisplayMinutes = (totalSeconds: number): number => {
      if (!totalSeconds || totalSeconds <= 0) return 0;
      return Math.round(totalSeconds / 60);
    };

    const formatMins = (mins: number) => {
      if (mins < 60) return `${Math.round(mins)} Min.`;
      const hrs = Math.floor(mins / 60);
      const rem = Math.round(mins % 60);
      return rem > 0 ? `${hrs} Std. ${rem} Min.` : `${hrs} Std.`;
    };

    // Formatted reset date
    const resetFormatted = stats.resetDateStr 
      ? new Date(stats.resetDateStr).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
      : null;

    if (activePlatform === 'campus') {
      const brandColor = '#34a853';
      const now = getSimulatedNow();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();
      const startOfCurrentMonth = new Date(currentYear, currentMonth, 1, 0, 0, 0, 0);

      // Academic Year Start (Sep 1st)
      const startYear = currentMonth >= 8 ? currentYear : currentYear - 1;
      const annualStartDate = new Date(startYear, 8, 1, 0, 0, 0, 0);

      // Rolling 7 days for weekly team practice
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      const isTeacherDashboardMode = admin?.role === 'teacher' || (typeof window !== 'undefined' && (sessionStorage.getItem('groovelab_active_workspace') === 'teacher' || localStorage.getItem('groovelab_active_workspace') === 'teacher')) || userId === 'teacher';
      const myStudentsList = isTeacherDashboardMode ? (students || []) : (students || []).filter((s: any) => s.teacher_id === userId);
      const classmateIds = myStudentsList.map((s: any) => s.id);
      const classCount = classmateIds.length;

      const classFocusLogs = stats?.focusLogs || [];

      // 1. Current Month Practice Minutes
      const currentMonthSecs = classFocusLogs.filter((log: any) => {
        if (!log.created_at) return false;
        const d = new Date(log.created_at);
        return classmateIds.includes(log.user_id) && d >= startOfCurrentMonth && d <= now;
      }).reduce((sum: number, log: any) => sum + getExactLogSeconds(log), 0);
      const currentMonthMins = secondsToDisplayMinutes(currentMonthSecs);

      // 2. Weekly Practice Minutes (Rolling 7 days)
      const classWeeklySecs = classFocusLogs.filter((log: any) => {
        if (!log.created_at) return false;
        const d = new Date(log.created_at);
        return classmateIds.includes(log.user_id) && d >= oneWeekAgo && d <= now;
      }).reduce((sum: number, log: any) => sum + getExactLogSeconds(log), 0);
      const classWeeklyMins = secondsToDisplayMinutes(classWeeklySecs);

      // 3. Annual Academic Year Practice Minutes (Sep - Aug)
      const classAnnualSecs = classFocusLogs.filter((log: any) => {
        if (!log.created_at) return false;
        const d = new Date(log.created_at);
        return classmateIds.includes(log.user_id) && d >= annualStartDate && d <= now;
      }).reduce((sum: number, log: any) => sum + getExactLogSeconds(log), 0);
      const classAnnualMins = secondsToDisplayMinutes(classAnnualSecs);

      const myClassMins = currentMonthMins;
      const otherClassMins = stats.otherClassMins || 0;
      const totalSchoolMins = myClassMins + otherClassMins;

      // Pie chart data
      const pieData = myClassMins === 0 && otherClassMins === 0 
        ? [
            { name: 'Unsere Klasse', value: 0.1, color: brandColor },
            { name: 'Restliche Schule', value: 0.9, color: '#e2e8f0' }
          ]
        : [
            { name: 'Unsere Klasse', value: myClassMins, color: brandColor },
            { name: 'Restliche Schule', value: otherClassMins, color: '#cbd5e1' }
          ];

      const contributionPercent = totalSchoolMins > 0 
        ? Math.round((myClassMins / totalSchoolMins) * 100) 
        : (myClassMins > 0 ? 100 : 0);

      return (
        <div style={{ marginTop: '0px', display: 'flex', flexDirection: 'column', gap: isMobile ? '16px' : '24px', width: '100%', maxWidth: '100%', boxSizing: 'border-box', overflowX: 'hidden', paddingBottom: isMobile ? '120px' : '0px' }}>
          {/* Top Section: Header & Contribution */}
          <div className="pwa-adaptive-grid" style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '2.2fr 1.2fr', gap: isMobile ? '16px' : '32px', alignItems: 'stretch', width: '100%', boxSizing: 'border-box' }}>
            {/* Top Left: Header and 3 Focused Pedagogical Hero Cards (Tier-1 Apple Master-Standard) */}
            <div className="glass-panel" style={{ padding: isMobile ? '16px' : '20px 24px', background: 'white', borderRadius: isMobile ? '24px' : '32px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', width: '100%', boxSizing: 'border-box' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '18px' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: `${brandColor}15`, color: brandColor, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Award size={24} />
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <h2 style={{ fontSize: isMobile ? '1.35rem' : '1.75rem', fontWeight: 900, color: '#1e293b', margin: 0, wordBreak: 'break-word' }}>Highlights &amp; Fortschritt</h2>
                  <p style={{ color: '#64748b', margin: '3px 0 0 0', fontWeight: 600, fontSize: isMobile ? '0.8rem' : '0.9rem' }}>Feiere die Lernfortschritte deiner Klasse und stärke die Motivation durch positives Feedback.</p>
                </div>
              </div>

              {/* 3 Focused Hero Cards (Pädagogisch wertschätzend & DSGVO-konform) */}
              <div className="stat-cards-grid" style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: '12px', width: '100%', boxSizing: 'border-box' }}>
                {/* Card 1: Deine Schüler */}
                <div style={{ padding: '14px 16px', background: '#f8fafc', borderRadius: '20px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '96px', width: '100%', boxSizing: 'border-box' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Deine Schüler</span>
                    <div style={{ padding: '6px', borderRadius: '10px', background: '#e6f4ea', color: '#34a853', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Users size={16} />
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '1.4rem', fontWeight: 950, color: '#0f172a', letterSpacing: '-0.02em', marginTop: '4px' }}>
                      {classCount} <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#475569' }}>Schüler</span>
                    </div>
                    <div style={{ fontSize: '0.74rem', fontWeight: 700, color: '#166534', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      Gemeinsam im Team
                    </div>
                  </div>
                </div>

                {/* Card 2: Diese Woche im Team */}
                <div style={{ padding: '14px 16px', background: '#f8fafc', borderRadius: '20px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '96px', width: '100%', boxSizing: 'border-box' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Diese Woche im Team</span>
                    <div style={{ padding: '6px', borderRadius: '10px', background: '#e6f4ea', color: '#34a853', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Clock size={16} />
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '1.4rem', fontWeight: 950, color: '#0f172a', letterSpacing: '-0.02em', marginTop: '4px' }}>
                      {formatMins(classWeeklyMins)}
                    </div>
                    <div style={{ fontSize: '0.74rem', fontWeight: 700, color: '#166534', marginTop: '2px' }}>
                      Jede Minute zählt fürs Team
                    </div>
                  </div>
                </div>

                {/* Card 3: Schuljahr Gesamt */}
                <div style={{ padding: '14px 16px', background: '#f8fafc', borderRadius: '20px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '96px', width: '100%', boxSizing: 'border-box' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Schuljahr Gesamt</span>
                    <div style={{ padding: '6px', borderRadius: '10px', background: '#e6f4ea', color: '#34a853', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Award size={16} />
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '1.4rem', fontWeight: 950, color: '#0f172a', letterSpacing: '-0.02em', marginTop: '4px' }}>
                      {formatMins(classAnnualMins)}
                    </div>
                    <div style={{ fontSize: '0.74rem', fontWeight: 700, color: '#166534', marginTop: '2px' }}>
                      Klassen-Pool (Sep – Aug)
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Top Right: Donut Chart (Gemeinsamer Schul-Beitrag) */}
            <div className="glass-panel" style={{ padding: isMobile ? '16px' : '20px 24px', background: 'white', borderRadius: isMobile ? '24px' : '32px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100%', boxSizing: 'border-box' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 900, color: '#1e293b', width: '100%', marginBottom: '4px', textAlign: 'left' }}>
                Gemeinsamer Schul-Beitrag
              </h3>
              <p style={{ fontSize: '0.75rem', color: '#64748b', width: '100%', margin: '0 0 12px 0', textAlign: 'left', fontWeight: 600 }}>
                Wie viel trägt deine Klasse bei?
              </p>

              <div style={{ width: '100%', height: '130px', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                <RechartsPieChart width={130} height={130}>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={42}
                    outerRadius={58}
                    paddingAngle={myClassMins > 0 && otherClassMins > 0 ? 3 : 0}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => formatMins(Number(value))} />
                </RechartsPieChart>
                
                <div style={{ position: 'absolute', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontSize: '1.25rem', fontWeight: 950, color: '#0f172a', lineHeight: 1 }}>
                    {contributionPercent}%
                  </span>
                  <span style={{ fontSize: '0.62rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '2px' }}>
                    Anteil
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', width: '100%', marginTop: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 10px', background: '#f8fafc', borderRadius: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div style={{ width: '10px', height: '10px', borderRadius: '3px', background: brandColor }} />
                    <span style={{ fontSize: '0.72rem', fontWeight: 750, color: '#334155' }}>Unsere Klasse</span>
                  </div>
                  <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#0f172a' }}>{formatMins(myClassMins)}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 10px', background: '#f8fafc', borderRadius: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div style={{ width: '10px', height: '10px', borderRadius: '3px', background: '#cbd5e1' }} />
                    <span style={{ fontSize: '0.72rem', fontWeight: 750, color: '#64748b' }}>Restliche Schule</span>
                  </div>
                  <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#64748b' }}>{formatMins(otherClassMins)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Grid Section: Goals | Highlights | Annual Stats */}
          <div className="pwa-adaptive-grid" style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1.2fr 1.2fr', gap: isMobile ? '16px' : '32px', alignItems: 'stretch', width: '100%', boxSizing: 'border-box' }}>
            
            {/* Column 1: Übe-Ziele der Klasse */}
            <div className="glass-panel" style={{ padding: isMobile ? '16px' : '32px', background: 'white', borderRadius: isMobile ? '24px' : '32px', border: '1px solid #e2e8f0', width: '100%', boxSizing: 'border-box' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 900, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                  <span>🌱</span> Übe-Ziele der Klasse
                </h3>
                <button 
                  onClick={() => setShowAddGoalForm(!showAddGoalForm)}
                  style={{ background: brandColor, color: 'white', border: 'none', padding: '6px 12px', borderRadius: '10px', fontSize: '0.75rem', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                  className="hover-scale"
                >
                  <span>{showAddGoalForm ? 'Abbrechen' : '+ Ziel'}</span>
                </button>
              </div>

              {showAddGoalForm && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', background: '#f8fafc', padding: '20px', borderRadius: '20px', border: '1px solid #e2e8f0', marginBottom: '24px' }}>
                  <h4 style={{ fontSize: '0.85rem', fontWeight: 900, color: '#0f172a', margin: 0 }}>Neues Ziel erstellen</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label style={{ fontSize: '0.7rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Titel des Ziels</label>
                    <input 
                      type="text" 
                      aria-label="Titel des Ziels"
                      value={newGoalTitle} 
                      onChange={(e) => setNewGoalTitle(e.target.value)} 
                      placeholder="z.B. Wochenziel, Ferien-Challenge"
                      style={{ padding: '10px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.82rem', fontWeight: 600 }}
                    />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <label style={{ fontSize: '0.7rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Ziel (Minuten)</label>
                      <input 
                        type="number" 
                        min="1"
                        aria-label="Ziel in Minuten"
                        value={newGoalMinutes} 
                        onChange={(e) => setNewGoalMinutes(e.target.value)} 
                        style={{ padding: '10px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.82rem', fontWeight: 700 }}
                      />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <label style={{ fontSize: '0.7rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Deadline (optional)</label>
                      <input 
                        type="date" 
                        aria-label="Deadline (optional)"
                        value={newGoalDeadline} 
                        onChange={(e) => setNewGoalDeadline(e.target.value)} 
                        style={{ padding: '10px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.82rem', fontWeight: 600 }}
                      />
                    </div>
                  </div>
                  <button 
                    onClick={handleAddGoal}
                    style={{ background: brandColor, color: 'white', border: 'none', padding: '10px', borderRadius: '10px', fontSize: '0.8rem', fontWeight: 800, cursor: 'pointer', marginTop: '4px' }}
                  >
                    Ziel hinzufügen
                  </button>
                </div>
              )}

              {(() => {
                const targets = stats?.weeklyTargets || [];
                const totalGoals = targets.length;
                const masteredGoals = targets.filter((target: any) => {
                  const targetProgressMins = target.title?.toLowerCase().includes('woche') ? classWeeklyMins : currentMonthMins;
                  const targetPercent = Math.round((targetProgressMins / target.minutes) * 100);
                  return targetPercent >= 100;
                }).length;
                const highestPercent = targets.length > 0 
                  ? Math.max(...targets.map((target: any) => {
                      const targetProgressMins = target.title?.toLowerCase().includes('woche') ? classWeeklyMins : currentMonthMins;
                      return Math.round((targetProgressMins / target.minutes) * 100);
                    }))
                  : 0;

                return (
                  <>
                    {totalGoals > 0 && (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', background: '#f8fafc', padding: '12px', borderRadius: '16px', marginBottom: '20px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                          <span style={{ fontSize: '0.62rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.03em' }}>Missionen</span>
                          <span style={{ fontSize: '1.05rem', fontWeight: 900, color: '#1e293b', marginTop: '2px' }}>{totalGoals}</span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', borderLeft: '1px solid #e2e8f0', borderRight: '1px solid #e2e8f0' }}>
                          <span style={{ fontSize: '0.62rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.03em' }}>Geknackt</span>
                          <span style={{ fontSize: '1.05rem', fontWeight: 900, color: '#34a853', marginTop: '2px' }}>{masteredGoals}</span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                          <span style={{ fontSize: '0.62rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.03em' }}>Peak</span>
                          <span style={{ fontSize: '1.05rem', fontWeight: 900, color: brandColor, marginTop: '2px' }}>{highestPercent}%</span>
                        </div>
                      </div>
                    )}

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      {totalGoals === 0 ? (
                        <p style={{ fontSize: '0.8rem', color: '#64748b', textAlign: 'center', margin: '20px 0', fontWeight: 600 }}>
                          Keine aktiven Ziele angelegt.
                        </p>
                      ) : (
                        targets.map((target: any) => {
                          const targetProgressMins = target.title?.toLowerCase().includes('woche') ? classWeeklyMins : currentMonthMins;
                          const targetPercent = Math.round((targetProgressMins / target.minutes) * 100);
                          const isDeadlinePassed = target.deadline ? new Date(target.deadline) < new Date() : false;
                          
                          const maxPercentOnBar = 133;
                          const visualWidth = Math.min(100, (targetPercent / maxPercentOnBar) * 100);
                          const isAchieved = targetPercent >= 100;

                          return (
                            <div key={target.id} style={{
                              position: 'relative',
                              display: 'flex',
                              flexDirection: 'column',
                              background: '#34a853',
                              boxShadow: '0 6px 20px rgba(52, 168, 83, 0.12)',
                              borderRadius: '16px',
                              padding: '12px 14px',
                              gap: '8px'
                            }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: 1 }}>
                                  <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#ffffff', letterSpacing: '-0.01em', lineHeight: '1.25' }}>
                                    {target.title || 'Challenge'}
                                  </span>
                                  {target.deadline && (
                                    <span style={{ fontSize: '0.62rem', fontWeight: 500, color: isDeadlinePassed ? '#ff8780' : 'rgba(255, 255, 255, 0.75)', lineHeight: '1.2' }}>
                                      bis {new Date(target.deadline).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })}
                                      {isDeadlinePassed && ' (abgelaufen)'}
                                    </span>
                                  )}
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                                  <span style={{ fontSize: '1.1rem', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.02em', fontFeatureSettings: '"tnum"' }}>
                                    {targetPercent}%
                                  </span>
                                  <button 
                                    onClick={() => handleDeleteGoal(target.id)}
                                    aria-label={`Ziel ${target.title || 'Challenge'} löschen`}
                                    style={{ background: 'rgba(255, 255, 255, 0.15)', border: 'none', color: '#ffffff', cursor: 'pointer', padding: '4px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                    title="Ziel löschen"
                                  >
                                    <X size={12} strokeWidth={2.5} />
                                  </button>
                                </div>
                              </div>

                              <div style={{ position: 'relative', height: '6px', background: 'rgba(255, 255, 255, 0.2)', borderRadius: '99px' }}>
                                <div style={{
                                  width: `${visualWidth}%`,
                                  height: '100%',
                                  background: '#ffffff',
                                  borderRadius: '99px',
                                  transition: 'width 1.2s cubic-bezier(0.16, 1, 0.3, 1)',
                                  boxShadow: '0 0 6px rgba(255, 255, 255, 0.25)'
                                }} />
                              </div>

                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.68rem', gap: '10px' }}>
                                <span style={{ color: 'rgba(255, 255, 255, 0.9)', fontFeatureSettings: '"tnum"', fontWeight: 500, whiteSpace: 'normal' }}>
                                  <span style={{ fontWeight: 700, color: '#ffffff' }}>{formatMins(targetProgressMins)}</span> von {target.minutes} Min.
                                </span>
                                <span style={{
                                  fontWeight: 700,
                                  color: isAchieved ? '#e6f4ea' : 'rgba(255, 255, 255, 0.8)',
                                  whiteSpace: 'normal',
                                  textAlign: 'right'
                                }}>
                                  {isAchieved ? 'Erreicht 🎉' : `Noch ${Math.max(0, target.minutes - targetProgressMins)} Min.`}
                                </span>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </>
                );
              })()}
            </div>

            {/* Column 2: Helden-Momente */}
            <div className="glass-panel" style={{ padding: '32px', background: 'white', borderRadius: '32px', border: '1px solid #e2e8f0', minHeight: '350px', boxShadow: '0 4px 20px rgba(0,0,0,0.01)' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 900, color: '#1e293b', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                <span>✨</span> Helden-Momente
              </h3>
              <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '4px 0 20px 0', fontWeight: 600 }}>
                Besondere Meilensteine und Fleiß-Highlights deiner Schüler aus dem aktuellen Monat.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {(stats?.highlights || []).length === 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 20px', textAlign: 'center', background: '#f8fafc', borderRadius: '24px', border: '1px dashed #cbd5e1' }}>
                    <span style={{ fontSize: '2.5rem', marginBottom: '16px' }}>🤫</span>
                    <h4 style={{ fontSize: '0.9rem', fontWeight: 800, color: '#475569', margin: '0 0 6px 0' }}>Ruhe vor dem Sturm</h4>
                    <p style={{ fontSize: '0.78rem', color: '#64748b', maxWidth: '300px', margin: 0, lineHeight: 1.4 }}>
                      Sobald deine Schüler diesen Monat fleißig üben oder Challenges meistern, erscheinen ihre Erfolge hier!
                    </p>
                  </div>
                ) : (
                  (stats.highlights || []).map((hl: any, idx: number) => {
                    return (
                      <div 
                        key={idx} 
                        style={{ 
                          padding: '14px 18px', 
                          background: '#f8fafc', 
                          borderRadius: '16px', 
                          border: '1px solid #e2e8f0', 
                          display: 'flex', 
                          alignItems: 'center',
                          gap: '14px',
                          transition: 'transform 0.2s, box-shadow 0.2s',
                          cursor: 'default'
                        }}
                        className="hover-scale"
                      >
                        <span style={{ fontSize: '1.6rem', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          {hl.emoji}
                        </span>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: '8px' }}>
                            <span style={{ fontSize: '0.82rem', fontWeight: 900, color: '#0f172a' }}>{hl.studentName}</span>
                            <span style={{ fontSize: '0.65rem', fontWeight: 900, color: brandColor, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                              {hl.title}
                            </span>
                          </div>
                          <p style={{ fontSize: '0.75rem', color: '#64748b', margin: '3px 0 0 0', lineHeight: 1.3, fontWeight: 550 }}>
                            {hl.text}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Column 3: Jahresstatistik */}
            <div className="glass-panel" style={{ padding: isMobile ? '16px' : '32px', background: 'white', borderRadius: isMobile ? '24px' : '32px', border: '1px solid #e2e8f0', boxShadow: '0 4px 20px rgba(0,0,0,0.01)', width: '100%', boxSizing: 'border-box' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px' }}>
                <div style={{ background: '#e6f4ea', color: '#34a853', padding: '8px', borderRadius: '12px' }}>
                  <Calendar size={18} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 900, color: '#1e293b', margin: 0 }}>
                    Jahres-Statistik
                  </h3>
                  <p style={{ fontSize: '0.7rem', color: '#475569', margin: '2px 0 0 0', fontWeight: 600 }}>
                    Übeminuten (Sep - Aug)
                  </p>
                </div>
              </div>

              {(() => {
                const now = getSimulatedNow();
                const currentMonth = now.getMonth();
                const startYear = currentMonth >= 8 ? now.getFullYear() : now.getFullYear() - 1;
                const monthsList = [
                  { month: 8, label: 'Sep', year: startYear },
                  { month: 9, label: 'Okt', year: startYear },
                  { month: 10, label: 'Nov', year: startYear },
                  { month: 11, label: 'Dez', year: startYear },
                  { month: 0, label: 'Jan', year: startYear + 1 },
                  { month: 1, label: 'Feb', year: startYear + 1 },
                  { month: 2, label: 'Mrz', year: startYear + 1 },
                  { month: 3, label: 'Apr', year: startYear + 1 },
                  { month: 4, label: 'Mai', year: startYear + 1 },
                  { month: 5, label: 'Jun', year: startYear + 1 },
                  { month: 6, label: 'Jul', year: startYear + 1 },
                  { month: 7, label: 'Aug', year: startYear + 1 }
                ];

                const isTeacherDashboardMode = admin?.role === 'teacher' || (typeof window !== 'undefined' && (sessionStorage.getItem('groovelab_active_workspace') === 'teacher' || localStorage.getItem('groovelab_active_workspace') === 'teacher')) || userId === 'teacher';
                const myStudentsList = isTeacherDashboardMode ? (students || []) : (students || []).filter((s: any) => s.teacher_id === userId);
                const classmateIds = myStudentsList.map((s: any) => s.id);
                const classFocusLogs = stats?.focusLogs || [];

                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                      {monthsList.map(item => {
                        const logsForMonth = classFocusLogs.filter((log: any) => {
                          if (!log.created_at) return false;
                          const logDate = new Date(log.created_at);
                          return classmateIds.includes(log.user_id) && logDate.getMonth() === item.month && logDate.getFullYear() === item.year;
                        });
                        const totalSecs = logsForMonth.reduce((sum: number, log: any) => {
                          return sum + getExactLogSeconds(log);
                        }, 0);

                        const minutes = secondsToDisplayMinutes(totalSecs);

                        // Heatmap calculations
                        let bg = '#f8fafc';
                        let border = '1px solid #e2e8f0';
                        let labelColor = '#475569';
                        let textColor = '#64748b';
                        let numColor = '#1e293b';
                        let shadow = 'none';

                        if (minutes > 0) {
                          if (minutes <= 15) {
                            bg = 'linear-gradient(135deg, #e6f4ea 0%, #e6fbf0 100%)';
                            border = '1px solid #e6f4ea';
                            labelColor = '#34a853';
                            textColor = '#34a853';
                            numColor = '#34a853';
                            shadow = '0 2px 6px rgba(52, 168, 83, 0.04)';
                          } else if (minutes <= 60) {
                            bg = 'linear-gradient(135deg, #e6f4ea 0%, #e6f4ea 100%)';
                            border = '1px solid #e6f4ea';
                            labelColor = '#34a853';
                            textColor = '#34a853';
                            numColor = '#34a853';
                            shadow = '0 3px 8px rgba(52, 168, 83, 0.07)';
                          } else if (minutes <= 180) {
                            bg = 'linear-gradient(135deg, #e6f4ea 0%, #e6f4ea 100%)';
                            border = '1px solid #e6f4ea';
                            labelColor = '#34a853';
                            textColor = '#34a853';
                            numColor = '#34a853';
                            shadow = '0 4px 12px rgba(52, 168, 83, 0.12)';
                          } else {
                            bg = 'linear-gradient(135deg, #34a853 0%, #34a853 100%)';
                            border = '1px solid #34a853';
                            labelColor = 'rgba(255, 255, 255, 0.8)';
                            textColor = 'rgba(255, 255, 255, 0.9)';
                            numColor = '#ffffff';
                            shadow = '0 6px 15px rgba(52, 168, 83, 0.25)';
                          }
                        }

                        return (
                          <div 
                            key={`${item.month}-${item.year}`}
                            style={{
                              background: bg,
                              border: border,
                              borderRadius: '16px',
                              padding: '12px 4px',
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '3px',
                              minHeight: '66px',
                              textAlign: 'center',
                              boxShadow: shadow,
                              transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)'
                            }}
                          >
                            <span style={{ fontSize: '0.62rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', color: labelColor }}>
                              {item.label}
                            </span>
                            <span style={{ fontSize: '1.05rem', fontWeight: 950, color: numColor, fontFeatureSettings: '"tnum"', letterSpacing: '-0.02em' }}>
                              {minutes}<span style={{ fontSize: '0.72rem', fontWeight: 700, color: textColor, marginLeft: '1px' }}>m</span>
                            </span>
                          </div>
                        );
                      })}
                    </div>

                    {/* Legend */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap', gap: '8px 12px', background: '#f8fafc', padding: '10px 14px', borderRadius: '14px', border: '1px solid #e2e8f0', marginTop: '6px' }}>
                      <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.03em' }}>Heatmap:</span>
                      {[
                        { color: '#f8fafc', label: '0m', border: '#e2e8f0' },
                        { color: '#e6f4ea', label: '<15m', border: '#e6f4ea' },
                        { color: '#e6f4ea', label: '<1h', border: '#e6f4ea' },
                        { color: '#e6f4ea', label: '<3h', border: '#e6f4ea' },
                        { color: '#34a853', label: '3h+', border: '#34a853' }
                      ].map(pill => (
                        <div key={pill.label} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: pill.color, border: `1px solid ${pill.border}` }} />
                          <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#64748b' }}>{pill.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </div>

          </div>
        </div>
      );
    }

    return (
      <div style={{ marginTop: '0px', display: 'flex', flexDirection: 'column', gap: '32px' }}>
        {/* Top Header Card */}
        <div className="glass-panel" style={{ padding: '32px', background: 'white', borderRadius: '32px', border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '32px' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: `${brandColor}15`, color: brandColor, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <TrendingUp size={24} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.75rem', fontWeight: 900, color: '#1e293b', margin: 0 }}>Akademie-Statistiken</h2>
              <p style={{ color: '#64748b', margin: 0, fontWeight: 600, fontSize: '0.9rem' }}>Echtzeit-Einblicke in die Übe-Aktivität und Repertoire-Erfolge deiner Schule.</p>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' }}>
            {[
              { label: 'Schüler Gesamt', value: stats.studentCount, icon: Users, color: '#34a853', bg: '#e6f4ea' },
              { label: 'Songs in Library', value: stats.songCount, icon: Music, color: '#3b82f6', bg: '#eff6ff' },
              { label: 'Team-Mitglieder', value: teachers.length, icon: Shield, color: '#8b5cf6', bg: '#f5f3ff' },
              { 
                label: 'Zeit im Lab', 
                value: formatMins(stats.labMins), 
                icon: Clock, 
                color: '#f59e0b', 
                bg: '#fffbeb', 
                subText: resetFormatted ? `Seit Reset: ${resetFormatted}` : 'Seit Installation' 
              }
            ].map((stat, idx) => (
              <div key={idx} style={{ padding: '24px', background: stat.bg, borderRadius: '24px', border: `1px solid ${stat.color}15`, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '130px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{stat.label}</span>
                  <div style={{ padding: '8px', borderRadius: '10px', background: 'white', color: stat.color, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 10px rgba(0,0,0,0.02)' }}>
                    <stat.icon size={18} />
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '1.75rem', fontWeight: 950, color: '#0f172a', letterSpacing: '-0.02em', marginTop: '12px' }}>{stat.value}</div>
                  {stat.subText && (
                    <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#a1a1aa', marginTop: '4px' }}>{stat.subText}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Middle: Challenges & Wochentage Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1.2fr 1fr', gap: '32px' }}>
          
          {/* Left: Challenges per Instrument */}
          <div className="glass-panel" style={{ padding: '32px', background: 'white', borderRadius: '32px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 900, color: '#1e293b', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Award size={20} color={brandColor} /> Gemeisterte Challenges (Stage Ready)
            </h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', flex: 1, justifyContent: 'center' }}>
              {[
                { name: 'E-Gitarre', value: stats.stageReadyPerInst?.guitar || 0, iconKey: 'E-Gitarre', color: '#ef4444' }, // Red
                { name: 'E-Piano / Keys', value: stats.stageReadyPerInst?.keys || 0, iconKey: 'E-Piano', color: '#a855f7' }, // Purple
                { name: 'E-Drums', value: stats.stageReadyPerInst?.drums || 0, iconKey: 'E-Drums', color: '#3b82f6' }, // Blue
                { name: 'E-Bass', value: stats.stageReadyPerInst?.bass || 0, iconKey: 'E-Bass', color: '#eab308' }, // Yellow
                { name: 'Vocals / Gesang', value: stats.stageReadyPerInst?.vocals || 0, iconKey: 'Vocals', color: '#ec4899' } // Pink
              ].map((inst, idx) => {
                const maxVal = Math.max(...Object.values(stats.stageReadyPerInst || {}).map(Number), 1);
                const percent = Math.round((inst.value / maxVal) * 100);
                
                return (
                  <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.875rem', fontWeight: 800, color: '#334155' }}>
                        <span style={{ display: 'flex', alignItems: 'center', width: '20px', height: '20px', color: inst.color }}>
                          {ADMIN_INSTRUMENT_ICONS[inst.iconKey]}
                        </span>
                        <span>{inst.name}</span>
                      </div>
                      <span style={{ background: `${inst.color}15`, color: inst.color, padding: '2px 10px', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 900 }}>
                        {inst.value} Meister
                      </span>
                    </div>
                    <div style={{ width: '100%', height: '10px', background: '#f1f5f9', borderRadius: '5px', overflow: 'hidden' }}>
                      <div style={{ width: `${Math.max(3, percent)}%`, height: '100%', background: inst.color, borderRadius: '5px', transition: 'width 1s ease-out' }}></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right: Weekday Attendance */}
          <div className="glass-panel" style={{ padding: '32px', background: 'white', borderRadius: '32px', border: '1px solid #e2e8f0' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 900, color: '#1e293b', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Calendar size={20} color={brandColor} /> Auslastung nach Wochentag
            </h3>
            
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', height: '220px', padding: '0 10px 10px 10px', borderBottom: '1px solid #e2e8f0' }}>
              {(stats.weekdayData || []).map((dayData: any, idx: number) => {
                const maxMins = Math.max(...(stats.weekdayData || []).map((d: any) => d.mins), 1);
                const heightPercent = Math.round((dayData.mins / maxMins) * 100);

                return (
                  <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', width: '40px' }}>
                    <div style={{ fontSize: '0.7rem', fontWeight: 800, color: brandColor }}>
                      {dayData.mins}h
                    </div>
                    <div style={{ 
                      width: '100%', 
                      height: `${Math.max(6, heightPercent * 1.5)}px`, 
                      maxHeight: '150px',
                      background: `linear-gradient(180deg, ${brandColor} 0%, ${brandColor}60 100%)`, 
                      borderRadius: '8px 8px 0 0',
                      transition: 'all 0.5s ease'
                    }}></div>
                    <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b' }}>
                      {dayData.day}
                    </div>
                  </div>
                );
              })}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#475569', textAlign: 'center', marginTop: '12px', fontWeight: 600 }}>
              Übe-Stunden aufgeteilt nach Wochentagen.
            </div>
          </div>
        </div>

        {/* Bottom: Leaderboard & Popular Songs */}
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '32px' }}>
          
          {/* XP Leaderboard */}
          <div className="glass-panel" style={{ padding: '32px', background: 'white', borderRadius: '32px', border: '1px solid #e2e8f0' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 900, color: '#1e293b', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Zap size={20} color={brandColor} /> XP Leaderboard (Top 5 Schüler)
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {(stats.leaderboard || []).map((user: any, idx: number) => (
                <div key={user.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: '#f8fafc', borderRadius: '16px', border: '1px solid #f1f5f9' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ fontSize: '0.9rem', fontWeight: 900, color: idx === 0 ? '#f59e0b' : idx === 1 ? '#64748b' : idx === 2 ? '#b45309' : '#64748b', width: '20px' }}>
                      #{idx + 1}
                    </div>
                    <div style={{ 
                      width: '40px', 
                      height: '40px', 
                      borderRadius: '12px', 
                      overflow: 'hidden', 
                      border: '2px solid white', 
                      boxShadow: '0 4px 8px rgba(0,0,0,0.05)',
                      background: `${brandColor}15`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      position: 'relative'
                    }}>
                      <span style={{ fontSize: '1rem', fontWeight: 900, color: brandColor, position: 'absolute', zIndex: 0 }}>
                        {user.first_name?.[0] || 'S'}
                      </span>
                      <img 
                        src={resolveUserAvatar(user, activePlatform)} 
                        style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'relative', zIndex: 1 }} 
                        alt="" 
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                      />
                    </div>
                    <div style={{ fontWeight: 800, color: '#1e293b', fontSize: '0.9rem' }}>
                      {user.first_name} {maskLastName(user.last_name, showRealNames)}
                    </div>
                  </div>
                  <div style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)', color: 'white', padding: '6px 12px', borderRadius: '10px', fontSize: '0.75rem', fontWeight: 950, display: 'flex', alignItems: 'center', gap: '4px', boxShadow: '0 4px 10px rgba(245, 158, 11, 0.2)' }}>
                    <Star size={12} fill="white" /> {user.xp} XP
                  </div>
                </div>
              ))}
              {(stats.leaderboard || []).length === 0 && (
                <div style={{ textAlign: 'center', padding: '24px', color: '#475569', fontWeight: 600, fontSize: '0.85rem' }}>
                  Noch keine XP gesammelt.
                </div>
              )}
            </div>
          </div>

          {/* Popular Songs */}
          <div className="glass-panel" style={{ padding: '32px', background: 'white', borderRadius: '32px', border: '1px solid #e2e8f0' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 900, color: '#1e293b', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Music size={20} color={brandColor} /> Beliebteste Songs (Repertoire-Hits)
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {(stats.topSongs || []).map((song: any, idx: number) => {
                const parts = song.name.split(' - ');
                const title = parts[0];
                const artist = parts[1] || 'Unbekannt';

                return (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', background: '#f8fafc', borderRadius: '16px', border: '1px solid #f1f5f9' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                      <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: `${brandColor}10`, color: brandColor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '0.9rem' }}>
                        #{idx + 1}
                      </div>
                      <div>
                        <div style={{ fontWeight: 800, color: '#1e293b', fontSize: '0.9rem' }}>{title}</div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>{artist}</div>
                      </div>
                    </div>
                    <div style={{ background: '#eff6ff', color: '#2563eb', padding: '6px 12px', borderRadius: '10px', fontSize: '0.75rem', fontWeight: 850, border: '1px solid #dbeafe' }}>
                      {song.count} Schüler üben
                    </div>
                  </div>
                );
              })}
              {(stats.topSongs || []).length === 0 && (
                <div style={{ textAlign: 'center', padding: '40px', color: '#475569', fontWeight: 600, fontSize: '0.85rem' }}>
                  Noch keine Songs im Schüler-Repertoire.
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    );
};
