import React, { useState, useEffect, useRef, useMemo } from 'react';
import { supabase } from '../../../lib/supabase';
import {
  X, Check, BookOpen, Music, Plus, ChevronRight, ChevronDown, ChevronUp, Book, Star,
  Mic, Square, Play, Pause, Headphones, Calendar, Clock, ArrowLeft, Edit3, Search, Lock,
  Share2, Sparkles, Filter, HelpCircle, SlidersHorizontal, Users, RotateCcw, Send, Repeat, Disc
} from 'lucide-react';
import { harmonizeAudioList, isGenericSongTag } from '../../../utils/audioNamingHelper';
import { checkIsAudioTresorActive } from '../../../domain/stickersAndTresor';
import { shouldDefaultToInputPad } from '../../../utils/instruments';
import { getSimulatedNow } from '../studentDateUtils';
import { parseSongArtistAndTitle, Student } from '../meisterwerk.types';
import { InlineAudioPlayer, MechanicalMetronomeIcon } from './MeisterwerkAudioPlayers';
import { DuettDeckModal } from './DuettDeckModal';

export interface MeisterwerkRecordingsTabProps {
  isTeacherTools?: boolean;
  readOnly?: boolean;
  student: Student;
  activeSongSkills: any[];
  audioDuration: number;
  audioLabel: string;
  audioSongTags: Record<string, string>;
  availablePlaylists: any[];
  availableSongsForTagging: any[];
  expandedStudentAudioWeeks: any;
  expandedTeacherAudioWeeks: any;
  favoriteAudioUrls: string[];
  formatRecordTime: (seconds: number) => string;
  getISOWeek: (date: Date) => string;
  getMonthAlbumTheme: (monthKey: string) => any;
  getNormalizedSongTitle: (title: string) => string;
  handleDeleteNote: (idx: number, url?: string) => void;
  handleDeleteStudentAudio?: (url: string, id?: string, audMeta?: any) => Promise<void> | void;
  handleRenameStudentAudio: (url: string, newTitle: string, id?: string) => void;
  handleRenameTeacherAudio: (url: string, newTitle: string, originalIdx?: number) => void;
  handleSaveEditedTeacherAudio?: (result: { url: string; original_url?: string; duration: number; original_duration?: number; label: string; mode: 'overwrite' | 'duplicate'; is_edited?: boolean; loop_locator?: any }, originalIdx?: number, currentUrl?: string) => Promise<void>;
  handleRevertTeacherAudioToOriginal?: (originalIdx?: number, currentUrl?: string) => Promise<void>;
  handleSaveShareToPlaylist: () => Promise<void>;
  handleUpdateAudioSongTag: (url: string, tag: string | null) => void;
  hasTresorStorage: boolean;
  homeworkNotes: string;
  homeworkNotesList: any[];
  isBookAlbum: (title: string) => boolean;
  isCurrentHomework?: boolean;
  isMobileOrSim: boolean;
  isRecordingAudio: boolean;
  isRecordingMetronomeActive: boolean;
  isRecordingPadActive?: boolean;
  setIsRecordingPadActive?: React.Dispatch<React.SetStateAction<boolean>>;
  isSharingToPlaylist: boolean;
  isStudentWeekExpanded: boolean;
  isTeacherHomeworkExpanded: boolean;
  isTeacherMode: boolean;
  isUploadingAudio: boolean;
  matchesAudioSearch: (item: any, query: string) => boolean;
  mobileRecordingsTab: 'teacher' | 'student';
  newPlaylistTitle: string;
  openHomeworkWeekAccordions: string[];
  playMetronomeTick: (isAccent: boolean) => void;
  progressItems: any[];
  recordingBpm: number;
  recordingMetronomeRef: React.MutableRefObject<any>;
  recordingSearchQuery: string;
  selectedStudentMonth: { key: string; label: string } | null;
  selectedStudentSongAlbum: string | null;
  selectedTeacherMonth: { key: string; label: string } | null;
  selectedTeacherSongAlbum: string | null;
  setAudioLabel: (label: string) => void;
  setIsRecordingMetronomeActive: React.Dispatch<React.SetStateAction<boolean>>;
  setIsStudentWeekExpanded: React.Dispatch<React.SetStateAction<boolean>>;
  setIsTeacherHomeworkExpanded: React.Dispatch<React.SetStateAction<boolean>>;
  setLocalJuniorRecordingsTrigger: React.Dispatch<React.SetStateAction<number>>;
  setMobileRecordingsTab: (tab: 'teacher' | 'student') => void;
  setNewPlaylistTitle: (title: string) => void;
  setOpenHomeworkWeekAccordions: React.Dispatch<React.SetStateAction<string[]>>;
  setRecordingBpm: React.Dispatch<React.SetStateAction<number>>;
  setSelectedStudentMonth: (month: { key: string; label: string } | null) => void;
  setSelectedStudentSongAlbum: (album: string | null) => void;
  setSelectedTeacherMonth: (month: { key: string; label: string } | null) => void;
  setSelectedTeacherSongAlbum: (album: string | null) => void;
  setShareAudioModal: (modal: any) => void;
  setShareCustomTitle: (title: string) => void;
  setSharePlaylistId: (id: string) => void;
  setShareProcessing: React.Dispatch<React.SetStateAction<'raw' | 'master'>>;
  setShowNewPlaylistInput: (show: boolean) => void;
  setShowRecordingMetronomePopup: React.Dispatch<React.SetStateAction<boolean>>;
  setShowStudentFavoritesOnly: React.Dispatch<React.SetStateAction<boolean>>;
  setShowTeacherFavoritesOnly: React.Dispatch<React.SetStateAction<boolean>>;
  setShowTeacherHomeworkArchive: React.Dispatch<React.SetStateAction<boolean>>;
  shareAudioModal: any;
  shareCustomTitle: string;
  sharePlaylistId: string;
  shareProcessing: 'raw' | 'master';
  schoolYearStartMonth?: number;
  showNewPlaylistInput: boolean;
  showRecordingMetronomePopup: boolean;
  showStudentFavoritesOnly: boolean;
  showTeacherFavoritesOnly: boolean;
  showTeacherHomeworkArchive: boolean;
  songs: any[];
  startRecordingAudio: (overrideSongId?: string | React.MouseEvent | any, overrideLabel?: string, isMasterworkSong?: boolean) => void | Promise<void>;
  stopRecordingAudio: () => void;
  handleRetakeRecordingAudio?: () => void;
  recordCountInRemaining?: number | null;
  recordCountInMode?: 'get_ready' | 'metronome' | null;
  cancelActiveRecordCountIn?: () => void;
  justRecordedAudioUrl?: string | null;
  justRecordedAudioLabel?: string | null;
  studentFirstName: string;
  toggleFavoriteAudio: (url: string) => void;
  toggleStudentAudioWeek: (weekKey: string, force?: boolean) => void;
  toggleTeacherAudioWeek: (weekKey: string, force?: boolean) => void;
  topicName: string;
  useNotebookLayout: boolean;
}

interface AbAudioComparisonBarProps {
  teacherAudio: { url: string; label: string; duration?: number };
  studentAudio: { url: string; label: string; duration?: number };
}

const AbAudioComparisonBar: React.FC<AbAudioComparisonBarProps> = ({ teacherAudio, studentAudio }) => {
  const [activePlaying, setActivePlaying] = useState<'teacher' | 'student' | null>(null);
  const teacherAudioRef = useRef<HTMLAudioElement | null>(null);
  const studentAudioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    return () => {
      if (teacherAudioRef.current) teacherAudioRef.current.pause();
      if (studentAudioRef.current) studentAudioRef.current.pause();
    };
  }, []);

  const handleToggle = (target: 'teacher' | 'student') => {
    if (activePlaying === target) {
      if (target === 'teacher' && teacherAudioRef.current) teacherAudioRef.current.pause();
      if (target === 'student' && studentAudioRef.current) studentAudioRef.current.pause();
      setActivePlaying(null);
      return;
    }

    let currentPos = 0;
    if (activePlaying === 'teacher' && teacherAudioRef.current) {
      currentPos = teacherAudioRef.current.currentTime;
      teacherAudioRef.current.pause();
    } else if (activePlaying === 'student' && studentAudioRef.current) {
      currentPos = studentAudioRef.current.currentTime;
      studentAudioRef.current.pause();
    }

    if (target === 'teacher') {
      if (!teacherAudioRef.current) {
        teacherAudioRef.current = new Audio(teacherAudio.url);
        teacherAudioRef.current.onended = () => setActivePlaying(null);
      }
      try {
        if (currentPos > 0 && teacherAudioRef.current.duration && currentPos < teacherAudioRef.current.duration) {
          teacherAudioRef.current.currentTime = currentPos;
        }
      } catch {}
      teacherAudioRef.current.play().catch(() => {});
      setActivePlaying('teacher');
    } else {
      if (!studentAudioRef.current) {
        studentAudioRef.current = new Audio(studentAudio.url);
        studentAudioRef.current.onended = () => setActivePlaying(null);
      }
      try {
        if (currentPos > 0 && studentAudioRef.current.duration && currentPos < studentAudioRef.current.duration) {
          studentAudioRef.current.currentTime = currentPos;
        }
      } catch {}
      studentAudioRef.current.play().catch(() => {});
      setActivePlaying('student');
    }
  };

  return (
    <div style={{
      marginTop: '8px',
      padding: '7px 12px',
      background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
      border: '1.5px solid #e2e8f0',
      borderRadius: '12px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: '10px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
        <Headphones size={13} color="#6366f1" style={{ flexShrink: 0 }} />
        <span style={{ fontSize: '0.74rem', fontWeight: 850, color: '#1e293b' }}>
          Hörvergleich
        </span>
        <span style={{ fontSize: '0.68rem', color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          vs. {teacherAudio.label}
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
        <button
          type="button"
          onClick={() => handleToggle('teacher')}
          style={{
            background: activePlaying === 'teacher' ? '#15803d' : '#ffffff',
            border: activePlaying === 'teacher' ? '1px solid #15803d' : '1px solid #86efac',
            color: activePlaying === 'teacher' ? '#ffffff' : '#15803d',
            borderRadius: '100px',
            padding: '3px 9px',
            fontSize: '0.70rem',
            fontWeight: 850,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            boxShadow: activePlaying === 'teacher' ? '0 2px 6px rgba(21, 128, 61, 0.3)' : 'none',
            transition: 'all 0.15s ease'
          }}
          className="hover-scale-mini"
          title="Vorbild der Lehrkraft anhören"
        >
          {activePlaying === 'teacher' ? <Pause size={10} fill="#ffffff" /> : <Play size={10} fill="#15803d" />}
          <span>Lehrkraft</span>
        </button>

        <span style={{ fontSize: '0.70rem', color: '#94a3b8', fontWeight: 700 }}>⟷</span>

        <button
          type="button"
          onClick={() => handleToggle('student')}
          style={{
            background: activePlaying === 'student' ? '#6d28d9' : '#ffffff',
            border: activePlaying === 'student' ? '1px solid #6d28d9' : '1px solid #c4b5fd',
            color: activePlaying === 'student' ? '#ffffff' : '#6d28d9',
            borderRadius: '100px',
            padding: '3px 9px',
            fontSize: '0.70rem',
            fontWeight: 850,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            boxShadow: activePlaying === 'student' ? '0 2px 6px rgba(109, 40, 217, 0.3)' : 'none',
            transition: 'all 0.15s ease'
          }}
          className="hover-scale-mini"
          title="Deinen eigenen Take anhören"
        >
          {activePlaying === 'student' ? <Pause size={10} fill="#ffffff" /> : <Play size={10} fill="#6d28d9" />}
          <span>Dein Take</span>
        </button>
      </div>
    </div>
  );
};

export type SharedAlbumType = 'favorites' | 'practice' | 'loops' | 'duet' | 'forTeacher' | 'month' | 'song';

export interface ActiveSharedAlbum {
  type: SharedAlbumType;
  title: string;
  subtitle?: string;
  badge?: string;
  theme: {
    bg: string;
    shadow: string;
    border?: string;
    textColor?: string;
    accentColor?: string;
  };
  icon: React.ReactNode;
  monthKey?: string;
  songTitle?: string;
  variant?: 'vivid' | 'sleeve' | 'disc';
  monthNumber?: number;
  monthCode?: string;
}

interface VinylRecordCoverProps {
  title: string;
  subtitle?: string;
  theme: {
    bg: string;
    shadow?: string;
    border?: string;
    textColor?: string;
    accentColor?: string;
  };
  variant?: 'vivid' | 'sleeve' | 'disc';
  icon?: React.ReactNode;
  monthNumber?: number;
  monthCode?: string;
  badge?: string;
  teacherCount?: number;
  studentCount?: number;
  totalCount?: number;
  isActive?: boolean;
  onClick: () => void;
  size?: 'normal' | 'large';
  maxWidth?: string;
  ariaLabel?: string;
}

const VinylRecordCover: React.FC<VinylRecordCoverProps> = ({
  title,
  subtitle,
  theme,
  variant = 'vivid',
  icon,
  monthNumber,
  monthCode,
  badge,
  teacherCount,
  studentCount,
  totalCount,
  isActive = false,
  onClick,
  size = 'normal',
  maxWidth,
  ariaLabel
}) => {
  const isDisc = variant === 'disc';
  const isSleeve = variant === 'sleeve';
  const isLarge = size === 'large';
  const outerWidth = isLarge ? '116px' : '100%';
  const sleeveSize = isLarge ? 96 : undefined;
  const discSize = isLarge ? 88 : 72;

  const countDisplay = totalCount !== undefined
    ? (totalCount === 1 ? '1 Take' : `${totalCount} Takes`)
    : ((teacherCount || 0) + (studentCount || 0) > 0
      ? `${(teacherCount || 0) + (studentCount || 0)} Takes`
      : '0 Takes');

  const takesNum = totalCount !== undefined
    ? totalCount
    : ((teacherCount || 0) + (studentCount || 0));

  const accentColor = theme.accentColor || theme.textColor || '#2563eb';
  const textColor = isSleeve ? '#0f172a' : (theme.textColor || '#0f172a');

  if (isDisc) {
    const isLightDisc = ['#facc15', '#eab308', '#d97706'].includes(theme.bg);
    const discTextColor = theme.textColor || (isLightDisc ? '#0f172a' : '#ffffff');
    const discMutedColor = isLightDisc ? '#334155' : 'rgba(255, 255, 255, 0.82)';

    return (
      <div
        role="button"
        tabIndex={0}
        aria-label={ariaLabel || `Vinyl Schallplatte: ${title}`}
        onClick={onClick}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onClick();
          }
        }}
        style={{
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          cursor: 'pointer',
          userSelect: 'none',
          outline: 'none',
          width: outerWidth,
          maxWidth: maxWidth || (isLarge ? '108px' : '82px'),
          gap: '4px',
          transition: 'transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)'
        }}
        className="hover-scale-mini"
      >
        {/* 💽 Pure Colored Vinyl (Echte Farb-Schallplatte ohne störenden weißen Innenkreis) */}
        <div
          style={{
            position: 'relative',
            width: `${discSize}px`,
            height: `${discSize}px`,
            aspectRatio: '1 / 1',
            borderRadius: '50%',
            background: theme.bg,
            border: isActive
              ? '3px solid #0f172a'
              : '2px solid rgba(255, 255, 255, 0.45)',
            boxShadow: isActive
              ? `0 8px 20px -2px ${accentColor}48, inset 0 0 0 2px rgba(0,0,0,0.06), inset 0 0 0 5px rgba(255,255,255,0.10), inset 0 0 0 8px rgba(0,0,0,0.04), inset 0 0 0 12px rgba(255,255,255,0.08), inset 0 0 0 17px rgba(0,0,0,0.04), inset 0 0 0 22px rgba(255,255,255,0.06)`
              : `0 3px 8px rgba(15, 23, 42, 0.07), inset 0 0 0 2px rgba(0,0,0,0.05), inset 0 0 0 5px rgba(255,255,255,0.08), inset 0 0 0 8px rgba(0,0,0,0.04), inset 0 0 0 12px rgba(255,255,255,0.07), inset 0 0 0 17px rgba(0,0,0,0.03), inset 0 0 0 22px rgba(255,255,255,0.05)`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxSizing: 'border-box',
            overflow: 'hidden'
          }}
        >
          {/* Typografie & Haptik direkt auf der Farb-Schallplatte */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              lineHeight: 1,
              position: 'relative',
              zIndex: 2,
              userSelect: 'none'
            }}
          >
            {icon ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {icon}
              </div>
            ) : (
              <>
                {/* Monatskürzel oben */}
                <span
                  style={{
                    fontSize: isLarge ? '0.62rem' : '0.48rem',
                    fontWeight: 900,
                    color: discMutedColor,
                    letterSpacing: '0.12em',
                    textTransform: 'uppercase',
                    lineHeight: 1,
                    marginBottom: '1px'
                  }}
                >
                  {monthCode || ''}
                </span>

                {/* Echtes Spindel-Zentrierloch in der Mitte */}
                <div
                  style={{
                    width: isLarge ? '5px' : '4px',
                    height: isLarge ? '5px' : '4px',
                    borderRadius: '50%',
                    background: '#0f172a',
                    border: '1px solid rgba(255, 255, 255, 0.3)',
                    boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.6)',
                    margin: '1px 0 2px 0'
                  }}
                />

                {/* Große, ruhige Monatsnummer unten */}
                <span
                  style={{
                    fontSize: isLarge ? '1.25rem' : '1.02rem',
                    fontWeight: 950,
                    color: discTextColor,
                    lineHeight: 1,
                    letterSpacing: '-0.03em'
                  }}
                >
                  {monthNumber ? (monthNumber < 10 ? `0${monthNumber}` : monthNumber) : ''}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Ruhiger Status unter der Platte: Voller Monatsname + Take-Badge */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '1px',
            width: '100%'
          }}
        >
          <span
            style={{
              fontSize: '0.65rem',
              fontWeight: 800,
              color: '#334155',
              textAlign: 'center',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              width: '100%',
              lineHeight: 1.15
            }}
          >
            {title}
          </span>
          <div
            style={{
              fontSize: '0.52rem',
              fontWeight: 800,
              color: takesNum > 0 ? (accentColor || '#15803d') : '#94a3b8',
              background: takesNum > 0 ? `${accentColor}14` : '#f8fafc',
              border: `1px solid ${takesNum > 0 ? `${accentColor}28` : '#e2e8f0'}`,
              padding: '1px 5px',
              borderRadius: '100px',
              lineHeight: 1.1,
              whiteSpace: 'nowrap'
            }}
          >
            {badge || countDisplay}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={ariaLabel || `Vinyl LP Album: ${title}`}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
      style={{
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        cursor: 'pointer',
        userSelect: 'none',
        outline: 'none',
        width: outerWidth,
        maxWidth: maxWidth || (isLarge ? '120px' : '108px'),
        transition: 'transform 0.18s ease'
      }}
      className="hover-scale-mini"
    >
      {/* 📦 Flat Swiss Studio Sleeve (Campus Studio Module Ästhetik - Clean Swiss Design) */}
      <div style={{
        position: 'relative',
        width: sleeveSize ? `${sleeveSize}px` : '100%',
        aspectRatio: '1 / 1',
        borderRadius: '16px',
        background: isSleeve ? '#ffffff' : theme.bg,
        border: isActive
          ? (isSleeve ? `2px solid ${accentColor}` : '2px solid #ffffff')
          : (isSleeve ? '1.5px solid #e2e8f0' : (theme.border ? `1px solid ${theme.border}` : '1px solid rgba(255, 255, 255, 0.22)')),
        boxShadow: isActive
          ? (isSleeve ? `0 8px 24px -2px ${accentColor}33, 0 2px 6px rgba(15, 23, 42, 0.06)` : '0 8px 24px rgba(15, 23, 42, 0.25), inset 0 1px 1px rgba(255,255,255,0.45)')
          : (isSleeve ? '0 2px 8px rgba(15, 23, 42, 0.04), 0 1px 2px rgba(15, 23, 42, 0.02)' : `${theme.shadow || '0 4px 14px -2px rgba(0,0,0,0.18)'}, inset 0 1px 1px rgba(255,255,255,0.30)`),
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: isSleeve ? '10px 8px 10px 11px' : '10px 8px',
        boxSizing: 'border-box',
        overflow: 'hidden'
      }}>
        {/* Left Spine for Studio Sleeve */}
        {isSleeve && (
          <div style={{
            position: 'absolute',
            left: 0,
            top: 0,
            bottom: 0,
            width: '5px',
            background: accentColor,
            borderRadius: '16px 0 0 16px'
          }} />
        )}

        {/* Top: Icon oder Monats-Code */}
        {icon ? (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '32px',
            height: '32px',
            borderRadius: '10px',
            background: isSleeve
              ? `${accentColor}14`
              : (textColor === '#0f172a' ? 'rgba(0, 0, 0, 0.08)' : 'rgba(255, 255, 255, 0.22)'),
            border: isSleeve ? `1px solid ${accentColor}30` : '1px solid rgba(255, 255, 255, 0.35)',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
            backdropFilter: 'blur(4px)',
            WebkitBackdropFilter: 'blur(4px)',
            marginTop: '2px'
          }}>
            {icon}
          </div>
        ) : (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            marginTop: '2px',
            lineHeight: 1
          }}>
            <span style={{
              fontSize: isLarge ? '1.45rem' : '1.20rem',
              fontWeight: 950,
              color: isSleeve ? accentColor : textColor,
              textShadow: (!isSleeve && textColor === '#ffffff') ? '0 1px 2px rgba(0, 0, 0, 0.20)' : 'none',
              letterSpacing: '-0.03em',
              lineHeight: 1
            }}>
              {monthNumber ? (monthNumber < 10 ? `0${monthNumber}` : monthNumber) : ''}
            </span>
            <span style={{
              fontSize: '0.60rem',
              fontWeight: 900,
              color: isSleeve ? '#64748b' : textColor,
              opacity: isSleeve ? 1 : 0.9,
              letterSpacing: '0.12em',
              marginTop: '3px'
            }}>
              {monthCode || ''}
            </span>
          </div>
        )}

        {/* Bottom: Titel & Take-Zähler */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          width: '100%',
          gap: '3px',
          marginBottom: '2px'
        }}>
          <span style={{
            fontSize: '0.70rem',
            fontWeight: 850,
            color: textColor,
            textAlign: 'center',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            width: '100%'
          }}>
            {title}
          </span>
          <div style={{
            fontSize: '0.56rem',
            fontWeight: 800,
            color: isSleeve
              ? (takesNum > 0 ? accentColor : '#64748b')
              : textColor,
            background: isSleeve
              ? (takesNum > 0 ? `${accentColor}14` : '#f1f5f9')
              : (textColor === '#0f172a' ? 'rgba(0, 0, 0, 0.10)' : 'rgba(255, 255, 255, 0.24)'),
            border: isSleeve
              ? `1px solid ${takesNum > 0 ? `${accentColor}30` : '#e2e8f0'}`
              : '1px solid rgba(255, 255, 255, 0.35)',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
            backdropFilter: 'blur(4px)',
            WebkitBackdropFilter: 'blur(4px)',
            padding: '2px 7px',
            borderRadius: '100px',
            lineHeight: 1.1,
            whiteSpace: 'nowrap'
          }}>
            {badge || countDisplay}
          </div>
        </div>
      </div>
    </div>
  );
};

export function MeisterwerkRecordingsTab(props: MeisterwerkRecordingsTabProps) {
  const {
    isTeacherTools,
    readOnly,
    student,
    activeSongSkills,
    audioDuration,
    audioLabel,
    audioSongTags,
    availablePlaylists,
    availableSongsForTagging,
    expandedStudentAudioWeeks,
    expandedTeacherAudioWeeks,
    favoriteAudioUrls,
    formatRecordTime,
    getISOWeek,
    getMonthAlbumTheme,
    getNormalizedSongTitle,
    handleDeleteNote,
    handleDeleteStudentAudio,
    handleRenameStudentAudio,
    handleRenameTeacherAudio,
    handleSaveEditedTeacherAudio,
    handleRevertTeacherAudioToOriginal,
    handleSaveShareToPlaylist,
    handleUpdateAudioSongTag,
    hasTresorStorage,
    homeworkNotes,
    homeworkNotesList,
    isBookAlbum,
    isCurrentHomework,
    isMobileOrSim,
    isRecordingAudio,
    isRecordingMetronomeActive,
    isRecordingPadActive,
    setIsRecordingPadActive,
    isSharingToPlaylist,
    isStudentWeekExpanded,
    isTeacherHomeworkExpanded,
    isTeacherMode,
    isUploadingAudio,
    matchesAudioSearch,
    mobileRecordingsTab,
    newPlaylistTitle,
    openHomeworkWeekAccordions,
    playMetronomeTick,
    progressItems,
    recordingBpm,
    recordingMetronomeRef,
    recordingSearchQuery,
    selectedStudentMonth,
    selectedStudentSongAlbum,
    selectedTeacherMonth,
    selectedTeacherSongAlbum,
    setAudioLabel,
    setIsRecordingMetronomeActive,
    setIsStudentWeekExpanded,
    setIsTeacherHomeworkExpanded,
    setLocalJuniorRecordingsTrigger,
    setMobileRecordingsTab,
    setNewPlaylistTitle,
    setOpenHomeworkWeekAccordions,
    setRecordingBpm,
    setSelectedStudentMonth,
    setSelectedStudentSongAlbum,
    setSelectedTeacherMonth,
    setSelectedTeacherSongAlbum,
    setShareAudioModal,
    setShareCustomTitle,
    setSharePlaylistId,
    setShareProcessing,
    setShowNewPlaylistInput,
    setShowRecordingMetronomePopup,
    setShowStudentFavoritesOnly,
    setShowTeacherFavoritesOnly,
    setShowTeacherHomeworkArchive,
    shareAudioModal,
    shareCustomTitle,
    sharePlaylistId,
    shareProcessing,
    showNewPlaylistInput,
    showRecordingMetronomePopup,
    showStudentFavoritesOnly,
    showTeacherFavoritesOnly,
    showTeacherHomeworkArchive,
    songs,
    startRecordingAudio,
    stopRecordingAudio,
    handleRetakeRecordingAudio,
    recordCountInRemaining,
    recordCountInMode,
    cancelActiveRecordCountIn,
    justRecordedAudioUrl,
    justRecordedAudioLabel,
    studentFirstName,
    toggleFavoriteAudio,
    toggleStudentAudioWeek,
    toggleTeacherAudioWeek,
    topicName,
    useNotebookLayout
  } = props;

  // 🎛️ Instrumenten-PAD State (-6 dB Dämpfung für dynamikstarke Instrumente / Slap-Transienten)
  const [localPadActive, setLocalPadActive] = useState<boolean>(() => shouldDefaultToInputPad(props.student));
  const effectivePadActive = isRecordingPadActive !== undefined ? isRecordingPadActive : localPadActive;
  const handleTogglePad = () => {
    if (setIsRecordingPadActive) {
      setIsRecordingPadActive(prev => !prev);
    } else {
      setLocalPadActive(prev => !prev);
    }
  };

  const [duettModalData, setDuettModalData] = useState<{
    teacherUrl: string;
    teacherTitle: string;
    teacherBpm?: number;
    songTag?: string;
  } | null>(null);

  // 🏫 Schuljahresbeginn (Default: 9 / September, konfigurierbar über schools.school_year_start_month)
  const [schoolYearStartMonth, setSchoolYearStartMonth] = useState<number>(() => {
    if (props.schoolYearStartMonth && props.schoolYearStartMonth >= 1 && props.schoolYearStartMonth <= 12) {
      return props.schoolYearStartMonth;
    }
    const fromStudent = Number(
      (props.student as any)?.school_year_start_month || 
      (props.student as any)?.schools?.school_year_start_month
    );
    if (fromStudent >= 1 && fromStudent <= 12) return fromStudent;
    const fromStorage = Number(
      localStorage.getItem('groovelab_school_year_start_month') || 
      localStorage.getItem('campus_school_year_start_month')
    );
    if (fromStorage >= 1 && fromStorage <= 12) return fromStorage;
    return 9; // September Standard für Musikschulen
  });

  useEffect(() => {
    const sId = props.student?.school_id || (props.student as any)?.schools?.id;
    if (!sId) return;
    supabase
      .from('schools')
      .select('school_year_start_month')
      .eq('id', sId)
      .single()
      .then(({ data }) => {
        if (data?.school_year_start_month) {
          const m = Number(data.school_year_start_month);
          if (m >= 1 && m <= 12) setSchoolYearStartMonth(m);
        }
      }, () => {});
  }, [props.student?.school_id]);

  // 💽 2027 0.1% Goldstandard Shared Album & Vinyl State
  const [activeSharedAlbum, setActiveSharedAlbum] = useState<ActiveSharedAlbum | null>(null);

  const [localRecordingsRevision, setLocalRecordingsRevision] = useState(0);
  const [selectedPracticeCompanionAlbum, setSelectedPracticeCompanionAlbum] = useState<boolean>(false);
  const [selectedDuettAlbum, setSelectedDuettAlbum] = useState<boolean>(false);
  const [selectedStudentSharedAlbum, setSelectedStudentSharedAlbum] = useState<boolean>(false);
  const [selectedPracticeStyleFilter, setSelectedPracticeStyleFilter] = useState<string>('all');
  const [selectedTeacherPracticeAlbum, setSelectedTeacherPracticeAlbum] = useState<boolean>(false);
  const [selectedTeacherDuettAlbum, setSelectedTeacherDuettAlbum] = useState<boolean>(false);
  const [selectedTeacherPracticeStyleFilter, setSelectedTeacherPracticeStyleFilter] = useState<string>('all');

  useEffect(() => {
    const handleRecordingsChange = () => {
      setLocalRecordingsRevision(p => p + 1);
    };

    window.addEventListener('campus_junior_recordings_updated', handleRecordingsChange);
    window.addEventListener('campus-recordings-updated', handleRecordingsChange);
    window.addEventListener('storage', handleRecordingsChange);

    return () => {
      window.removeEventListener('campus_junior_recordings_updated', handleRecordingsChange);
      window.removeEventListener('campus-recordings-updated', handleRecordingsChange);
      window.removeEventListener('storage', handleRecordingsChange);
    };
  }, []);

  // 🧹 DSGVO Art. 17 / User Request: Automatischer 0,1% Scrubber für alte Demo-/Test-Aufnahmen (28. Aug.)
  useEffect(() => {
    try {
      const candidateStudentIds = Array.from(new Set([
        props.student?.id,
        (props.student as any)?.student_id,
        (props.student as any)?.studentId,
        (props.student as any)?.canonical_uuid,
        (props.student as any)?.slot_id,
        '15102f5e-c504-4c33-93ab-436285197c8c',
        'current'
      ].filter(Boolean))) as string[];

      let didScrub = false;

      candidateStudentIds.forEach(cid => {
        // 1. Scrub student recordings
        const juniorKey = `campus_junior_recordings_${cid}`;
        const stored = localStorage.getItem(juniorKey);
        if (stored) {
          try {
            const parsed = JSON.parse(stored);
            if (Array.isArray(parsed) && parsed.length > 0) {
              const remaining = parsed.filter((r: any) => {
                const dateStr = String(r.date || r.created_at || '');
                const labelStr = String(r.label || r.title || '');
                const isAug28 = dateStr.includes('-08-28') || labelStr.includes('28. Aug') || labelStr.includes('Privat... • 28. Aug');
                return !isAug28;
              });
              if (remaining.length !== parsed.length) {
                localStorage.setItem(juniorKey, JSON.stringify(remaining));
                didScrub = true;
              }
            }
          } catch {}
        }

        // 2. Scrub teacher notes & vault
        const notesKey = `campus_homework_notes_${cid}`;
        const storedNotes = localStorage.getItem(notesKey);
        if (storedNotes) {
          try {
            const parsed = JSON.parse(storedNotes);
            if (Array.isArray(parsed)) {
              const remainingNotes = parsed.filter((n: any) => {
                const s = String(n || '');
                return !(s.includes('AUDIO:') && (s.includes('-08-28') || s.includes('28. Aug') || s.includes('Unterricht • 28. Aug')));
              });
              if (remainingNotes.length !== parsed.length) {
                localStorage.setItem(notesKey, JSON.stringify(remainingNotes));
                didScrub = true;
              }
            }
          } catch {}
        }

        const vaultKey = `campus_teacher_audio_vault_${cid}`;
        const storedVault = localStorage.getItem(vaultKey);
        if (storedVault) {
          try {
            const parsed = JSON.parse(storedVault);
            if (Array.isArray(parsed)) {
              const remainingVault = parsed.filter((n: any) => {
                const s = String(n || '');
                return !(s.includes('AUDIO:') && (s.includes('-08-28') || s.includes('28. Aug')));
              });
              if (remainingVault.length !== parsed.length) {
                localStorage.setItem(vaultKey, JSON.stringify(remainingVault));
                didScrub = true;
              }
            }
          } catch {}
        }
      });

      // 3. Remove from live homeworkNotesList if present
      if (props.homeworkNotesList && props.homeworkNotesList.length > 0 && props.handleDeleteNote) {
        props.homeworkNotesList.forEach((n, idx) => {
          const s = String(n || '');
          if (s.includes('AUDIO:') && (s.includes('-08-28') || s.includes('28. Aug') || s.includes('Unterricht • 28. Aug'))) {
            props.handleDeleteNote(idx, s);
            didScrub = true;
          }
        });
      }

      if (didScrub) {
        setLocalRecordingsRevision(p => p + 1);
        window.dispatchEvent(new Event('campus_junior_recordings_updated'));
      }
    } catch (e) {
      console.warn('[MeisterwerkRecordingsTab] Scrub error:', e);
    }
  }, [props.student?.id]);

  // 🗑️ 1-Klick Studio Reset: Alle Schüler-Aufnahmen leeren
  const handleResetStudioTakes = () => {
    if (typeof window === 'undefined') return;
    const confirmReset = window.confirm('Möchtest du wirklich alle Aufnahmen in deinem Studio leeren?');
    if (!confirmReset) return;

    try {
      const candidateStudentIds = Array.from(new Set([
        props.student?.id,
        (props.student as any)?.student_id,
        (props.student as any)?.studentId,
        (props.student as any)?.canonical_uuid,
        (props.student as any)?.slot_id,
        '15102f5e-c504-4c33-93ab-436285197c8c',
        'current'
      ].filter(Boolean))) as string[];

      candidateStudentIds.forEach(cid => {
        localStorage.removeItem(`campus_junior_recordings_${cid}`);
        localStorage.removeItem(`campus_audio_biography_${cid}`);
      });

      setLocalRecordingsRevision(p => p + 1);
      window.dispatchEvent(new Event('campus_junior_recordings_updated'));
      window.dispatchEvent(new Event('storage'));
    } catch (e) {
      console.warn('Error resetting studio takes:', e);
    }
  };

  // 🎧 Zentraler Teacher-Audio-Katalog für Lehrkraft-Spalte & A/B-Hörvergleich
  const teacherAudiosList = useMemo(() => {
    const rawAudioItems: { str: string; originalIdx: number; isCurrentHomework?: boolean; songTag?: string }[] = [];

    const extractAudios = (sourceText: string, defaultIsCurrent: boolean, defaultSongTag?: string, origIdx = -1) => {
      if (!sourceText || typeof sourceText !== 'string' || !sourceText.includes('AUDIO:')) return;
      let toScan: string[] = [];
      try {
        const parsed = JSON.parse(sourceText);
        if (Array.isArray(parsed)) {
          toScan = parsed.filter(x => typeof x === 'string' && x.includes('AUDIO:'));
        } else if (typeof parsed === 'string' && parsed.includes('AUDIO:')) {
          toScan = [parsed];
        }
      } catch {
        toScan = [sourceText];
      }

      toScan.forEach(str => {
        const chunks = str.split('AUDIO:');
        chunks.forEach((chunk, cIdx) => {
          if (cIdx === 0 && !str.startsWith('AUDIO:')) return;
          if (!chunk.trim()) return;
          const firstDelim = chunk.search(/[\n\r"\]]/);
          const audioContent = firstDelim !== -1 ? chunk.substring(0, firstDelim) : chunk;
          rawAudioItems.push({
            str: 'AUDIO:' + audioContent.trim(),
            originalIdx: origIdx,
            isCurrentHomework: defaultIsCurrent,
            songTag: defaultSongTag
          });
        });
      });
    };

    // 1. Current active homework notes list
    (homeworkNotesList || []).forEach((note, idx) => {
      extractAudios(String(note || ''), true, undefined, idx);
    });

    // 2. Local storage homework notes across all candidate student IDs
    try {
      const candidateStudentIds = Array.from(new Set([
        student?.id,
        (student as any)?.student_id,
        (student as any)?.studentId,
        (student as any)?.canonical_uuid,
        (student as any)?.slot_id
      ].filter(Boolean))) as string[];

      candidateStudentIds.forEach(stdId => {
        const localGen = localStorage.getItem(`campus_homework_notes_${stdId}`);
        if (localGen) extractAudios(localGen, true);

        const localVault = localStorage.getItem(`campus_teacher_audio_vault_${stdId}`);
        if (localVault) extractAudios(localVault, true);
      });
    } catch {}

    // 3. Scan progressItems across all lessons/history
    (progressItems || []).forEach((pItem) => {
      const isHw = Boolean(pItem.is_current_homework || (pItem.topic_name && pItem.topic_name.startsWith('Hausaufgabe KW ')));
      let songTag: string | undefined = undefined;
      if (pItem.topic_name && !pItem.topic_name.startsWith('Hausaufgabe KW ') && !pItem.topic_name.startsWith('Allgemein')) {
        songTag = getNormalizedSongTitle(pItem) || pItem.topic_name.replace(/\s*\([^)]*\)\s*$/, '').trim();
      }
      if (pItem.homework_notes) {
        extractAudios(pItem.homework_notes, isHw, songTag);
      }
    });

    // 4. Scan activeSongSkills and localStorage song notes (song_note_${student.id}_*)
    try {
      (activeSongSkills || []).forEach(skill => {
        const songArtist = skill.songs?.artist || skill.artist || '';
        const songTitleOnly = skill.songs?.title || skill.title || skill.song_title || 'Song';
        const fullSongTitle = songArtist ? `${songArtist} - ${songTitleOnly}` : songTitleOnly;
        const isHw = localStorage.getItem(`song_hw_${student?.id}_${skill.id}`) === 'true' ||
                     localStorage.getItem(`song_hw_${student?.id}_${skill.song_id}`) === 'true' ||
                     Boolean(skill.is_current_homework);

        const cachedNote = localStorage.getItem(`song_note_${student?.id}_${skill.id}`) ||
                           localStorage.getItem(`song_note_${student?.id}_${skill.song_id}`) ||
                           skill.homework_notes ||
                           skill.teacher_notes ||
                           '';
        if (cachedNote) {
          extractAudios(cachedNote, isHw, fullSongTitle);
        }
      });

      if (typeof window !== 'undefined' && student?.id) {
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k && k.startsWith(`song_note_${student.id}_`)) {
            const val = localStorage.getItem(k);
            if (val && val.includes('AUDIO:')) {
              const suffix = k.replace(`song_note_${student.id}_`, '');
              const matchingSkill = (activeSongSkills || []).find(s => s.id === suffix || s.song_id === suffix);
              const matchingItem = (progressItems || []).find(p => p.id === suffix || (p as any).song_id === suffix);
              const songTag = matchingSkill
                ? (matchingSkill.songs?.title ? `${matchingSkill.songs?.artist ? matchingSkill.songs.artist + ' - ' : ''}${matchingSkill.songs.title}` : matchingSkill.title)
                : (matchingItem?.topic_name ? matchingItem.topic_name.replace(/\s*\([^)]*\)\s*$/, '').trim() : undefined);
              const isHw = (localStorage.getItem(`song_hw_${student.id}_${suffix}`) === 'true') ||
                           Boolean(matchingSkill?.is_current_homework) ||
                           Boolean(matchingItem?.is_current_homework);
              extractAudios(val, isHw, songTag);
            }
          }
        }
      }
    } catch {}

    // 5. Scan Lehrwerke book page notes (from progressItems & localStorage)
    try {
      (progressItems || []).forEach((item: any) => {
        if (item.topic_name && item.topic_name.includes(' - Seite ')) {
          const pNotes = item.homework_notes || item.teacher_notes;
          if (pNotes && typeof pNotes === 'string' && pNotes.includes('AUDIO:')) {
            extractAudios(pNotes, Boolean(item.is_current_homework), item.topic_name.replace(/\s*\([^)]*\)\s*$/, '').trim());
          }
        }
      });

      const lehrwerkeKey = `campus_lehrwerke_progress_${student?.id}`;
      const storedLw = (student?.id && localStorage.getItem(lehrwerkeKey)) || localStorage.getItem('student_lehrwerke_progress');
      if (storedLw) {
        const parsedLw = JSON.parse(storedLw);
        if (parsedLw && typeof parsedLw === 'object') {
          Object.entries(parsedLw).forEach(([bKey, bVal]: [string, any]) => {
            if (bVal?.pageStates) {
              Object.entries(bVal.pageStates).forEach(([pNum, pState]: [string, any]) => {
                const pNotes = pState?.homeworkNotes || pState?.homework_notes;
                if (pNotes && typeof pNotes === 'string' && pNotes.includes('AUDIO:')) {
                  extractAudios(pNotes, true, `${bVal.title || bKey} • S. ${pNum}`);
                }
              });
            }
          });
        }
      }
    } catch {}

    const resultList: any[] = [];
    const seenTeacherKeys = new Set<string>();

    rawAudioItems.forEach((item, rIdx) => {
      const cleanStr = item.str.replace(/[\[\]"]/g, '');
      const audioIndex = cleanStr.indexOf('AUDIO:');
      if (audioIndex === -1) return;
      const parts = cleanStr.substring(audioIndex + 6).split('|');
      const url = parts[0]?.trim() || '';
      if (!url || url === '#' || url === 'undefined' || url === 'null' || url.includes('storage.campus.de') || url.includes('mock-storage')) return;
      const duration = parseInt(parts[1] || '0', 10);
      const date = parts[2]?.trim() || new Date().toISOString();
      const label = parts[3]?.trim() || `Aufnahme #${resultList.length + 1}`;
      const author = parts[4]?.trim() || 'teacher';
      if (author === 'student') return;

      const tagInParts = parts[7]?.trim();
      const rawSongTag = item.songTag || (tagInParts && tagInParts !== '' ? tagInParts : undefined);
      const songTag = audioSongTags[url] !== undefined ? (audioSongTags[url] || undefined) : rawSongTag;

      const isCustomTitle = parts[8]?.trim() === 'custom';
      const originalUrl = parts[9]?.trim() || undefined;
      const originalDuration = parseInt(parts[10] || '0', 10) || undefined;
      const bpmPart = parts.find(p => typeof p === 'string' && p.trim().startsWith('BPM:'));
      const metronomeBpm = bpmPart ? parseInt(bpmPart.trim().replace('BPM:', ''), 10) : undefined;

      const uniqueKey = parts[6] || (url && url !== '#' && url.length > 8 ? url : null) || `teacher_rec_${item.originalIdx >= 0 ? item.originalIdx : rIdx}_${label}_${duration}_${date}_${songTag || 'notag'}`;
      if (seenTeacherKeys.has(uniqueKey)) return;

      seenTeacherKeys.add(uniqueKey);
      resultList.push({
        url,
        duration,
        date,
        label,
        originalIdx: item.originalIdx,
        isCurrentHomework: item.isCurrentHomework,
        songTag,
        isCustomTitle,
        originalUrl,
        originalDuration,
        metronomeBpm
      });
    });

    const harmonizedTeacherAudios = harmonizeAudioList(resultList, true, topicName);
    resultList.length = 0;
    harmonizedTeacherAudios.forEach(aud => {
      aud.label = aud.harmonizedTitle;
      resultList.push(aud);
    });

    resultList.sort((a, b) => {
      const timeA = a.date ? new Date(a.date).getTime() : 0;
      const timeB = b.date ? new Date(b.date).getTime() : 0;
      return timeB - timeA;
    });

    return resultList;
  }, [homeworkNotesList, student?.id, progressItems, activeSongSkills, topicName, audioSongTags, localRecordingsRevision]);

  // ⭐ Zentraler Student-Audio-Katalog für Schüler-Spalte & A/B-Hörvergleich
  const studentAudiosList = useMemo(() => {
    const studentAudios: any[] = [];
    const seenStudentUrls = new Set<string>();

    try {
      const candidateStudentIds = Array.from(new Set([
        student?.id,
        (student as any)?.student_id,
        (student as any)?.studentId,
        (student as any)?.canonical_uuid,
        (student as any)?.slot_id
      ].filter(Boolean))) as string[];

      const seenIds = new Set<string>();

      candidateStudentIds.forEach(cid => {
        const juniorKey = `campus_junior_recordings_${cid}`;
        const stored = localStorage.getItem(juniorKey);
        if (stored) {
          try {
            const parsed = JSON.parse(stored);
            if (Array.isArray(parsed)) {
              parsed.forEach((rec: any, idx: number) => {
                const recId = rec.id || `stud-${cid}-${idx}`;
                const dedupeKey = rec.blobKey || rec.url || recId;
                if (rec.url && (rec.url.includes('storage.campus.de') || rec.url.includes('mock-storage'))) return;
                if (dedupeKey && !seenStudentUrls.has(dedupeKey) && !seenIds.has(recId)) {
                  if (rec.url) seenStudentUrls.add(rec.url);
                  if (rec.blobKey) seenStudentUrls.add(rec.blobKey);
                  seenIds.add(recId);
                  const rawSongTag = rec.songTag || rec.song || rec.songTitle || undefined;
                  const songTag = (rec.url && audioSongTags[rec.url] !== undefined) ? (audioSongTags[rec.url] || undefined) : rawSongTag;
                  const sanitizedSongTag = isGenericSongTag(songTag) ? undefined : songTag;
                  const rawBpmCandidate = rec.metronomeBpm ?? rec.bpm ?? rec.teacherBpm;
                  const parsedBpmNum = rawBpmCandidate !== undefined && rawBpmCandidate !== null ? parseInt(String(rawBpmCandidate), 10) : undefined;
                  const validatedBpm = (parsedBpmNum && !isNaN(parsedBpmNum) && parsedBpmNum > 0) ? parsedBpmNum : undefined;

                  const isDuett = Boolean(
                    rec.isDuettTake || 
                    rec.source === 'duet' || 
                    (typeof rec.title === 'string' && rec.title.startsWith('Duett:')) || 
                    (typeof rec.label === 'string' && rec.label.startsWith('Duett:'))
                  );

                  const rawDateCandidate = rec.date || rec.created_at || rec.recordedAt;
                  let resolvedDate = rawDateCandidate;
                  if (!resolvedDate && rec.id && typeof rec.id === 'string' && rec.id.includes('_')) {
                    const parts = rec.id.split('_');
                    const num = parseInt(parts[2] || parts[1] || '0', 10);
                    if (num > 1600000000000) {
                      resolvedDate = new Date(num).toISOString();
                    }
                  }
                  if (!resolvedDate) {
                    resolvedDate = new Date(0).toISOString();
                  }

                  studentAudios.push({
                    id: recId,
                    url: rec.url,
                    blobKey: rec.blobKey,
                    duration: parseInt(rec.duration || '0', 10),
                    date: resolvedDate,
                    label: rec.title || rec.label || `Eigene Aufnahme #${studentAudios.length + 1}`,
                    visibility: rec.visibility || 'private',
                    songTag: sanitizedSongTag,
                    originalIdx: -1,
                    source: rec.source || (isDuett ? 'duet' : 'local_junior'),
                    bpm: validatedBpm,
                    style: rec.style,
                    cloudSyncStatus: rec.cloudSyncStatus,
                    cloudPath: rec.cloudPath,
                    checksumSha256: rec.checksumSha256,
                    isCustomTitle: rec.isCustomTitle || (rec.source === 'practice_companion'),
                    metronomeBpm: validatedBpm,
                    original_url: rec.original_url || rec.originalUrl,
                    original_duration: rec.original_duration || rec.originalDuration,
                    waveformPeaks: rec.waveformPeaks,
                    isDuettTake: isDuett,
                    teacherAudioUrl: rec.teacherAudioUrl,
                    teacherTitle: rec.teacherTitle,
                    teacherBpm: rec.teacherBpm,
                    latencyOffsetMs: rec.latencyOffsetMs,
                    monitoringMode: rec.monitoringMode,
                    isBlindTake: rec.isBlindTake
                  });
                }
              });
            }
          } catch {}
        }
      });
    } catch {}

    try {
      (homeworkNotesList || []).forEach((n, hIdx) => {
        if (typeof n !== 'string' || !n.startsWith('AUDIO:')) return;
        const parts = n.substring(6).split('|');
        const url = parts[0]?.trim() || '';
        const duration = parseInt(parts[1] || '0', 10);
        const date = parts[2]?.trim() || new Date().toISOString();
        const label = parts[3]?.trim() || `Eigene Aufnahme #${studentAudios.length + 1}`;
        const author = parts[4]?.trim() || 'teacher';
        const visibility = parts[5]?.trim() || 'private';
        const uniqueId = parts[6]?.trim() || `hw_note_${hIdx}`;
        const tagInParts = parts[7]?.trim();

        if (author === 'student' && url && !seenStudentUrls.has(url) && !seenStudentUrls.has(uniqueId)) {
          seenStudentUrls.add(url);
          seenStudentUrls.add(uniqueId);
          const bpmPart = parts.find(p => typeof p === 'string' && p.trim().startsWith('BPM:'));
          const metronomeBpm = bpmPart ? parseInt(bpmPart.trim().replace('BPM:', ''), 10) : undefined;

          studentAudios.push({
            id: uniqueId,
            url,
            blobKey: url,
            duration,
            date,
            label,
            visibility,
            songTag: tagInParts || undefined,
            originalIdx: hIdx,
            source: 'homework_note',
            bpm: metronomeBpm,
            metronomeBpm
          });
        }
      });
    } catch {}

    const harmonizedStudentAudios = harmonizeAudioList(studentAudios, false, topicName);
    studentAudios.length = 0;
    harmonizedStudentAudios.forEach(aud => {
      aud.label = aud.harmonizedTitle;
      studentAudios.push(aud);
    });

    studentAudios.sort((a, b) => {
      const timeA = a.date ? new Date(a.date).getTime() : 0;
      const timeB = b.date ? new Date(b.date).getTime() : 0;
      return (isNaN(timeB) ? 0 : timeB) - (isNaN(timeA) ? 0 : timeA);
    });

    return studentAudios;
  }, [student?.id, homeworkNotesList, topicName, audioSongTags, localRecordingsRevision]);

  // 🎛️ 5 Kuratierte Einzel-LPs (Favoriten, Übe-Begleiter, Loops, Duette, Für Lehrer)
  const singleLpsData = useMemo(() => {
    const teacherFavs = teacherAudiosList.filter(a => favoriteAudioUrls.includes(a.url));
    const studentFavs = studentAudiosList.filter(a => favoriteAudioUrls.includes(a.url));

    const teacherPractice = teacherAudiosList.filter(a => (a.metronomeBpm && a.metronomeBpm > 0) || (a.label && (a.label.toLowerCase().includes('tempo') || a.label.toLowerCase().includes('begleit'))));
    const studentPractice = studentAudiosList.filter(a => a.source === 'practice_companion' || Boolean(a.metronomeBpm && a.metronomeBpm > 0));

    const teacherLoops = teacherAudiosList.filter(a => a.loop_locator || (a.label && a.label.toLowerCase().includes('loop')));
    const studentLoops = studentAudiosList.filter(a => a.loop_locator || (a.label && a.label.toLowerCase().includes('loop')));

    const teacherDuet = teacherAudiosList.filter(a => (a.metronomeBpm && a.metronomeBpm > 0) || (a.label && a.label.toLowerCase().includes('duett')));
    const studentDuet = studentAudiosList.filter(a => a.isDuettTake || a.source === 'duet' || (a.label && a.label.toLowerCase().includes('duett')));

    const teacherHw = teacherAudiosList.filter(a => a.isCurrentHomework || (a.label && a.label.toLowerCase().includes('hausaufgabe')));
    const studentShared = studentAudiosList.filter(a => a.visibility === 'shared_with_teacher');

    return {
      favorites: {
        type: 'favorites' as const,
        title: 'Favoriten',
        subtitle: 'Beste Takes & Highlights',
        badge: `${teacherFavs.length + studentFavs.length} Takes`,
        theme: {
          bg: 'linear-gradient(135deg, #facc15 0%, #eab308 100%)',
          shadow: '0 6px 14px -2px rgba(234, 179, 8, 0.40)',
          border: 'rgba(255, 255, 255, 0.35)',
          textColor: '#0f172a'
        },
        icon: <Star size={16} fill="#0f172a" color="#0f172a" />,
        teacherCount: teacherFavs.length,
        studentCount: studentFavs.length,
        totalCount: teacherFavs.length + studentFavs.length
      },
      practice: {
        type: 'practice' as const,
        title: 'Übe-Begleiter',
        subtitle: 'Tempo & Play-Alongs',
        badge: `${teacherPractice.length + studentPractice.length} Takes`,
        theme: {
          bg: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
          shadow: '0 6px 14px -2px rgba(249, 115, 22, 0.40)',
          border: 'rgba(255, 255, 255, 0.28)',
          textColor: '#ffffff'
        },
        icon: <SlidersHorizontal size={16} color="#ffffff" strokeWidth={2.4} />,
        teacherCount: teacherPractice.length,
        studentCount: studentPractice.length,
        totalCount: teacherPractice.length + studentPractice.length
      },
      loops: {
        type: 'loops' as const,
        title: 'Loops',
        subtitle: 'Endlos-Grooves & Licks',
        badge: `${teacherLoops.length + studentLoops.length} Takes`,
        theme: {
          bg: 'linear-gradient(135deg, #f43f5e 0%, #be123c 100%)',
          shadow: '0 6px 14px -2px rgba(244, 63, 94, 0.40)',
          border: 'rgba(255, 255, 255, 0.28)',
          textColor: '#ffffff'
        },
        icon: <Repeat size={16} color="#ffffff" strokeWidth={2.4} />,
        teacherCount: teacherLoops.length,
        studentCount: studentLoops.length,
        totalCount: teacherLoops.length + studentLoops.length
      },
      duet: {
        type: 'duet' as const,
        title: 'Duette',
        subtitle: 'Mehrspur & Zusammenspiel',
        badge: `${teacherDuet.length + studentDuet.length} Takes`,
        theme: {
          bg: 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)',
          shadow: '0 6px 14px -2px rgba(139, 92, 246, 0.40)',
          border: 'rgba(255, 255, 255, 0.28)',
          textColor: '#ffffff'
        },
        icon: <Users size={16} color="#ffffff" strokeWidth={2.4} />,
        teacherCount: teacherDuet.length,
        studentCount: studentDuet.length,
        totalCount: teacherDuet.length + studentDuet.length
      },
      forTeacher: {
        type: 'forTeacher' as const,
        title: 'Für Lehrer',
        subtitle: 'Für Unterricht freigegeben',
        badge: `${studentShared.length} Freigegeben`,
        theme: {
          bg: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
          shadow: '0 6px 14px -2px rgba(16, 185, 129, 0.40)',
          border: 'rgba(255, 255, 255, 0.28)',
          textColor: '#ffffff'
        },
        icon: <BookOpen size={16} color="#ffffff" strokeWidth={2.4} />,
        teacherCount: teacherHw.length,
        studentCount: studentShared.length,
        totalCount: teacherHw.length + studentShared.length
      }
    };
  }, [teacherAudiosList, studentAudiosList, favoriteAudioUrls]);

  // 🎨 Campus Studio Module Farbintensität (Chromatisch aufsteigender 360° Jahreszeiten-Farbkreis von Sep bis Aug - Swiss Uni-Colors)
  const getMonthlyMixedTheme = (monthNum: number) => {
    const palettes: Record<number, { bg: string; shadow: string; border: string; textColor: string; accentColor: string }> = {
      // 1. JANUAR: Eis-Violett / Tiefes Amethyst (Winterhöhepunkt)
      1: { bg: '#7c3aed', shadow: '0 6px 14px -2px rgba(124, 58, 237, 0.35)', border: 'rgba(255, 255, 255, 0.28)', textColor: '#ffffff', accentColor: '#7c3aed' },
      // 2. FEBRUAR: Mitternachts-Indigo / Frostiges Royalblau
      2: { bg: '#4f46e5', shadow: '0 6px 14px -2px rgba(79, 70, 229, 0.35)', border: 'rgba(255, 255, 255, 0.28)', textColor: '#ffffff', accentColor: '#4f46e5' },
      // 3. MÄRZ: Klares Ozeanblau / Sky Blue (Tauwetter & Vorfrühling)
      3: { bg: '#0284c7', shadow: '0 6px 14px -2px rgba(2, 132, 199, 0.35)', border: 'rgba(255, 255, 255, 0.28)', textColor: '#ffffff', accentColor: '#0284c7' },
      // 4. APRIL: Frisches Türkis / Aqua Mint (Frühlingserwachen)
      4: { bg: '#0d9488', shadow: '0 6px 14px -2px rgba(13, 148, 136, 0.35)', border: 'rgba(255, 255, 255, 0.28)', textColor: '#ffffff', accentColor: '#0d9488' },
      // 5. MAI: Frisches Maigrün / Smaragd (Blütezeit)
      5: { bg: '#10b981', shadow: '0 6px 14px -2px rgba(16, 185, 129, 0.35)', border: 'rgba(255, 255, 255, 0.28)', textColor: '#ffffff', accentColor: '#10b981' },
      // 6. JUNI: Strahlendes Apfelgrün / Knackige Limette (Frühsommer)
      6: { bg: '#65a30d', shadow: '0 6px 14px -2px rgba(101, 163, 13, 0.35)', border: 'rgba(255, 255, 255, 0.28)', textColor: '#ffffff', accentColor: '#65a30d' },
      // 7. JULI: Warmes Sonnengelb (Hochsommer)
      7: { bg: '#eab308', shadow: '0 6px 14px -2px rgba(234, 179, 8, 0.35)', border: 'rgba(255, 255, 255, 0.35)', textColor: '#0f172a', accentColor: '#d97706' },
      // 8. AUGUST: Sonniges Mango / Warmes Mandarine (Spätsommer)
      8: { bg: '#f97316', shadow: '0 6px 14px -2px rgba(249, 115, 22, 0.35)', border: 'rgba(255, 255, 255, 0.28)', textColor: '#ffffff', accentColor: '#ea580c' },
      // 9. SEPTEMBER: Warmes Bernstein-Gold (Schuljahresbeginn)
      9: { bg: '#d97706', shadow: '0 6px 14px -2px rgba(217, 119, 6, 0.35)', border: 'rgba(255, 255, 255, 0.30)', textColor: '#ffffff', accentColor: '#b45309' },
      // 10. OKTOBER: Kräftiges Kupfer-Orange / Herbstlaub
      10: { bg: '#ea580c', shadow: '0 6px 14px -2px rgba(234, 88, 12, 0.35)', border: 'rgba(255, 255, 255, 0.28)', textColor: '#ffffff', accentColor: '#c2410c' },
      // 11. NOVEMBER: Warmes Karminrot / Herbstrose
      11: { bg: '#e11d48', shadow: '0 6px 14px -2px rgba(225, 29, 72, 0.35)', border: 'rgba(255, 255, 255, 0.28)', textColor: '#ffffff', accentColor: '#e11d48' },
      // 12. DEZEMBER: Edles Festtags-Purpur / Beere (Winterbeginn)
      12: { bg: '#9333ea', shadow: '0 6px 14px -2px rgba(147, 51, 234, 0.35)', border: 'rgba(255, 255, 255, 0.28)', textColor: '#ffffff', accentColor: '#a855f7' }
    };
    return palettes[monthNum] || { bg: '#475569', shadow: '0 6px 14px -2px rgba(71, 85, 105, 0.30)', border: 'rgba(255, 255, 255, 0.25)', textColor: '#ffffff', accentColor: '#64748b' };
  };

  // 📅 Alle 12 Monats-LPs in Schuljahres-Chronologie (Start: September bis August)
  const { allMonthsList, currentSchoolYearLabel, startMonthName, endMonthName } = useMemo(() => {
    const startM = schoolYearStartMonth || 9; // 1-12
    const today = new Date();
    const curCalMonth = today.getMonth() + 1; // 1-12
    const curCalYear = today.getFullYear();

    // Schuljahr Startjahr
    const schoolYearStartYear = curCalMonth >= startM ? curCalYear : curCalYear - 1;
    const schoolYearEndYear = schoolYearStartYear + 1;
    const syLabel = `${schoolYearStartYear}/${schoolYearEndYear}`;

    const months: {
      monthKey: string;
      monthLabel: string;
      monthNumber: number;
      monthCode?: string;
      year: number;
      teacherCount: number;
      studentCount: number;
      totalCount: number;
    }[] = [];

    const mapByKey: Record<string, typeof months[0]> = {};

    for (let i = 0; i < 12; i++) {
      const rawMonth = ((startM - 1 + i) % 12) + 1; // 1 bis 12
      const calYear = (startM - 1 + i) >= 12 ? schoolYearEndYear : schoolYearStartYear;
      const mStr = rawMonth < 10 ? `0${rawMonth}` : `${rawMonth}`;
      const key = `${calYear}-${mStr}`;
      const dObj = new Date(calYear, rawMonth - 1, 1);
      const label = dObj.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' });

      const mShort = dObj.toLocaleDateString('de-DE', { month: 'short' }).replace('.', '').toUpperCase();
      const item = {
        monthKey: key,
        monthLabel: label,
        monthNumber: rawMonth,
        monthCode: mShort,
        year: calYear,
        teacherCount: 0,
        studentCount: 0,
        totalCount: 0
      };
      months.push(item);
      mapByKey[key] = item;
    }

    teacherAudiosList.forEach(aud => {
      if (!aud.date) return;
      const key = aud.date.slice(0, 7);
      if (mapByKey[key]) {
        mapByKey[key].teacherCount++;
        mapByKey[key].totalCount++;
      }
    });

    studentAudiosList.forEach(aud => {
      if (!aud.date) return;
      const key = aud.date.slice(0, 7);
      if (mapByKey[key]) {
        mapByKey[key].studentCount++;
        mapByKey[key].totalCount++;
      }
    });

    const sStartD = new Date(2026, startM - 1, 1);
    const endM = ((startM + 10) % 12) + 1;
    const sEndD = new Date(2026, endM - 1, 1);
    const sName = sStartD.toLocaleDateString('de-DE', { month: 'short' });
    const eName = sEndD.toLocaleDateString('de-DE', { month: 'short' });

    return {
      allMonthsList: months,
      currentSchoolYearLabel: syLabel,
      startMonthName: sName,
      endMonthName: eName
    };
  }, [schoolYearStartMonth, teacherAudiosList, studentAudiosList]);

  // 🎵 Song-Alben & Lehrwerke
  const songAlbumsList = useMemo(() => {
    const map: Record<string, { songTitle: string; teacherTakes: any[]; studentTakes: any[] }> = {};
    teacherAudiosList.forEach(aud => {
      if (aud.songTag) {
        if (!map[aud.songTag]) map[aud.songTag] = { songTitle: aud.songTag, teacherTakes: [], studentTakes: [] };
        map[aud.songTag].teacherTakes.push(aud);
      }
    });
    studentAudiosList.forEach(aud => {
      if (aud.songTag) {
        if (!map[aud.songTag]) map[aud.songTag] = { songTitle: aud.songTag, teacherTakes: [], studentTakes: [] };
        map[aud.songTag].studentTakes.push(aud);
      }
    });
    return Object.values(map).sort((a, b) => (b.teacherTakes.length + b.studentTakes.length) - (a.teacherTakes.length + a.studentTakes.length));
  }, [teacherAudiosList, studentAudiosList]);

  // 🌟 Aktuelle Woche Spotlight
  const currentWeekTeacherAudio = useMemo(() => {
    return teacherAudiosList.find(a => a.isCurrentHomework) || teacherAudiosList[0] || null;
  }, [teacherAudiosList]);

  const currentWeekStudentAudio = useMemo(() => {
    return studentAudiosList[0] || null;
  }, [studentAudiosList]);

  // 🎧 Universal Helper: Lehrkraft-Player
  const renderTeacherPlayer = (aud: any, key: string, isHero = false, customThemeColor = "#15803d", customThemeBg = "#e6f4ea") => {
    const playerKey = aud.id || aud.blobKey || aud.url || `${key}-${aud.date || ''}`;
    const effectiveBpm = (aud.metronomeBpm && Number(aud.metronomeBpm) > 0)
      ? Number(aud.metronomeBpm)
      : ((aud.bpm && Number(aud.bpm) > 0)
        ? Number(aud.bpm)
        : ((aud.teacherBpm && Number(aud.teacherBpm) > 0) ? Number(aud.teacherBpm) : undefined));

    return (
      <InlineAudioPlayer
        key={playerKey}
        layout="two-line"
        id={playerKey}
        audioId={aud.id || aud.blobKey || aud.url}
        url={aud.url}
        label={aud.label}
        duration={aud.duration}
        waveformPeaks={aud.waveformPeaks}
        date={aud.date}
        initialLoopLocator={aud.loop_locator}
        isHero={isHero || (Boolean(justRecordedAudioUrl) && aud.url === justRecordedAudioUrl)}
        contextBadge={aud.songTag}
        onContextBadgeClick={aud.songTag ? () => {
          setActiveSharedAlbum({
            type: 'song',
            title: aud.songTag,
            subtitle: 'Song-Album',
            badge: `${(songAlbumsList.find(s => s.songTitle === aud.songTag)?.teacherTakes.length || 0) + (songAlbumsList.find(s => s.songTitle === aud.songTag)?.studentTakes.length || 0)} Takes`,
            theme: { bg: 'linear-gradient(135deg, #6366f1 0%, #4338ca 100%)', shadow: 'rgba(99, 102, 241, 0.45)', textColor: '#ffffff' },
            icon: <Music size={18} color="#ffffff" strokeWidth={2.4} />,
            songTitle: aud.songTag
          });
        } : undefined}
        availableSongs={availableSongsForTagging}
        onSelectSongTag={(newTag) => handleUpdateAudioSongTag(aud.url, newTag)}
        isFavorite={favoriteAudioUrls.includes(aud.url)}
        onToggleFavorite={() => toggleFavoriteAudio(aud.url)}
        themeColor={customThemeColor}
        themeBg={customThemeBg}
        onRename={!readOnly ? (newTitle) => handleRenameTeacherAudio(aud.url, newTitle, aud.originalIdx) : undefined}
        onDelete={!readOnly ? () => handleDeleteNote(aud.originalIdx, aud.url) : undefined}
        originalAudioUrl={aud.originalUrl}
        originalDuration={aud.originalDuration}
        onRevertToOriginal={!readOnly && aud.originalUrl && handleRevertTeacherAudioToOriginal ? () => handleRevertTeacherAudioToOriginal(aud.originalIdx, aud.url) : undefined}
        onSaveEdited={!readOnly && handleSaveEditedTeacherAudio ? (res) => handleSaveEditedTeacherAudio(res, aud.originalIdx, aud.url) : undefined}
        metronomeBpm={effectiveBpm}
        onOpenDuettDeck={() => setDuettModalData({
          teacherUrl: aud.url,
          teacherTitle: aud.label || 'Lehrer-Aufnahme',
          teacherBpm: effectiveBpm || recordingBpm || 100,
          songTag: aud.songTag
        })}
      />
    );
  };

  // ⭐ Universal Helper: Schüler-Player
  const renderStudentPlayer = (aud: any, idxKey: string, isHero = false) => {
    const isShared = aud.visibility === "shared_with_teacher";
    const isPracticeTake = aud.source === 'practice_companion' || (typeof aud.label === 'string' && aud.label.includes('Übe-Begleiter'));
    const playerKey = aud.id || aud.blobKey || aud.url || `${idxKey}-${aud.date || ''}`;
    const effectiveBpm = (aud.metronomeBpm && Number(aud.metronomeBpm) > 0)
      ? Number(aud.metronomeBpm)
      : ((aud.bpm && Number(aud.bpm) > 0)
        ? Number(aud.bpm)
        : ((aud.teacherBpm && Number(aud.teacherBpm) > 0) ? Number(aud.teacherBpm) : undefined));
    const hasValidBpm = Boolean(effectiveBpm && effectiveBpm > 0);

    return (
      <div key={playerKey} style={{ display: 'flex', flexDirection: 'column', gap: '4px', width: '100%' }}>
        <InlineAudioPlayer
          layout="two-line"
          id={playerKey}
          audioId={aud.id || aud.blobKey}
          url={aud.url}
          label={aud.label}
          duration={aud.duration}
          waveformPeaks={aud.waveformPeaks}
          date={aud.date}
          initialLoopLocator={aud.loop_locator}
          isHero={isHero || (Boolean(justRecordedAudioUrl) && (aud.url === justRecordedAudioUrl || aud.blobKey === justRecordedAudioUrl))}
          contextBadge={aud.songTag}
          onContextBadgeClick={aud.songTag ? () => {
            setActiveSharedAlbum({
              type: 'song',
              title: aud.songTag,
              subtitle: 'Song-Album',
              badge: `${(songAlbumsList.find(s => s.songTitle === aud.songTag)?.teacherTakes.length || 0) + (songAlbumsList.find(s => s.songTitle === aud.songTag)?.studentTakes.length || 0)} Takes`,
              theme: { bg: 'linear-gradient(135deg, #6366f1 0%, #4338ca 100%)', shadow: 'rgba(99, 102, 241, 0.45)', textColor: '#ffffff' },
              icon: <Music size={18} color="#ffffff" strokeWidth={2.4} />,
              songTitle: aud.songTag
            });
          } : undefined}
          availableSongs={availableSongsForTagging}
          onSelectSongTag={(newTag) => handleUpdateAudioSongTag(aud.url, newTag)}
          isFavorite={favoriteAudioUrls.includes(aud.url)}
          onToggleFavorite={() => toggleFavoriteAudio(aud.url)}
          themeColor={isPracticeTake ? "#d97706" : (aud.isDuettTake ? "#7c3aed" : "#6d28d9")}
          themeBg={isPracticeTake ? "#fffbeb" : (aud.isDuettTake ? "#faf5ff" : "#ede9fe")}
          isSharedWithTeacher={isShared}
          badge={aud.isDuettTake ? "👥 Duett" : (aud.cloudSyncStatus === 'synced' ? "☁️ Cloud" : (isShared ? "📬 Für Lehrer" : "🔒 Privat"))}
          badgeTitle={aud.isDuettTake ? "Synchrones Duett (Spur 1 & Spur 2) - Klicke auf Duett-Deck zum Abhören" : (aud.cloudSyncStatus === 'synced' ? "Revisionssicher im Audio-Tresor gesichert" : (isShared ? "Mit Lehrkraft geteilt (Klicken, um wieder privat zu machen)" : "Privat (Nur für dich sichtbar - Klicken zum Teilen mit Lehrkraft)"))}
          badgeBg={aud.isDuettTake ? "#f3e8ff" : (aud.cloudSyncStatus === 'synced' ? "#fef3c7" : (isShared ? "#dcfce7" : "#f1f5f9"))}
          badgeColor={aud.isDuettTake ? "#6b21a8" : (aud.cloudSyncStatus === 'synced' ? "#b45309" : (isShared ? "#15803d" : "#475569"))}
          onRename={(newTitle) => handleRenameStudentAudio(aud.url, newTitle, aud.id)}
          metronomeBpm={effectiveBpm || (aud.isDuettTake ? (recordingBpm || 100) : undefined)}
          onOpenDuettDeck={(hasValidBpm || aud.isDuettTake || aud.teacherAudioUrl) ? () => setDuettModalData({
            teacherUrl: aud.teacherAudioUrl || aud.url,
            teacherTitle: aud.teacherTitle || aud.label || 'Duett-Aufnahme',
            teacherBpm: effectiveBpm || recordingBpm || 100,
            songTag: aud.songTag
          }) : undefined}
          onBadgeClick={!isTeacherMode ? () => {
            if (student?.id) {
              try {
                const candidateStudentIds = Array.from(new Set([
                  student?.id,
                  (student as any)?.student_id,
                  (student as any)?.studentId,
                  (student as any)?.canonical_uuid,
                  (student as any)?.slot_id
                ].filter(Boolean))) as string[];

                candidateStudentIds.forEach(cid => {
                  const juniorKey = `campus_junior_recordings_${cid}`;
                  const stored = localStorage.getItem(juniorKey);
                  if (stored) {
                    const recs = JSON.parse(stored).map((r: any) => {
                      if (r.url === aud.url || r.id === aud.id || r.blobKey === aud.blobKey) {
                        return { ...r, visibility: isShared ? "private" : "shared_with_teacher" };
                      }
                      return r;
                    });
                    localStorage.setItem(juniorKey, JSON.stringify(recs));
                  }
                });
                setLocalRecordingsRevision(p => p + 1);
                window.dispatchEvent(new Event('campus_junior_recordings_updated'));
              } catch {}
            }
          } : undefined}
          onDelete={!isTeacherMode ? async () => {
            if (handleDeleteStudentAudio) {
              await handleDeleteStudentAudio(aud.url, aud.id, aud);
            } else if (student?.id) {
              try {
                const candidateStudentIds = Array.from(new Set([
                  student?.id,
                  (student as any)?.student_id,
                  (student as any)?.studentId,
                  (student as any)?.canonical_uuid,
                  (student as any)?.slot_id
                ].filter(Boolean))) as string[];

                candidateStudentIds.forEach(cid => {
                  const juniorKey = `campus_junior_recordings_${cid}`;
                  const stored = localStorage.getItem(juniorKey);
                  if (stored) {
                    const recs = JSON.parse(stored).filter((r: any) => {
                      const matchUrl = aud.url && (r.url === aud.url || r.original_url === aud.url);
                      const matchKey = aud.blobKey && (r.blobKey === aud.blobKey || r.url === aud.blobKey);
                      const matchId = aud.id && (r.id === aud.id);
                      return !(matchUrl || matchKey || matchId);
                    });
                    localStorage.setItem(juniorKey, JSON.stringify(recs));
                  }
                });
                setLocalRecordingsRevision(p => p + 1);
                window.dispatchEvent(new Event('campus_junior_recordings_updated'));
              } catch {}
            }
          } : undefined}
        />
      </div>
    );
  };

  // 💽 Gefilterte Takes für das aktuell geöffnete geteilte Vinyl-Album
  const activeTeacherTakes = useMemo(() => {
    if (!activeSharedAlbum) return [];
    if (activeSharedAlbum.type === 'favorites') return teacherAudiosList.filter(a => favoriteAudioUrls.includes(a.url));
    if (activeSharedAlbum.type === 'practice') return teacherAudiosList.filter(a => (a.metronomeBpm && a.metronomeBpm > 0) || (a.label && (a.label.toLowerCase().includes('tempo') || a.label.toLowerCase().includes('begleit'))));
    if (activeSharedAlbum.type === 'loops') return teacherAudiosList.filter(a => a.loop_locator || (a.label && a.label.toLowerCase().includes('loop')));
    if (activeSharedAlbum.type === 'duet') return teacherAudiosList.filter(a => (a.metronomeBpm && a.metronomeBpm > 0) || (a.label && a.label.toLowerCase().includes('duett')));
    if (activeSharedAlbum.type === 'forTeacher') return teacherAudiosList.filter(a => a.isCurrentHomework || (a.label && a.label.toLowerCase().includes('hausaufgabe')));
    if (activeSharedAlbum.type === 'month') return teacherAudiosList.filter(a => a.date && a.date.startsWith(activeSharedAlbum.monthKey || ''));
    if (activeSharedAlbum.type === 'song') return teacherAudiosList.filter(a => a.songTag && a.songTag.toLowerCase() === activeSharedAlbum.songTitle?.toLowerCase());
    return [];
  }, [activeSharedAlbum, teacherAudiosList, favoriteAudioUrls]);

  const activeStudentTakes = useMemo(() => {
    if (!activeSharedAlbum) return [];
    if (activeSharedAlbum.type === 'favorites') return studentAudiosList.filter(a => favoriteAudioUrls.includes(a.url));
    if (activeSharedAlbum.type === 'practice') return studentAudiosList.filter(a => a.source === 'practice_companion' || Boolean(a.metronomeBpm && a.metronomeBpm > 0));
    if (activeSharedAlbum.type === 'loops') return studentAudiosList.filter(a => a.loop_locator || (a.label && a.label.toLowerCase().includes('loop')));
    if (activeSharedAlbum.type === 'duet') return studentAudiosList.filter(a => a.isDuettTake || a.source === 'duet' || (a.label && a.label.toLowerCase().includes('duett')));
    if (activeSharedAlbum.type === 'forTeacher') return studentAudiosList.filter(a => a.visibility === 'shared_with_teacher');
    if (activeSharedAlbum.type === 'month') return studentAudiosList.filter(a => a.date && a.date.startsWith(activeSharedAlbum.monthKey || ''));
    if (activeSharedAlbum.type === 'song') return studentAudiosList.filter(a => a.songTag && a.songTag.toLowerCase() === activeSharedAlbum.songTitle?.toLowerCase());
    return [];
  }, [activeSharedAlbum, studentAudiosList, favoriteAudioUrls]);

  // 🔍 Suchergebnisse
  const isSearching = Boolean(recordingSearchQuery && recordingSearchQuery.trim().length > 0);
  const searchFilteredTeacherTakes = useMemo(() => {
    if (!isSearching) return [];
    return teacherAudiosList.filter(a => matchesAudioSearch(a, recordingSearchQuery));
  }, [isSearching, teacherAudiosList, recordingSearchQuery, matchesAudioSearch]);

  const searchFilteredStudentTakes = useMemo(() => {
    if (!isSearching) return [];
    return studentAudiosList.filter(a => matchesAudioSearch(a, recordingSearchQuery));
  }, [isSearching, studentAudiosList, recordingSearchQuery, matchesAudioSearch]);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      width: '100%',
      height: '100%',
      minHeight: 0,
      overflowY: 'auto',
      background: useNotebookLayout ? '#faf8f2' : '#f8fafc',
      boxSizing: 'border-box'
    }}>
      {/* ========================================================================= */}
      {/* 1. VIEW A: RUHEANSICHT / 2-SPALTEN STUDIO-COCKPIT (activeSharedAlbum === null) */}
      {/* ========================================================================= */}
      {activeSharedAlbum === null ? (
        <div style={{
          width: '100%',
          maxWidth: '1380px',
          margin: '0 auto',
          padding: isMobileOrSim
            ? '14px 12px calc(var(--bottom-bar-height, 68px) + env(safe-area-inset-bottom) + 32px) 12px'
            : '14px 18px',
          display: 'grid',
          gridTemplateColumns: isMobileOrSim ? '1fr' : 'minmax(380px, 42%) 1fr',
          gap: isMobileOrSim ? '14px' : '16px',
          alignItems: 'start',
          boxSizing: 'border-box'
        }}>
          {/* ===================================================================== */}
          {/* LINKE SPALTE: 🎛️ STUDIO CONSOLE (AUFNAHME-DECK & AKTUELLE WOCHE)      */}
          {/* ===================================================================== */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            position: isMobileOrSim ? 'static' : 'sticky',
            top: '16px',
            alignSelf: 'start'
          }}>
            {/* 🎙️ Header & Studio Recording Stage */}
            <div style={{
              background: '#ffffff',
              borderRadius: '20px',
              padding: isMobileOrSim ? '12px 14px' : '14px 18px',
              border: '1.5px solid #e2e8f0',
              boxShadow: '0 4px 18px -2px rgba(15, 23, 42, 0.05)',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '13px',
                    background: 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)',
                    color: '#ef4444',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 3px 10px rgba(239, 68, 68, 0.2)',
                    flexShrink: 0
                  }}>
                    <Mic size={20} strokeWidth={2.4} />
                  </div>
                  <div>
                    <h2 style={{ margin: 0, fontSize: '1.18rem', fontWeight: 950, color: '#0f172a', letterSpacing: '-0.02em', lineHeight: 1.15 }}>
                      {isTeacherMode ? 'Studio-Aufnahmen' : 'Vinyl-Aufnahmestudio'}
                    </h2>
                    <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 650 }}>
                      1-Tap Aufnahme & Vorbilder
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{
                    fontSize: '0.70rem',
                    fontWeight: 850,
                    color: '#6d28d9',
                    background: '#f5f3ff',
                    border: '1px solid #ddd6fe',
                    padding: '4px 10px',
                    borderRadius: '100px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}>
                    <Headphones size={12} color="#6d28d9" />
                    <span>{studentAudiosList.length} Takes</span>
                  </span>
                </div>
              </div>

              {/* 🔴 One-Tap Recording Console */}
              {!isRecordingAudio ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', position: 'relative' }}>
                    {recordCountInRemaining !== null && recordCountInRemaining !== undefined ? (
                      <div style={{
                        flex: 1,
                        height: '48px',
                        background: recordCountInMode === 'metronome'
                          ? 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)'
                          : 'linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%)',
                        border: recordCountInMode === 'metronome' ? '2px solid #ef4444' : '2px solid #8b5cf6',
                        borderRadius: '14px',
                        padding: '4px 12px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        boxShadow: recordCountInMode === 'metronome'
                          ? '0 3px 12px rgba(239, 68, 68, 0.2)'
                          : '0 3px 12px rgba(139, 92, 246, 0.2)',
                        boxSizing: 'border-box'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '50%',
                            background: recordCountInMode === 'metronome'
                              ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)'
                              : 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
                            color: '#ffffff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 950,
                            fontSize: '1.10rem',
                            boxShadow: '0 2px 6px rgba(0,0,0,0.12)'
                          }}>
                            {recordCountInRemaining}
                          </div>
                          <div>
                            <div style={{
                              fontSize: '0.78rem',
                              fontWeight: 950,
                              color: recordCountInMode === 'metronome' ? '#991b1b' : '#5b21b6'
                            }}>
                              {recordCountInMode === 'metronome' ? `Einzählen (${recordingBpm} BPM)...` : 'Bereit machen...'}
                            </div>
                            <div style={{
                              fontSize: '0.64rem',
                              fontWeight: 700,
                              color: recordCountInMode === 'metronome' ? '#b91c1c' : '#7c3aed',
                              opacity: 0.9
                            }}>
                              {recordCountInMode === 'metronome' ? 'Klick wird mit aufgenommen' : 'Instrument ansetzen • Startet gleich!'}
                            </div>
                          </div>
                        </div>
                        {cancelActiveRecordCountIn && (
                          <button
                            type="button"
                            onClick={cancelActiveRecordCountIn}
                            style={{
                              background: '#ffffff',
                              border: recordCountInMode === 'metronome' ? '1px solid #fca5a5' : '1px solid #ddd6fe',
                              borderRadius: '8px',
                              color: recordCountInMode === 'metronome' ? '#b91c1c' : '#6d28d9',
                              padding: '4px 8px',
                              fontSize: '0.68rem',
                              fontWeight: 850,
                              cursor: 'pointer'
                            }}
                            className="hover-scale-mini"
                            title="Abbrechen"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={startRecordingAudio}
                        disabled={isUploadingAudio}
                        style={{
                          flex: 1,
                          height: '48px',
                          background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                          color: '#ffffff',
                          border: 'none',
                          borderRadius: '14px',
                          padding: '8px 16px',
                          fontSize: '0.90rem',
                          fontWeight: 950,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '8px',
                          boxShadow: '0 4px 14px rgba(239, 68, 68, 0.3)',
                          transition: 'all 0.15s ease'
                        }}
                        className="hover-scale"
                      >
                        <Mic size={18} strokeWidth={2.8} />
                        <span>Jetzt aufnehmen</span>
                      </button>
                    )}

                    {/* 🎛️ Instrumenten-PAD Schalter */}
                    <button
                      type="button"
                      onClick={handleTogglePad}
                      aria-label={effectivePadActive ? "Instrumenten-PAD aktiv (-6 dB)" : "Instrumenten-PAD inaktiv"}
                      title={effectivePadActive ? "PAD aktiv: -6 dB Headroom für laute Instrumente" : "PAD: -6 dB Dämpfung zuschalten"}
                      style={{
                        background: effectivePadActive ? '#0f172a' : '#ffffff',
                        border: effectivePadActive ? '1.5px solid #0f172a' : '1.5px solid #cbd5e1',
                        color: effectivePadActive ? '#ffffff' : '#64748b',
                        borderRadius: '14px',
                        width: '48px',
                        height: '48px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        flexShrink: 0
                      }}
                      className="hover-scale-mini"
                    >
                      <SlidersHorizontal size={18} color={effectivePadActive ? '#ffffff' : '#64748b'} strokeWidth={effectivePadActive ? 2.4 : 2} />
                    </button>

                    {/* ⏱️ Metronom Button */}
                    <button
                      type="button"
                      onClick={() => setShowRecordingMetronomePopup(prev => !prev)}
                      style={{
                        background: isRecordingMetronomeActive ? '#dcfce7' : '#ffffff',
                        border: isRecordingMetronomeActive ? '1.5px solid #16a34a' : '1.5px solid #cbd5e1',
                        color: isRecordingMetronomeActive ? '#15803d' : '#64748b',
                        borderRadius: '14px',
                        width: '48px',
                        height: '48px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        flexShrink: 0
                      }}
                      className="hover-scale-mini"
                      title={isRecordingMetronomeActive ? `Klick aktiv (${recordingBpm} BPM)` : 'Klick / Metronom einstellen'}
                    >
                      <MechanicalMetronomeIcon size={18} color={isRecordingMetronomeActive ? "#15803d" : "#64748b"} strokeWidth={isRecordingMetronomeActive ? 2.4 : 2} />
                    </button>

                    {/* Metronome Popup */}
                    {showRecordingMetronomePopup && (
                      <div
                        ref={recordingMetronomeRef}
                        onClick={(e) => e.stopPropagation()}
                        style={{
                          position: 'absolute',
                          top: '100%',
                          right: 0,
                          marginTop: '8px',
                          background: '#ffffff',
                          borderRadius: '16px',
                          border: '1.5px solid #cbd5e1',
                          boxShadow: '0 16px 36px -4px rgba(15, 23, 42, 0.22)',
                          padding: '12px 14px',
                          width: '240px',
                          zIndex: 1000,
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '10px'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '0.78rem', fontWeight: 900, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <MechanicalMetronomeIcon size={14} color="#16a34a" />
                            <span>Klick / Metronom</span>
                          </span>
                          <button type="button" onClick={() => setShowRecordingMetronomePopup(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
                            <X size={13} />
                          </button>
                        </div>
                        <button
                          type="button"
                          onClick={() => { const next = !isRecordingMetronomeActive; setIsRecordingMetronomeActive(next); if (next) playMetronomeTick(true); }}
                          style={{ width: '100%', background: isRecordingMetronomeActive ? '#16a34a' : '#f1f5f9', color: isRecordingMetronomeActive ? '#ffffff' : '#475569', border: 'none', borderRadius: '8px', padding: '6px', fontSize: '0.74rem', fontWeight: 850, cursor: 'pointer' }}
                        >
                          {isRecordingMetronomeActive ? '✓ Klick aktiv' : 'Klick einschalten'}
                        </button>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.70rem', fontWeight: 800, color: '#475569' }}>
                            <span>Tempo</span>
                            <span style={{ color: '#16a34a', fontWeight: 900 }}>{recordingBpm} BPM</span>
                          </div>
                          <input type="range" min="40" max="240" value={recordingBpm} onChange={(e) => setRecordingBpm(parseInt(e.target.value, 10))} style={{ accentColor: '#16a34a', cursor: 'pointer' }} />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Post-Take Micro Bar */}
                  {justRecordedAudioLabel && (
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '8px',
                      background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
                      border: '1.5px solid #86efac',
                      borderRadius: '12px',
                      padding: '6px 10px',
                      color: '#15803d'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
                        <Check size={14} strokeWidth={3} />
                        <span style={{ fontSize: '0.74rem', fontWeight: 900, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          Gesichert: „{justRecordedAudioLabel}“
                        </span>
                      </div>
                      {justRecordedAudioUrl && (
                        <button
                          type="button"
                          onClick={() => toggleFavoriteAudio(justRecordedAudioUrl)}
                          style={{ background: '#ffffff', border: '1px solid #bbf7d0', color: favoriteAudioUrls?.includes(justRecordedAudioUrl) ? '#d97706' : '#15803d', borderRadius: '99px', padding: '2px 8px', fontSize: '0.66rem', fontWeight: 850, cursor: 'pointer' }}
                          className="hover-scale-mini"
                        >
                          <Star size={10} fill={favoriteAudioUrls?.includes(justRecordedAudioUrl) ? '#f59e0b' : 'none'} color={favoriteAudioUrls?.includes(justRecordedAudioUrl) ? '#f59e0b' : '#15803d'} />
                          <span>Favorit</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                /* Live Active Recording Stage */
                <div style={{
                  width: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  padding: '12px 14px',
                  borderRadius: '14px',
                  background: 'linear-gradient(180deg, #fef2f2 0%, #fff1f2 100%)',
                  border: '2px solid #fecdd3',
                  boxSizing: 'border-box'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ef4444', display: 'inline-block' }} />
                      <span style={{ fontSize: '0.80rem', fontWeight: 950, color: '#991b1b' }}>AUFNAHME LÄUFT</span>
                    </div>
                    <div style={{ fontSize: '0.80rem', fontWeight: 950, color: '#dc2626', background: '#ffffff', padding: '2px 6px', borderRadius: '100px', border: '1px solid #fecdd3' }}>
                      {formatRecordTime(audioDuration)}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', width: '100%' }}>
                    <button
                      type="button"
                      onClick={() => stopRecordingAudio()}
                      style={{ flex: 1, height: '42px', background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)', color: '#ffffff', border: 'none', borderRadius: '10px', fontSize: '0.84rem', fontWeight: 950, cursor: 'pointer' }}
                      className="hover-scale"
                    >
                      Stopp & Take sichern
                    </button>
                    {handleRetakeRecordingAudio && (
                      <button
                        type="button"
                        onClick={handleRetakeRecordingAudio}
                        style={{ height: '42px', background: '#ffffff', border: '1px solid #fca5a5', color: '#b91c1c', borderRadius: '10px', padding: '0 10px', fontSize: '0.78rem', fontWeight: 850, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                        className="hover-scale-mini"
                        title="Neu aufnehmen"
                      >
                        <RotateCcw size={13} strokeWidth={2.4} />
                        <span>Nochmal</span>
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* 🔍 Suchergebnisse (falls Suche aktiv) */}
            {isSearching && (
              <div style={{ background: '#ffffff', borderRadius: '18px', padding: '14px', border: '1.5px solid #cbd5e1', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <span style={{ fontSize: '0.80rem', fontWeight: 900, color: '#1e293b' }}>
                  🔍 Suche: „{recordingSearchQuery}“ ({searchFilteredTeacherTakes.length + searchFilteredStudentTakes.length} Treffer)
                </span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {searchFilteredTeacherTakes.map((aud, i) => renderTeacherPlayer(aud, `search-t-${i}`))}
                  {searchFilteredStudentTakes.map((aud, i) => renderStudentPlayer(aud, `search-s-${i}`))}
                </div>
              </div>
            )}

            {/* 🎧 Meine Studio-Aufnahmen (Schüler-Takes Fokus) */}
            <div style={{
              background: '#ffffff',
              borderRadius: '18px',
              padding: '12px 14px',
              border: '1.5px solid #e2e8f0',
              boxShadow: '0 2px 10px rgba(15, 23, 42, 0.03)',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Headphones size={15} color="#475569" strokeWidth={2.4} />
                  <span style={{ fontSize: '0.84rem', fontWeight: 950, color: '#1e293b' }}>
                    Meine Studio-Aufnahmen
                  </span>
                </div>
                <span style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 750 }}>
                  {studentAudiosList.length > 4 ? `Letzte 4 von ${studentAudiosList.length} Takes` : `${studentAudiosList.length} Takes gesamt`}
                </span>
              </div>

              {studentAudiosList.length === 0 ? (
                <div style={{
                  padding: '20px 14px',
                  textAlign: 'center',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '8px',
                  background: 'linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%)',
                  borderRadius: '14px',
                  border: '1.5px dashed #cbd5e1'
                }}>
                  <div style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#64748b',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.03)'
                  }}>
                    <Disc size={18} strokeWidth={2} />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.82rem', fontWeight: 900, color: '#334155' }}>
                      Dein Studio ist bereit
                    </div>
                    <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600, marginTop: '2px', lineHeight: 1.35 }}>
                      Tippe oben auf „Jetzt aufnehmen“, um deinen ersten Take einzuspielen!
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {studentAudiosList.slice(0, 4).map((aud, idx) => (
                    <div key={`student-take-${aud.id || aud.url || idx}`}>
                      {renderStudentPlayer(aud, `student-take-item-${idx}`, false)}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ===================================================================== */}
          {/* RECHTE SPALTE: 💽 VINYL-PLATTENREGAL (5 EINZEL-LPS + 12 MONATS-LPS)   */}
          {/* ===================================================================== */}
          <div style={{
            background: '#ffffff',
            borderRadius: '20px',
            padding: isMobileOrSim ? '12px 10px' : '14px 16px',
            border: '1.5px solid #e2e8f0',
            boxShadow: '0 4px 18px -2px rgba(15, 23, 42, 0.05)',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}>
            {/* 1. DIE 5 KURATIERTEN EINZEL-LPS */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '0.92rem', fontWeight: 950, color: '#0f172a', letterSpacing: '-0.01em' }}>
                    Kuratierte Vinyl-LPs
                  </h3>
                  <span style={{ fontSize: '0.70rem', color: '#64748b', fontWeight: 600 }}>
                    Favoriten, Übe-Begleiter, Loops, Duette & Für Lehrer
                  </span>
                </div>
              </div>

              <div style={{
                display: 'grid',
                gridTemplateColumns: isMobileOrSim ? 'repeat(2, 1fr)' : 'repeat(5, 1fr)',
                gap: '8px',
                justifyItems: 'center'
              }}>
                <VinylRecordCover
                  title={singleLpsData.favorites.title}
                  badge={singleLpsData.favorites.badge}
                  theme={singleLpsData.favorites.theme}
                  icon={singleLpsData.favorites.icon}
                  totalCount={singleLpsData.favorites.totalCount}
                  onClick={() => setActiveSharedAlbum({
                    type: 'favorites',
                    title: 'Favoriten',
                    subtitle: 'Eure gemeinsamen Highlights',
                    badge: singleLpsData.favorites.badge,
                    theme: singleLpsData.favorites.theme,
                    icon: singleLpsData.favorites.icon
                  })}
                />

                <VinylRecordCover
                  title={singleLpsData.practice.title}
                  badge={singleLpsData.practice.badge}
                  theme={singleLpsData.practice.theme}
                  icon={singleLpsData.practice.icon}
                  totalCount={singleLpsData.practice.totalCount}
                  onClick={() => setActiveSharedAlbum({
                    type: 'practice',
                    title: 'Übe-Begleiter',
                    subtitle: 'Play-Alongs & Tempo-Trainer',
                    badge: singleLpsData.practice.badge,
                    theme: singleLpsData.practice.theme,
                    icon: singleLpsData.practice.icon
                  })}
                />

                <VinylRecordCover
                  title={singleLpsData.loops.title}
                  badge={singleLpsData.loops.badge}
                  theme={singleLpsData.loops.theme}
                  icon={singleLpsData.loops.icon}
                  totalCount={singleLpsData.loops.totalCount}
                  onClick={() => setActiveSharedAlbum({
                    type: 'loops',
                    title: 'Loops & Grooves',
                    subtitle: 'Endlose Riffs & Licks',
                    badge: singleLpsData.loops.badge,
                    theme: singleLpsData.loops.theme,
                    icon: singleLpsData.loops.icon
                  })}
                />

                <VinylRecordCover
                  title={singleLpsData.duet.title}
                  badge={singleLpsData.duet.badge}
                  theme={singleLpsData.duet.theme}
                  icon={singleLpsData.duet.icon}
                  totalCount={singleLpsData.duet.totalCount}
                  onClick={() => setActiveSharedAlbum({
                    type: 'duet',
                    title: 'Duette & Mehrspur',
                    subtitle: 'Zusammenspiel & Play-Alongs',
                    badge: singleLpsData.duet.badge,
                    theme: singleLpsData.duet.theme,
                    icon: singleLpsData.duet.icon
                  })}
                />

                <VinylRecordCover
                  title={singleLpsData.forTeacher.title}
                  badge={singleLpsData.forTeacher.badge}
                  theme={singleLpsData.forTeacher.theme}
                  icon={singleLpsData.forTeacher.icon}
                  totalCount={singleLpsData.forTeacher.totalCount}
                  onClick={() => setActiveSharedAlbum({
                    type: 'forTeacher',
                    title: 'Für Lehrer',
                    subtitle: 'Für den Unterricht freigegeben',
                    badge: singleLpsData.forTeacher.badge,
                    theme: singleLpsData.forTeacher.theme,
                    icon: singleLpsData.forTeacher.icon
                  })}
                />
              </div>
            </div>

            {/* 2. DIE 12 MONATS-LPS (4x3 Großformat in Schuljahres-Reihenfolge mit Uni-Farben) */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '4px' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '0.92rem', fontWeight: 950, color: '#0f172a', letterSpacing: '-0.01em' }}>
                    Schuljahr {currentSchoolYearLabel} • Monats-Chronik
                  </h3>
                  <span style={{ fontSize: '0.70rem', color: '#64748b', fontWeight: 600 }}>
                    12 Monats-Platten in Schuljahres-Reihenfolge ({startMonthName} – {endMonthName}) • 4×3 Studio-Regal
                  </span>
                </div>
                <div style={{
                  padding: '2px 8px',
                  borderRadius: '100px',
                  background: '#f1f5f9',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.66rem',
                  fontWeight: 800,
                  color: '#475569'
                }}>
                  {allMonthsList.reduce((acc, curr) => acc + curr.totalCount, 0)} Takes gesamt
                </div>
              </div>

              <div style={{
                display: 'grid',
                gridTemplateColumns: isMobileOrSim ? 'repeat(3, 1fr)' : 'repeat(4, 1fr)',
                gap: isMobileOrSim ? '8px 6px' : '8px 10px',
                justifyItems: 'center'
              }}>
                {allMonthsList.map((m) => {
                  const theme = getMonthlyMixedTheme(m.monthNumber);
                  return (
                    <VinylRecordCover
                      key={`month-lp-${m.monthKey}`}
                      variant="disc"
                      title={m.monthLabel.split(' ')[0]}
                      subtitle={`${m.year}`}
                      badge={`${m.totalCount} Takes`}
                      theme={theme}
                      monthNumber={m.monthNumber}
                      monthCode={m.monthCode}
                      totalCount={m.totalCount}
                      maxWidth="86px"
                      onClick={() => setActiveSharedAlbum({
                        type: 'month',
                        variant: 'disc',
                        title: m.monthLabel,
                        subtitle: `${m.teacherCount} Lehrkraft • ${m.studentCount} Schüler`,
                        badge: `${m.totalCount} Takes`,
                        theme,
                        icon: <Calendar size={18} color={theme.accentColor || theme.textColor || '#0f172a'} strokeWidth={2.4} />,
                        monthKey: m.monthKey,
                        monthNumber: m.monthNumber,
                        monthCode: m.monthCode
                      })}
                    />
                  );
                })}
              </div>
            </div>

            {/* 3. SONGS & LEHRWERKE */}
            {songAlbumsList.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '0.94rem', fontWeight: 950, color: '#0f172a', letterSpacing: '-0.01em' }}>
                    Songs & Lehrwerke
                  </h3>
                </div>

                <div style={{
                  display: 'grid',
                  gridTemplateColumns: isMobileOrSim ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)',
                  gap: '12px',
                  justifyItems: 'center'
                }}>
                  {songAlbumsList.map((s, sIdx) => {
                    const totalSongTakes = s.teacherTakes.length + s.studentTakes.length;
                    return (
                      <VinylRecordCover
                        key={`song-lp-${sIdx}`}
                        title={s.songTitle}
                        badge={`${totalSongTakes} Takes`}
                        theme={{
                          bg: '#f8fafc',
                          shadow: 'rgba(15, 23, 42, 0.04)',
                          border: '#cbd5e1',
                          textColor: '#1e293b'
                        }}
                        icon={<Music size={16} color="#4f46e5" strokeWidth={2.4} />}
                        totalCount={totalSongTakes}
                        onClick={() => setActiveSharedAlbum({
                          type: 'song',
                          title: s.songTitle,
                          subtitle: `${s.teacherTakes.length} Lehrkraft • ${s.studentTakes.length} Schüler`,
                          badge: `${totalSongTakes} Takes`,
                          theme: { bg: '#f8fafc', shadow: 'rgba(15, 23, 42, 0.04)', border: '#cbd5e1', textColor: '#1e293b' },
                          icon: <Music size={18} color="#4f46e5" strokeWidth={2.4} />,
                          songTitle: s.songTitle
                        })}
                      />
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* ========================================================================= */
        /* 2. VIEW B: GEÖFFNETE LP-HÖRSTATION (activeSharedAlbum !== null)           */
        /* ========================================================================= */
        <div style={{
          width: '100%',
          maxWidth: '1280px',
          margin: '0 auto',
          padding: isMobileOrSim
            ? '14px 12px calc(var(--bottom-bar-height, 68px) + env(safe-area-inset-bottom) + 32px) 12px'
            : '24px 28px',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px',
          boxSizing: 'border-box'
        }}>
          {/* Header Bar with Back-Button & Album Title */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
            background: '#ffffff',
            borderRadius: '24px',
            padding: '16px 20px',
            border: '1.5px solid #e2e8f0',
            boxShadow: '0 4px 16px rgba(0,0,0,0.04)'
          }}>
            <button
              type="button"
              onClick={() => setActiveSharedAlbum(null)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '9px 16px',
                borderRadius: '100px',
                background: '#f1f5f9',
                border: '1px solid #cbd5e1',
                color: '#334155',
                fontWeight: 850,
                fontSize: '0.82rem',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
              className="hover-scale-mini"
            >
              <ArrowLeft size={16} />
              <span>← Alle LPs</span>
            </button>

            {/* Album Hero Info with Vinyl Disc */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <VinylRecordCover
                title=""
                size="large"
                isActive={true}
                variant={activeSharedAlbum.variant || (activeSharedAlbum.type === 'month' ? 'disc' : 'vivid')}
                theme={activeSharedAlbum.theme}
                icon={activeSharedAlbum.icon}
                monthNumber={activeSharedAlbum.monthNumber}
                monthCode={activeSharedAlbum.monthCode}
                onClick={() => setActiveSharedAlbum(null)}
              />
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '0.70rem', fontWeight: 900, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Vinyl-Hörstation
                </span>
                <h2 style={{ margin: '2px 0 0', fontSize: isMobileOrSim ? '1.20rem' : '1.45rem', fontWeight: 950, color: '#0f172a', letterSpacing: '-0.02em', lineHeight: 1.15 }}>
                  {activeSharedAlbum.title}
                </h2>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                  <span style={{
                    fontSize: '0.72rem',
                    fontWeight: 850,
                    color: '#15803d',
                    background: '#dcfce7',
                    border: '1px solid #bbf7d0',
                    padding: '2px 8px',
                    borderRadius: '100px'
                  }}>
                    {activeTeacherTakes.length} Lehrkraft
                  </span>
                  <span style={{
                    fontSize: '0.72rem',
                    fontWeight: 850,
                    color: '#6d28d9',
                    background: '#ede9fe',
                    border: '1px solid #ddd6fe',
                    padding: '2px 8px',
                    borderRadius: '100px'
                  }}>
                    {activeStudentTakes.length} Schüler
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Synchroner A/B Hörvergleich ganz oben im Album */}
          {activeTeacherTakes.length > 0 && activeStudentTakes.length > 0 && (
            <div style={{ background: '#ffffff', borderRadius: '18px', padding: '14px 18px', border: '1.5px solid #e0e7ff', boxShadow: '0 2px 10px rgba(99, 102, 241, 0.05)' }}>
              <div style={{ fontSize: '0.76rem', fontWeight: 900, color: '#4338ca', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Headphones size={14} color="#6366f1" />
                <span>Synchroner A/B-Hörvergleich für dieses Album</span>
              </div>
              <AbAudioComparisonBar
                teacherAudio={{ url: activeTeacherTakes[0].url, label: activeTeacherTakes[0].label, duration: activeTeacherTakes[0].duration }}
                studentAudio={{ url: activeStudentTakes[0].url, label: activeStudentTakes[0].label, duration: activeStudentTakes[0].duration }}
              />
            </div>
          )}

          {/* 44px Segmented Touch Switcher for Mobile */}
          {isMobileOrSim && (
            <div style={{
              display: 'flex',
              background: '#f1f5f9',
              borderRadius: '100px',
              padding: '3px',
              width: '100%',
              height: '44px',
              boxSizing: 'border-box',
              gap: '4px'
            }}>
              <button
                type="button"
                onClick={() => setMobileRecordingsTab('teacher')}
                style={{
                  flex: 1,
                  height: '38px',
                  borderRadius: '100px',
                  border: 'none',
                  background: mobileRecordingsTab === 'teacher' ? '#ffffff' : 'transparent',
                  color: mobileRecordingsTab === 'teacher' ? '#15803d' : '#64748b',
                  fontWeight: 850,
                  fontSize: '0.78rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  boxShadow: mobileRecordingsTab === 'teacher' ? '0 2px 8px rgba(0,0,0,0.1)' : 'none'
                }}
              >
                <Mic size={14} color={mobileRecordingsTab === 'teacher' ? '#15803d' : '#64748b'} />
                <span>Lehrkraft ({activeTeacherTakes.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setMobileRecordingsTab('student')}
                style={{
                  flex: 1,
                  height: '38px',
                  borderRadius: '100px',
                  border: 'none',
                  background: mobileRecordingsTab === 'student' ? '#ffffff' : 'transparent',
                  color: mobileRecordingsTab === 'student' ? '#6d28d9' : '#64748b',
                  fontWeight: 850,
                  fontSize: '0.78rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  boxShadow: mobileRecordingsTab === 'student' ? '0 2px 8px rgba(0,0,0,0.1)' : 'none'
                }}
              >
                <Star size={14} color={mobileRecordingsTab === 'student' ? '#6d28d9' : '#64748b'} />
                <span>Deine Takes ({activeStudentTakes.length})</span>
              </button>
            </div>
          )}

          {/* ⚖️ 2-SPALTEN-DECK (Desktop 50:50 / Mobile tab-gesteuert) */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: isMobileOrSim ? '1fr' : '1fr 1fr',
            gap: '20px',
            alignItems: 'start'
          }}>
            {/* LINKE SPALTE: 🎙️ AUFNAHMEN DER LEHRKRAFT */}
            <div style={{
              display: isMobileOrSim ? (mobileRecordingsTab === 'teacher' ? 'flex' : 'none') : 'flex',
              flexDirection: 'column',
              gap: '12px',
              background: '#ffffff',
              borderRadius: '20px',
              padding: isMobileOrSim ? '16px 14px' : '20px',
              border: '1.5px solid #dcfce7',
              boxShadow: '0 4px 16px rgba(21, 128, 61, 0.04)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', paddingBottom: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '10px', background: '#dcfce7', color: '#15803d', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Mic size={16} strokeWidth={2.4} />
                  </div>
                  <div>
                    <span style={{ fontSize: '0.68rem', fontWeight: 900, color: '#15803d', textTransform: 'uppercase' }}>Vom Unterricht</span>
                    <h4 style={{ margin: 0, fontSize: '0.94rem', fontWeight: 900, color: '#0f172a' }}>
                      Vorbilder der Lehrkraft ({activeTeacherTakes.length})
                    </h4>
                  </div>
                </div>
              </div>

              {activeTeacherTakes.length === 0 ? (
                <div style={{ padding: '36px 16px', textAlign: 'center', color: '#94a3b8' }}>
                  <p style={{ fontWeight: 800, fontSize: '0.84rem', margin: '0 0 4px', color: '#475569' }}>Keine Vorbilder in diesem Album</p>
                  <p style={{ fontSize: '0.74rem', margin: 0 }}>Aufnahmen deiner Lehrkraft für dieses Thema werden hier automatisch abgelegt.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {activeTeacherTakes.map((aud, idx) => renderTeacherPlayer(aud, `album-teacher-${idx}`))}
                </div>
              )}
            </div>

            {/* RECHTE SPALTE: ⭐ DEINE AUFNAHMEN (SCHÜLER) */}
            <div style={{
              display: isMobileOrSim ? (mobileRecordingsTab === 'student' ? 'flex' : 'none') : 'flex',
              flexDirection: 'column',
              gap: '12px',
              background: '#ffffff',
              borderRadius: '20px',
              padding: isMobileOrSim ? '16px 14px' : '20px',
              border: '1.5px solid #ede9fe',
              boxShadow: '0 4px 16px rgba(109, 40, 217, 0.04)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', paddingBottom: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '10px', background: '#ede9fe', color: '#7c3aed', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Star size={16} strokeWidth={2.4} />
                  </div>
                  <div>
                    <span style={{ fontSize: '0.68rem', fontWeight: 900, color: '#6d28d9', textTransform: 'uppercase' }}>Dein Übe-Studio</span>
                    <h4 style={{ margin: 0, fontSize: '0.94rem', fontWeight: 900, color: '#0f172a' }}>
                      Deine Takes ({activeStudentTakes.length})
                    </h4>
                  </div>
                </div>

                {/* 1-Tap Record Button direkt für dieses Album */}
                {!isTeacherMode && !isRecordingAudio && recordCountInRemaining === null && (
                  <button
                    type="button"
                    onClick={() => startRecordingAudio(undefined, activeSharedAlbum.title)}
                    style={{
                      background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '100px',
                      padding: '6px 12px',
                      fontSize: '0.74rem',
                      fontWeight: 850,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      boxShadow: '0 2px 8px rgba(239, 68, 68, 0.25)'
                    }}
                    className="hover-scale-mini"
                  >
                    <Mic size={12} strokeWidth={2.4} />
                    <span>+ Neuer Take</span>
                  </button>
                )}
              </div>

              {activeStudentTakes.length === 0 ? (
                <div style={{ padding: '36px 16px', textAlign: 'center', color: '#94a3b8' }}>
                  <p style={{ fontWeight: 800, fontSize: '0.84rem', margin: '0 0 4px', color: '#475569' }}>Noch keine eigenen Takes eingespielt</p>
                  <p style={{ fontSize: '0.74rem', margin: '0 0 12px' }}>Tippe auf „Neuer Take“, um deine erste Aufnahme für dieses Album zu sichern!</p>
                  {!isTeacherMode && !isRecordingAudio && recordCountInRemaining === null && (
                    <button
                      type="button"
                      onClick={() => startRecordingAudio(undefined, activeSharedAlbum.title)}
                      style={{
                        background: '#6d28d9',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '12px',
                        padding: '8px 16px',
                        fontSize: '0.78rem',
                        fontWeight: 850,
                        cursor: 'pointer'
                      }}
                      className="hover-scale-mini"
                    >
                      Jetzt Take aufnehmen
                    </button>
                  )}
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {activeStudentTakes.map((aud, idx) => renderStudentPlayer(aud, `album-student-${idx}`))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 👥 Synchronous Teacher-Student Duett-Deck Modal */}
      {duettModalData && (
        <DuettDeckModal
          isOpen={Boolean(duettModalData)}
          onClose={() => setDuettModalData(null)}
          teacherAudioUrl={duettModalData.teacherUrl}
          teacherTitle={duettModalData.teacherTitle}
          teacherBpm={duettModalData.teacherBpm}
          songTag={duettModalData.songTag}
          studentId={student.id}
          schoolId={student.school_id}
          studentFirstName={studentFirstName}
          onSaveStudentTake={() => {
            setLocalJuniorRecordingsTrigger(prev => prev + 1);
          }}
        />
      )}
    </div>
  );
}
