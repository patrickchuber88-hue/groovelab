import React from 'react';
import { maskLastName } from '../../utils/nameHelper';
import { formatHarmonizedAudioTitle } from '../../utils/audioNamingHelper';
import { getDailyQuote } from '@groovelab/shared';

import {
  Activity, BookOpen, Calendar, Clock, Edit3, Flame,
  Mic, Music, Sparkles, Sun, User, Users
} from 'lucide-react';

export interface TeacherHausaufgabenWidgetProps {
  teacher: any;
  activeStudent: any;
  activeGroupStudents: any[];
  selectedGroupStudentId: string | null;
  setSelectedGroupStudentId: (id: string | null) => void;
  allStudents: any[];
  bypassSickView: boolean;
  selectedStudentProfile: any;
  setSelectedStudentProfile: (s: any) => void;
  docStudent: any;
  setDocStudent: (s: any) => void;
  dynamicPrepMirror: any;
  setDynamicPrepMirror: React.Dispatch<React.SetStateAction<any>>;
  loadingPrepMirror: boolean;
  setLoadingPrepMirror: React.Dispatch<React.SetStateAction<boolean>>;
  briefingData: any;
  isFreeDay: boolean;
  isWeekend: boolean;
  isTourDemoScheduleActive: boolean;
  firstSlotStartStr: string;
  getSimulatedNow: () => Date;
  showRealNames: boolean;
  widgetState: any;
}

export const TeacherHausaufgabenWidget: React.FC<TeacherHausaufgabenWidgetProps> = ({
  teacher,
  activeStudent,
  activeGroupStudents,
  selectedGroupStudentId,
  setSelectedGroupStudentId,
  allStudents,
  bypassSickView,
  selectedStudentProfile,
  setSelectedStudentProfile,
  docStudent,
  setDocStudent,
  dynamicPrepMirror,
  setDynamicPrepMirror,
  loadingPrepMirror,
  setLoadingPrepMirror,
  briefingData,
  isFreeDay,
  isWeekend,
  isTourDemoScheduleActive,
  firstSlotStartStr,
  getSimulatedNow,
  showRealNames,
  widgetState,
}) => {
  return (
    (!teacher?.sick_until || bypassSickView) && (isTourDemoScheduleActive || (!isFreeDay && !isWeekend)) && (
      <div className="google-card" style={{ 
        width: '100%', 
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        borderLeft: isTourDemoScheduleActive 
          ? '4px solid #34a853' 
          : widgetState === 'VORBEREITUNG' 
          ? '4px solid #fbbc05' 
          : widgetState === 'ACTIVE' 
          ? '4px solid #34a853' 
          : widgetState === 'WEEKEND' 
          ? '4px solid #8b5cf6' 
          : '4px solid #f59e0b', 
        opacity: loadingPrepMirror ? 0.6 : 1, 
        transition: 'opacity 0.2s', 
        boxSizing: 'border-box' 
      }}>
        {(() => {
          if (isTourDemoScheduleActive) {
            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {/* Header: Student Info & Profile Button */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, flex: '1 1 200px' }}>
                    <div style={{
                      width: '42px',
                      height: '42px',
                      borderRadius: '50%',
                      background: '#34a853',
                      color: '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 900,
                      fontSize: '1.1rem',
                      fontFamily: "'Plus Jakarta Sans', sans-serif",
                      flexShrink: 0
                    }}>
                      J
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                      <h4 style={{ margin: 0, fontSize: '0.96rem', fontWeight: 900, color: '#0f172a', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                        Justus G.
                      </h4>
                      <span style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 600 }}>Aktueller Schüler</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    style={{
                      background: '#ffffff',
                      border: '1px solid #cbd5e1',
                      borderRadius: '10px',
                      padding: '6px 12px',
                      fontSize: '0.74rem',
                      fontWeight: 700,
                      color: '#0f172a',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px',
                      cursor: 'pointer'
                    }}
                  >
                    <User size={13} color="#64748b" />
                    <span>Profil</span>
                  </button>
                </div>

                {/* Homework / Notes Section */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', background: '#fafafa', borderRadius: '16px', padding: '16px 18px' }}>
                  <div>
                    <span style={{ fontSize: '0.65rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      LETZTE WOCHE (VORWOCHE)
                    </span>
                    <p style={{ margin: '4px 0 0 0', fontSize: '0.78rem', color: '#64748b', fontStyle: 'italic' }}>
                      Keine Hausaufgaben erfasst.
                    </p>
                  </div>
                  <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '10px' }}>
                    <span style={{ fontSize: '0.65rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      DIESE WOCHE (HEUTE)
                    </span>
                    <p style={{ margin: '4px 0 0 0', fontSize: '0.78rem', color: '#64748b', fontStyle: 'italic' }}>
                      Noch keine Hausaufgaben erfasst.
                    </p>
                  </div>
                </div>

                {/* Action CTA Button */}
                <button
                  type="button"
                  style={{
                    background: '#34a853',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '12px',
                    padding: '12px 18px',
                    fontSize: '0.85rem',
                    fontWeight: 800,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(52, 168, 83, 0.25)'
                  }}
                >
                  <Edit3 size={15} color="#ffffff" />
                  <span>Hausaufgabe / Notiz erfassen</span>
                </button>
              </div>
            );
          }

          if (widgetState === 'VORBEREITUNG') {
            const activeLessonsCount = briefingData?.timeline 
              ? briefingData.timeline.filter((s: any) => s.student && s.status !== 'canceled_by_student' && s.status !== 'teacher_sick' && s.status !== 'cancelled' && s.status !== 'canceled_by_teacher_sick' && s.status !== 'rescheduled_away').length 
              : 0;
            const dailyChanges = briefingData?.timeline 
              ? briefingData.timeline.filter((s: any) => s.student && (
                  s.status === 'canceled_by_student' || 
                  s.status === 'teacher_sick' || 
                  s.status === 'cancelled' || 
                  s.status === 'canceled_by_teacher_sick' ||
                  s.status === 'rescheduled_away'
                )) 
              : [];

            const otherReschedules = briefingData?.rescheduledReminders?.filter((rem: any) => 
              !dailyChanges.some((dc: any) => dc.student?.name === rem.studentName)
            ) || [];

            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', fontFamily: "'Inter', sans-serif", flex: 1, minHeight: 0 }}>
                {/* Title Section: borderless, simple, calm */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
                  <Calendar size={16} color="#475569" style={{ opacity: 0.8 }} />
                  <div>
                    <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: '#1e293b', fontFamily: "'Plus Jakarta Sans', sans-serif", letterSpacing: '-0.01em' }}>
                      Vorbereitung
                    </h4>
                    <div style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 500 }}>Fahrplan &amp; Änderungen</div>
                  </div>
                </div>

                {/* Unified Compact Info Container */}
                <div style={{
                  background: '#fafafa',
                  borderRadius: '16px',
                  padding: '16px 20px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                  flex: 1,
                  minHeight: 0,
                  overflowY: 'auto'
                }}>
                  {/* 1. Key Facts: Lessons count & Start Time */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.84rem', color: '#334155' }}>
                      <Activity size={15} color="#64748b" style={{ flexShrink: 0 }} />
                      <span>
                        Heute stehen <strong style={{ color: '#0f172a' }}>{activeLessonsCount} Termine</strong> auf dem Fahrplan.
                      </span>
                    </div>

                    {firstSlotStartStr && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.84rem', color: '#334155' }}>
                        <Clock size={15} color="#64748b" style={{ flexShrink: 0 }} />
                        <span>
                          Erster Unterricht beginnt um <strong style={{ color: '#0f172a' }}>{firstSlotStartStr} Uhr</strong>.
                        </span>
                      </div>
                    )}
                  </div>

                  {/* 2. Daily Changes (Nur dynamisch anzeigen, wenn wirklich ein Ausfall oder eine Verschiebung vorliegt) */}
                  {dailyChanges.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', borderTop: '1px solid #f1f5f9', paddingTop: '10px' }}>
                      <span style={{ fontSize: '0.65rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                        Änderungen &amp; Ausfälle heute
                      </span>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {dailyChanges.map((slot: any, idx: number) => {
                          const isCanceled = slot.status !== 'rescheduled_away';
                          const labelColor = isCanceled ? '#ef4444' : '#f59e0b';
                          const labelText = isCanceled ? 'Ausfall' : 'Verschoben';
                          const matchRem = !isCanceled 
                            ? briefingData.rescheduledReminders?.find((r: any) => r.studentName === slot.student?.name)
                            : null;
                          
                          return (
                            <div key={idx} style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              fontSize: '0.82rem',
                              color: '#475569'
                            }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0, flex: 1 }}>
                                <span style={{ fontWeight: 700, color: '#334155', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                  {slot.student?.name}
                                </span>
                                <span style={{ color: '#94a3b8', fontSize: '0.74rem' }}>
                                  ({slot.timeSlot || slot.start_time?.substring(0, 5)} Uhr)
                                </span>
                                {!isCanceled && matchRem && (
                                  <span style={{ 
                                    color: '#f59e0b', 
                                    fontSize: '0.74rem', 
                                    fontWeight: 700, 
                                    marginLeft: '4px'
                                  }}>
                                    ➔ {matchRem.weekdayShort}. {matchRem.dateStr}.
                                  </span>
                                )}
                              </div>
                              <span style={{
                                fontSize: '0.72rem',
                                fontWeight: 800,
                                color: labelColor,
                                background: isCanceled ? '#fef2f2' : '#fffbeb',
                                padding: '1px 6px',
                                borderRadius: '4px',
                                border: `1px solid ${isCanceled ? '#fecaca' : '#fde68a'}`
                              }}>
                                {labelText}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* 3. Other weekly rescheduled appointments (Nur dynamisch anzeigen, wenn vorhanden) */}
                  {otherReschedules.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', borderTop: '1px solid #f1f5f9', paddingTop: '10px' }}>
                      <span style={{ fontSize: '0.65rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                        Weitere Änderungen diese Woche
                      </span>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {otherReschedules.map((rem: any) => (
                          <div key={rem.id} style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            fontSize: '0.82rem',
                            color: '#475569'
                          }}>
                            <span style={{ fontWeight: 700, color: '#334155' }}>
                              {rem.studentName}
                            </span>
                            <span style={{ 
                              fontSize: '0.74rem', 
                              fontWeight: 700, 
                              color: '#64748b'
                            }}>
                              {rem.weekdayShort}. {rem.dateStr}., {rem.time.replace(':', '.')} Uhr
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          }

          if (widgetState === 'ACTIVE') {
            if (!dynamicPrepMirror && !briefingData?.prepMirror) {
              return <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Keine Unterrichtsdaten geladen.</div>;
            }
            const prep = dynamicPrepMirror || briefingData.prepMirror;

            const cleanTitle = (t: string) => t.replace(/\s*\((gitarre|guitar|e-gitarre|bass|e-bass|drums|schlagzeug|klavier|piano|keys|keyboard|vocals|gesang|stimme|allgemein)\)/i, '');

            const groupAndFormatItems = (rawItems: any[]) => {
              const groupedLehrwerke: Record<string, { pages: number[]; statuses: string[] }> = {};
              const otherItems: any[] = [];

              (rawItems || []).forEach(item => {
                const title = item.title || item.topic_name || '';
                if (title.includes(' - Seite ')) {
                  const parts = title.split(' - Seite ');
                  const bookTitle = cleanTitle(parts[0].trim());
                  const pageNum = parseInt(parts[1], 10);
                  
                  if (!groupedLehrwerke[bookTitle]) {
                    groupedLehrwerke[bookTitle] = { pages: [], statuses: [] };
                  }
                  if (!isNaN(pageNum) && !groupedLehrwerke[bookTitle].pages.includes(pageNum)) {
                    groupedLehrwerke[bookTitle].pages.push(pageNum);
                    groupedLehrwerke[bookTitle].statuses.push(item.status);
                  }
                } else {
                  otherItems.push(item);
                }
              });

              const formatPageNumbers = (pages: number[]): string => {
                if (pages.length === 0) return '';
                const sorted = [...pages].sort((a, b) => a - b);
                const ranges: string[] = [];
                let start = sorted[0];
                let end = start;
                
                for (let i = 1; i < sorted.length; i++) {
                  if (sorted[i] === end + 1) {
                    end = sorted[i];
                  } else {
                    if (start === end) {
                      ranges.push(`${start}`);
                    } else {
                      ranges.push(`${start}-${end}`);
                    }
                    start = sorted[i];
                    end = start;
                  }
                }
                if (start === end) {
                  ranges.push(`${start}`);
                } else {
                  ranges.push(`${start}-${end}`);
                }
                
                if (ranges.length === 1) return `S. ${ranges[0]}`;
                const last = ranges.pop();
                return `S. ${ranges.join(', ')} & ${last}`;
              };

              const groupedItems = Object.entries(groupedLehrwerke).map(([bookTitle, info]) => {
                const formattedPages = formatPageNumbers(info.pages);
                const allDone = info.statuses.every(status => status === 'MASTERED' || status === 'THEORY_DONE');
                return {
                  bookTitle,
                  formattedPages,
                  title: `${bookTitle}: ${formattedPages}`,
                  status: allDone ? 'MASTERED' : 'IN_PROGRESS',
                  isBook: true
                };
              });

              return [
                ...groupedItems,
                ...otherItems.map(item => ({
                  title: cleanTitle(item.title || item.topic_name || ''),
                  status: item.status,
                  isBook: false
                }))
              ];
            };

            const formattedPrevWeekItems = groupAndFormatItems(prep.prevWeekItems);
            const formattedCurrentWeekItems = groupAndFormatItems(prep.currentWeekItems);

            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {/* Multi-Student Group Switcher */}
                {activeGroupStudents.length > 1 && (
                  <div style={{
                    display: 'flex',
                    background: '#f1f5f9',
                    padding: '4px',
                    borderRadius: '14px',
                    gap: '4px',
                    width: '100%',
                    boxSizing: 'border-box'
                  }}>
                    {activeGroupStudents.map((stud: any) => {
                      const isSelected = (!selectedGroupStudentId && activeGroupStudents[0]?.id === stud.id) || selectedGroupStudentId === stud.id;
                      const fName = stud.first_name || (stud.name ? stud.name.split(' ')[0] : 'Schüler');
                      const lName = stud.last_name || (stud.name ? stud.name.split(' ').slice(1).join(' ') : '');
                      return (
                        <button
                          key={stud.id}
                          type="button"
                          onClick={() => setSelectedGroupStudentId(stud.id)}
                          style={{
                            flex: 1,
                            padding: '8px 10px',
                            borderRadius: '10px',
                            border: isSelected ? '1px solid #cbd5e1' : 'none',
                            background: isSelected ? '#ffffff' : 'transparent',
                            color: isSelected ? '#0f172a' : '#475569',
                            fontWeight: isSelected ? 850 : 600,
                            fontSize: '0.80rem',
                            cursor: 'pointer',
                            boxShadow: isSelected ? '0 2px 6px rgba(0,0,0,0.06)' : 'none',
                            transition: 'all 0.15s ease',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '5px'
                          }}
                        >
                          <User size={13} color={isSelected ? '#34a853' : '#64748b'} />
                          <span>{fName} {maskLastName(lName, showRealNames)}</span>
                        </button>
                      );
                    })}
                    <button
                      type="button"
                      onClick={() => setSelectedGroupStudentId('both')}
                      style={{
                        flex: 1,
                        padding: '8px 10px',
                        borderRadius: '10px',
                        border: selectedGroupStudentId === 'both' ? '1px solid #cbd5e1' : 'none',
                        background: selectedGroupStudentId === 'both' ? '#ffffff' : 'transparent',
                        color: selectedGroupStudentId === 'both' ? '#0f172a' : '#475569',
                        fontWeight: selectedGroupStudentId === 'both' ? 850 : 600,
                        fontSize: '0.80rem',
                        cursor: 'pointer',
                        boxShadow: selectedGroupStudentId === 'both' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none',
                        transition: 'all 0.15s ease',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '5px'
                      }}
                    >
                      <Users size={13} color={selectedGroupStudentId === 'both' ? '#34a853' : '#64748b'} />
                      <span>Beide (Gruppe)</span>
                    </button>
                  </div>
                )}

                {/* Header: Student Info & Toolbox/Profile Buttons */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
                  <div 
                    style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', minWidth: 0, flex: '1 1 200px' }}
                    onClick={() => {
                      const foundStud = allStudents.find(s => s.id === prep.studentId);
                      setDocStudent({
                        ...(foundStud || {}),
                        id: prep.studentId,
                        first_name: prep.studentName.split(' ')[0],
                        last_name: prep.studentName.split(' ').slice(1).join(' '),
                        photo_url: '/avatar_ghost.jpg',
                        is_campus_active: foundStud ? foundStud.is_campus_active : false,
                        school_id: foundStud?.school_id || teacher?.school_id,
                        schoolId: foundStud?.school_id || teacher?.school_id,
                        schools: foundStud?.schools || (teacher as any)?.schools,
                        school_name: foundStud?.schools?.name || foundStud?.school_name
                      });
                    }}
                  >
                    <div style={{
                      width: '38px',
                      height: '38px',
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, #34a853 0%, #2e944b 100%)',
                      color: 'white',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '1.0rem',
                      fontWeight: 800,
                      boxShadow: '0 2px 6px rgba(52, 168, 83, 0.18)',
                      flexShrink: 0
                    }}>
                      {prep.studentName.charAt(0)}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 900, color: '#0f172a', fontSize: '0.96rem', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                        {prep.studentName}
                      </div>
                      <div style={{ fontSize: '0.74rem', color: '#475569', fontWeight: 600 }}>
                        {activeStudent?.id === prep.studentId ? 'Aktueller Schüler' : 'Nächster Schüler'}
                      </div>
                    </div>
                  </div>

                  {/* Profil Action Button */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                    {/* Profil Button */}
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedStudentProfile({
                          id: prep.studentId,
                          first_name: prep.studentName.split(' ')[0],
                          last_name: prep.studentName.split(' ').slice(1).join(' '),
                          photo_url: '/avatar_ghost.jpg'
                        });
                      }}
                      style={{
                        background: '#f8fafc',
                        color: '#334155',
                        border: '1px solid #e2e8f0',
                        padding: '7px 12px',
                        borderRadius: '10px',
                        fontSize: '0.76rem',
                        fontWeight: 750,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px',
                        minHeight: '36px',
                        transition: 'all 0.2s'
                      }}
                      className="hover-scale"
                      title="Schüler-Profil öffnen"
                    >
                      <User size={14} />
                      <span>Profil</span>
                    </button>
                  </div>
                </div>

                {prep.streakCount > 0 && (
                  <div style={{ 
                    display: 'inline-flex', 
                    alignItems: 'center', 
                    gap: '6px', 
                    background: 'rgba(245, 158, 11, 0.08)', 
                    border: '1px solid rgba(245, 158, 11, 0.15)', 
                    padding: '4px 12px', 
                    borderRadius: '100px', 
                    color: '#b45309', 
                    fontSize: '0.76rem', 
                    fontWeight: 750,
                    alignSelf: 'flex-start'
                  }}>
                    <Flame size={14} fill="#f59e0b" color="#f59e0b" />
                    <span>Flammen-Streak: {prep.streakCount} Tage!</span>
                  </div>
                )}

                {/* Vorwoche */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ fontSize: '0.74rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>Letzte Woche (Vorwoche)</span>
                    {prep.prevWeekNum && (
                      <span style={{ fontSize: '0.66rem', fontWeight: 600, color: '#94a3b8', textTransform: 'none' }}>
                        · KW {prep.prevWeekNum}
                      </span>
                    )}
                  </div>
                  {((formattedPrevWeekItems && formattedPrevWeekItems.length > 0) || (prep.prevWeekNotes && prep.prevWeekNotes.length > 0)) ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {formattedPrevWeekItems && formattedPrevWeekItems.map((item: any, idx: number) => {
                        const isBook = item.isBook;
                        return (
                          <div key={`prev-item-${idx}`} style={{
                            background: '#f8fafc',
                            padding: '10px 12px',
                            borderRadius: '12px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '8px',
                            opacity: 0.85
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                              {isBook ? <BookOpen size={14} color="#64748b" /> : <Music size={14} color="#64748b" />}
                              <span style={{ fontWeight: 800, color: '#475569', fontSize: '0.84rem', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                                {item.bookTitle || item.title}
                              </span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                              {item.formattedPages && (
                                <span style={{
                                  fontSize: '0.78rem',
                                  fontWeight: 800,
                                  color: '#15803d',
                                  background: '#dcfce7',
                                  padding: '2px 6px',
                                  borderRadius: '6px'
                                }}>
                                  {item.formattedPages}
                                </span>
                              )}
                              {(item.status === 'MASTERED' || item.status === 'THEORY_DONE') && (
                                <span style={{
                                  background: 'rgba(52, 168, 83, 0.08)',
                                  color: '#34a853',
                                  fontSize: '0.66rem',
                                  fontWeight: 800,
                                  borderRadius: '100px',
                                  padding: '2px 8px',
                                  textTransform: 'uppercase'
                                }}>
                                  Erledigt
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                      {prep.prevWeekNotes && prep.prevWeekNotes
                        .filter((note: string) => !note.startsWith("STICKER:") && !note.startsWith("LATENCY:") && !note.startsWith("LATENCY_CALIBRATION:") && !note.startsWith("SYSTEM:"))
                        .map((note: string, idx: number) => {
                        const isLoop = note.startsWith("LOOP:");
                        const isAudio = note.startsWith("AUDIO:");
                        if (isLoop) {
                          const parts = note.substring(5).split('|');
                          const label = parts[3] || 'Loop-Mix';
                          const duration = parts[1] || '8';
                          const creatorRole = parts[4] || 'student';
                          const visibility = parts[5] || (creatorRole === 'teacher' ? 'shared_with_teacher' : 'private');
                          if (creatorRole === 'student' && visibility === 'private') return null;
                          return (
                            <div key={`prev-note-${idx}`}>
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#fefce8', border: '1px solid rgba(234, 179, 8, 0.2)', padding: '4px 8px', borderRadius: '8px', fontSize: '0.74rem', color: '#854d0e', fontStyle: 'normal', fontWeight: 700 }}>
                                <Music size={12} color="#854d0e" />
                                <span>{creatorRole === 'teacher' ? 'Lehrer-Loop' : 'Schüler-Loop'}: "{label}" ({duration}s)</span>
                              </span>
                            </div>
                          );
                        }
                        if (isAudio) {
                          const parts = note.substring(6).split('|');
                          const duration = parts[1] || '60';
                          const role = parts[4] || 'teacher';
                          const label = formatHarmonizedAudioTitle({
                            label: parts[3],
                            date: parts[2],
                            author: role,
                            songTag: parts[7]
                          }, undefined, role === 'teacher');
                          return (
                            <div key={`prev-note-${idx}`}>
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#e6f4ea', border: '1px solid rgba(52, 168, 83, 0.2)', padding: '4px 8px', borderRadius: '8px', fontSize: '0.74rem', color: '#166534', fontStyle: 'normal', fontWeight: 700 }}>
                                <Mic size={12} color="#166534" />
                                <span>{role === 'teacher' ? 'Lehrer-Aufnahme' : 'Schüler-Aufnahme'}: "{label}" ({duration}s)</span>
                              </span>
                            </div>
                          );
                        }
                        return (
                          <div key={`prev-note-${idx}`} style={{ 
                            fontSize: '0.80rem', 
                            color: '#64748b', 
                            fontWeight: 550, 
                            fontStyle: 'italic', 
                            borderLeft: '2.5px solid #cbd5e1', 
                            paddingLeft: '8px', 
                            margin: '2px 0',
                            lineHeight: 1.35,
                            opacity: 0.85
                          }}>
                            {note}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div style={{ fontSize: '0.80rem', color: '#94a3b8', fontStyle: 'italic', padding: '2px 0' }}>
                      Keine Hausaufgaben erfasst.
                    </div>
                  )}
                </div>

                {/* Diese Woche */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ fontSize: '0.74rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>Diese Woche (Heute)</span>
                    {prep.currentWeekNum && (
                      <span style={{ fontSize: '0.66rem', fontWeight: 600, color: '#94a3b8', textTransform: 'none' }}>
                        · KW {prep.currentWeekNum}
                      </span>
                    )}
                  </div>
                  {((formattedCurrentWeekItems && formattedCurrentWeekItems.length > 0) || (prep.currentWeekNotes && prep.currentWeekNotes.length > 0)) ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {formattedCurrentWeekItems && formattedCurrentWeekItems.map((item: any, idx: number) => {
                        const isBook = item.isBook;
                        return (
                          <div key={`curr-item-${idx}`} style={{
                            background: '#f8fafc',
                            padding: '10px 14px',
                            borderRadius: '14px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '10px'
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                              {isBook ? (
                                <div style={{
                                  width: '24px',
                                  height: '30px',
                                  borderRadius: '5px',
                                  background: 'linear-gradient(135deg, #e2e8f0, #cbd5e1)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  flexShrink: 0
                                }}>
                                  <BookOpen size={13} color="#475569" />
                                </div>
                              ) : (
                                <div style={{
                                  width: '24px',
                                  height: '24px',
                                  borderRadius: '6px',
                                  background: '#e0e7ff',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  flexShrink: 0
                                }}>
                                  <Music size={13} color="#4338ca" />
                                </div>
                              )}
                              <span style={{ fontWeight: 900, color: '#0f172a', fontSize: '0.92rem', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                                {item.bookTitle || item.title}
                              </span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                              {item.formattedPages && (
                                <span style={{
                                  fontSize: '0.82rem',
                                  fontWeight: 850,
                                  color: '#15803d',
                                  background: '#dcfce7',
                                  padding: '3px 8px',
                                  borderRadius: '8px'
                                }}>
                                  {item.formattedPages}
                                </span>
                              )}
                              {(item.status === 'MASTERED' || item.status === 'THEORY_DONE') && (
                                <span style={{
                                  background: 'rgba(52, 168, 83, 0.08)',
                                  color: '#34a853',
                                  fontSize: '0.68rem',
                                  fontWeight: 800,
                                  borderRadius: '100px',
                                  padding: '2px 8px',
                                  textTransform: 'uppercase'
                                }}>
                                  Erledigt
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                      {prep.currentWeekNotes && prep.currentWeekNotes
                        .filter((note: string) => !note.startsWith("STICKER:") && !note.startsWith("LATENCY:") && !note.startsWith("LATENCY_CALIBRATION:") && !note.startsWith("SYSTEM:"))
                        .map((note: string, idx: number) => {
                        const isLoop = note.startsWith("LOOP:");
                        const isAudio = note.startsWith("AUDIO:");
                        if (isLoop) {
                          const parts = note.substring(5).split('|');
                          const label = parts[3] || 'Loop-Mix';
                          const duration = parts[1] || '8';
                          const creatorRole = parts[4] || 'student';
                          const visibility = parts[5] || (creatorRole === 'teacher' ? 'shared_with_teacher' : 'private');
                          if (creatorRole === 'student' && visibility === 'private') return null;
                          return (
                            <div key={`curr-note-${idx}`}>
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#fefce8', border: '1px solid rgba(234, 179, 8, 0.2)', padding: '4px 8px', borderRadius: '8px', fontSize: '0.74rem', color: '#854d0e', fontStyle: 'normal', fontWeight: 700 }}>
                                <Music size={12} color="#854d0e" />
                                <span>{creatorRole === 'teacher' ? 'Lehrer-Loop' : 'Schüler-Loop'}: "{label}" ({duration}s)</span>
                              </span>
                            </div>
                          );
                        }
                        if (isAudio) {
                          const parts = note.substring(6).split('|');
                          const duration = parts[1] || '60';
                          const role = parts[4] || 'teacher';
                          const label = formatHarmonizedAudioTitle({
                            label: parts[3],
                            date: parts[2],
                            author: role,
                            songTag: parts[7]
                          }, undefined, role === 'teacher');
                          return (
                            <div key={`curr-note-${idx}`}>
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#e6f4ea', border: '1px solid rgba(52, 168, 83, 0.2)', padding: '4px 8px', borderRadius: '8px', fontSize: '0.74rem', color: '#166534', fontStyle: 'normal', fontWeight: 700 }}>
                                <Mic size={12} color="#166534" />
                                <span>{role === 'teacher' ? 'Lehrer-Aufnahme' : 'Schüler-Aufnahme'}: "{label}" ({duration}s)</span>
                              </span>
                            </div>
                          );
                        }
                        return (
                          <div key={`curr-note-${idx}`} style={{ 
                            fontSize: '0.84rem', 
                            color: '#475569', 
                            fontWeight: 550, 
                            fontStyle: 'italic', 
                            borderLeft: '2.5px solid #34a853', 
                            paddingLeft: '10px', 
                            margin: '3px 0',
                            lineHeight: 1.4
                          }}>
                            {note}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div style={{ fontSize: '0.80rem', color: '#94a3b8', fontStyle: 'italic', padding: '2px 0' }}>
                      Noch keine Hausaufgaben erfasst.
                    </div>
                  )}
                </div>

                {/* Primary Action */}
                <div style={{ marginTop: '4px', paddingTop: '12px', borderTop: '1px solid #f1f5f9' }}>
                  <button
                    onClick={() => {
                      const foundStud = allStudents.find(s => s.id === prep.studentId);
                      setDocStudent({
                        ...(foundStud || {}),
                        id: prep.studentId,
                        first_name: prep.studentName.split(' ')[0],
                        last_name: prep.studentName.split(' ').slice(1).join(' '),
                        photo_url: '/avatar_ghost.jpg',
                        is_campus_active: foundStud ? foundStud.is_campus_active : false,
                        school_id: foundStud?.school_id || teacher?.school_id,
                        schoolId: foundStud?.school_id || teacher?.school_id,
                        schools: foundStud?.schools || (teacher as any)?.schools,
                        school_name: foundStud?.schools?.name || foundStud?.school_name
                      });
                    }}
                    style={{
                      width: '100%',
                      background: '#34a853',
                      color: 'white',
                      border: 'none',
                      padding: '12px 16px',
                      borderRadius: '14px',
                      fontSize: '0.88rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      boxShadow: '0 4px 12px rgba(52, 168, 83, 0.18)',
                      transition: 'all 0.2s'
                    }}
                    className="hover-scale"
                  >
                    <Edit3 size={16} />
                    <span>Hausaufgabe / Notiz erfassen</span>
                  </button>
                </div>
              </div>
            );
          }

          // WEEKEND or FEIERABEND (fallback)
          // 10 Seeded Feierabend wishes
          const wishes = [
            "Du hast heute Großartiges geleistet. Entspanne dich, tanke neue Energie und lass den Tag gemütlich ausklingen!",
            "Der produktive Teil des Tages ist geschafft! Mach es dir bequem, leg die Füße hoch und genieße deinen wohlverdienten Abend.",
            "Zeit, die Instrumente ruhen zu lassen. Wir wünschen dir einen entspannten Feierabend voller Ruhe und Gelassenheit!",
            "Ein erfolgreicher Unterrichtstag geht zu Ende. Geh raus, atme durch und genieße deine freie Zeit in vollen Zügen!",
            "Musik im Kopf und Entspannung im Herzen. Hab einen wundervollen, erholsamen Feierabend!",
            "Die Notenblätter sind sortiert, die Tasten ruhen. Jetzt ist Zeit für dich! Schönen Feierabend!",
            "Kopf aus, Entspannung an! Genieße die wohlverdiente Ruhe nach einem fantastischen Unterrichtstag.",
            "Ein toller Tag voller Rhythmus und Melodie liegt hinter dir. Lass den Abend nun ganz in deinem eigenen Tempo ausklingen.",
            "Feierabend! Lass den Alltagsstress hinter dir und mach heute Abend genau das, was dir am meisten Freude bringt.",
            "Schönen Feierabend! Zeit für frische Luft, gutes Essen und eine wohlverdiente Auszeit vom Schulalltag."
          ];

          const today = getSimulatedNow();
          const dateSeed = today.getDate() + today.getMonth() * 31 + today.getFullYear();
          const dailyWishIndex = dateSeed % wishes.length;

          const dailyWish = wishes[dailyWishIndex];
          const dailyItem = getDailyQuote(dateSeed, 'teacher');

          if (widgetState === 'WEEKEND') {
            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ 
                    background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.15) 0%, rgba(109, 40, 217, 0.1) 100%)', 
                    color: '#8b5cf6', 
                    width: '38px', 
                    height: '38px', 
                    borderRadius: '12px', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    boxShadow: '0 2px 8px rgba(139, 92, 246, 0.08)'
                  }}>
                    <Sparkles size={18} />
                  </div>
                  <div>
                    <h4 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#1d1d1f', fontFamily: "'Plus Jakarta Sans', sans-serif", letterSpacing: '-0.01em' }}>
                      Wochenende
                    </h4>
                    <div style={{ fontSize: '0.72rem', color: '#86868b', fontWeight: 500, marginTop: '1px' }}>Ruhe &amp; Regeneration</div>
                  </div>
                </div>

                {/* Premium Weekend Rest Card */}
                <div style={{
                  background: 'linear-gradient(135deg, rgba(245, 243, 255, 0.25) 0%, rgba(237, 233, 254, 0.05) 100%)',
                  border: '1px solid rgba(139, 92, 246, 0.25)',
                  borderRadius: '20px',
                  padding: '24px 20px',
                  color: '#6d28d9',
                  textAlign: 'center',
                  boxShadow: '0 10px 25px -5px rgba(139, 92, 246, 0.05), inset 0 1px 0 rgba(255, 255, 255, 0.5)',
                  position: 'relative',
                  overflow: 'hidden'
                }}>
                  {/* Decorative ambient background glow */}
                  <div style={{
                    position: 'absolute',
                    top: '-50%',
                    left: '-50%',
                    width: '200%',
                    height: '200%',
                    background: 'radial-gradient(circle, rgba(196, 181, 253, 0.15) 0%, transparent 60%)',
                    pointerEvents: 'none',
                    zIndex: 0
                  }} />

                  <div style={{ position: 'relative', zIndex: 1 }}>
                    <div style={{ 
                      fontSize: '1.35rem', 
                      fontWeight: 950, 
                      marginBottom: '10px',
                      letterSpacing: '-0.02em',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      color: '#8b5cf6',
                      fontFamily: "'Plus Jakarta Sans', sans-serif"
                    }}>
                      <Sun size={20} color="#8b5cf6" />
                      <span>Schönes Wochenende!</span>
                    </div>
                    <div style={{ fontSize: '0.86rem', fontWeight: 600, color: '#4b5563', lineHeight: '1.5' }}>
                      Genieße deine wohlverdiente Pause! Keine Termine, kein Schulstress. Erhole dich gut und tanke Kraft für neue musikalische Abenteuer in der kommenden Woche.
                    </div>
                  </div>
                </div>
              </div>
            );
          }

          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ 
                  background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.15) 0%, rgba(217, 119, 6, 0.1) 100%)', 
                  color: '#f59e0b', 
                  width: '38px', 
                  height: '38px', 
                  borderRadius: '12px', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  boxShadow: '0 2px 8px rgba(245, 158, 11, 0.08)'
                }}>
                  <Sparkles size={18} />
                </div>
                <div>
                  <h4 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#1d1d1f', fontFamily: "'Plus Jakarta Sans', sans-serif", letterSpacing: '-0.01em' }}>
                    Feierabend
                  </h4>
                  <div style={{ fontSize: '0.72rem', color: '#86868b', fontWeight: 500, marginTop: '1px' }}>Entspannung &amp; Inspiration</div>
                </div>
              </div>

              {/* Premium Feierabend Wishing Card */}
              <div style={{
                background: 'linear-gradient(135deg, rgba(254, 243, 199, 0.2) 0%, rgba(253, 230, 138, 0.05) 100%)',
                border: '1px solid rgba(245, 158, 11, 0.25)',
                borderRadius: '20px',
                padding: '24px 20px',
                color: '#78350f',
                textAlign: 'center',
                boxShadow: '0 10px 25px -5px rgba(245, 158, 11, 0.05), inset 0 1px 0 rgba(255, 255, 255, 0.5)',
                position: 'relative',
                overflow: 'hidden'
              }}>
                {/* Decorative ambient background glow */}
                <div style={{
                  position: 'absolute',
                  top: '-50%',
                  left: '-50%',
                  width: '200%',
                  height: '200%',
                  background: 'radial-gradient(circle, rgba(253, 224, 71, 0.15) 0%, transparent 60%)',
                  pointerEvents: 'none',
                  zIndex: 0
                }} />

                <div style={{ position: 'relative', zIndex: 1 }}>
                  <div style={{ 
                    fontSize: '1.35rem', 
                    fontWeight: 950, 
                    marginBottom: '10px',
                    letterSpacing: '-0.02em',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    color: '#d97706',
                    fontFamily: "'Plus Jakarta Sans', sans-serif"
                  }}>
                    <Sparkles size={20} color="#d97706" />
                    <span>Schönen Feierabend!</span>
                  </div>
                  <div style={{ fontSize: '0.86rem', fontWeight: 600, color: '#4b5563', lineHeight: '1.5' }}>
                    {dailyWish}
                  </div>
                </div>
              </div>

              <div style={{ 
                borderTop: '1px solid #f1f5f9', 
                paddingTop: '18px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px'
              }}>
                <div style={{
                  background: '#f8fafc',
                  border: '1px solid #f1f5f9',
                  borderRadius: '16px',
                  padding: '16px 20px',
                  position: 'relative',
                  textAlign: 'center'
                }}>
                  <span style={{ 
                    fontSize: '2rem', 
                    color: 'rgba(203, 213, 225, 0.5)', 
                    position: 'absolute', 
                    top: '6px', 
                    left: '12px',
                    fontFamily: 'Georgia, serif',
                    lineHeight: 1
                  }}>“</span>
                  <p style={{ 
                    margin: 0, 
                    fontSize: '0.85rem', 
                    color: '#334155', 
                    fontStyle: 'italic', 
                    lineHeight: '1.5',
                    fontWeight: 500,
                    padding: '0 10px'
                  }}>
                    {dailyItem.text}
                  </p>
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    gap: '6px', 
                    marginTop: '12px',
                    fontSize: '0.74rem',
                    color: '#64748b',
                    fontWeight: 700
                  }}>
                    <span style={{ 
                      background: dailyItem.type === 'joke' 
                        ? 'rgba(239, 68, 68, 0.08)' 
                        : dailyItem.type === 'fact'
                          ? 'rgba(52, 168, 83, 0.08)'
                          : 'rgba(99, 102, 241, 0.08)',
                      color: dailyItem.type === 'joke' 
                        ? '#ef4444' 
                        : dailyItem.type === 'fact'
                          ? '#34a853'
                          : '#4f46e5',
                      padding: '2px 8px',
                      borderRadius: '100px',
                      fontSize: '0.65rem',
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em'
                    }}>
                      {dailyItem.type === 'joke' ? 'Witz' : dailyItem.type === 'fact' ? 'Fakt' : 'Zitat'}
                    </span>
                    <span>— {dailyItem.author}</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}
      </div>
    )

  );
};
