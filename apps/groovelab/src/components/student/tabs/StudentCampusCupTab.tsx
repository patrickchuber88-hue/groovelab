import React from "react";
import { Award, Calendar, Clock, Users } from "lucide-react";
import { PieChart as RechartsPieChart, Pie, Cell, Tooltip } from "recharts";
import { getSimulatedNow, getExactLogSeconds, secondsToDisplayMinutes, formatMins } from "../studentDateUtils";

export interface StudentCampusCupTabProps {
  activeTab: string;
  rankingLoading: boolean;
  studentUser: any;
  sessionActive: boolean;
  secondsElapsed: number;
  classMins: number;
  classWeeklyFocus: number;
  otherClassMins: number;
  classmateIds?: string[];
  studentId: string;
  classFocusLogs: any[];
  classCount: number;
  classGoals: any[];
  classHighlights: any[];
  highlightsLoading: boolean;
  isMobile?: boolean;
}

export const StudentCampusCupTab: React.FC<StudentCampusCupTabProps> = ({
  activeTab,
  rankingLoading,
  studentUser,
  sessionActive,
  secondsElapsed,
  classMins,
  classWeeklyFocus,
  otherClassMins,
  classmateIds,
  studentId,
  classFocusLogs,
  classCount,
  classGoals,
  classHighlights,
  highlightsLoading,
  isMobile = false,
}) => {
  return (
      <div style={{ display: activeTab === 'campus_cup' ? 'flex' : 'none', flexDirection: 'column', gap: '32px' }}>
        {activeTab === 'campus_cup' && (
          rankingLoading ? (
            <div style={{ padding: '60px', textAlign: 'center', color: '#64748b', fontWeight: 600 }}>
              Highlights & Fortschritt werden geladen...
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }} className="animation-slide-up">
              
              {/* Top Section: Header & Contribution */}
              {(() => {
                const brandColor = studentUser?.schools?.brand_color || '#34a853';
                const activeSessionSecs = sessionActive ? secondsElapsed : 0;
                const liveClassMins = classMins + secondsToDisplayMinutes(activeSessionSecs);
                const liveClassWeeklyFocus = classWeeklyFocus + secondsToDisplayMinutes(activeSessionSecs);

                const totalSchoolMins = liveClassMins + otherClassMins;
                const contributionPercent = totalSchoolMins > 0 
                  ? Math.round((liveClassMins / totalSchoolMins) * 100) 
                  : 0;

                // MoM performance percentage
                const now = getSimulatedNow();
                const currentMonth = now.getMonth();
                const currentYear = now.getFullYear();
                const startOfCurrentMonth = new Date(currentYear, currentMonth, 1, 0, 0, 0, 0);
                const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
                const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;
                const startOfPreviousMonth = new Date(prevYear, prevMonth, 1, 0, 0, 0, 0);
                const daysElapsed = now.getDate();
                const limitOfPreviousMonth = new Date(prevYear, prevMonth, daysElapsed, now.getHours(), now.getMinutes(), now.getSeconds());

                const classmateAndSelfIds = Array.from(new Set([...(classmateIds || []), studentId]));

                const currentMonthSecs = classFocusLogs.filter(log => {
                  if (!log.created_at) return false;
                  const d = new Date(log.created_at);
                  const isClassmateOrSelf = classmateAndSelfIds.includes(log.user_id);
                  return isClassmateOrSelf && d >= startOfCurrentMonth && d <= now;
                }).reduce((sum, log) => sum + getExactLogSeconds(log), 0) + activeSessionSecs;
                const currentMonthMins = secondsToDisplayMinutes(currentMonthSecs);

                const previousMonthSecs = classFocusLogs.filter(log => {
                  if (!log.created_at) return false;
                  const d = new Date(log.created_at);
                  const isClassmateOrSelf = classmateAndSelfIds.includes(log.user_id);
                  return isClassmateOrSelf && d >= startOfPreviousMonth && d <= limitOfPreviousMonth;
                }).reduce((sum, log) => sum + getExactLogSeconds(log), 0);
                const previousMonthMins = secondsToDisplayMinutes(previousMonthSecs);

                const momPercent = previousMonthMins > 0
                  ? Math.round(((currentMonthMins - previousMonthMins) / previousMonthMins) * 100)
                  : (currentMonthMins > 0 ? 100 : 0);

                // Weekly activity rate
                const startOfWeek = new Date(now);
                const day = startOfWeek.getDay();
                const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1);
                startOfWeek.setDate(diff);
                startOfWeek.setHours(0, 0, 0, 0);

                const activeThisWeekCount = classmateAndSelfIds.filter(id => {
                  return classFocusLogs.some(log => {
                    if (!log.created_at) return false;
                    const d = new Date(log.created_at);
                    return log.user_id === id && d >= startOfWeek && d <= now;
                  });
                }).length;

                const effectiveClassCount = Math.max(classCount, classmateAndSelfIds.length);
                const activityRate = effectiveClassCount > 0
                  ? Math.round((activeThisWeekCount / effectiveClassCount) * 100)
                  : 0;

                const classAnnualSecs = classFocusLogs.filter(log => {
                  if (!log.created_at) return false;
                  const isClassmateOrSelf = classmateAndSelfIds.includes(log.user_id);
                  return isClassmateOrSelf;
                }).reduce((sum, log) => sum + getExactLogSeconds(log), 0) + activeSessionSecs;
                const classAnnualMins = secondsToDisplayMinutes(classAnnualSecs);

                const levelThresholds = [
                  { level: 1, mins: 0, title: 'Groove-Starter' },
                  { level: 2, mins: 60, title: 'Rhythmus-Team' },
                  { level: 3, mins: 180, title: 'Timing-Tigers' },
                  { level: 4, mins: 360, title: 'Sound-Magier' },
                  { level: 5, mins: 600, title: 'Bühnen-Helden' },
                  { level: 6, mins: 1000, title: 'Meister-Ensemble' },
                  { level: 7, mins: 1800, title: 'Campus-Legenden' }
                ];

                let currentLevelObj = levelThresholds[0];
                let nextLevelObj = levelThresholds[1];

                for (let i = levelThresholds.length - 1; i >= 0; i--) {
                  if (classAnnualMins >= levelThresholds[i].mins) {
                    currentLevelObj = levelThresholds[i];
                    nextLevelObj = levelThresholds[i + 1] || { level: currentLevelObj.level + 1, mins: currentLevelObj.mins + 1000, title: 'Super-Stars' };
                    break;
                  }
                }

                const levelCurrentFloor = currentLevelObj.mins;
                const levelTargetCeil = nextLevelObj.mins;
                const levelRange = Math.max(1, levelTargetCeil - levelCurrentFloor);
                const levelProgressMins = Math.max(0, classAnnualMins - levelCurrentFloor);
                const levelPercent = Math.min(100, Math.round((levelProgressMins / levelRange) * 100));
                const minsToNextLevel = Math.max(0, levelTargetCeil - classAnnualMins);

                const pieData = liveClassMins === 0 && otherClassMins === 0 
                  ? [
                      { name: 'Unsere Klasse', value: 0.1, color: brandColor },
                      { name: 'Restliche Schule', value: 0.9, color: '#e2e8f0' }
                    ]
                  : [
                      { name: 'Unsere Klasse', value: liveClassMins, color: brandColor },
                      { name: 'Restliche Schule', value: otherClassMins, color: '#cbd5e1' }
                    ];

                return (
                  <div className="pwa-adaptive-grid" style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '2.2fr 1.2fr', gap: isMobile ? '16px' : '32px', alignItems: 'stretch', width: '100%', maxWidth: '100%', boxSizing: 'border-box', overflowX: 'hidden' }}>
                    {/* Top Left: Header and 3 Hero Cards */}
                    <div className="glass-panel" style={{ padding: isMobile ? '16px' : '20px 24px', background: 'white', borderRadius: isMobile ? '24px' : '32px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', boxShadow: '0 4px 20px rgba(0,0,0,0.01)', width: '100%', boxSizing: 'border-box' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '18px' }}>
                        <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: `${brandColor}15`, color: brandColor, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <Award size={24} />
                        </div>
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <h2 style={{ fontSize: isMobile ? '1.35rem' : '1.75rem', fontWeight: 900, color: '#1e293b', margin: 0, wordBreak: 'break-word' }}>Klassen-Highlights &amp; Team-Power</h2>
                          <p style={{ color: '#475569', margin: '3px 0 0 0', fontWeight: 600, fontSize: isMobile ? '0.8rem' : '0.9rem' }}>Gemeinsam üben &amp; Sterne für die Schule sammeln! ⭐</p>
                        </div>
                      </div>

                      {/* 3 Focused Hero Cards (Pädagogisch glasklar & wertschätzend) */}
                      <div className="stat-cards-grid" style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: '12px', width: '100%', boxSizing: 'border-box' }}>
                        {/* Card 1: Unsere Klasse */}
                        <div style={{ padding: '14px 16px', background: '#f8fafc', borderRadius: '20px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '96px', width: '100%', boxSizing: 'border-box' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Unsere Klasse</span>
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
                              {formatMins(liveClassWeeklyFocus)}
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
                    <div className="glass-panel" style={{ padding: isMobile ? '16px' : '20px 24px', background: 'white', borderRadius: isMobile ? '24px' : '32px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 20px rgba(0,0,0,0.01)', width: '100%', boxSizing: 'border-box' }}>
                      <h3 style={{ fontSize: '1.1rem', fontWeight: 900, color: '#1e293b', width: '100%', marginBottom: '4px', textAlign: 'left' }}>
                        Gemeinsamer Schul-Beitrag
                      </h3>
                      <p style={{ fontSize: '0.78rem', color: '#475569', width: '100%', margin: '0 0 12px 0', textAlign: 'left', fontWeight: 600 }}>
                        Gemeinsam für unsere Musikschule
                      </p>

                      <div style={{ width: '100%', height: '130px', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                        <RechartsPieChart width={130} height={130}>
                          <Pie
                            data={pieData}
                            cx="50%"
                            cy="50%"
                            innerRadius={42}
                            outerRadius={58}
                            paddingAngle={liveClassMins > 0 && otherClassMins > 0 ? 3 : 0}
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
                          <span style={{ fontSize: '0.62rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '2px' }}>
                            Anteil
                          </span>
                        </div>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', width: '100%', marginTop: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 10px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <div style={{ width: '10px', height: '10px', borderRadius: '3px', background: brandColor }} />
                            <span style={{ fontSize: '0.74rem', fontWeight: 750, color: '#334155' }}>Unsere Klasse</span>
                          </div>
                          <span style={{ fontSize: '0.74rem', fontWeight: 800, color: '#0f172a' }}>{formatMins(liveClassMins)}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 10px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <div style={{ width: '10px', height: '10px', borderRadius: '3px', background: '#cbd5e1' }} />
                            <span style={{ fontSize: '0.74rem', fontWeight: 750, color: '#475569' }}>Restliche Schule</span>
                          </div>
                          <span style={{ fontSize: '0.74rem', fontWeight: 800, color: '#334155' }}>{formatMins(otherClassMins)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Grid Section: Goals | Highlights | Annual Stats */}
              <div className="pwa-adaptive-grid" style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1.2fr 1.2fr', gap: isMobile ? '16px' : '32px', alignItems: 'stretch', width: '100%', boxSizing: 'border-box' }}>
                
                {/* Column 1: Übe-Ziele der Klasse (Klassen-Quests) */}
                <div className="glass-panel" style={{ padding: isMobile ? '16px' : '32px', background: 'white', borderRadius: isMobile ? '24px' : '32px', border: '1px solid #e2e8f0', boxShadow: '0 4px 20px rgba(0,0,0,0.01)', width: '100%', boxSizing: 'border-box' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                    <h3 style={{ fontSize: '1.2rem', fontWeight: 900, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                      <span>🌱</span> Übe-Ziele der Klasse
                    </h3>
                  </div>

                  {(() => {
                    const brandColor = studentUser?.schools?.brand_color || '#34a853';
                    const activeSessionMins = sessionActive ? Math.round(secondsElapsed / 60) : 0;
                    const liveClassMins = classMins + activeSessionMins;
                    const targets = classGoals || [];
                    const totalGoals = targets.length;
                    const masteredGoals = targets.filter((target: any) => {
                      const targetProgressMins = target.title?.toLowerCase().includes('woche') ? classWeeklyFocus : liveClassMins;
                      const targetPercent = Math.round((targetProgressMins / target.minutes) * 100);
                      return targetPercent >= 100;
                    }).length;
                    const highestPercent = targets.length > 0 
                      ? Math.max(...targets.map((target: any) => {
                          const targetProgressMins = target.title?.toLowerCase().includes('woche') ? classWeeklyFocus : liveClassMins;
                          return Math.round((targetProgressMins / target.minutes) * 100);
                        }))
                      : 0;

                    return (
                      <>
                        {totalGoals > 0 && (
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', background: '#f8fafc', padding: '12px', borderRadius: '16px', marginBottom: '20px', border: '1px solid #e2e8f0' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                              <span style={{ fontSize: '0.65rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.03em' }}>Missionen</span>
                              <span style={{ fontSize: '1.05rem', fontWeight: 900, color: '#1e293b', marginTop: '2px' }}>{totalGoals}</span>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', borderLeft: '1px solid #e2e8f0', borderRight: '1px solid #e2e8f0' }}>
                              <span style={{ fontSize: '0.65rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.03em' }}>Geknackt</span>
                              <span style={{ fontSize: '1.05rem', fontWeight: 900, color: '#166534', marginTop: '2px' }}>{masteredGoals}</span>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                              <span style={{ fontSize: '0.65rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.03em' }}>Peak</span>
                              <span style={{ fontSize: '1.05rem', fontWeight: 900, color: brandColor, marginTop: '2px' }}>{highestPercent}%</span>
                            </div>
                          </div>
                        )}

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                          {totalGoals === 0 ? (
                            <div style={{
                              position: 'relative',
                              display: 'flex',
                              flexDirection: 'column',
                              background: '#34a853',
                              boxShadow: '0 6px 20px rgba(52, 168, 83, 0.12)',
                              borderRadius: '16px',
                              padding: '14px 16px',
                              gap: '10px'
                            }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: 1 }}>
                                  <span style={{
                                    fontSize: '0.85rem',
                                    fontWeight: 800,
                                    color: '#ffffff',
                                    letterSpacing: '-0.01em',
                                    lineHeight: '1.25'
                                  }}>
                                    Klassen-Monats-Quest
                                  </span>
                                  <span style={{
                                    fontSize: '0.68rem',
                                    fontWeight: 600,
                                    color: 'rgba(255, 255, 255, 0.85)'
                                  }}>
                                    Gemeinsam als Team 100 Min. sammeln
                                  </span>
                                </div>
                                <span style={{
                                  fontSize: '1.15rem',
                                  fontWeight: 900,
                                  color: '#ffffff',
                                  letterSpacing: '-0.02em',
                                  fontFeatureSettings: '"tnum"'
                                }}>
                                  {Math.min(100, Math.round((liveClassMins / 100) * 100))}%
                                </span>
                              </div>

                              {/* Progress bar container */}
                              <div style={{ position: 'relative', height: '8px', background: 'rgba(255, 255, 255, 0.25)', borderRadius: '99px' }}>
                                <div style={{
                                  width: `${Math.min(100, (liveClassMins / 100) * 100)}%`,
                                  height: '100%',
                                  background: '#ffffff',
                                  borderRadius: '99px',
                                  transition: 'width 1.2s cubic-bezier(0.16, 1, 0.3, 1)',
                                  boxShadow: '0 0 6px rgba(255, 255, 255, 0.3)'
                                }} />
                              </div>

                              {/* Current / Target & Status label */}
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.72rem', gap: '10px' }}>
                                <span style={{ color: 'rgba(255, 255, 255, 0.95)', fontFeatureSettings: '"tnum"', fontWeight: 600 }}>
                                  <span style={{ fontWeight: 800, color: '#ffffff' }}>{liveClassMins}</span> / 100 Min.
                                </span>
                                <span style={{
                                  fontWeight: 800,
                                  color: liveClassMins >= 100 ? '#e6f4ea' : 'rgba(255, 255, 255, 0.9)',
                                  textAlign: 'right'
                                }}>
                                  {liveClassMins >= 100 ? 'Stufe 1 erreicht 🎉' : `Noch ${Math.max(0, 100 - liveClassMins)} Min.`}
                                </span>
                              </div>
                            </div>
                          ) : (
                            targets.map((target: any) => {
                              const targetProgressMins = target.title?.toLowerCase().includes('woche') ? classWeeklyFocus : liveClassMins;
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
                                      <span style={{
                                        fontSize: '0.8rem',
                                        fontWeight: 700,
                                        color: '#ffffff',
                                        letterSpacing: '-0.01em',
                                        lineHeight: '1.25',
                                        whiteSpace: 'normal',
                                        wordBreak: 'break-word'
                                      }}>
                                        {target.title || 'Challenge'}
                                      </span>
                                      {target.deadline && (
                                        <span style={{
                                          fontSize: '0.62rem',
                                          fontWeight: 500,
                                          color: isDeadlinePassed ? '#ff8780' : 'rgba(255, 255, 255, 0.75)',
                                          lineHeight: '1.2',
                                          whiteSpace: 'normal'
                                        }}>
                                          bis {new Date(target.deadline).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })}
                                          {isDeadlinePassed && ' (abgelaufen)'}
                                        </span>
                                      )}
                                    </div>
                                    <span style={{
                                      fontSize: '1.1rem',
                                      fontWeight: 800,
                                      color: '#ffffff',
                                      letterSpacing: '-0.02em',
                                      fontFeatureSettings: '"tnum"',
                                      flexShrink: 0,
                                      alignSelf: 'flex-start'
                                    }}>
                                      {targetPercent}%
                                    </span>
                                  </div>

                                  {/* Progress bar container */}
                                  <div style={{ position: 'relative', height: '6px', background: 'rgba(255, 255, 255, 0.2)', borderRadius: '99px' }}>
                                    {/* Target marker (100% line) at 75% width */}
                                    <div style={{
                                      position: 'absolute',
                                      left: '75%',
                                      top: '-2px',
                                      height: '10px',
                                      width: '2px',
                                      background: '#ffffff',
                                      zIndex: 3,
                                      borderRadius: '99px'
                                    }} />

                                    {/* Bar fill */}
                                    <div style={{
                                      width: `${visualWidth}%`,
                                      height: '100%',
                                      background: '#ffffff',
                                      borderRadius: '99px',
                                      transition: 'width 1.2s cubic-bezier(0.16, 1, 0.3, 1)',
                                      boxShadow: '0 0 6px rgba(255, 255, 255, 0.25)'
                                    }} />
                                  </div>

                                  {/* Row 3: Current / Target & Status label */}
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.68rem', gap: '10px' }}>
                                    <span style={{ color: 'rgba(255, 255, 255, 0.9)', fontFeatureSettings: '"tnum"', fontWeight: 500, whiteSpace: 'normal' }}>
                                      <span style={{ fontWeight: 700, color: '#ffffff' }}>{targetProgressMins}</span> / {target.minutes} Min.
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

                {/* Column 2: Helden-Momente (Klassen-Meilensteine) */}
                <div className="glass-panel" style={{ padding: '32px', background: 'white', borderRadius: '32px', border: '1px solid #e2e8f0', minHeight: '350px', boxShadow: '0 4px 20px rgba(0,0,0,0.01)' }}>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 900, color: '#1e293b', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                    <span>✨</span> Helden-Momente
                  </h3>
                  <p style={{ fontSize: '0.8rem', color: '#475569', margin: '4px 0 20px 0', fontWeight: 600 }}>
                    Besondere Highlights deiner Mitschüler aus diesem Monat.
                  </p>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {highlightsLoading ? (
                      <div style={{ padding: '40px', textAlign: 'center', color: '#475569', fontWeight: 700 }}>Highlights werden geladen...</div>
                    ) : classHighlights.length === 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 20px', textAlign: 'center', background: '#f8fafc', borderRadius: '24px', border: '1px dashed #cbd5e1' }}>
                        <span style={{ fontSize: '2.5rem', marginBottom: '16px' }}>✨</span>
                        <h4 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#334155', margin: '0 0 6px 0' }}>Bereit für neue Meilensteine</h4>
                        <p style={{ fontSize: '0.78rem', color: '#475569', maxWidth: '300px', margin: 0, lineHeight: 1.4 }}>
                          Sobald du oder deine Mitschüler fleißig üben oder Songs meistern, erscheinen die Erfolge hier zum gemeinsamen Feiern!
                        </p>
                      </div>
                    ) : (
                      classHighlights.map((hl: any, idx: number) => {
                        return (
                          <div 
                            key={idx} 
                            style={{ 
                              padding: '14px 18px', 
                              background: '#f8fafc', 
                              borderRadius: '18px', 
                              border: '1px solid #e2e8f0', 
                              display: 'flex', 
                              alignItems: 'center',
                              gap: '14px',
                              boxShadow: '0 2px 6px rgba(0,0,0,0.01)',
                              transition: 'all 0.2s ease'
                            }}
                            className="hover-scale"
                          >
                            <span style={{ fontSize: '1.6rem', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                              {hl.emoji}
                            </span>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: '6px' }}>
                                <span style={{ fontSize: '0.84rem', fontWeight: 900, color: '#0f172a' }}>
                                  {(() => {
                                    const name = hl.studentName || '';
                                    const parts = name.trim().split(/\s+/);
                                    if (parts.length <= 1) return name;
                                    const first = parts[0];
                                    const last = parts[parts.length - 1];
                                    return `${first} ${last.charAt(0)}.`;
                                  })()}
                                </span>
                                <span style={{ fontSize: '0.65rem', fontWeight: 900, color: studentUser?.schools?.brand_color || '#34a853', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                                  {hl.title}
                                </span>
                              </div>
                              <p style={{ fontSize: '0.78rem', color: '#475569', margin: '2px 0 0 0', lineHeight: 1.3, fontWeight: 550 }}>
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
                      <p style={{ fontSize: '0.72rem', color: '#475569', margin: '2px 0 0 0', fontWeight: 600 }}>
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

                    const classmateAndSelfIds = Array.from(new Set([...(classmateIds || []), studentId]));

                    return (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                          {monthsList.map(item => {
                            const logsForMonth = classFocusLogs.filter(log => {
                              if (!log.created_at) return false;
                              const logDate = new Date(log.created_at);
                              const isClassmateOrSelf = classmateAndSelfIds.includes(log.user_id);
                              return isClassmateOrSelf && logDate.getMonth() === item.month && logDate.getFullYear() === item.year;
                            });
                            let totalSecs = logsForMonth.reduce((sum, log) => {
                              return sum + getExactLogSeconds(log);
                            }, 0);

                            if (sessionActive && secondsElapsed > 0 && item.month === now.getMonth() && item.year === now.getFullYear()) {
                              totalSecs += secondsElapsed;
                            }

                            const minutes = secondsToDisplayMinutes(totalSecs);

                            // Heatmap calculations with WCAG AA compliant contrast
                            let bg = '#f8fafc';
                            let border = '1px solid #e2e8f0';
                            let labelColor = '#475569';
                            let textColor = '#475569';
                            let numColor = '#0f172a';
                            let shadow = 'none';

                            if (minutes > 0) {
                              if (minutes <= 15) {
                                bg = 'linear-gradient(135deg, #e6f4ea 0%, #e6fbf0 100%)';
                                border = '1px solid #e6f4ea';
                                labelColor = '#166534';
                                textColor = '#166534';
                                numColor = '#166534';
                                shadow = '0 2px 6px rgba(52, 168, 83, 0.04)';
                              } else if (minutes <= 60) {
                                bg = 'linear-gradient(135deg, #e6f4ea 0%, #e6f4ea 100%)';
                                border = '1px solid #e6f4ea';
                                labelColor = '#166534';
                                textColor = '#166534';
                                numColor = '#166534';
                                shadow = '0 3px 8px rgba(52, 168, 83, 0.07)';
                              } else if (minutes <= 180) {
                                bg = 'linear-gradient(135deg, #e6f4ea 0%, #e6f4ea 100%)';
                                border = '1px solid #e6f4ea';
                                labelColor = '#166534';
                                textColor = '#166534';
                                numColor = '#166534';
                                shadow = '0 4px 12px rgba(52, 168, 83, 0.12)';
                              } else {
                                bg = 'linear-gradient(135deg, #34a853 0%, #34a853 100%)';
                                border = '1px solid #34a853';
                                labelColor = 'rgba(255, 255, 255, 0.9)';
                                textColor = 'rgba(255, 255, 255, 0.95)';
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
                                <span style={{ fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', color: labelColor }}>
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
                          <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.03em' }}>Heatmap:</span>
                          {[
                            { color: '#f8fafc', label: '0m', border: '#e2e8f0' },
                            { color: '#e6f4ea', label: '<15m', border: '#e6f4ea' },
                            { color: '#e6f4ea', label: '<1h', border: '#e6f4ea' },
                            { color: '#e6f4ea', label: '<3h', border: '#e6f4ea' },
                            { color: '#34a853', label: '3h+', border: '#34a853' }
                          ].map(pill => (
                            <div key={pill.label} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: pill.color, border: `1px solid ${pill.border}` }} />
                              <span style={{ fontSize: '0.68rem', fontWeight: 750, color: '#475569' }}>{pill.label}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })()}
                </div>

              </div>

            </div>
          )
        )}
      </div>
  );
};
