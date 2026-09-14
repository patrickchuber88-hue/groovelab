import { formatCleanNoteContent } from '../notes/notesConstants';
import React, { useState, useRef } from 'react';
import {
  CalendarX, Check, Clock, Coffee, DoorOpen, Eye, EyeOff,
  HelpCircle, MessageSquare, Mic, Sparkles, Users
} from 'lucide-react';
import { maskLastName, formatSingleStudentAnonymized } from '../../utils/nameHelper';
import { isTeacherCurrentlyAbsent } from '../../utils/teacherAbsenceHelper';
import { isUUID } from '../../utils/uuidValidator';

export interface TeacherTourDemoScheduleProps {
  isFreeDay?: boolean;
  getSimulatedNow: () => Date;
  windowWidth?: number;
  showRealNames?: boolean;
  toggleRealNames?: () => void;
}

export const TeacherTourDemoSchedule: React.FC<TeacherTourDemoScheduleProps> = ({
  isFreeDay,
  getSimulatedNow,
  windowWidth = 1024,
  showRealNames = false,
  toggleRealNames,
}) => (
    <div id="tour-teacher-schedule" className="google-card animation-slide-up" style={{ 
      flex: isFreeDay ? '0.8 1 300px' : '1.2 1 450px', 
      minWidth: '300px', 
      padding: '20px 24px', 
      borderRadius: '20px', 
      border: '1px solid #f1f5f9', 
      boxShadow: '0 2px 12px rgba(0,0,0,0.04)', 
      background: 'white', 
      boxSizing: 'border-box',
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      maxHeight: windowWidth >= 768 ? '700px' : undefined
    }}>
      {/* 1:1 Live Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: '#1f2937' }}>
          <Clock size={20} color="#0b57d0" />
          <strong style={{ fontSize: '1.05rem', fontWeight: 800, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            Tagesplan – {getSimulatedNow().toLocaleDateString('de-DE')} (Unterrichte Heute)
          </strong>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{
            fontSize: '0.72rem',
            fontWeight: 800,
            padding: '4px 12px',
            borderRadius: '100px',
            background: '#e8f0fe',
            color: '#0b57d0',
            fontFamily: 'Inter'
          }}>
            LIVE
          </span>
          <button
            type="button"
            onClick={() => toggleRealNames?.()}
            title={showRealNames ? "Auge an: Datenschutz aktiv (Vorname N.)" : "Auge aus: Klarnamen aktiv (Vorname Nachname)"}
            style={{
              border: 'none',
              background: showRealNames ? '#e6f4ea' : '#f1f5f9',
              color: showRealNames ? '#34a853' : '#64748b',
              width: (windowWidth < 768) ? '36px' : '28px',
              height: (windowWidth < 768) ? '36px' : '28px',
              minWidth: (windowWidth < 768) ? '36px' : '28px',
              minHeight: (windowWidth < 768) ? '36px' : '28px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 0.2s',
              touchAction: 'manipulation'
            }}
          >
            {showRealNames ? <Eye size={14} /> : <EyeOff size={14} />}
          </button>
        </div>
      </div>

      {/* 1:1 Live Timeline Stream */}
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        gap: '8px', 
        position: 'relative',
        overflowY: 'auto',
        paddingRight: '6px',
        flex: 1,
        minHeight: 0
      }}>
        <div style={{ position: 'absolute', top: '16px', bottom: '16px', left: '9px', width: '2px', background: '#e2e8f0' }} />

        {/* Slot 1: 13:30 Jonah K. (Past) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: windowWidth < 768 ? '10px' : '14px', position: 'relative', zIndex: 1 }}>
          <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#34a853', margin: '0 4px', flexShrink: 0, boxShadow: '0 0 0 3px #ffffff' }} />
          <div style={{
            flex: 1,
            background: '#ffffff',
            border: '1.5px solid #e2e8f0',
            borderLeft: '5px solid #34a853',
            borderRadius: '16px',
            padding: windowWidth < 768 ? '10px 14px' : '12px 18px',
            display: 'flex',
            flexDirection: windowWidth < 768 ? 'column' : 'row',
            alignItems: windowWidth < 768 ? 'stretch' : 'center',
            justifyContent: 'space-between',
            gap: windowWidth < 768 ? '4px' : '14px',
            boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
            minWidth: 0
          }}>
            {windowWidth < 768 ? (
              <>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', minWidth: 0 }}>
                  <span style={{ fontWeight: 900, fontSize: '0.96rem', color: '#16a34a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Jonah K.</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                    <div style={{ background: '#f8fafc', padding: '5px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Mic size={14} color="#94a3b8" />
                    </div>
                    <div style={{ background: '#f8fafc', padding: '5px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <MessageSquare size={14} color="#94a3b8" />
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', color: '#64748b', fontWeight: 600 }}>
                  <span style={{ fontWeight: 800, color: '#0f172a', fontFamily: 'monospace' }}>13:30 Uhr</span>
                  <span>•</span>
                  <span>Gitarre</span>
                  <span>•</span>
                  <span>Raum 4</span>
                </div>
              </>
            ) : (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'nowrap', minWidth: 0 }}>
                  <span style={{ fontWeight: 800, fontSize: '0.92rem', color: '#0f172a', fontFamily: 'monospace', flexShrink: 0 }}>13:30 Uhr</span>
                  <span style={{ color: '#cbd5e1', fontSize: '0.85rem' }}>|</span>
                  <span style={{ fontWeight: 800, fontSize: '0.92rem', color: '#16a34a', whiteSpace: 'nowrap' }}>Jonah K.</span>
                  <span style={{ color: '#64748b', fontSize: '0.84rem', fontWeight: 600, whiteSpace: 'nowrap' }}>• Gitarre • Raum 4</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
                  <Mic size={17} color="#94a3b8" />
                  <MessageSquare size={17} color="#94a3b8" />
                </div>
              </>
            )}
          </div>
        </div>

        {/* Slot 2: 14:00 Justus G. (Active Highlight) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: windowWidth < 768 ? '10px' : '14px', position: 'relative', zIndex: 1 }}>
          <div style={{ width: '14px', height: '14px', borderRadius: '50%', border: '3px solid #34a853', background: '#ffffff', margin: '0 3px', flexShrink: 0, boxShadow: '0 0 0 3px #ffffff' }} />
          <div style={{
            flex: 1,
            background: '#f0fdf4',
            border: '1.5px solid #bbf7d0',
            borderLeft: '5px solid #34a853',
            borderRadius: '16px',
            padding: windowWidth < 768 ? '10px 14px' : '12px 18px',
            display: 'flex',
            flexDirection: windowWidth < 768 ? 'column' : 'row',
            alignItems: windowWidth < 768 ? 'stretch' : 'center',
            justifyContent: 'space-between',
            gap: windowWidth < 768 ? '4px' : '14px',
            boxShadow: '0 4px 12px rgba(34, 197, 94, 0.08)',
            minWidth: 0
          }}>
            {windowWidth < 768 ? (
              <>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', minWidth: 0 }}>
                  <span style={{ fontWeight: 900, fontSize: '0.96rem', color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Justus G.</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                    <div style={{ background: '#ffffff', border: '1px solid rgba(52, 168, 83, 0.2)', padding: '5px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Mic size={14} color="#166534" />
                    </div>
                    <div style={{ background: '#ffffff', border: '1px solid rgba(52, 168, 83, 0.2)', padding: '5px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <MessageSquare size={14} color="#166534" />
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', color: '#64748b', fontWeight: 600 }}>
                  <span style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    background: '#ffffff',
                    border: '1px solid #34a853',
                    borderRadius: '6px',
                    padding: '2px 6px',
                    fontWeight: 800,
                    fontSize: '0.75rem',
                    color: '#166534',
                    fontFamily: 'monospace'
                  }}>
                    <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#34a853' }} />
                    14:00 Uhr
                  </span>
                  <span>•</span>
                  <span>Gitarre</span>
                  <span>•</span>
                  <span>Raum 4</span>
                </div>
              </>
            ) : (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'nowrap', minWidth: 0 }}>
                  <span style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    background: '#ffffff',
                    border: '1.5px solid #34a853',
                    borderRadius: '8px',
                    padding: '3px 8px',
                    fontWeight: 800,
                    fontSize: '0.86rem',
                    color: '#166534',
                    fontFamily: 'monospace',
                    flexShrink: 0
                  }}>
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#34a853' }} />
                    14:00 Uhr
                  </span>
                  <span style={{ color: '#cbd5e1', fontSize: '0.85rem' }}>|</span>
                  <span style={{ fontWeight: 900, fontSize: '0.94rem', color: '#0f172a', whiteSpace: 'nowrap' }}>Justus G.</span>
                  <span style={{ color: '#64748b', fontSize: '0.84rem', fontWeight: 600, whiteSpace: 'nowrap' }}>• Gitarre • Raum 4</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
                  <Mic size={17} color="#94a3b8" />
                  <MessageSquare size={17} color="#94a3b8" />
                </div>
              </>
            )}
          </div>
        </div>

        {/* Slot 3: 14:30 Celina S. (Upcoming) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: windowWidth < 768 ? '10px' : '14px', position: 'relative', zIndex: 1 }}>
          <div style={{ width: '12px', height: '12px', borderRadius: '50%', border: '2px solid #cbd5e1', background: '#ffffff', margin: '0 4px', flexShrink: 0, boxShadow: '0 0 0 3px #ffffff' }} />
          <div style={{
            flex: 1,
            background: '#ffffff',
            border: '1.5px solid #e2e8f0',
            borderLeft: '5px solid #cbd5e1',
            borderRadius: '16px',
            padding: windowWidth < 768 ? '10px 14px' : '12px 18px',
            display: 'flex',
            flexDirection: windowWidth < 768 ? 'column' : 'row',
            alignItems: windowWidth < 768 ? 'stretch' : 'center',
            justifyContent: 'space-between',
            gap: windowWidth < 768 ? '4px' : '14px',
            boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
            minWidth: 0
          }}>
            {windowWidth < 768 ? (
              <>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', minWidth: 0 }}>
                  <span style={{ fontWeight: 900, fontSize: '0.96rem', color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Celina S.</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                    <div style={{ background: '#f8fafc', padding: '5px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Mic size={14} color="#94a3b8" />
                    </div>
                    <div style={{ background: '#f8fafc', padding: '5px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <MessageSquare size={14} color="#94a3b8" />
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', color: '#64748b', fontWeight: 600 }}>
                  <span style={{ fontWeight: 800, color: '#0f172a', fontFamily: 'monospace' }}>14:30 Uhr</span>
                  <span>•</span>
                  <span>Gitarre</span>
                  <span>•</span>
                  <span>Raum 4</span>
                </div>
              </>
            ) : (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'nowrap', minWidth: 0 }}>
                  <span style={{ fontWeight: 800, fontSize: '0.92rem', color: '#0f172a', fontFamily: 'monospace', flexShrink: 0 }}>14:30 Uhr</span>
                  <span style={{ color: '#cbd5e1', fontSize: '0.85rem' }}>|</span>
                  <span style={{ fontWeight: 800, fontSize: '0.92rem', color: '#0f172a', whiteSpace: 'nowrap' }}>Celina S.</span>
                  <span style={{ color: '#64748b', fontSize: '0.84rem', fontWeight: 600, whiteSpace: 'nowrap' }}>• Gitarre • Raum 4</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
                  <Mic size={17} color="#94a3b8" />
                  <MessageSquare size={17} color="#94a3b8" />
                </div>
              </>
            )}
          </div>
        </div>

        {/* Slot 4: 15:00 Marlene F. (Upcoming) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: windowWidth < 768 ? '10px' : '14px', position: 'relative', zIndex: 1 }}>
          <div style={{ width: '12px', height: '12px', borderRadius: '50%', border: '2px solid #cbd5e1', background: '#ffffff', margin: '0 4px', flexShrink: 0, boxShadow: '0 0 0 3px #ffffff' }} />
          <div style={{
            flex: 1,
            background: '#ffffff',
            border: '1.5px solid #e2e8f0',
            borderLeft: '5px solid #cbd5e1',
            borderRadius: '16px',
            padding: windowWidth < 768 ? '10px 14px' : '12px 18px',
            display: 'flex',
            flexDirection: windowWidth < 768 ? 'column' : 'row',
            alignItems: windowWidth < 768 ? 'stretch' : 'center',
            justifyContent: 'space-between',
            gap: windowWidth < 768 ? '4px' : '14px',
            boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
            minWidth: 0
          }}>
            {windowWidth < 768 ? (
              <>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', minWidth: 0 }}>
                  <span style={{ fontWeight: 900, fontSize: '0.96rem', color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Marlene F.</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                    <div style={{ background: '#f8fafc', padding: '5px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Mic size={14} color="#94a3b8" />
                    </div>
                    <div style={{ background: '#f8fafc', padding: '5px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <MessageSquare size={14} color="#94a3b8" />
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', color: '#64748b', fontWeight: 600 }}>
                  <span style={{ fontWeight: 800, color: '#0f172a', fontFamily: 'monospace' }}>15:00 Uhr</span>
                  <span>•</span>
                  <span>Gitarre</span>
                  <span>•</span>
                  <span>Raum 4</span>
                </div>
              </>
            ) : (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'nowrap', minWidth: 0 }}>
                  <span style={{ fontWeight: 800, fontSize: '0.92rem', color: '#0f172a', fontFamily: 'monospace', flexShrink: 0 }}>15:00 Uhr</span>
                  <span style={{ color: '#cbd5e1', fontSize: '0.85rem' }}>|</span>
                  <span style={{ fontWeight: 800, fontSize: '0.92rem', color: '#0f172a', whiteSpace: 'nowrap' }}>Marlene F.</span>
                  <span style={{ color: '#64748b', fontSize: '0.84rem', fontWeight: 600, whiteSpace: 'nowrap' }}>• Gitarre • Raum 4</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
                  <Mic size={17} color="#94a3b8" />
                  <MessageSquare size={17} color="#94a3b8" />
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );


export interface TeacherTagesplanRoomIssuesBannerProps {
  isDesktop?: boolean;
  relevantRoomIssuesToday: any[];
  teacherTodayRooms: any[];
  handleResolveRoomIssueInTagesplan: (issueId: string) => Promise<void> | void;
  getIssueRoomLabel: (issue: any, fallback?: any) => string;
  teacher?: any;
  userId?: string;
}

export const TeacherTagesplanRoomIssuesBanner: React.FC<TeacherTagesplanRoomIssuesBannerProps> = ({
  isDesktop = true,
  relevantRoomIssuesToday,
  teacherTodayRooms,
  handleResolveRoomIssueInTagesplan,
  getIssueRoomLabel,
  teacher,
  userId,
}) => {
    if (relevantRoomIssuesToday.length === 0) return null;

    return (
      <div 
        style={{
          width: '100%',
          padding: isDesktop ? '10px 16px' : '10px 14px',
          background: 'rgba(254, 242, 242, 0.85)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(239, 68, 68, 0.2)',
          borderRadius: '18px',
          boxShadow: '0 4px 20px -4px rgba(220, 38, 38, 0.08), 0 1px 3px rgba(0, 0, 0, 0.02)',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          boxSizing: 'border-box'
        }}
      >
        {relevantRoomIssuesToday.map(issue => {
          const isMyReport = issue.user_id === (teacher?.id || userId);
          const authorDisplay = isMyReport 
            ? 'Von dir' 
            : (issue.author_name ? `Gemeldet von ${issue.author_name}` : 'Kollegium');
          const cleanContent = formatCleanNoteContent(issue.content, issue.student_name);
          const roomLabel = getIssueRoomLabel(issue, teacherTodayRooms[0] || 'Raum 4');

          return (
            <div
              key={`tagesplan-issue-${issue.id}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '10px',
                width: '100%',
                minHeight: '28px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flex: 1 }}>
                {/* Apple Squircle Icon Badge */}
                <div style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '7px',
                  background: 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)',
                  border: '1px solid rgba(239, 68, 68, 0.25)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  boxShadow: '0 1px 3px rgba(239, 68, 68, 0.12)'
                }}>
                  <DoorOpen size={13} color="#dc2626" />
                </div>

                {/* Room Pill */}
                <span style={{
                  fontSize: '0.74rem',
                  fontWeight: 800,
                  color: '#991b1b',
                  letterSpacing: '-0.01em',
                  flexShrink: 0
                }}>
                  {roomLabel}
                </span>

                <span style={{ color: '#fca5a5', fontSize: '0.74rem', flexShrink: 0 }}>•</span>

                {/* Clean Content Text */}
                <span 
                  title={cleanContent}
                  style={{
                    fontSize: '0.80rem',
                    fontWeight: 650,
                    color: '#1e293b',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    minWidth: 0
                  }}
                >
                  {cleanContent}
                </span>

                {/* Author Capsule */}
                <span style={{
                  fontSize: '0.64rem',
                  fontWeight: 750,
                  color: isMyReport ? '#0284c7' : '#64748b',
                  background: isMyReport ? 'rgba(2, 132, 199, 0.10)' : 'rgba(100, 116, 139, 0.10)',
                  border: isMyReport ? '1px solid rgba(2, 132, 199, 0.20)' : '1px solid rgba(100, 116, 139, 0.15)',
                  padding: '2px 7px',
                  borderRadius: '100px',
                  whiteSpace: 'nowrap',
                  flexShrink: 0
                }}>
                  {authorDisplay}
                </span>
              </div>

              {/* 1-Tap Apple Action Pill Button */}
              <button
                type="button"
                onClick={() => handleResolveRoomIssueInTagesplan(issue.id)}
                style={{
                  background: '#16a34a',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '100px',
                  padding: '5px 12px',
                  fontSize: '0.72rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  flexShrink: 0,
                  boxShadow: '0 2px 6px rgba(22, 163, 74, 0.30)',
                  transition: 'all 0.15s ease'
                }}
                className="hover-scale-mini"
                title="Mangel als selbst behoben markieren"
              >
                <Check size={12} strokeWidth={3} color="#ffffff" />
                <span>Selbst behoben</span>
              </button>
            </div>
          );
        })}
      </div>
    );
  };

export const resolveSlotStudent = (slotOrStudent: any, allStudents?: any[]) => {
  if (!slotOrStudent) return null;
  const target = slotOrStudent.isGroup 
    ? (slotOrStudent.students?.[0] || slotOrStudent.student) 
    : (slotOrStudent.student || slotOrStudent.students?.[0] || slotOrStudent);
  
  if (!target) return null;

  const targetFn = target.first_name || (target.name ? target.name.trim().split(/\s+/)[0] : '');
  const targetLn = target.last_name || (target.name ? target.name.trim().split(/\s+/).slice(1).join(' ') : '');

  const matchedFromAll = allStudents?.find((s: any) => 
    (target.id && s.id === target.id) ||
    (target.student_id && s.id === target.student_id) ||
    (target.studentId && s.id === target.studentId) ||
    (slotOrStudent.student_id && s.id === slotOrStudent.student_id) ||
    (slotOrStudent.studentId && s.id === slotOrStudent.studentId) ||
    (s.first_name && targetFn && s.first_name.trim().toLowerCase() === targetFn.trim().toLowerCase() && 
     (!targetLn || !s.last_name || s.last_name.trim().toLowerCase().startsWith(targetLn.trim().toLowerCase()[0]))) ||
    (s.name && target.name && s.name.trim().toLowerCase() === target.name.trim().toLowerCase()) ||
    (s.first_name && target.name && s.first_name.trim().toLowerCase() === target.name.trim().split(' ')[0].toLowerCase())
  );

  const canonicalId = (isUUID(matchedFromAll?.id) ? matchedFromAll.id : null) ||
                      (isUUID(target.id) ? target.id : null) ||
                      (isUUID(target.student_id) ? target.student_id : null) ||
                      (isUUID(slotOrStudent.student_id) ? slotOrStudent.student_id : null) ||
                      matchedFromAll?.id ||
                      target.id ||
                      target.student_id ||
                      slotOrStudent.student_id;

  const resolvedStudent = {
    ...target,
    ...(matchedFromAll || {}),
    id: canonicalId,
    student_id: canonicalId,
    slot_id: target.id,
    first_name: matchedFromAll?.first_name || targetFn || 'Schüler',
    last_name: matchedFromAll?.last_name || targetLn || '',
    photo_url: matchedFromAll?.photo_url || target.photo_url || '/avatar_ghost.jpg',
    is_campus_active: matchedFromAll ? matchedFromAll.is_campus_active : target.is_campus_active,
    canonical_uuid: isUUID(canonicalId) ? canonicalId : (isUUID(matchedFromAll?.id) ? matchedFromAll.id : undefined)
  };

  return {
    targetStudent: target,
    matchedFromAll,
    canonicalId,
    resolvedStudent
  };
};

export interface TeacherTagesplanWidgetProps {
  teacher: any;
  activeChatOcc: any;
  setActiveChatOcc: (occ: any) => void;
  docStudent: any;
  setDocStudent: (s: any) => void;
  allStudents?: any[];
  isAbsenceWidgetExpanded?: boolean;
  setIsAbsenceWidgetExpanded?: React.Dispatch<React.SetStateAction<boolean>>;
  absenceUntilDate?: string;
  setAbsenceUntilDate?: React.Dispatch<React.SetStateAction<string>>;
  bypassAbsenceView?: boolean;
  currentTimeStr: string;
  quickAudioStudent: any;
  setQuickAudioStudent: (s: any) => void;
  loadingPrepMirror: boolean;
  windowWidth: number;
  isMobileDevice: boolean;
  activeTimelineSlotRef: any;
  briefingData: any;
  checkHasStudentQuestion: (studentId: string) => boolean;
  checkHasTodayAudio: (studentId: string) => boolean;
  cleanRoomName: (roomName: string) => string;
  getIssueRoomLabel: (issue: any, fallback?: any) => string;
  handleResolveRoomIssueInTagesplan: (issueId: string) => Promise<void> | void;
  isStudentBirthdayToday: (student: any) => boolean;
  resolveStudentInstrument: (...args: any[]) => string;
  splitAndNormalizeStudents: (students: any, allStudents?: any[]) => any[];
  getSimulatedNow: () => Date;
  relevantRoomIssuesToday: any[];
  teacherTodayRooms: any[];
  isFreeDay: boolean;
  isWeekend: boolean;
  isTourDemoScheduleActive: boolean;
  showRealNames: boolean;
  toggleRealNames: () => void;
  userId?: string;
  urgentCancellations?: any[];
  onOpenUrgentModal?: () => void;
  onOpenMakeupModal?: (params: { mode: 'create' | 'redeem', slot: any }) => void;
}

export const TeacherTagesplanWidget: React.FC<TeacherTagesplanWidgetProps> = ({
  teacher,
  activeChatOcc,
  setActiveChatOcc,
  docStudent,
  setDocStudent,
  allStudents,
  isAbsenceWidgetExpanded,
  setIsAbsenceWidgetExpanded,
  absenceUntilDate,
  setAbsenceUntilDate,
  bypassAbsenceView,
  currentTimeStr,
  quickAudioStudent,
  setQuickAudioStudent,
  loadingPrepMirror,
  windowWidth,
  isMobileDevice,
  activeTimelineSlotRef,
  briefingData,
  checkHasStudentQuestion,
  checkHasTodayAudio,
  cleanRoomName,
  getIssueRoomLabel,
  handleResolveRoomIssueInTagesplan,
  isStudentBirthdayToday,
  resolveStudentInstrument,
  splitAndNormalizeStudents,
  getSimulatedNow,
  relevantRoomIssuesToday,
  teacherTodayRooms,
  isFreeDay,
  isWeekend,
  isTourDemoScheduleActive,
  showRealNames,
  toggleRealNames,
  urgentCancellations = [],
  userId,
  onOpenUrgentModal,
  onOpenMakeupModal,
}) => {
  const [scrollTop, setScrollTop] = useState(0);

  return (
    isTourDemoScheduleActive ? (
      <TeacherTourDemoSchedule isFreeDay={isFreeDay} getSimulatedNow={getSimulatedNow} windowWidth={windowWidth} showRealNames={showRealNames} toggleRealNames={toggleRealNames} />
    ) : !(isWeekend || isFreeDay) ? (
      isTeacherCurrentlyAbsent(teacher) && !bypassAbsenceView ? (
        <div style={{
          flex: '1.2 1 450px',
          minWidth: '300px',
          background: 'linear-gradient(135deg, #fff1f2 0%, #fff5f5 100%)',
          border: '1.5px solid #fecaca',
          borderRadius: '20px',
          padding: '24px',
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '6px',
          boxShadow: 'inset 0 2px 4px rgba(255,255,255,0.6), 0 2px 12px rgba(0,0,0,0.02)',
          boxSizing: 'border-box'
        }}>
           <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 900, color: '#991b1b', fontFamily: "'Plus Jakarta Sans', sans-serif", display: 'flex', alignItems: 'center', gap: '8px' }}>
             <CalendarX size={20} color="#dc2626" />
             Abwesenheits-Modus aktiv
           </h4>
           <p style={{ margin: 0, fontSize: '0.82rem', color: '#b91c1c', fontWeight: 600, maxWidth: '440px', lineHeight: 1.4 }}>
             Deine Termine für diesen Zeitraum wurden storniert und betroffene Schüler und Eltern benachrichtigt.
           </p>
        </div>
      ) : (
        <div style={{
          flex: isFreeDay ? '0.8 1 300px' : '1.2 1 450px', 
          minWidth: (windowWidth < 768 || isMobileDevice) ? '100%' : '300px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px'
        }}>
          <div id="tour-teacher-schedule" className="google-card" style={{ 
            width: '100%', 
            padding: (windowWidth < 768 || isMobileDevice) ? '16px 14px' : '20px 24px', 
            borderRadius: '20px', 
            border: '1px solid #f1f5f9', 
            boxShadow: '0 2px 12px rgba(0,0,0,0.04)', 
            background: 'white', 
            boxSizing: 'border-box',
            display: 'flex',
            flexDirection: 'column',
            maxHeight: windowWidth >= 768 ? '700px' : undefined
          }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: '#1f2937' }}>
              <Clock size={20} color="#0b57d0" />
              <strong style={{ fontSize: '1.05rem', fontWeight: 800, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Tagesplan – {getSimulatedNow().toLocaleDateString('de-DE')} (Unterrichte Heute)</strong>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{
                fontSize: '0.72rem',
                fontWeight: 800,
                padding: '4px 12px',
                borderRadius: '100px',
                background: '#e8f0fe',
                color: '#0b57d0',
                fontFamily: 'Inter'
              }}>
                LIVE
              </span>
              <button
                type="button"
                onClick={() => toggleRealNames()}
                title={showRealNames ? "Auge an: Datenschutz aktiv (Vorname N.)" : "Auge aus: Klarnamen aktiv (Vorname Nachname)"}
                style={{
                  border: 'none',
                  background: showRealNames ? '#e6f4ea' : '#f1f5f9',
                  color: showRealNames ? '#34a853' : '#64748b',
                  width: (isMobileDevice || windowWidth < 768) ? '36px' : '28px',
                  height: (isMobileDevice || windowWidth < 768) ? '36px' : '28px',
                  minWidth: (isMobileDevice || windowWidth < 768) ? '36px' : '28px',
                  minHeight: (isMobileDevice || windowWidth < 768) ? '36px' : '28px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  touchAction: 'manipulation'
                }}
              >
                {showRealNames ? <Eye size={14} /> : <EyeOff size={14} />}
              </button>
            </div>
          </div>

          <div 
            onScroll={(e) => {
              const target = e.currentTarget;
              setScrollTop(target.scrollTop);
            }}
            style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            gap: '8px', 
            position: 'relative',
            overflowY: 'auto',
            paddingRight: '6px',
            maxHeight: (windowWidth < 768 || isMobileDevice) ? '520px' : undefined,
            flex: 1,
            minHeight: 0
          }}>
            <div style={{ position: 'absolute', top: '16px', bottom: '16px', left: '9px', width: '2px', background: '#e2e8f0' }} />
            {briefingData ? (
              <div>
                {briefingData.timeline && briefingData.timeline.length > 0 ? (() => {
                  const rawTimeline = briefingData.timeline || [];
                  const groupedTimeline: any[] = [];
                  
                  rawTimeline.forEach((slot: any) => {
                    if (!slot.student && (!slot.students || slot.students.length === 0) && !slot.isGroup) {
                      groupedTimeline.push({ ...slot, isBreak: true, isGroup: false, students: [], slots: [slot] });
                    } else if (slot.status === 'rescheduled_away') {
                      // If this slot was rescheduled away to another day, check if there is an active slot for this timeSlot in rawTimeline
                      const hasActiveSlotAtSameTime = rawTimeline.some((other: any) => 
                        other !== slot && 
                        other.timeSlot === slot.timeSlot && 
                        other.status !== 'rescheduled_away' && 
                        other.status !== 'canceled_by_student' &&
                        other.status !== 'cancelled'
                      );
                      // If there is an active replacement slot at this time, the moved-away slot is superseded in the timeline (it is displayed in the Vorbereitung card)
                      if (!hasActiveSlotAtSameTime) {
                        groupedTimeline.push({
                          ...slot,
                          isBreak: false,
                          isGroup: false,
                          students: splitAndNormalizeStudents([slot.student], allStudents),
                          slots: [slot]
                        });
                      }
                    } else {
                      const subStudents = splitAndNormalizeStudents(
                        slot.students && slot.students.length > 0 ? slot.students : [slot.student], 
                        allStudents
                      );
                      const isExplicitGroup = Boolean(
                        slot.isGroup || 
                        slot.is_group || 
                        (slot.groupStudents && slot.groupStudents.length > 1) || 
                        subStudents.length > 1 || 
                        (slot.student?.name && slot.student.name.includes('&')) ||
                        (slot.student?.first_name && slot.student.first_name.includes('&'))
                      );

                      // Only merge with an existing slot if BOTH are explicitly marked as a group or belong to the same group/schedule:
                      const existing = isExplicitGroup ? groupedTimeline.find(item => 
                        !item.isBreak && 
                        item.timeSlot === slot.timeSlot &&
                        (item.isGroup || (slot.scheduleId && item.scheduleId === slot.scheduleId)) &&
                        !item.slots.some((s: any) => s.status === 'rescheduled_away')
                      ) : null;

                      if (existing) {
                        existing.slots.push(slot);
                        subStudents.forEach(st => {
                          const stFn = (st.first_name || st.name?.split(' ')[0] || '').toLowerCase().trim();
                          const alreadyHas = existing.students.some((s: any) => {
                            if (s.id && st.id && s.id === st.id) return true;
                            const sFn = (s.first_name || s.name?.split(' ')[0] || '').toLowerCase().trim();
                            return sFn && stFn && sFn === stFn;
                          });
                          if (!alreadyHas) {
                            existing.students.push(st);
                          } else {
                            const matchIdx = existing.students.findIndex((s: any) => {
                              if (s.id && st.id && s.id === st.id) return true;
                              const sFn = (s.first_name || s.name?.split(' ')[0] || '').toLowerCase().trim();
                              return sFn && stFn && sFn === stFn;
                            });
                            if (matchIdx !== -1 && (st.last_name || st.id)) {
                              existing.students[matchIdx] = { ...existing.students[matchIdx], ...st };
                            }
                          }
                        });
                        if (existing.students.length > 1 || slot.isGroup) {
                          existing.isGroup = true;
                        }
                      } else {
                        groupedTimeline.push({
                          ...slot,
                          isBreak: false,
                          isGroup: isExplicitGroup,
                          students: [...subStudents],
                          slots: [slot]
                        });
                      }
                    }
                  });

                  // Insert automatic break/gap items between consecutive slots if there is an empty window >= 15 min
                  const timelineWithGaps: any[] = [];
                  const sortedTimeline = [...groupedTimeline].sort((a, b) => {
                    const [ah, am] = (a.timeSlot || '00:00').split(':').map(Number);
                    const [bh, bm] = (b.timeSlot || '00:00').split(':').map(Number);
                    return (ah * 60 + am) - (bh * 60 + bm);
                  });

                  sortedTimeline.forEach((currentSlot, i) => {
                    if (i > 0) {
                      const prevSlot = sortedTimeline[i - 1];
                      const [ph, pm] = (prevSlot.timeSlot || '00:00').split(':').map(Number);
                      const prevDuration = prevSlot.duration || 30;
                      const prevEndMinutes = ph * 60 + pm + prevDuration;
                      
                      const [ch, cm] = (currentSlot.timeSlot || '00:00').split(':').map(Number);
                      const currentStartMinutes = ch * 60 + cm;
                      
                      const gapMinutes = currentStartMinutes - prevEndMinutes;
                      if (gapMinutes >= 15 && !prevSlot.isBreak && !currentSlot.isBreak) {
                        const gapStartH = Math.floor(prevEndMinutes / 60);
                        const gapStartM = prevEndMinutes % 60;
                        const gapStartTimeStr = `${String(gapStartH).padStart(2, '0')}:${String(gapStartM).padStart(2, '0')}`;
                        
                        timelineWithGaps.push({
                          id: `auto-gap-${gapStartTimeStr}-${gapMinutes}`,
                          timeSlot: gapStartTimeStr,
                          duration: gapMinutes,
                          isBreak: true,
                          isGroup: false,
                          students: [],
                          slots: [],
                          room: prevSlot.room || 'Freiraum',
                          status: 'scheduled'
                        });
                      }
                    }
                    timelineWithGaps.push(currentSlot);
                  });

                  let prepIndex = -1;
                  for (let i = 0; i < timelineWithGaps.length; i++) {
                    const slot = timelineWithGaps[i];
                    const activeSlots = (slot.isGroup && Array.isArray(slot.slots)) ? slot.slots : (slot.slots || [slot]);
                    const isCanceled = activeSlots.every((s: any) => s.status === 'canceled_by_student' || s.status === 'teacher_sick' || s.status === 'cancelled' || s.status === 'canceled_by_teacher_sick');
                    if (!isCanceled) {
                      const slotStart = slot.timeSlot;
                      const slotEnd = (() => {
                        const [sh, sm] = slotStart.split(':').map(Number);
                        const totalMin = sh * 60 + sm + (slot.duration || 30);
                        return `${String(Math.floor(totalMin / 60) % 24).padStart(2, '0')}:${String(totalMin % 60).padStart(2, '0')}`;
                      })();
                      const isFinished = currentTimeStr >= slotEnd;
                      if (!isFinished) {
                        prepIndex = i;
                        break;
                      }
                    }
                  }

                  const estimatedItemHeight = 90;
                  const totalSlots = timelineWithGaps.length;
                  const viewportHeight = 600;
                  const startIndex = totalSlots > 12 ? Math.max(0, Math.floor(scrollTop / estimatedItemHeight) - 4) : 0;
                  const endIndex = totalSlots > 12 ? Math.min(totalSlots - 1, Math.ceil((scrollTop + viewportHeight) / estimatedItemHeight) + 4) : totalSlots - 1;

                  return timelineWithGaps.map((slot: any, idx: number) => {
                    if (totalSlots > 12 && (idx < startIndex || idx > endIndex)) {
                      return (
                        <div 
                          key={slot.id || idx} 
                          style={{ height: `${estimatedItemHeight}px`, width: '100%' }} 
                          aria-hidden="true" 
                        />
                      );
                    }

                    const slotStart = slot.timeSlot;
                    const slotEnd = (() => {
                      const [sh, sm] = slotStart.split(':').map(Number);
                      const totalMin = sh * 60 + sm + (slot.duration || 30);
                      return `${String(Math.floor(totalMin / 60) % 24).padStart(2, '0')}:${String(totalMin % 60).padStart(2, '0')}`;
                    })();

                    const isBreak = slot.isBreak;
                    const activeSlots = (slot.isGroup && Array.isArray(slot.slots)) ? slot.slots : (slot.slots || [slot]);
                    
                    const isCanceled = activeSlots.every((s: any) => s.status === 'canceled_by_student' || s.status === 'teacher_sick' || s.status === 'cancelled' || s.status === 'canceled_by_teacher_sick');
                    const isRescheduledAway = activeSlots.every((s: any) => s.status === 'rescheduled_away');
                    const isFinished = currentTimeStr >= slotEnd && !isCanceled && !isRescheduledAway;
                    const isCurrentSlot = currentTimeStr >= slotStart && currentTimeStr < slotEnd;
                    const minutesToSlotEnd = (() => {
                      const [ch, cm] = currentTimeStr.split(':').map(Number);
                      const [eh, em] = slotEnd.split(':').map(Number);
                      const currentTotal = ch * 60 + cm;
                      const endTotal = eh * 60 + em;
                      return endTotal - currentTotal;
                    })();
                    const isWrapUp = isCurrentSlot && !isFinished && !isBreak && !isCanceled && !isRescheduledAway && minutesToSlotEnd <= 3 && minutesToSlotEnd > 0;
                    const isRescheduledPending = activeSlots.some((s: any) => 
                       s.status === 'rescheduled_pending' || 
                       s.status === 'pending_reschedule' || 
                       s.isRescheduledPending === true
                     );
                    const isRescheduledConfirmed = !isRescheduledPending && activeSlots.every((s: any) => s.status === 'rescheduled_confirmed');
                    const isResetPending = activeSlots.some((s: any) => s.status === 'scheduled' && s.original_date && s.date && String(s.original_date) !== String(s.date) && s.student_acknowledged === false);
                    const isResetAcknowledged = !isResetPending && activeSlots.every((s: any) => s.status === 'scheduled' && s.original_date && s.date && String(s.original_date) !== String(s.date) && s.student_acknowledged === true);
                    const isBirthday = !slot.isGroup && slot.student && isStudentBirthdayToday(slot.student);

                    let slotBg = '#ffffff';
                    let slotBorder = '1.5px solid #e2e8f0';
                    let slotBorderLeft = '5px solid #cbd5e1';
                    let titleColor = '#0f172a';
                    let dotComponent = null;

                    if (isBreak) {
                      slotBg = '#fffbeb';
                      slotBorder = '1.5px dashed rgba(245, 158, 11, 0.25)';
                      slotBorderLeft = '5px solid #f59e0b';
                      titleColor = '#b45309';
                      dotComponent = isCurrentSlot ? (
                        <div style={{
                          width: '20px',
                          height: '20px',
                          borderRadius: '50%',
                          border: '3px solid #f59e0b',
                          background: '#ffffff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          boxSizing: 'border-box',
                          animation: 'pulse 1.5s infinite'
                        }}>
                          <div style={{
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            background: '#f59e0b'
                          }} />
                        </div>
                      ) : (
                        <div style={{
                          width: '12px',
                          height: '12px',
                          borderRadius: '50%',
                          border: '3px solid #f59e0b',
                          background: isFinished ? '#f59e0b' : '#ffffff',
                          boxSizing: 'border-box'
                        }} />
                      );
                    } else if (isCanceled || isRescheduledAway) {
                      slotBg = '#ffffff';
                      slotBorder = isRescheduledAway ? '1.5px solid #fef3c7' : '1.5px solid #fee2e2';
                      slotBorderLeft = isRescheduledAway ? '5px solid #fbbc05' : '5px solid #ef4444';
                      titleColor = '#a1a1aa';
                      dotComponent = isCurrentSlot ? (
                        <div style={{
                          width: '20px',
                          height: '20px',
                          borderRadius: '50%',
                          border: `3px solid ${isRescheduledAway ? '#fbbc05' : '#ef4444'}`,
                          background: '#ffffff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          boxSizing: 'border-box',
                          animation: 'pulse 1.5s infinite'
                        }}>
                          <div style={{
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            background: isRescheduledAway ? '#fbbc05' : '#ef4444'
                          }} />
                        </div>
                      ) : (
                        <div style={{
                          width: '12px',
                          height: '12px',
                          borderRadius: '50%',
                          border: `3px solid ${isRescheduledAway ? '#fbbc05' : '#ef4444'}`,
                          background: '#ffffff',
                          boxSizing: 'border-box'
                        }} />
                      );
                    } else if (isCurrentSlot && !isFinished) {
                      slotBg = isWrapUp ? '#fefce8' : '#e6f4ea';
                      slotBorder = isWrapUp ? '1.5px solid #fef08a' : '1.5px solid #e6f4ea';
                      slotBorderLeft = isWrapUp ? '5px solid #eab308' : '5px solid #34a853';
                      titleColor = '#0f172a';
                      dotComponent = (
                        <div style={{
                          width: '20px',
                          height: '20px',
                          borderRadius: '50%',
                          border: `3px solid ${isWrapUp ? '#eab308' : '#34a853'}`,
                          background: '#ffffff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          boxSizing: 'border-box',
                          animation: 'pulse 1.5s infinite'
                        }}>
                          <div style={{
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            background: isWrapUp ? '#eab308' : '#34a853'
                          }} />
                        </div>
                      );
                    } else if (isFinished) {
                      slotBg = '#ffffff';
                      slotBorder = '1.5px solid #e6f4ea';
                      slotBorderLeft = '5px solid #34a853';
                      titleColor = '#94a3b8';
                      dotComponent = (
                        <div style={{
                          width: '12px',
                          height: '12px',
                          borderRadius: '50%',
                          border: '3px solid #34a853',
                          background: '#34a853',
                          boxSizing: 'border-box'
                        }} />
                      );
                    } else if (isRescheduledPending) {
                      slotBg = '#ffffff';
                      slotBorder = '1.5px solid #fef3c7';
                      slotBorderLeft = '5px solid #fbbc05';
                      titleColor = '#8e8e93';
                      dotComponent = isCurrentSlot ? (
                        <div style={{
                          width: '20px',
                          height: '20px',
                          borderRadius: '50%',
                          border: '3px solid #fbbc05',
                          background: '#ffffff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          boxSizing: 'border-box',
                          animation: 'pulse 1.5s infinite'
                        }}>
                          <div style={{
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            background: '#fbbc05'
                          }} />
                        </div>
                      ) : (
                        <div style={{
                          width: '12px',
                          height: '12px',
                          borderRadius: '50%',
                          border: '3px solid #fbbc05',
                          background: isFinished ? '#fbbc05' : '#ffffff',
                          boxSizing: 'border-box'
                        }} />
                      );
                    } else {
                      slotBg = '#ffffff';
                      slotBorder = '1.5px solid #e2e8f0';
                      slotBorderLeft = '5px solid #cbd5e1';
                      titleColor = '#0f172a';
                      dotComponent = (
                        <div style={{
                          width: '12px',
                          height: '12px',
                          borderRadius: '50%',
                          border: '3px solid #cbd5e1',
                          background: '#ffffff',
                          boxSizing: 'border-box'
                        }} />
                      );
                    }

                    return (
                       <div 
                         key={idx}
                         style={{
                           display: 'flex',
                           alignItems: 'center',
                           gap: '12px',
                           position: 'relative',
                           width: '100%'
                         }}
                        >
                         {/* Timeline Dot on the left */}
                         <div style={{ width: '20px', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 2, flexShrink: 0 }}>
                           {dotComponent}
                         </div>

                         {/* Slot card on the right */}
                         <div 
                           onClick={() => {
                             if (isCanceled || isRescheduledAway) return;
                             const resolved = resolveSlotStudent(slot, allStudents);
                             if (resolved) {
                               const groupStudentsList = (slot.isGroup && Array.isArray(slot.students))
                                 ? slot.students.map((s: any) => {
                                     const grpRes = resolveSlotStudent({ student: s }, allStudents);
                                     return grpRes ? grpRes.resolvedStudent : s;
                                   })
                                 : undefined;

                               setDocStudent({
                                 ...resolved.resolvedStudent,
                                 groupStudents: groupStudentsList
                               });
                             }
                             const todayStr = getSimulatedNow().toLocaleDateString('sv-SE');
                             if (setAbsenceUntilDate) setAbsenceUntilDate(todayStr);
                             if (setIsAbsenceWidgetExpanded) setIsAbsenceWidgetExpanded(true);
                           }}
                           ref={el => {
                             if (isCurrentSlot || (idx === prepIndex && !isFinished)) {
                               activeTimelineSlotRef.current = el;
                             }
                           }}
                           style={{
                             flex: 1,
                             display: 'flex',
                             flexDirection: isMobileDevice ? 'column' : 'row',
                             alignItems: isMobileDevice ? 'flex-start' : 'center',
                             justifyContent: 'space-between',
                             gap: isMobileDevice ? '4px' : '12px',
                             padding: isMobileDevice ? '10px 12px' : '8px 14px',
                             background: isCurrentSlot ? (isWrapUp ? '#fefce8' : '#e6f4ea') : slotBg,
                             borderRadius: '12px',
                             border: slotBorder,
                             borderLeft: slotBorderLeft,
                             cursor: ((slot.student || slot.isGroup) && !isCanceled && !isRescheduledAway) ? 'pointer' : 'default',
                             transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                             boxShadow: isCurrentSlot ? (isWrapUp ? '0 8px 24px rgba(234, 179, 8, 0.16), 0 2px 6px rgba(234, 179, 8, 0.08)' : '0 8px 24px rgba(52, 168, 83, 0.12), 0 2px 6px rgba(52, 168, 83, 0.06)') : ((idx === prepIndex) ? (isRescheduledPending ? '0 6px 18px rgba(234, 179, 8, 0.08)' : '0 6px 18px rgba(59, 130, 246, 0.06)') : '0 4px 10px rgba(0, 0, 0, 0.02), 0 1px 3px rgba(0, 0, 0, 0.02)'),
                             minWidth: 0,
                             boxSizing: 'border-box',
                             overflow: 'hidden',
                             opacity: ((!slot.student && !slot.isGroup) || isCanceled) ? 0.75 : 1
                           }}
                           className="hover-scale google-timeline-card"
                         >
                            {/* Top Row: Name on Mobile (full width) or Time + Name on Desktop */}
                            <div style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              width: '100%',
                              gap: '8px',
                              minWidth: 0
                            }}>
                                 <div style={{
                                   display: 'flex',
                                   alignItems: 'center',
                                   gap: '8px',
                                   position: 'relative',
                                   minWidth: 0,
                                   flex: 1
                                 }}>
                                   {/* Uhrzeit (Desktop Only in Top Row) */}
                                   {!isMobileDevice && windowWidth >= 768 && (
                                     <>
                                       <div style={{
                                         fontSize: '0.78rem',
                                         fontWeight: 900,
                                         color: isCurrentSlot && !isFinished && (slot.student || slot.isGroup) ? '#34a853' : '#0f172a',
                                         fontFamily: "'Plus Jakarta Sans', sans-serif",
                                         whiteSpace: 'nowrap',
                                         flexShrink: 0,
                                         background: isCurrentSlot && !isFinished && (slot.student || slot.isGroup) ? '#ffffff' : 'transparent',
                                         padding: '2px 6px',
                                         borderRadius: '6px',
                                         border: isCurrentSlot && !isFinished && (slot.student || slot.isGroup) ? '1.5px solid #34a853' : 'none',
                                         boxShadow: isCurrentSlot && !isFinished && (slot.student || slot.isGroup) ? '0 1px 3px rgba(19,115,51,0.08)' : 'none',
                                         display: 'inline-flex',
                                         alignItems: 'center',
                                         justifyContent: 'center',
                                         gap: '4px'
                                       }}>
                                         {isCurrentSlot && !isFinished && (slot.student || slot.isGroup) && (
                                           <span className="pulse" style={{
                                             width: '6px',
                                             height: '6px',
                                             borderRadius: '50%',
                                             background: '#34a853',
                                             display: 'inline-block'
                                           }} />
                                         )}
                                         {slot.timeSlot} Uhr
                                       </div>

                                       {isWrapUp && (
                                        <span style={{
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          gap: '4px',
                                          background: '#fef08a',
                                          border: '1px solid #fde047',
                                          borderRadius: '6px',
                                          padding: '2px 8px',
                                          fontWeight: 800,
                                          fontSize: '0.68rem',
                                          color: '#854d0e',
                                          flexShrink: 0,
                                          boxShadow: '0 1px 3px rgba(234, 179, 8, 0.15)'
                                        }}>
                                          <Clock size={10} color="#854d0e" />
                                          Wrap-Up ({minutesToSlotEnd} Min.)
                                        </span>
                                      )}
                                       <div style={{ width: '1.5px', height: '14px', background: '#e2e8f0', flexShrink: 0 }} />
                                     </>
                                   )}

                                   {/* Student Name */}
                                   {slot.isGroup ? (
                                     <span style={{ 
                                       fontWeight: 900, 
                                       color: (isCanceled || isRescheduledAway) ? '#8e8e93' : (isFinished ? '#34a853' : '#0f172a'), 
                                       fontSize: isMobileDevice || windowWidth < 768 ? '0.94rem' : '0.86rem', 
                                       whiteSpace: 'nowrap',
                                       overflow: 'hidden',
                                       textOverflow: 'ellipsis'
                                     }}>
                                       {(() => {
                                         if (slot.students && slot.students.length > 0) {
                                           const names = slot.students.map((stud: any) => {
                                             const found = allStudents?.find((s: any) => s.id === stud.id);
                                             const rawFn = stud.first_name || found?.first_name || (stud.name ? stud.name.split(' ')[0] : '');
                                             const cleanFn = rawFn.replace(/&.*/, '').trim() || 'Schüler';
                                             const rawLn = stud.last_name || found?.last_name || (stud.name ? stud.name.split(' ').slice(1).join(' ') : '');
                                             const cleanLn = rawLn.replace(/&.*/, '').trim();
                                             if (cleanFn || cleanLn) {
                                               return `${cleanFn} ${maskLastName(cleanLn, showRealNames)}`.trim();
                                             }
                                             return stud.name || 'Schüler';
                                           });
                                           return Array.from(new Set(names)).join(' & ');
                                         }
                                         return slot.student?.name || 'Gruppentermin';
                                       })()}
                                     </span>
                                   ) : slot.student ? (
                                     <span style={{ 
                                       fontWeight: 900, 
                                       color: (isCanceled || isRescheduledAway) ? '#8e8e93' : (isFinished ? '#34a853' : '#0f172a'), 
                                       fontSize: isMobileDevice || windowWidth < 768 ? '0.94rem' : '0.86rem', 
                                       whiteSpace: 'nowrap',
                                       overflow: 'hidden',
                                       textOverflow: 'ellipsis'
                                     }}>
                                       {isBirthday && (
                                         <span title="Hat heute Geburtstag!" style={{ display: 'inline-flex', alignItems: 'center', marginRight: '4px', verticalAlign: 'middle' }}>
                                           <Sparkles size={13} color="#eab308" />
                                         </span>
                                       )}{(() => {
                                         const found = allStudents?.find((s: any) => s.id === slot.student?.id);
                                         const fn = slot.student?.first_name || found?.first_name || (slot.student?.name ? slot.student.name.split(' ')[0] : '');
                                         const ln = slot.student?.last_name || found?.last_name || (slot.student?.name ? slot.student.name.split(' ').slice(1).join(' ') : '');
                                         if (fn || ln) {
                                           return `${fn} ${maskLastName(ln, showRealNames)}`.trim();
                                         }
                                         return slot.student?.name || 'Schüler';
                                       })()}
                                     </span>
                                   ) : isBreak ? (
                                     <span style={{ fontWeight: 700, color: '#b45309', fontSize: '0.82rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                       <Coffee size={13} color="#b45309" />
                                       <span>Freies Zeitfenster</span>
                                       <span style={{ fontSize: '0.72rem', fontWeight: 600, color: '#d97706' }}>({slot.duration || 30} Min.)</span>
                                     </span>
                                   ) : (
                                     <span style={{ fontWeight: 700, color: '#78350f', fontSize: '0.82rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                       <Coffee size={13} color="#78350f" />
                                       <span>Pause ({slot.duration || 30} Min.)</span>
                                     </span>
                                   )}

                                    {/* ❓ Schülerfrage Badge (Mobile/Shared) */}
                                    {(slot.student || slot.isGroup) && !isCanceled && !isRescheduledAway && (() => {
                                      const targetStudentId = slot.isGroup ? slot.students?.[0]?.id : slot.student?.id;
                                      const hasQuestion = targetStudentId ? checkHasStudentQuestion(targetStudentId) : false;
                                      if (!hasQuestion) return null;
                                      return (
                                        <span
                                          title="Schüler hat eine Frage für den Unterricht notiert"
                                          style={{
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '3px',
                                            padding: '2px 7px',
                                            borderRadius: '100px',
                                            background: '#fef3c7',
                                            border: '1px solid #fde68a',
                                            color: '#b45309',
                                            fontSize: '0.68rem',
                                            fontWeight: 850,
                                            fontFamily: "'Plus Jakarta Sans', sans-serif",
                                            flexShrink: 0,
                                            marginLeft: '6px'
                                          }}
                                        >
                                          <HelpCircle size={10} strokeWidth={2.8} />
                                          <span>1 Frage</span>
                                        </span>
                                      );
                                    })()}

                                   {(slot.student || slot.isGroup) && (isRescheduledAway || isCanceled) && (
                                     <div style={{
                                       position: 'absolute',
                                       left: '-6px',
                                       right: '-10px',
                                       height: '2px',
                                       background: isRescheduledAway ? '#fbbc05' : '#ef4444',
                                       top: '50%',
                                       transform: 'translateY(-50%)',
                                       pointerEvents: 'none',
                                       zIndex: 10
                                     }} />
                                   )}
                                 </div>

                                 {/* Monochrome Group Icon before Shoutbox */}
                                 {slot.isGroup && !isCanceled && !isRescheduledAway && (
                                   <span 
                                     title={`Gruppentermin (${slot.students?.length || 2} Schüler)`}
                                     style={{
                                       display: 'inline-flex',
                                       alignItems: 'center',
                                       justifyContent: 'center',
                                       color: '#64748b',
                                       marginLeft: 'auto',
                                       marginRight: '2px',
                                       flexShrink: 0
                                     }}
                                   >
                                     <Users size={14} color="#64748b" />
                                   </span>
                                 )}

                                  {/* 1-Click Audio-Hausaufgabe Button on Top Row Right */}
                                  {(slot.student || slot.isGroup) && !isCanceled && !isRescheduledAway && (() => {
                                    const resolved = resolveSlotStudent(slot, allStudents);
                                    if (!resolved) return null;
                                    const { targetStudent, matchedFromAll, canonicalId, resolvedStudent } = resolved;
                                    const hasAudioToday = Boolean(
                                      (canonicalId && checkHasTodayAudio(canonicalId)) ||
                                      (targetStudent?.id && checkHasTodayAudio(targetStudent.id)) ||
                                      (matchedFromAll?.id && checkHasTodayAudio(matchedFromAll.id))
                                    );
                                    return (
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setQuickAudioStudent(resolvedStudent);
                                        }}
                                        title={`Hausaufgabe diktieren / Audio aufnehmen für ${resolvedStudent.first_name || 'Schüler'}`}
                                        style={{
                                          display: 'flex',
                                          alignItems: 'center',
                                          justifyContent: 'center',
                                          background: hasAudioToday ? '#e6f4ea' : '#ffffff',
                                          color: hasAudioToday ? '#15803d' : '#64748b',
                                          width: (isMobileDevice || windowWidth < 768) ? '44px' : '36px',
                                          height: (isMobileDevice || windowWidth < 768) ? '44px' : '36px',
                                          minWidth: (isMobileDevice || windowWidth < 768) ? '44px' : '36px',
                                          minHeight: (isMobileDevice || windowWidth < 768) ? '44px' : '36px',
                                          borderRadius: '10px',
                                          border: hasAudioToday ? '1px solid rgba(52, 168, 83, 0.3)' : '1px solid rgba(0,0,0,0.06)',
                                          cursor: 'pointer',
                                          transition: 'all 0.2s',
                                          flexShrink: 0,
                                          boxShadow: hasAudioToday ? '0 2px 4px rgba(21, 128, 61, 0.15)' : '0 1px 2px rgba(0,0,0,0.04)',
                                          marginLeft: slot.isGroup ? '4px' : 'auto',
                                          marginRight: '2px',
                                          position: 'relative',
                                          touchAction: 'manipulation'
                                        }}
                                        className="hover-scale-mini"
                                      >
                                        <Mic size={16} color={hasAudioToday ? '#15803d' : '#64748b'} />
                                        {hasAudioToday && (
                                          <span style={{
                                            position: 'absolute',
                                            top: '3px',
                                            right: '3px',
                                            width: '6px',
                                            height: '6px',
                                            borderRadius: '50%',
                                            background: '#34a853'
                                          }} />
                                        )}
                                      </button>
                                    );
                                  })()}

                                  {/* 1:1 Shoutbox Icon Button on Top Row Right */}
                                  {(slot.student || slot.isGroup) && !isCanceled && !isRescheduledAway && (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        const targetSlot = slot.isGroup ? slot.slots[0] : slot;
                                        const resolved = resolveSlotStudent(slot, allStudents);
                                        if (targetSlot && resolved) {
                                          setActiveChatOcc({
                                            id: targetSlot.id,
                                            student_id: resolved.canonicalId,
                                            teacher_id: targetSlot.teacher_id || userId,
                                            date: targetSlot.date,
                                            start_time: targetSlot.timeSlot,
                                            student: {
                                              first_name: slot.isGroup ? slot.students?.map((st: any) => st.name.split(' ')[0]).join(', ') : (resolved.resolvedStudent.first_name || 'Schüler')
                                            }
                                          });
                                        }
                                      }}
                                     title="Termingekoppelte Shoutbox öffnen"
                                     style={{
                                       display: 'flex',
                                       alignItems: 'center',
                                       justifyContent: 'center',
                                       background: '#ffffff',
                                       color: '#34a853',
                                       width: (isMobileDevice || windowWidth < 768) ? '44px' : '36px',
                                       height: (isMobileDevice || windowWidth < 768) ? '44px' : '36px',
                                       minWidth: (isMobileDevice || windowWidth < 768) ? '44px' : '36px',
                                       minHeight: (isMobileDevice || windowWidth < 768) ? '44px' : '36px',
                                       borderRadius: '10px',
                                       border: '1px solid rgba(0,0,0,0.06)',
                                       cursor: 'pointer',
                                       transition: 'all 0.2s',
                                       flexShrink: 0,
                                       boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                                       marginLeft: '4px',
                                       touchAction: 'manipulation'
                                     }}
                                   >
                                     <MessageSquare size={16} />
                                   </button>
                                 )}
                               </div>

                               {/* Bottom Sub-Line: Time (on Mobile) + Metadata & Status Badges */}
                               <div style={{ 
                                 display: 'flex', 
                                 alignItems: 'center', 
                                 gap: '6px',
                                 width: '100%', 
                                 minWidth: 0, 
                                 fontSize: '0.80rem', 
                                 color: '#64748b', 
                                 fontWeight: 700,
                                 flexWrap: 'wrap',
                                 paddingLeft: '0'
                               }}>
                                 {(slot.student || slot.isGroup) && (
                                   <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', width: '100%' }}>
                                     {/* Mobile Time Badge in Bottom Line */}
                                     {(isMobileDevice || windowWidth < 768) && (
                                       <span style={{
                                         display: 'inline-flex',
                                         alignItems: 'center',
                                         gap: '4px',
                                         background: isCurrentSlot && !isFinished ? '#ffffff' : '#f8fafc',
                                         border: isCurrentSlot && !isFinished ? '1px solid #34a853' : '1px solid #e2e8f0',
                                         borderRadius: '6px',
                                         padding: '2px 6px',
                                         fontWeight: 800,
                                         fontSize: '0.74rem',
                                         color: isCurrentSlot && !isFinished ? '#166534' : '#0f172a',
                                         fontFamily: 'monospace',
                                         flexShrink: 0
                                       }}>
                                         {isCurrentSlot && !isFinished && (
                                           <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#34a853' }} />
                                         )}
                                         {slot.timeSlot} Uhr
                                       </span>
                                     )}

                                      {isCanceled || isRescheduledAway ? (() => {
                                        const isAcked = activeSlots.every((s: any) => s.student_acknowledged === true || s.teacher_acknowledged === true || s.status === 'cancelled_acknowledged' || s.status === 'rescheduled_confirmed');

                                        // Matching urgent radar item
                                        const urgentItem = (urgentCancellations || []).find((u: any) => 
                                          activeSlots.some((s: any) => 
                                            (u.occurrence_id && (u.occurrence_id === s.id || u.occurrence_id === s.occurrenceId)) ||
                                            (u.student_id && (u.student_id === s.student?.id || u.student_id === s.studentId) && u.start_time?.startsWith(slot.timeSlot))
                                          )
                                        );

                                        return (
                                          <>
                                            {isRescheduledAway ? (
                                              <span style={{ 
                                                color: '#000000', 
                                                fontWeight: 850, 
                                                fontSize: '0.68rem', 
                                                background: '#facc15', 
                                                border: '1px solid #000000',
                                                padding: '2px 8px', 
                                                borderRadius: '6px', 
                                                fontFamily: 'Inter',
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: '4px'
                                              }}>
                                                Termin verschoben
                                                {isAcked && <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#34a853', display: 'inline-block' }} />}
                                              </span>
                                            ) : urgentItem?.teacher_contact_status === 'reached' ? (
                                              <span style={{ 
                                                color: '#15803d', 
                                                fontWeight: 800, 
                                                fontSize: '0.68rem', 
                                                background: '#dcfce7', 
                                                border: '1px solid #bbf7d0',
                                                padding: '2px 8px', 
                                                borderRadius: '6px', 
                                                fontFamily: 'Inter',
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: '4px'
                                              }}>
                                                📞 Telefonisch informiert
                                              </span>
                                            ) : urgentItem?.teacher_contact_status === 'voicemail' ? (
                                              <span style={{ 
                                                color: '#b45309', 
                                                fontWeight: 800, 
                                                fontSize: '0.68rem', 
                                                background: '#fef3c7', 
                                                border: '1px solid #fde68a',
                                                padding: '2px 8px', 
                                                borderRadius: '6px', 
                                                fontFamily: 'Inter',
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: '4px'
                                              }}>
                                                📼 Mailbox besprochen
                                              </span>
                                            ) : urgentItem?.teacher_contact_status === 'delegated_to_secretariat' ? (
                                              <span style={{ 
                                                color: '#1d4ed8', 
                                                fontWeight: 800, 
                                                fontSize: '0.68rem', 
                                                background: '#dbeafe', 
                                                border: '1px solid #bfdbfe',
                                                padding: '2px 8px', 
                                                borderRadius: '6px', 
                                                fontFamily: 'Inter',
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: '4px'
                                              }}>
                                                🏢 An Sekretariat übergeben
                                              </span>
                                            ) : urgentItem && !urgentItem.student_acknowledged ? (
                                              <button
                                                type="button"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  onOpenUrgentModal?.();
                                                }}
                                                title="Kurzfristiger Ausfall noch digital unbestätigt – Bitte telefonisch kontaktieren"
                                                style={{ 
                                                  color: '#dc2626', 
                                                  fontWeight: 850, 
                                                  fontSize: '0.68rem', 
                                                  background: '#fee2e2', 
                                                  border: '1px solid #fca5a5',
                                                  padding: '2px 8px', 
                                                  borderRadius: '6px', 
                                                  fontFamily: 'Inter',
                                                  display: 'inline-flex',
                                                  alignItems: 'center',
                                                  gap: '4px',
                                                  cursor: 'pointer',
                                                  animation: 'pulse 1.8s infinite'
                                                }}
                                              >
                                                ⚠️ Ungelesen – Bitte kontaktieren
                                              </button>
                                            ) : (
                                              <span style={{ 
                                                color: '#ef4444', 
                                                fontWeight: 700, 
                                                fontSize: '0.68rem', 
                                                background: 'rgba(239, 68, 68, 0.08)', 
                                                padding: '2px 8px', 
                                                borderRadius: '6px', 
                                                fontFamily: 'Inter',
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: '4px'
                                              }}>
                                                Heute abgesagt
                                                {isAcked && <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#34a853', display: 'inline-block' }} />}
                                              </span>
                                            )}

                                            {/* 🎟️ Nachhol-Kontingent Button / Badge (100% Lehrkraft-Souveränität) */}
                                            {!isRescheduledAway && onOpenMakeupModal && (
                                              slot.makeup_token_id ? (
                                                <button
                                                  type="button"
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    onOpenMakeupModal({ mode: 'redeem', slot });
                                                  }}
                                                  title="Nachhol-Kontingent verwalten & einlösen"
                                                  style={{
                                                    background: '#eff6ff',
                                                    color: '#1d4ed8',
                                                    border: '1px solid #bfdbfe',
                                                    borderRadius: '6px',
                                                    padding: '2px 8px',
                                                    fontSize: '0.68rem',
                                                    fontWeight: 850,
                                                    fontFamily: 'Inter',
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: '4px',
                                                    cursor: 'pointer'
                                                  }}
                                                >
                                                  🎟️ Nachhol-Kontingent aktiv
                                                </button>
                                              ) : (
                                                <button
                                                  type="button"
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    onOpenMakeupModal({ mode: 'create', slot });
                                                  }}
                                                  title="100% Lehrkraft-Souveränität: Nachhol-Kontingent für diesen Ausfall anlegen"
                                                  style={{
                                                    background: '#f8fafc',
                                                    color: '#0f172a',
                                                    border: '1px solid #cbd5e1',
                                                    borderRadius: '6px',
                                                    padding: '2px 8px',
                                                    fontSize: '0.68rem',
                                                    fontWeight: 850,
                                                    fontFamily: 'Inter',
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: '4px',
                                                    cursor: 'pointer'
                                                  }}
                                                >
                                                  🎟️ Nachhol-Kontingent
                                                </button>
                                              )
                                            )}
                                          </>
                                        );
                                      })() : (
                                       <>
                                         {resolveStudentInstrument(slot.instrument, slot.students?.[0]?.instrument || slot.student?.instrument, teacher?.instrument) && (
                                           <span style={{ color: '#334155', fontWeight: 600 }}>• {resolveStudentInstrument(slot.instrument, slot.students?.[0]?.instrument || slot.student?.instrument, teacher?.instrument)}</span>
                                         )}
                                         {slot.room && <span style={{ color: '#334155', fontWeight: 600 }}>• {cleanRoomName(slot.room)}</span>}
                                         {slot.makeup_extension_minutes > 0 && (
                                           <span 
                                             title={`Dieser Termin wurde um +${slot.makeup_extension_minutes} Min. aus einem Nachhol-Kontingent verlängert`}
                                             style={{
                                               color: '#15803d',
                                               background: '#dcfce7',
                                               border: '1px solid #86efac',
                                               padding: '2px 8px',
                                               borderRadius: '6px',
                                               fontSize: '0.68rem',
                                               fontWeight: 850,
                                               fontFamily: 'Inter',
                                               display: 'inline-flex',
                                               alignItems: 'center',
                                               gap: '4px'
                                             }}
                                           >
                                             ⏱️ +{slot.makeup_extension_minutes} Min. Nachholung
                                           </span>
                                         )}
                                         {slot.is_makeup_lesson && (
                                           <span 
                                             title="Revisionssicherer Ersatztermin aus einem Nachhol-Kontingent"
                                             style={{
                                               color: '#1d4ed8',
                                               background: '#eff6ff',
                                               border: '1px solid #bfdbfe',
                                               padding: '2px 8px',
                                               borderRadius: '6px',
                                               fontSize: '0.68rem',
                                               fontWeight: 850,
                                               fontFamily: 'Inter',
                                               display: 'inline-flex',
                                               alignItems: 'center',
                                               gap: '4px'
                                             }}
                                           >
                                             🎟️ Nachholtermin
                                           </span>
                                         )}
                                       </>
                                     )}
                                     {!slot.isGroup && isRescheduledPending && (
                                       <span 
                                         title="Terminverschiebung ausstehend (noch nicht bestätigt)"
                                         style={{
                                           background: '#fef3c7',
                                           color: '#b45309',
                                           border: '1px solid #fde68a',
                                           padding: '2px 8px',
                                           borderRadius: '100px',
                                           fontSize: '0.68rem',
                                           fontWeight: 750,
                                           fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif",
                                           display: 'inline-flex',
                                           alignItems: 'center',
                                           gap: '4px',
                                           marginLeft: 'auto',
                                           boxShadow: '0 1px 2px rgba(180, 83, 9, 0.05)',
                                           letterSpacing: '0.01em'
                                         }}
                                       >
                                         <Clock size={11} strokeWidth={2.5} color="#b45309" />
                                         <span>Unbestätigt</span>
                                       </span>
                                     )}
                                   </div>
                                 )}
                               </div>
                         </div>
                       </div>
                    );
                  })
                })() : (
                  <div style={{ padding: '30px', textAlign: 'center', color: '#64748b' }}>Keine Termine für heute eingetragen.</div>
                )}
              </div>
            ) : (
              <div style={{ padding: '40px', textAlign: 'center', color: '#64748b', fontSize: '0.9rem', fontWeight: 600 }}>Lade Stundenplan...</div>
            )}
          </div>
        </div>
        <TeacherTagesplanRoomIssuesBanner isDesktop={!isMobileDevice && windowWidth >= 768} relevantRoomIssuesToday={relevantRoomIssuesToday} teacherTodayRooms={teacherTodayRooms} handleResolveRoomIssueInTagesplan={handleResolveRoomIssueInTagesplan} getIssueRoomLabel={getIssueRoomLabel} teacher={teacher} userId={userId} />
      </div>
    )
  ) : null
  );
};
