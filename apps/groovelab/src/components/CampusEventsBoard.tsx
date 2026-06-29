import React, { useState, useEffect, useRef } from 'react';
import { 
  Calendar, 
  Plus, 
  Trash2, 
  Clock, 
  MapPin, 
  Users, 
  Music, 
  Globe, 
  Lock, 
  Settings, 
  Filter, 
  Check, 
  X, 
  AlertCircle, 
  Info, 
  CalendarDays,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  Palmtree,
  Building2,
  ExternalLink,
  Eye,
  Edit3,
  CalendarPlus,
  Maximize2,
  Minimize2,
  Minus,
  Search
} from 'lucide-react';

interface CampusEventsBoardProps {
  userId: string;
  role: 'student' | 'teacher' | 'admin' | 'secretary';
  schoolId: string;
  supabase: any;
  brandColor: string;
}

interface LessonOccurrence {
  id: string;
  schedule_id?: string;
  student_id?: string;
  teacher_id?: string;
  date: string;
  start_time: string;
  duration: number;
  status: 'scheduled' | 'pending_reschedule' | 'rescheduled_confirmed' | 'cancelled' | 'canceled_by_student' | 'teacher_sick' | 'canceled_by_teacher_sick';
  is_virtual?: boolean;
  teacher?: { first_name: string; last_name: string };
  student?: { first_name: string; last_name: string };
  schedule?: { room?: string };
}

interface Song {
  title: string;
  artist: string;
  composer: string;
  arranger: string;
}

interface CampusEvent {
  id: string;
  school_id: string;
  title: string;
  description?: string;
  event_date: string;
  event_end_date?: string;
  start_time: string;
  end_time?: string;
  category: string;
  created_by: string;
  is_public?: boolean;
  created_at?: string;
  location_type?: 'none' | 'intern' | 'extern';
  room_id?: string;
  location_extern?: string;
  room?: { id: string; name: string };
  assigned_student_ids?: string[];
  student_id?: string;
  is_subscribed?: boolean;
  isSubscribed?: boolean;
  ensemble_id?: string;
  band_id?: string;
  color?: string;
  visibility?: 'all' | 'teachers' | 'students' | 'private';
  stage_count?: number;
  total_duration?: number;
  program_duration?: number;
  songs?: Song[];
  location?: string;
  location_address?: string;
  admission_time?: string;
  event_start_time?: string;
  audience_count?: number;
  event_description?: string;
  budget?: number;
  responsible_program?: string;
  responsible_tech?: string;
  responsible_coordination?: string;
  planning_status?: 'planung' | 'bestaetigt' | 'laufend' | 'abgeschlossen';
  is_planning_active?: boolean;
  submission_deadline?: string;
  no_submission_teacher_ids?: string[];
}

const formatToLocalDatetime = (isoString: string | null | undefined): string => {
  if (!isoString) return '';
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return '';
  
  const pad = (n: number) => String(n).padStart(2, '0');
  const yyyy = date.getFullYear();
  const MM = pad(date.getMonth() + 1);
  const dd = pad(date.getDate());
  const hh = pad(date.getHours());
  const mm = pad(date.getMinutes());
  
  return `${yyyy}-${MM}-${dd}T${hh}:${mm}`;
};

export function CampusEventsBoard({ userId, role, schoolId, supabase, brandColor }: CampusEventsBoardProps) {
  // Tabs for Column 1 (My Lessons)
  const [lessonTab, setLessonTab] = useState<'upcoming' | 'past'>('upcoming');

  // Tabs for Column 3 (Event-Planung)
  const [planningEventTab, setPlanningEventTab] = useState<'upcoming' | 'past'>('upcoming');

  // Expanded/Collapsed months state for Column 1
  const [expandedMonths, setExpandedMonths] = useState<Record<string, boolean>>({});

  // Filter for Column 2 (School / Subscribed Events Timeline)
  const [eventFilter, setEventFilter] = useState<'all' | 'subscribed' | 'custom'>('all');
  const [isDragOverPlanning, setIsDragOverPlanning] = useState(false);

  // --- M5 Drag-and-Drop Board & Conflict Prevention ---
  const [activeStage, setActiveStage] = useState<number>(1);
  const [dbConflicts, setDbConflicts] = useState<{ program_point_id: string; conflict_type: string; conflict_message: string }[]>([]);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [dragOverPosition, setDragOverPosition] = useState<'above' | 'below' | null>(null);
  const [isManualEntryModalOpen, setIsManualEntryModalOpen] = useState(false);
  const [manualTitle, setManualTitle] = useState('');
  const [manualEnsemble, setManualEnsemble] = useState('');
  const [manualTeacherId, setManualTeacherId] = useState('');
  const [manualInstrument, setManualInstrument] = useState('');
  const [manualDuration, setManualDuration] = useState('');
  const [manualPreferredTime, setManualPreferredTime] = useState('');
  const [manualPerformerCount, setManualPerformerCount] = useState('1');
  const [manualSongs, setManualSongs] = useState<Song[]>([]);
  const [manualSongTitle, setManualSongTitle] = useState('');
  const [manualSongArtist, setManualSongArtist] = useState('');
  const [manualSongComposer, setManualSongComposer] = useState('');
  const [manualSongArranger, setManualSongArranger] = useState('');
  const [techViewMode, setTechViewMode] = useState<'single' | 'all'>('single');
  const [eventDayLessons, setEventDayLessons] = useState<any[]>([]);
  const [eventSubmissionDeadline, setEventSubmissionDeadline] = useState('');

  // Core Data States
  const [lessons, setLessons] = useState<LessonOccurrence[]>([]);
  const [customEvents, setCustomEvents] = useState<CampusEvent[]>([]);
  const [subscribedEvents, setSubscribedEvents] = useState<any[]>([]);
  const [calendarUrl, setCalendarUrl] = useState<string>('');
  const [icalActive, setIcalActive] = useState<boolean>(true);
  
  // Loaders
  const [loadingLessons, setLoadingLessons] = useState(true);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [loadingCalendar, setLoadingCalendar] = useState(false);
  const [calendarError, setCalendarError] = useState<string | null>(null);

  // Form State for creating custom events (Column 3)
  const [formTitle, setFormTitle] = useState('');
  const [formDate, setFormDate] = useState('');
  const [formStartTime, setFormStartTime] = useState('');
  const [formEndTime, setFormEndTime] = useState('');
  const [formCategory, setFormCategory] = useState('Sonstiges');
  const [formDescription, setFormDescription] = useState('');
  const [formIsPublic, setFormIsPublic] = useState(false);
  const [formColor, setFormColor] = useState('');
  const [formVisibility, setFormVisibility] = useState<'all' | 'teachers' | 'students' | 'private'>('all');
  const [submittingForm, setSubmittingForm] = useState(false);

  // Smart search state for Schüler / Ensembles & Bands
  const [participantQuery, setParticipantQuery] = useState('');
  const [participantResults, setParticipantResults] = useState<{id: string; name: string; type: 'student' | 'ensemble' | 'band'; detail?: string}[]>([]);
  const [selectedParticipants, setSelectedParticipants] = useState<{id: string; name: string; type: 'student' | 'ensemble' | 'band'; detail?: string}[]>([]);
  const [participantSearchOpen, setParticipantSearchOpen] = useState(false);
  const [participantLoading, setParticipantLoading] = useState(false);
  const participantSearchRef = useRef<HTMLDivElement>(null);
  const instrumentInputRef = useRef<HTMLInputElement>(null);
  const [myStudentIds, setMyStudentIds] = useState<string[]>([]);
  const [studentEnsembleIds, setStudentEnsembleIds] = useState<string[]>([]);



  // Location / Room state
  const [formLocationType, setFormLocationType] = useState<'none' | 'intern' | 'extern'>('none');
  const [formRoomId, setFormRoomId] = useState('');
  const [formLocationExtern, setFormLocationExtern] = useState('');
  const [schoolRooms, setSchoolRooms] = useState<{id: string; name: string; floor?: string}[]>([]);
  const [availableRooms, setAvailableRooms] = useState<{id: string; name: string; floor?: string}[]>([]);
  const [checkingRooms, setCheckingRooms] = useState(false);

  // Event Detail Modal (Column 2) — read-only; only visibility can be changed by admin/secretary
  const [selectedEvent, setSelectedEvent] = useState<any | null>(null);
  const [editVisibility, setEditVisibility] = useState<'all' | 'teachers' | 'students'>('all');
  const [savingVisibility, setSavingVisibility] = useState(false);

  // 1:1 Shoutbox States
  const [activeChatOcc, setActiveChatOcc] = useState<LessonOccurrence | null>(null);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [chatTypedMessage, setChatTypedMessage] = useState('');
  const [activeChatOccIds, setActiveChatOccIds] = useState<Set<string>>(new Set());
  const chatMessagesEndRef = useRef<HTMLDivElement>(null);

  // iCal Subscription States
  const [showIcalModal, setShowIcalModal] = useState(false);
  const [copied, setCopied] = useState(false);
  const [userQrToken, setUserQrToken] = useState<string>('');
  const [generatingToken, setGeneratingToken] = useState<boolean>(false);

  // Column 3: Infos der Verwaltung (campus_announcements)
  const [schoolAnnouncements, setSchoolAnnouncements] = useState<any[]>([]);
  const [showAnnForm, setShowAnnForm] = useState(false);
  const [annTitle, setAnnTitle] = useState('');
  const [annMessage, setAnnMessage] = useState('');
  const [annTarget, setAnnTarget] = useState<'all' | 'teachers' | 'students'>('all');
  const [submittingAnn, setSubmittingAnn] = useState(false);

  // --- Student specific Column 3: "Meine Events" ---
  const [studentProgramPoints, setStudentProgramPoints] = useState<any[]>([]);
  const [loadingStudentProgramPoints, setLoadingStudentProgramPoints] = useState(false);
  const [studentTab, setStudentTab] = useState<'upcoming' | 'past' | 'announcements'>('upcoming');
  const [selectedStudentEvent, setSelectedStudentEvent] = useState<any | null>(null);
  const [loadingSelectedStudentEventPoints, setLoadingSelectedStudentEventPoints] = useState(false);
  const [selectedEventAllPoints, setSelectedEventAllPoints] = useState<any[]>([]);


  // --- M3 Coordinator Panel & Teacher Submission States ---
  const showLessons = role === 'student' || role === 'teacher';
  const isAdminOrSecretary = role === 'admin' || role === 'secretary';

  // Toggle tab in Column 3 when no event is selected (Admins/Secretaries only)
  const [selectedSidebarTab, setSelectedSidebarTab] = useState<'koordination' | 'create'>('koordination');

  // Program points loaded for the selected event
  const [programPoints, setProgramPoints] = useState<any[]>([]);
  const [loadingProgramPoints, setLoadingProgramPoints] = useState(false);

  // States for event meta parameters
  const [stageCount, setStageCount] = useState<number>(1);
  const [totalDuration, setTotalDuration] = useState<string>('');
  const [programDuration, setProgramDuration] = useState<string>('');
  const [eventStatus, setEventStatus] = useState<'planung' | 'bestaetigt' | 'laufend' | 'abgeschlossen'>('planung');
  const [eventLocation, setEventLocation] = useState('');
  const [eventLocationAddress, setEventLocationAddress] = useState('');
  const [eventAdmissionTime, setEventAdmissionTime] = useState('');
  const [eventStartTime, setEventStartTime] = useState('');
  const [eventAudience, setEventAudience] = useState('');
  const [eventDescription, setEventDescription] = useState('');
  const [eventBudget, setEventBudget] = useState('');
  const [eventMainResponsible, setEventMainResponsible] = useState('');
  const [eventTechResponsible, setEventTechResponsible] = useState('');
  const [eventCoordResponsible, setEventCoordResponsible] = useState('');
  const [allUsers, setAllUsers] = useState<any[]>([]);

  const isMeEventResponsible = (ev: any) => {
    if (!ev) return false;
    const me = allUsers.find(u => u.id === userId);
    const myName = me ? `${me.first_name || ''} ${me.last_name || ''}`.trim() : '';
    if (!myName) return ev.created_by === userId;
    const nameLower = myName.toLowerCase();
    return ev.created_by === userId || 
      (ev.responsible_program && ev.responsible_program.toLowerCase() === nameLower) ||
      (ev.responsible_tech && ev.responsible_tech.toLowerCase() === nameLower) ||
      (ev.responsible_coordination && ev.responsible_coordination.toLowerCase() === nameLower);
  };
  const [admissionTimeError, setAdmissionTimeError] = useState('');
  const [expandedPoints, setExpandedPoints] = useState<Record<string, boolean>>({});
  const [isTimelineFullscreen, setIsTimelineFullscreen] = useState(false);

  // States for pause insertion
  const [pauseDuration, setPauseDuration] = useState<string>('');

  // States for additional feedback queries
  const [feedbackQuestion, setFeedbackQuestion] = useState<Record<string, string>>({}); // ppId -> question text
  const [expandedFeedbackForms, setExpandedFeedbackForms] = useState<Record<string, boolean>>({});

  // Coordinator active tab
  const [coordinatorTab, setCoordinatorTab] = useState<'eckdaten' | 'submissions' | 'timeline' | 'feedback' | 'tech' | 'export'>('eckdaten');

  // Submissions filter
  const [submissionsFilter, setSubmissionsFilter] = useState<'all' | 'submitted' | 'no_submission' | 'pending'>('all');
  const [collapsedTeachers, setCollapsedTeachers] = useState<Record<string, boolean>>({});
  const [expandedSubmissionDetails, setExpandedSubmissionDetails] = useState<Record<string, boolean>>({});
  const [selectedTeacherIdForSubmissions, setSelectedTeacherIdForSubmissions] = useState<string | null>(null);
  const [teacherSearchQuery, setTeacherSearchQuery] = useState('');
  const [teacherStatusFilter, setTeacherStatusFilter] = useState<'all' | 'pending' | 'completed'>('all');
  const [selectedTeacherIdForFeedback, setSelectedTeacherIdForFeedback] = useState<string | null>(null);
  const [feedbackSearchQuery, setFeedbackSearchQuery] = useState('');
  const [feedbackStatusFilter, setFeedbackStatusFilter] = useState<'all' | 'pending' | 'completed'>('all');

  // Teacher fullscreen overlay state
  const [teacherSubmissionEvent, setTeacherSubmissionEvent] = useState<any | null>(null);
  const [teacherOverlayTab, setTeacherOverlayTab] = useState<'einreichung' | 'technik' | 'schueler' | 'feedback' | 'packliste' | 'summary'>('einreichung');
  const [studentSearchQuery, setStudentSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [activeStudentSuggestionIndex, setActiveStudentSuggestionIndex] = useState(0);

  // Secretary planning fullscreen overlay state (separate from selectedEvent to avoid visibility modal)
  const [secretaryPlanningEvent, setSecretaryPlanningEvent] = useState<any | null>(null);

  // Console Night Mode & Active Live Point states
  const [techConsoleNightMode, setTechConsoleNightMode] = useState<boolean>(() => {
    try {
      return localStorage.getItem('groovelab_tech_night_mode') === 'true';
    } catch (e) {
      return false;
    }
  });

  const [transitionTime, setTransitionTime] = useState<number>(10);
  const [activeLivePointId, setActiveLivePointId] = useState<string | null>(null);
  const [techCheckTrigger, setTechCheckTrigger] = useState<number>(0);

  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, type });
  };

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => {
        setToast(null);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const alert = (msg: string) => {
    let type: 'success' | 'error' | 'info' = 'info';
    const lower = msg.toLowerCase();
    if (lower.includes('fehler') || lower.includes('fehlgeschlagen') || lower.includes('error')) {
      type = 'error';
    } else if (
      lower.includes('erfolgreich') || 
      lower.includes('aktiviert') || 
      lower.includes('🎉') || 
      lower.includes('gespeichert') || 
      lower.includes('storniert') || 
      lower.includes('übermittelt') || 
      lower.includes('zurückgesetzt')
    ) {
      type = 'success';
    }
    showToast(msg, type);
  };

  // Customizable Instrument Patch Configuration (schulweit)
  const [techConfig, setTechConfig] = useState<{
    keyboardMode: 'mono' | 'stereo';
    epianoMode: 'mono' | 'stereo';
    drumsMode: '4mic' | 'standard' | 'edrum';
  }>(() => {
    try {
      const saved = localStorage.getItem(`groovelab_tech_config_${schoolId}`);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {}
    return {
      keyboardMode: 'mono',
      epianoMode: 'mono',
      drumsMode: '4mic'
    };
  });

  const saveTechConfig = (newConfig: typeof techConfig) => {
    setTechConfig(newConfig);
    try {
      localStorage.setItem(`groovelab_tech_config_${schoolId}`, JSON.stringify(newConfig));
    } catch (e) {}
  };

  const [showTechSettings, setShowTechSettings] = useState<boolean>(false);

  useEffect(() => {
    const activeEv = selectedEvent || secretaryPlanningEvent || teacherSubmissionEvent;
    if (activeEv) {
      const saved = localStorage.getItem(`groovelab_event_transition_time_${activeEv.id}`);
      if (saved !== null) {
        setTransitionTime(parseInt(saved, 10));
      } else {
        setTransitionTime(10);
      }
    }
  }, [selectedEvent?.id, secretaryPlanningEvent?.id, teacherSubmissionEvent?.id]);

  useEffect(() => {
    try {
      const activeEv = selectedEvent || secretaryPlanningEvent || teacherSubmissionEvent;
      if (activeEv) {
        const stored = localStorage.getItem(`groovelab_active_live_pp_id_${activeEv.id}_${activeStage}`);
        setActiveLivePointId(stored || null);
      } else {
        setActiveLivePointId(null);
      }
    } catch (e) {
      setActiveLivePointId(null);
    }
  }, [selectedEvent, secretaryPlanningEvent, teacherSubmissionEvent, activeStage]);

  const fetchDbConflicts = async (eventId: string) => {
    if (!eventId) return;
    try {
      const { data, error } = await supabase.rpc('get_schedule_conflicts', { 
        p_event_id: eventId, 
        p_transition_time: transitionTime 
      });
      if (error) {
        console.error('Error fetching conflicts:', error);
      } else if (data) {
        setDbConflicts(data);
      }
    } catch (err) {
      console.error('Exception in fetchDbConflicts:', err);
    }
  };

  useEffect(() => {
    const activeEv = secretaryPlanningEvent || selectedEvent;
    if (activeEv?.id) {
      fetchDbConflicts(activeEv.id);
    } else {
      setDbConflicts([]);
    }
  }, [programPoints, transitionTime, secretaryPlanningEvent?.id, selectedEvent?.id]);
  
  // Teacher program point form states
  const [newPpName, setNewPpName] = useState('');
  const [newPpEnsemble, setNewPpEnsemble] = useState('');
  const [newPpPerformerCount, setNewPpPerformerCount] = useState('1');
  const [newPpDuration, setNewPpDuration] = useState('10');
  const [newPpPreferredTime, setNewPpPreferredTime] = useState('');
  const [newPpTitle, setNewPpTitle] = useState('');
  const [newPpArtist, setNewPpArtist] = useState('');
  const [newPpComposer, setNewPpComposer] = useState('');
  const [newPpArranger, setNewPpArranger] = useState('');
  const [newPpPublisher, setNewPpPublisher] = useState('');
  const [newPpTechRequirements, setNewPpTechRequirements] = useState('');
  const [newPpChairs, setNewPpChairs] = useState('0');
  const [newPpStands, setNewPpStands] = useState('0');
  const [newPpRemarks, setNewPpRemarks] = useState('');

  // Tech Rider Builder states
  const [techRiderItems, setTechRiderItems] = useState<any[]>([]);
  const [builderType, setBuilderType] = useState('Gesang');
  const [builderConnection, setBuilderConnection] = useState('Mikrofon');
  const [builderCount, setBuilderCount] = useState<number | string>(1);
  const [isBlasmusikSelected, setIsBlasmusikSelected] = useState(false);
  const [builderSource, setBuilderSource] = useState('venue');
  const [builderNotes, setBuilderNotes] = useState('');
  const [newPpSelectedStudentIds, setNewPpSelectedStudentIds] = useState<string[]>([]);
  const [submittingPp, setSubmittingPp] = useState(false);
  const [addedSongs, setAddedSongs] = useState<Song[]>([]);

  const handleAddSong = () => {
    if (!newPpTitle.trim()) {
      alert('Bitte geben Sie einen Songtitel ein.');
      return;
    }
    const song: Song = {
      title: newPpTitle.trim(),
      artist: newPpArtist.trim(),
      composer: newPpComposer.trim(),
      arranger: newPpArranger.trim()
    };
    setAddedSongs(prev => [...prev, song]);
    setNewPpTitle('');
    setNewPpArtist('');
    setNewPpComposer('');
    setNewPpArranger('');
  };

  const handleRemoveSong = (index: number) => {
    setAddedSongs(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleAddTechRiderItem = () => {
    const countNum = parseInt(String(builderCount), 10) || 1;
    if (countNum <= 0) {
      alert('Die Anzahl muss mindestens 1 sein.');
      return;
    }
    const finalType = (builderType.trim() === '' && isBlasmusikSelected) ? 'Blasmusik' : builderType;
    const newItem = {
      id: Math.random().toString(36).substring(2, 9),
      type: finalType,
      connection: builderConnection,
      count: countNum,
      source: builderSource,
      notes: builderNotes.trim()
    };
    setTechRiderItems(prev => [...prev, newItem]);
    setBuilderNotes('');
    setBuilderCount(1);
    setIsBlasmusikSelected(false);
  };

  const handleRemoveTechRiderItem = (id: string) => {
    setTechRiderItems(prev => prev.filter(item => item.id !== id));
  };

  // State to edit an existing program point for teacher
  const [editingPpId, setEditingPpId] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [saveErrorMessage, setSaveErrorMessage] = useState<string | null>(null);

  // Helper to check if form states differ from original database entry
  const hasFormChanges = () => {
    if (!editingPpId) return false;
    const originalPp = programPoints.find(p => p.id === editingPpId);
    if (!originalPp) return false;

    const perfCount = parseInt(newPpPerformerCount, 10) || 1;
    const dur = parseInt(newPpDuration, 10) || 10;
    const chairs = parseInt(newPpChairs, 10) || 0;
    const stands = parseInt(newPpStands, 10) || 0;

    const currentName = newPpName.trim() || newPpEnsemble.trim();
    if ((originalPp.name || '').trim() !== currentName) return true;

    const currentEnsemble = newPpEnsemble.trim();
    if ((originalPp.ensemble_band || '').trim() !== currentEnsemble) return true;

    if ((originalPp.performer_count || 1) !== perfCount) return true;
    if ((originalPp.duration || 10) !== dur) return true;

    if ((originalPp.preferred_time || '').trim() !== newPpPreferredTime.trim()) return true;
    
    if ((originalPp.publisher || '').trim() !== newPpPublisher.trim()) return true;

    // Compare songs arrays
    const originalSongs = originalPp.songs || [];
    if (JSON.stringify(originalSongs) !== JSON.stringify(addedSongs)) return true;

    // Compare tech requirements
    const originalTech = originalPp.tech_requirements || null;
    const currentTech = techRiderItems.length > 0 ? JSON.stringify(techRiderItems) : null;
    if (originalTech !== currentTech) return true;

    if ((originalPp.chairs_needed || 0) !== chairs) return true;
    if ((originalPp.music_stands_needed || 0) !== stands) return true;

    if ((originalPp.remarks || '').trim() !== newPpRemarks.trim()) return true;

    // Compare assigned students
    const originalStudents = originalPp.additional_feedback_responses?.assigned_students || [];
    if (JSON.stringify(originalStudents) !== JSON.stringify(newPpSelectedStudentIds)) return true;

    return false;
  };

  useEffect(() => {
    if (!editingPpId) {
      setSaveStatus('idle');
      setSaveErrorMessage(null);
      return;
    }

    if (!hasFormChanges()) {
      return;
    }

    setSaveStatus('saving');
    setSaveErrorMessage(null);
    const timer = setTimeout(async () => {
      try {
        await handleAutoSave();
        setSaveStatus('saved');
      } catch (err: any) {
        console.error('AutoSave failed:', err);
        setSaveStatus('error');
        setSaveErrorMessage(err?.message || 'Speichern fehlgeschlagen');
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [
    editingPpId,
    newPpName,
    newPpEnsemble,
    newPpPerformerCount,
    newPpDuration,
    newPpPreferredTime,
    newPpPublisher,
    newPpChairs,
    newPpStands,
    newPpRemarks,
    techRiderItems,
    addedSongs,
    newPpSelectedStudentIds
  ]);

  const renderSaveStatus = () => {
    if (saveStatus === 'saving') {
      return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.74rem', color: '#475569', fontWeight: 600, background: '#f1f5f9', padding: '2px 8px', borderRadius: '20px' }}>
          <span className="autosave-pulse" style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#3b82f6', display: 'inline-block' }} />
          Speichert...
        </span>
      );
    }
    if (saveStatus === 'saved') {
      return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.74rem', color: '#16a34a', fontWeight: 650, background: '#f0fdf4', padding: '2px 8px', borderRadius: '20px' }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#22c55e', display: 'inline-block' }} />
          Gespeichert
        </span>
      );
    }
    if (saveStatus === 'error') {
      return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.74rem', color: '#dc2626', fontWeight: 650, background: '#fef2f2', padding: '2px 8px', borderRadius: '20px' }} title={saveErrorMessage || ''}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ef4444', display: 'inline-block' }} />
          Fehler: {saveErrorMessage || 'Fehler beim Speichern'}
        </span>
      );
    }
    return null;
  };

  // Feedback question answers state for teacher
  const [feedbackAnswers, setFeedbackAnswers] = useState<Record<string, string>>({}); // ppId_questionIdx -> answer

  // Fetch program points for event
  const fetchProgramPoints = async (eventId: string) => {
    setLoadingProgramPoints(true);
    try {
      const { data, error } = await supabase
        .from('campus_event_program_points')
        .select('*')
        .eq('event_id', eventId)
        .order('stage_number', { ascending: true })
        .order('sort_order', { ascending: true });
      if (error) throw error;
      setProgramPoints(data || []);
      
      // Auto-populate feedbackAnswers state
      if (data) {
        const answersMap: Record<string, string> = {};
        data.forEach((pp: any) => {
          if (pp.additional_feedback_responses?.answers) {
            pp.additional_feedback_responses.answers.forEach((ans: string, idx: number) => {
              answersMap[`${pp.id}_${idx}`] = ans;
            });
          }
        });
        setFeedbackAnswers(answersMap);
      }
    } catch (err) {
      console.error('Error fetching program points:', err);
    } finally {
      setLoadingProgramPoints(false);
    }
  };

  // --- M5 Drag-and-Drop Board & Conflict Prevention ---
  const fetchEventDayLessons = async (dateStr: string) => {
    if (!dateStr) return;
    try {
      const { data, error } = await supabase
        .from('lessons')
        .select('*')
        .eq('date', dateStr);
      if (!error && data) {
        setEventDayLessons(data);
      }
    } catch (err) {
      console.error('Error fetching event day lessons:', err);
    }
  };

  const parseTimeToMinutes = (timeStr?: string) => {
    if (!timeStr) return 0;
    const parts = timeStr.split(':');
    const hours = parseInt(parts[0], 10) || 0;
    const minutes = parseInt(parts[1], 10) || 0;
    return hours * 60 + minutes;
  };

  const formatMinutesToTime = (totalMinutes: number) => {
    const hours = Math.floor(totalMinutes / 60) % 24;
    const minutes = totalMinutes % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  };

  const getTeacherName = (teacherId?: string) => {
    const teacher = allUsers.find(u => u.id === teacherId);
    return teacher ? `${teacher.first_name || ''} ${teacher.last_name || ''}`.trim() : '—';
  };

  const calculateTimelineTimes = (points: any[], eventStartTimeStr?: string) => {
    const startMin = parseTimeToMinutes(eventStartTimeStr || '14:00');
    const stages: Record<number, any[]> = {};
    points.forEach(pp => {
      if (pp.is_scheduled || pp.is_pause) {
        const stage = pp.stage_number || 1;
        if (!stages[stage]) stages[stage] = [];
        stages[stage].push(pp);
      }
    });

    const timeMap: Record<string, { startMin: number; endMin: number; start: string; end: string }> = {};

    Object.keys(stages).forEach(stageStr => {
      const stageNum = parseInt(stageStr, 10);
      const stagePoints = stages[stageNum].sort((a, b) => a.sort_order - b.sort_order);
      let currentMin = startMin;
      stagePoints.forEach((pp, idx) => {
        const duration = pp.duration || 0;
        
        // Add transition buffer between non-pause consecutive program points
        if (idx > 0 && !pp.is_pause && !stagePoints[idx - 1].is_pause) {
          currentMin += transitionTime;
        }

        timeMap[pp.id] = {
          startMin: currentMin,
          endMin: currentMin + duration,
          start: formatMinutesToTime(currentMin),
          end: formatMinutesToTime(currentMin + duration)
        };
        currentMin += duration;
      });
    });

    return timeMap;
  };

  const getConflictsMap = (points: any[], lessonsList: any[], activeEventStartTime: string) => {
    const timeMap = calculateTimelineTimes(points, activeEventStartTime);
    const conflicts: Record<string, string> = {};

    points.forEach(pp => {
      if ((!pp.is_scheduled && !pp.is_pause) || pp.is_pause || !pp.teacher_id) return;
      const ppTime = timeMap[pp.id];
      if (!ppTime) return;

      for (const lesson of lessonsList) {
        if (
          lesson.teacher_id === pp.teacher_id && 
          !lesson.status?.startsWith('cancel') && 
          lesson.status !== 'teacher_sick'
        ) {
          const lessonStart = parseTimeToMinutes(lesson.start_time);
          const lessonEnd = lessonStart + (lesson.duration || 0);
          if (ppTime.startMin < lessonEnd && ppTime.endMin > lessonStart) {
            conflicts[pp.id] = `Kollision mit Unterricht (${lesson.start_time} - ${formatMinutesToTime(lessonEnd)})`;
            return;
          }
        }
      }

      for (const otherPp of points) {
        if (
          otherPp.id !== pp.id &&
          (otherPp.is_scheduled || otherPp.is_pause) &&
          !otherPp.is_pause &&
          otherPp.teacher_id === pp.teacher_id &&
          otherPp.stage_number !== pp.stage_number
        ) {
          const otherTime = timeMap[otherPp.id];
          if (otherTime) {
            if (ppTime.startMin < otherTime.endMin && ppTime.endMin > otherTime.startMin) {
              conflicts[pp.id] = `Kollision mit Beitrag auf Bühne ${otherPp.stage_number} (${otherTime.start} - ${otherTime.end})`;
              return;
            }
          }
        }
      }
    });

    return conflicts;
  };

  const handleDropOnUnscheduledPool = async (e: React.DragEvent) => {
    e.preventDefault();
    const ppId = e.dataTransfer.getData('ppId');
    if (!ppId) return;

    const pp = programPoints.find(p => p.id === ppId);
    if (!pp) return;

    if (pp.is_pause) {
      const { error } = await supabase.from('campus_event_program_points').delete().eq('id', pp.id);
      if (!error) {
        setProgramPoints(prev => prev.filter(p => p.id !== pp.id));
      }
    } else {
      if (!pp.is_scheduled) return;
      const { error } = await supabase
        .from('campus_event_program_points')
        .update({ is_scheduled: false, sort_order: 0 })
        .eq('id', pp.id);
      if (!error) {
        setProgramPoints(prev => prev.map(p => p.id === pp.id ? { ...p, is_scheduled: false, sort_order: 0 } : p));
      }
    }
  };

  const handleDropOnTimeline = async (e: React.DragEvent, targetPpId?: string, insertAbove: boolean = true) => {
    e.preventDefault();
    const ppId = e.dataTransfer.getData('ppId');
    if (!ppId) return;

    const draggedPp = programPoints.find(p => p.id === ppId);
    if (!draggedPp) return;

    if (draggedPp.is_scheduled && draggedPp.stage_number === activeStage && !targetPpId) {
      return;
    }

    let updatedList = [...programPoints];
    if (!draggedPp.is_scheduled || (draggedPp.stage_number || 1) !== activeStage) {
      updatedList = updatedList.map(p => p.id === ppId ? { ...p, is_scheduled: true, stage_number: activeStage, status: 'approved' } : p);
    }

    const otherPoints = updatedList.filter(p => p.id !== ppId);
    const stageScheduled = otherPoints.filter(p => (p.is_scheduled || p.is_pause) && (p.stage_number || 1) === activeStage)
      .sort((a, b) => a.sort_order - b.sort_order);

    let newStageScheduled: any[] = [];
    const draggedItem = updatedList.find(p => p.id === ppId);
    if (targetPpId) {
      const targetIdx = stageScheduled.findIndex(p => p.id === targetPpId);
      if (targetIdx !== -1) {
        const sliceIdx = insertAbove ? targetIdx : targetIdx + 1;
        newStageScheduled = [
          ...stageScheduled.slice(0, sliceIdx),
          draggedItem,
          ...stageScheduled.slice(sliceIdx)
        ];
      } else {
        newStageScheduled = [...stageScheduled, draggedItem];
      }
    } else {
      newStageScheduled = [...stageScheduled, draggedItem];
    }

    newStageScheduled.forEach((p, index) => {
      p.sort_order = index;
      if (p.is_pause && !p.stage_number) {
        p.stage_number = activeStage;
      }
    });

    const finalPoints = updatedList.map(p => {
      const stageItem = newStageScheduled.find(sp => sp.id === p.id);
      return stageItem ? stageItem : p;
    });

    // Check conflicts is managed asynchronously via database RPC get_schedule_conflicts triggered on programPoints state updates

    const pointsToUpdate = finalPoints.filter(p => {
      const original = programPoints.find(orig => orig.id === p.id);
      return (
        original.is_scheduled !== p.is_scheduled ||
        original.stage_number !== p.stage_number ||
        original.sort_order !== p.sort_order ||
        original.status !== p.status
      );
    });

    for (const pp of pointsToUpdate) {
      const { error } = await supabase
        .from('campus_event_program_points')
        .update({
          is_scheduled: pp.is_scheduled,
          stage_number: pp.stage_number,
          sort_order: pp.sort_order,
          status: pp.status
        })
        .eq('id', pp.id);
      if (error) {
        console.error('Error updating program point placement:', error);
        alert('Fehler beim Speichern in der Datenbank.');
        return;
      }
    }

    setProgramPoints(finalPoints);
  };

  const handleMoveProgramPoint = async (ppId: string, direction: 'up' | 'down') => {
    const stagePoints = programPoints.filter(p => (p.is_scheduled || p.is_pause) && (p.stage_number || 1) === activeStage)
      .sort((a, b) => a.sort_order - b.sort_order);
    
    const idx = stagePoints.findIndex(p => p.id === ppId);
    if (idx === -1) return;
    
    if (direction === 'up' && idx === 0) return;
    if (direction === 'down' && idx === stagePoints.length - 1) return;
    
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    const updatedStagePoints = [...stagePoints];
    
    // Swap items
    const temp = updatedStagePoints[idx];
    updatedStagePoints[idx] = updatedStagePoints[targetIdx];
    updatedStagePoints[targetIdx] = temp;
    
    // Recalculate sort_order
    updatedStagePoints.forEach((p, index) => {
      p.sort_order = index;
    });
    
    const finalPoints = programPoints.map(p => {
      const stageItem = updatedStagePoints.find(sp => sp.id === p.id);
      return stageItem ? { ...p, sort_order: stageItem.sort_order } : p;
    });
    
    const pointsToUpdate = finalPoints.filter(p => {
      const original = programPoints.find(orig => orig.id === p.id);
      return original.sort_order !== p.sort_order;
    });
    
    for (const pp of pointsToUpdate) {
      const { error } = await supabase
        .from('campus_event_program_points')
        .update({ sort_order: pp.sort_order })
        .eq('id', pp.id);
      if (error) {
        console.error('Error updating program point sort order:', error);
        alert('Fehler beim Umsortieren.');
        return;
      }
    }
    
    setProgramPoints(finalPoints);
  };

  const handleEditDuration = async (ppId: string, newDuration: number) => {
    if (isNaN(newDuration) || newDuration <= 0) return;

    const finalPoints = programPoints.map(p => p.id === ppId ? { ...p, duration: newDuration } : p);

    // Check conflicts is managed asynchronously via database RPC get_schedule_conflicts triggered on programPoints state updates

    const { error } = await supabase
      .from('campus_event_program_points')
      .update({ duration: newDuration })
      .eq('id', ppId);

    if (error) {
      console.error('Error updating duration:', error);
      alert('Fehler beim Aktualisieren der Dauer.');
    } else {
      setProgramPoints(finalPoints);
    }
  };

  const handleAddManualEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    const activeEv = secretaryPlanningEvent || selectedEvent;
    if (!activeEv) return;

    const finalSongs = [...manualSongs];
    if (manualSongTitle.trim()) {
      finalSongs.push({
        title: manualSongTitle.trim(),
        artist: manualSongArtist.trim(),
        composer: manualSongComposer.trim(),
        arranger: manualSongArranger.trim()
      });
    }

    const firstSong = finalSongs[0];
    let resolvedName = manualTitle.trim();
    if (!resolvedName) {
      if (manualEnsemble.trim()) {
        resolvedName = manualEnsemble.trim();
      } else if (firstSong && firstSong.title) {
        resolvedName = firstSong.title;
      } else {
        resolvedName = 'Unbenannter Beitrag';
      }
    }

    const dur = manualDuration ? parseInt(manualDuration, 10) : 10;
    const perfCount = manualPerformerCount ? parseInt(manualPerformerCount, 10) : 1;

    const { data, error } = await supabase
      .from('campus_event_program_points')
      .insert({
        event_id: activeEv.id,
        school_id: activeEv.school_id || schoolId,
        name: resolvedName,
        title: manualTitle.trim() || (firstSong ? firstSong.title : null),
        ensemble_band: manualEnsemble.trim() || null,
        teacher_id: manualTeacherId || null,
        instrument: manualInstrument.trim() || null,
        duration: isNaN(dur) ? 10 : dur,
        performer_count: isNaN(perfCount) ? 1 : perfCount,
        preferred_time: manualPreferredTime.trim() || null,
        artist: firstSong ? firstSong.artist : null,
        composer: firstSong ? firstSong.composer : null,
        arranger: firstSong ? firstSong.arranger : null,
        songs: finalSongs,
        status: 'approved',
        is_scheduled: false
      })
      .select()
      .single();

    if (error) {
      console.error('Error inserting manual entry:', error);
      alert('Fehler beim Speichern: ' + error.message);
    } else {
      setProgramPoints(prev => [...prev, data]);
      setManualTitle('');
      setManualEnsemble('');
      setManualTeacherId('');
      setManualInstrument('');
      setManualDuration('');
      setManualPreferredTime('');
      setManualPerformerCount('1');
      setManualSongs([]);
      setManualSongTitle('');
      setManualSongArtist('');
      setManualSongComposer('');
      setManualSongArranger('');
      setIsManualEntryModalOpen(false);
    }
  };

  useEffect(() => {
    const fetchUsers = async () => {
      if (!schoolId) return;
      try {
        const { data, error } = await supabase
          .from('users')
          .select('id, first_name, last_name, role, instrument')
          .eq('school_id', schoolId)
          .in('role', ['teacher', 'admin', 'secretary', 'student']);
        if (!error && data) {
          const sorted = data.sort((a: any, b: any) => {
            const nameA = `${a.first_name || ''} ${a.last_name || ''}`.trim();
            const nameB = `${b.first_name || ''} ${b.last_name || ''}`.trim();
            return nameA.localeCompare(nameB);
          });
          setAllUsers(sorted);
        }
      } catch (err) {
        console.error('Error fetching users:', err);
      }
    };
    fetchUsers();
  }, [schoolId]);

  useEffect(() => {
    const activeEventForPanel = secretaryPlanningEvent || selectedEvent;
    if (activeEventForPanel && !activeEventForPanel.is_subscribed) {
      fetchProgramPoints(activeEventForPanel.id);
      fetchEventDayLessons(activeEventForPanel.event_date);
      setActiveStage(1);
      setStageCount(Math.min(10, Math.max(1, activeEventForPanel.stage_count || 1)));
      setTotalDuration(activeEventForPanel.total_duration ? String(activeEventForPanel.total_duration) : '');
      setProgramDuration(activeEventForPanel.program_duration ? String(activeEventForPanel.program_duration) : '');
      setEventStatus(activeEventForPanel.planning_status || 'planung');
      setEventLocation(activeEventForPanel.location || '');
      setEventLocationAddress(activeEventForPanel.location_address || '');
      setEventAdmissionTime(activeEventForPanel.admission_time || '');
      setAdmissionTimeError('');
      setEventStartTime(activeEventForPanel.event_start_time || activeEventForPanel.start_time || '');
      setEventAudience(activeEventForPanel.audience_count ? String(activeEventForPanel.audience_count) : '');
      setEventDescription(activeEventForPanel.event_description || '');
      setEventBudget(activeEventForPanel.budget ? String(activeEventForPanel.budget) : '');
      setEventMainResponsible(activeEventForPanel.responsible_program || '');
      setEventTechResponsible(activeEventForPanel.responsible_tech || '');
      setEventCoordResponsible(activeEventForPanel.responsible_coordination || '');
      setEventSubmissionDeadline(formatToLocalDatetime(activeEventForPanel.submission_deadline));
    } else if (teacherSubmissionEvent) {
      fetchProgramPoints(teacherSubmissionEvent.id);
    } else {
      setProgramPoints([]);
    }
  }, [selectedEvent, teacherSubmissionEvent, secretaryPlanningEvent]);

  const handleSaveEventSettings = async () => {
    const activeEv = secretaryPlanningEvent || selectedEvent;
    if (!activeEv) return;

    // Validate: Einlass darf nicht nach Beginn liegen (wenn beide gesetzt)
    if (eventAdmissionTime && eventStartTime && eventAdmissionTime > eventStartTime) {
      setAdmissionTimeError('Einlass kann nicht nach dem Beginn liegen.');
      return;
    }
    setAdmissionTimeError('');

    const audienceCountVal = eventAudience ? parseInt(eventAudience, 10) : null;
    const budgetVal = eventBudget ? parseFloat(eventBudget) : null;
    // Fallback: kein Einlass gesetzt → Einlass = Beginn
    const admissionTimeToSave = eventAdmissionTime || eventStartTime || null;

    try {
      const { data, error } = await supabase
        .from('campus_events')
        .update({
          stage_count: stageCount,
          planning_status: eventStatus,
          location: eventLocation,
          location_address: eventLocationAddress,
          admission_time: admissionTimeToSave,
          event_start_time: eventStartTime,
          audience_count: audienceCountVal,
          event_description: eventDescription,
          budget: budgetVal,
          responsible_program: eventMainResponsible,
          responsible_tech: eventTechResponsible,
          responsible_coordination: eventCoordResponsible,
          submission_deadline: eventSubmissionDeadline ? new Date(eventSubmissionDeadline).toISOString() : null
        })
        .eq('id', activeEv.id)
        .select()
        .single();
      if (error) throw error;
      if (data) {
        setCustomEvents((prev: CampusEvent[]) => prev.map(ev => ev.id === data.id ? { ...ev, ...data } : ev));
        if (selectedEvent) setSelectedEvent((prev: any) => prev.id === data.id ? { ...prev, ...data } : prev);
        if (secretaryPlanningEvent) setSecretaryPlanningEvent((prev: any) => prev.id === data.id ? { ...prev, ...data } : prev);
        alert('Event-Einstellungen erfolgreich gespeichert!');
      }
    } catch (err: any) {
      alert('Fehler beim Speichern: ' + err.message);
    }
  };

  const handleUpdateProgramPointStatus = async (ppId: string, newStatus: 'approved' | 'rejected') => {
    try {
      const { data, error } = await supabase
        .from('campus_event_program_points')
        .update({ status: newStatus })
        .eq('id', ppId)
        .select()
        .single();
      if (error) throw error;
      setProgramPoints(prev => prev.map(pp => pp.id === ppId ? data : pp));
      
      // Auto-resolve feedback questions if rejected
      if (newStatus === 'rejected' && data?.additional_feedback_responses?.status === 'pending_response') {
        const clearedFeedback = {
          ...data.additional_feedback_responses,
          status: 'resolved'
        };
        await supabase
          .from('campus_event_program_points')
          .update({ additional_feedback_responses: clearedFeedback })
          .eq('id', ppId);
        setProgramPoints(prev => prev.map(pp => pp.id === ppId ? { ...pp, additional_feedback_responses: clearedFeedback } : pp));
      }
    } catch (err: any) {
      alert('Fehler bei der Status-Aktualisierung: ' + err.message);
    }
  };

  const handleResetNoSubmissionStatus = async (teacherId: string) => {
    const activeEv = secretaryPlanningEvent || selectedEvent;
    if (!activeEv) return;
    const currentIds = activeEv.no_submission_teacher_ids || [];
    const newIds = currentIds.filter((id: string) => id !== teacherId);
    try {
      const { data, error } = await supabase
        .from('campus_events')
        .update({ no_submission_teacher_ids: newIds })
        .eq('id', activeEv.id)
        .select('*, room:room_id(id, name)')
        .single();
      if (error) throw error;
      setCustomEvents(prev => prev.map(ev => ev.id === activeEv.id ? data : ev));
      if (selectedEvent && selectedEvent.id === activeEv.id) setSelectedEvent((prev: any) => ({ ...prev, ...data }));
      if (secretaryPlanningEvent && secretaryPlanningEvent.id === activeEv.id) setSecretaryPlanningEvent((prev: any) => ({ ...prev, ...data }));
      alert('Status zurückgesetzt!');
    } catch (err: any) {
      alert('Fehler beim Zurücksetzen: ' + err.message);
    }
  };

  const handleBulkUpdateStatus = async (teacherId: string, status: 'approved' | 'rejected') => {
    const activeEv = secretaryPlanningEvent || selectedEvent;
    if (!activeEv) return;
    const pendingPoints = programPoints.filter(pp => pp.teacher_id === teacherId && pp.status === 'submitted' && !pp.is_pause);
    if (pendingPoints.length === 0) return;
    
    try {
      const { error } = await supabase
        .from('campus_event_program_points')
        .update({ status })
        .eq('event_id', activeEv.id)
        .eq('teacher_id', teacherId)
        .eq('status', 'submitted');
        
      if (error) throw error;
      
      // Update local state
      setProgramPoints(prev => prev.map(pp => 
        (pp.teacher_id === teacherId && pp.status === 'submitted' && !pp.is_pause) ? { ...pp, status } : pp
      ));
      
      // If rejected, auto-resolve feedback on all rejected points
      if (status === 'rejected') {
        for (const pp of pendingPoints) {
          if (pp.additional_feedback_responses?.status === 'pending_response') {
            const cleared = { ...pp.additional_feedback_responses, status: 'resolved' };
            await supabase.from('campus_event_program_points').update({ additional_feedback_responses: cleared }).eq('id', pp.id);
            setProgramPoints(prev => prev.map(p => p.id === pp.id ? { ...p, additional_feedback_responses: cleared } : p));
          }
        }
      }

      alert(`Erfolgreich ${pendingPoints.length} Beiträge ${status === 'approved' ? 'freigegeben' : 'abgelehnt'}!`);
    } catch (err: any) {
      alert('Fehler bei der Massenaktualisierung: ' + err.message);
    }
  };

  const handleAddPause = async (e: React.FormEvent) => {
    e.preventDefault();
    const activeEvent = secretaryPlanningEvent || selectedEvent;
    if (!activeEvent) return;
    const durationVal = parseInt(pauseDuration, 10);
    if (isNaN(durationVal) || durationVal <= 0) {
      alert('Bitte geben Sie eine gültige Pausendauer ein (eine positive Zahl).');
      return;
    }
    const activeStagePoints = programPoints.filter(pp => (pp.is_scheduled || pp.is_pause) && (pp.stage_number || 1) === activeStage);
    const nextSortOrder = activeStagePoints.length;
    try {
      const { data, error } = await supabase
        .from('campus_event_program_points')
        .insert({
          event_id: activeEvent.id,
          school_id: activeEvent.school_id || schoolId,
          name: 'Pause / Unterbrechung',
          duration: durationVal,
          is_pause: true,
          status: 'approved',
          sort_order: nextSortOrder,
          stage_number: activeStage,
          is_scheduled: true
        })
        .select()
        .single();
      if (error) throw error;
      setProgramPoints(prev => [...prev, data]);
      setPauseDuration('');
    } catch (err: any) {
      alert('Fehler beim Einfügen der Pause: ' + err.message);
    }
  };

  const handleSwapProgramPoints = async (pp1: any, pp2: any) => {
    if (!pp1 || !pp2) return;
    try {
      const order1 = pp1.sort_order;
      const order2 = pp2.sort_order;
      const { error: err1 } = await supabase.from('campus_event_program_points').update({ sort_order: order2 }).eq('id', pp1.id);
      if (err1) throw err1;
      const { error: err2 } = await supabase.from('campus_event_program_points').update({ sort_order: order1 }).eq('id', pp2.id);
      if (err2) throw err2;
      setProgramPoints(prev => prev.map(pp => {
        if (pp.id === pp1.id) return { ...pp, sort_order: order2 };
        if (pp.id === pp2.id) return { ...pp, sort_order: order1 };
        return pp;
      }).sort((a,b) => {
        if (a.stage_number !== b.stage_number) return a.stage_number - b.stage_number;
        return a.sort_order - b.sort_order;
      }));
    } catch (err: any) {
      alert('Fehler beim Tauschen: ' + err.message);
    }
  };

  const handleSendFeedbackQuestion = async (ppId: string) => {
    const questionText = feedbackQuestion[ppId]?.trim();
    if (!questionText) return;
    try {
      const pp = programPoints.find(p => p.id === ppId);
      const prevFeedback = pp?.additional_feedback_responses || {};
      const newQuestions = [...(prevFeedback.questions || []), questionText];
      const newAnswers = [...(prevFeedback.answers || []), '']; // Aligned with questions length
      
      const newFeedback = {
        questions: newQuestions,
        answers: newAnswers,
        status: 'pending_response'
      };
      const { data, error } = await supabase
        .from('campus_event_program_points')
        .update({ additional_feedback_responses: newFeedback })
        .eq('id', ppId)
        .select()
        .single();
      if (error) throw error;
      setProgramPoints(prev => prev.map(p => p.id === ppId ? data : p));
      setFeedbackQuestion(prev => ({ ...prev, [ppId]: '' }));
      alert('Rückfrage erfolgreich gesendet!');
    } catch (err: any) {
      alert('Fehler beim Senden der Rückfrage: ' + err.message);
    }
  };

  const handleCancelFeedbackQuestion = async (ppId: string) => {
    try {
      const pp = programPoints.find(p => p.id === ppId);
      const prevFeedback = pp?.additional_feedback_responses || {};
      const questions = prevFeedback.questions || [];
      const answers = prevFeedback.answers || [];
      
      let newFeedback = {};
      if (questions.length > 1) {
        const newQuestions = questions.slice(0, -1);
        const newAnswers = answers.slice(0, -1);
        const hasUnanswered = newAnswers.some((ans: any) => !ans || ans.trim() === '');
        newFeedback = {
          questions: newQuestions,
          answers: newAnswers,
          status: hasUnanswered ? 'pending_response' : 'responded'
        };
      } else {
        newFeedback = {};
      }
      
      const { data, error } = await supabase
        .from('campus_event_program_points')
        .update({ additional_feedback_responses: newFeedback })
        .eq('id', ppId)
        .select()
        .single();
      if (error) throw error;
      setProgramPoints(prev => prev.map(p => p.id === ppId ? data : p));
      alert('Rückfrage erfolgreich storniert!');
    } catch (err: any) {
      alert('Fehler beim Stornieren der Rückfrage: ' + err.message);
    }
  };

  const handleCancelEditing = () => {
    setEditingPpId(null);
    setNewPpName('');
    setNewPpEnsemble('');
    setNewPpPerformerCount('1');
    setNewPpDuration('10');
    setNewPpPreferredTime('');
    setNewPpTitle('');
    setNewPpArtist('');
    setNewPpComposer('');
    setNewPpArranger('');
    setNewPpPublisher('');
    setNewPpTechRequirements('');
    setTechRiderItems([]);
    setBuilderNotes('');
    setIsBlasmusikSelected(false);
    setNewPpChairs('0');
    setNewPpStands('0');
    setNewPpRemarks('');
    setAddedSongs([]);
    setNewPpSelectedStudentIds([]);
  };

  const handleStartEditing = (pp: any, tab: 'einreichung' | 'technik' | 'schueler' | 'feedback' | 'packliste' | 'summary') => {
    setEditingPpId(pp.id);
    setIsBlasmusikSelected(false);
    setNewPpName(pp.name || '');
    setNewPpEnsemble(pp.ensemble_band || '');
    setNewPpPerformerCount(String(pp.performer_count || 1));
    setNewPpDuration(String(pp.duration || 10));
    setNewPpPreferredTime(pp.preferred_time || '');
    setNewPpTitle(pp.title || '');
    setNewPpArtist(pp.artist || '');
    setNewPpComposer(pp.composer || '');
    setNewPpArranger(pp.arranger || '');
    setNewPpPublisher(pp.publisher || '');
    if (pp.tech_requirements) {
      try {
        if (pp.tech_requirements.trim().startsWith('[') || pp.tech_requirements.trim().startsWith('{')) {
          const res = JSON.parse(pp.tech_requirements);
          setTechRiderItems(Array.isArray(res) ? res : [res]);
        } else {
          setTechRiderItems([{ id: 'legacy', type: 'Blasinstrument / Sonstiges', count: 1, connection: 'Line-In', source: 'venue', notes: pp.tech_requirements }]);
        }
      } catch (e) {
        setTechRiderItems([{ id: 'legacy', type: 'Blasinstrument / Sonstiges', count: 1, connection: 'Line-In', source: 'venue', notes: pp.tech_requirements }]);
      }
    } else {
      setTechRiderItems([]);
    }
    setNewPpChairs(String(pp.chairs_needed || 0));
    setNewPpStands(String(pp.music_stands_needed || 0));
    setNewPpRemarks(pp.remarks || '');
    
    const assignedStudents = pp.additional_feedback_responses?.assigned_students || [];
    setNewPpSelectedStudentIds(assignedStudents);
    
    const loadedSongs = pp.songs && Array.isArray(pp.songs) ? pp.songs : [];
    if (loadedSongs.length === 0 && pp.title) {
      setAddedSongs([{
        title: pp.title,
        artist: pp.artist || '',
        composer: pp.composer || '',
        arranger: pp.arranger || ''
      }]);
    } else {
      setAddedSongs(loadedSongs);
    }
    setTeacherOverlayTab(tab);
  };

  const handleCreateProgramPoint = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teacherSubmissionEvent) return;
    if (!newPpEnsemble.trim()) {
      alert('Bitte fülle das Feld Ensemble / Band aus.');
      return;
    }
    const perfCount = parseInt(newPpPerformerCount, 10) || 1;
    const dur = parseInt(newPpDuration, 10) || 10;
    const chairs = parseInt(newPpChairs, 10) || 0;
    const stands = parseInt(newPpStands, 10) || 0;

    if (perfCount <= 0 || dur <= 0 || chairs < 0 || stands < 0) {
      alert('Bitte geben Sie gültige positive Werte für Teilnehmer, Dauer, Stühle und Notenständer ein.');
      return;
    }

    setSubmittingPp(true);
    try {
      const finalSongs = [...addedSongs];
      if (newPpTitle.trim()) {
        finalSongs.push({
          title: newPpTitle.trim(),
          artist: newPpArtist.trim(),
          composer: newPpComposer.trim(),
          arranger: newPpArranger.trim()
        });
      }

      const firstSong = finalSongs[0];

      const { data, error } = await supabase
        .from('campus_event_program_points')
        .insert({
          event_id: teacherSubmissionEvent.id,
          school_id: schoolId,
          teacher_id: userId,
          name: newPpName.trim() || newPpEnsemble.trim(),
          ensemble_band: newPpEnsemble.trim() || null,
          performer_count: perfCount,
          duration: dur,
          preferred_time: newPpPreferredTime.trim() || null,
          title: firstSong ? firstSong.title : null,
          artist: firstSong ? firstSong.artist : null,
          composer: firstSong ? firstSong.composer : null,
          arranger: firstSong ? firstSong.arranger : null,
          publisher: newPpPublisher.trim() || null,
          tech_requirements: techRiderItems.length > 0 ? JSON.stringify(techRiderItems) : null,
          chairs_needed: chairs,
          music_stands_needed: stands,
          remarks: newPpRemarks.trim() || null,
          status: 'submitted',
          sort_order: programPoints.length,
          songs: finalSongs,
          additional_feedback_responses: {
            assigned_students: newPpSelectedStudentIds
          }
        })
        .select()
        .single();

      if (error) throw error;
      setProgramPoints(prev => [...prev, data]);
      
      // Clear form
      setNewPpName('');
      setNewPpEnsemble('');
      setNewPpPerformerCount('1');
      setNewPpDuration('10');
      setNewPpPreferredTime('');
      setNewPpTitle('');
      setNewPpArtist('');
      setNewPpComposer('');
      setNewPpArranger('');
      setNewPpPublisher('');
      setNewPpTechRequirements('');
      setTechRiderItems([]);
      setBuilderNotes('');
      setNewPpChairs('0');
      setNewPpStands('0');
      setNewPpRemarks('');
      setAddedSongs([]);
      setNewPpSelectedStudentIds([]);
      alert('Programmpunkt erfolgreich eingereicht! 🎉');
    } catch (err: any) {
      alert('Fehler beim Einreichen: ' + err.message);
    } finally {
      setSubmittingPp(false);
    }
  };

  const handleUpdateProgramPoint = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPpId) return;
    const perfCount = parseInt(newPpPerformerCount, 10) || 1;
    const dur = parseInt(newPpDuration, 10) || 10;
    const chairs = parseInt(newPpChairs, 10) || 0;
    const stands = parseInt(newPpStands, 10) || 0;

    if (perfCount <= 0 || dur <= 0 || chairs < 0 || stands < 0) {
      alert('Bitte geben Sie gültige positive Werte für Teilnehmer, Dauer, Stühle und Notenständer ein.');
      return;
    }

    try {
      const finalSongs = [...addedSongs];
      if (newPpTitle.trim()) {
        finalSongs.push({
          title: newPpTitle.trim(),
          artist: newPpArtist.trim(),
          composer: newPpComposer.trim(),
          arranger: newPpArranger.trim()
        });
      }

      const firstSong = finalSongs[0];
      const currentPp = programPoints.find(p => p.id === editingPpId);
      const originalStudents = currentPp?.additional_feedback_responses?.assigned_students || [];
      const studentsChanged = JSON.stringify(originalStudents) !== JSON.stringify(newPpSelectedStudentIds);

      const updatePayload: any = {
        name: newPpName.trim() || newPpEnsemble.trim(),
        ensemble_band: newPpEnsemble.trim() || null,
        performer_count: perfCount,
        duration: dur,
        preferred_time: newPpPreferredTime.trim() || null,
        title: firstSong ? firstSong.title : null,
        artist: firstSong ? firstSong.artist : null,
        composer: firstSong ? firstSong.composer : null,
        arranger: firstSong ? firstSong.arranger : null,
        publisher: newPpPublisher.trim() || null,
        tech_requirements: techRiderItems.length > 0 ? JSON.stringify(techRiderItems) : null,
        chairs_needed: chairs,
        music_stands_needed: stands,
        remarks: newPpRemarks.trim() || null,
        songs: finalSongs
      };

      if (studentsChanged) {
        updatePayload.additional_feedback_responses = {
          ...(currentPp?.additional_feedback_responses || {}),
          assigned_students: newPpSelectedStudentIds
        };
      }

      const { data, error } = await supabase
        .from('campus_event_program_points')
        .update(updatePayload)
        .eq('id', editingPpId)
        .select()
        .single();

      if (error) throw error;
      setProgramPoints(prev => prev.map(pp => pp.id === editingPpId ? data : pp));
      setEditingPpId(null);
      
      // Clear form
      setNewPpName('');
      setNewPpEnsemble('');
      setNewPpPerformerCount('1');
      setNewPpDuration('10');
      setNewPpPreferredTime('');
      setNewPpTitle('');
      setNewPpArtist('');
      setNewPpComposer('');
      setNewPpArranger('');
      setNewPpPublisher('');
      setNewPpTechRequirements('');
      setTechRiderItems([]);
      setBuilderNotes('');
      setNewPpChairs('0');
      setNewPpStands('0');
      setNewPpRemarks('');
      setAddedSongs([]);
      setNewPpSelectedStudentIds([]);
      alert('Programmpunkt erfolgreich aktualisiert!');
    } catch (err: any) {
      alert('Fehler beim Aktualisieren: ' + err.message);
    }
  };

  const handleAutoSave = async () => {
    if (!editingPpId) return;
    const perfCount = parseInt(newPpPerformerCount, 10) || 1;
    const dur = parseInt(newPpDuration, 10) || 10;
    const chairs = parseInt(newPpChairs, 10) || 0;
    const stands = parseInt(newPpStands, 10) || 0;

    try {
      const finalSongs = [...addedSongs];
      const firstSong = finalSongs[0];
      const currentPp = programPoints.find(p => p.id === editingPpId);
      const originalStudents = currentPp?.additional_feedback_responses?.assigned_students || [];
      const studentsChanged = JSON.stringify(originalStudents) !== JSON.stringify(newPpSelectedStudentIds);

      const updatePayload: any = {
        name: newPpName.trim() || newPpEnsemble.trim(),
        ensemble_band: newPpEnsemble.trim() || null,
        performer_count: perfCount,
        duration: dur,
        preferred_time: newPpPreferredTime.trim() || null,
        title: firstSong ? firstSong.title : null,
        artist: firstSong ? firstSong.artist : null,
        composer: firstSong ? firstSong.composer : null,
        arranger: firstSong ? firstSong.arranger : null,
        publisher: newPpPublisher.trim() || null,
        tech_requirements: techRiderItems.length > 0 ? JSON.stringify(techRiderItems) : null,
        chairs_needed: chairs,
        music_stands_needed: stands,
        remarks: newPpRemarks.trim() || null,
        songs: finalSongs
      };

      if (studentsChanged) {
        updatePayload.additional_feedback_responses = {
          ...(currentPp?.additional_feedback_responses || {}),
          assigned_students: newPpSelectedStudentIds
        };
      }

      const { data, error } = await supabase
        .from('campus_event_program_points')
        .update(updatePayload)
        .eq('id', editingPpId)
        .select()
        .single();

      if (error) throw error;
      setProgramPoints(prev => prev.map(pp => pp.id === editingPpId ? data : pp));
    } catch (err: any) {
      console.error('Error in handleAutoSave:', err);
      throw err;
    }
  };

  const handleTabSwitch = async (newTab: 'einreichung' | 'technik' | 'schueler' | 'feedback' | 'packliste' | 'summary') => {
    if (editingPpId) {
      try {
        await handleAutoSave();
      } catch (err) {
        console.error('Error auto-saving during tab switch:', err);
      }
    }
    setTeacherOverlayTab(newTab);
  };

  const handleDeleteProgramPoint = async (ppId: string) => {
    if (!confirm('Diesen Programmpunkt wirklich löschen?')) return;
    try {
      const { error } = await supabase
        .from('campus_event_program_points')
        .delete()
        .eq('id', ppId);
      if (error) throw error;
      setProgramPoints(prev => prev.filter(pp => pp.id !== ppId));
    } catch (err: any) {
      alert('Fehler beim Löschen: ' + err.message);
    }
  };

  const handleSaveTeacherFeedback = async (pp: any) => {
    const questions = pp.additional_feedback_responses?.questions || [];
    const existingAnswers = pp.additional_feedback_responses?.answers || [];
    const answers: string[] = [];
    
    for (let i = 0; i < questions.length; i++) {
      const ansKey = `${pp.id}_${i}`;
      const newAnswer = feedbackAnswers[ansKey]?.trim();
      if (existingAnswers[i] && existingAnswers[i].trim() !== '') {
        answers.push(existingAnswers[i]);
      } else {
        answers.push(newAnswer || '');
      }
    }

    const hasEmpty = answers.some(ans => !ans || ans.trim() === '');
    if (hasEmpty) {
      alert('Bitte beantworte alle offenen Rückfragen!');
      return;
    }

    try {
      const updatedFeedback = {
        ...pp.additional_feedback_responses,
        answers,
        status: 'responded'
      };
      const { data, error } = await supabase
        .from('campus_event_program_points')
        .update({ additional_feedback_responses: updatedFeedback })
        .eq('id', pp.id)
        .select()
        .single();
      if (error) throw error;
      setProgramPoints(prev => prev.map(p => p.id === pp.id ? data : p));
      alert('Rückmeldung erfolgreich übermittelt!');
    } catch (err: any) {
      alert('Fehler beim Übermitteln der Rückmeldung: ' + err.message);
    }
  };

  // Fetch or generate QR token for secure iCal URL
  useEffect(() => {
    const fetchOrCreateToken = async () => {
      try {
        const { data, error } = await supabase
          .from('users')
          .select('qr_token')
          .eq('id', userId)
          .single();
        if (error) throw error;
        if (data && data.qr_token) {
          setUserQrToken(data.qr_token);
        } else {
          setGeneratingToken(true);
          const newToken = Array.from(crypto.getRandomValues(new Uint8Array(16)))
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');
          const { error: updateErr } = await supabase
            .from('users')
            .update({ qr_token: newToken })
            .eq('id', userId);
          if (updateErr) throw updateErr;
          setUserQrToken(newToken);
        }
      } catch (err) {
        console.warn('Error fetching or creating user QR token for iCal:', err);
      } finally {
        setGeneratingToken(false);
      }
    };
    if (userId) {
      fetchOrCreateToken();
    }
  }, [userId]);

  // Fetch all initial data
  useEffect(() => {
    fetchLessons();
    fetchCustomEvents();
    fetchSchoolCalendarSettings();
    fetchSchoolRooms();
    fetchAnnouncements();
    if (role === 'student') {
      fetchStudentEnsembles();
      fetchStudentProgramPoints();
    }
  }, [userId, schoolId, role]);


  // Handle auto-open of event planning submissions from teacher dashboard
  useEffect(() => {
    if (customEvents.length > 0) {
      const autoEventId = localStorage.getItem('groovelab_auto_submit_event_id');
      if (autoEventId) {
        const ev = customEvents.find(e => e.id === autoEventId);
        if (ev) {
          setTeacherSubmissionEvent(ev);
          const autoTab = localStorage.getItem('groovelab_auto_submit_tab');
          if (autoTab === 'feedback') {
            setTeacherOverlayTab('feedback');
          } else {
            setTeacherOverlayTab('einreichung');
          }
        }
        localStorage.removeItem('groovelab_auto_submit_event_id');
        localStorage.removeItem('groovelab_auto_submit_tab');
      }
    }
  }, [customEvents]);


  // Re-check room availability when date, start time or end time changes (Column 3 create form)
  useEffect(() => {
    if (formLocationType === 'intern' && formDate && formStartTime && formEndTime) {
      fetchAvailableRooms(formDate, formStartTime, formEndTime);
    }
  }, [formDate, formStartTime, formEndTime, formLocationType]);

  // Close participant dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (participantSearchRef.current && !participantSearchRef.current.contains(e.target as Node)) {
        setParticipantSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch occurrence-specific chat messages
  const fetchChat = async (studentId: string, occurrenceId: string) => {
    if (!userId || !studentId || !occurrenceId) return;
    try {
      const { data, error } = await supabase
        .from('campus_direct_messages')
        .select('*')
        .eq('occurrence_id', occurrenceId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      if (data) {
        setChatMessages(data);
        setTimeout(() => chatMessagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 60);
      }
    } catch (err) {
      console.error('Error fetching chat messages for occurrence:', err);
    }
  };

  useEffect(() => {
    if (!activeChatOcc) {
      setChatMessages([]);
      return;
    }
    const studentId = role === 'student' ? userId : activeChatOcc.student_id;
    if (!studentId) return;

    fetchChat(studentId, activeChatOcc.id);

    const channel = supabase
      .channel(`chat_occ_board_${activeChatOcc.id}`)
      .on('postgres_changes', { 
        schema: 'public', 
        event: '*', 
        table: 'campus_direct_messages', 
        filter: `occurrence_id=eq.${activeChatOcc.id}` 
      }, () => {
        fetchChat(studentId, activeChatOcc.id);
        setActiveChatOccIds(prev => {
          const newSet = new Set(prev);
          newSet.add(activeChatOcc.id);
          return newSet;
        });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeChatOcc, userId, role]);

  const handleSendChatMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatTypedMessage.trim() || !activeChatOcc) return;

    const studentId = role === 'student' ? userId : activeChatOcc.student_id;
    const recipientId = role === 'student' ? activeChatOcc.teacher_id : activeChatOcc.student_id;
    if (!studentId || !recipientId) return;

    const messageContent = chatTypedMessage.trim();
    setChatTypedMessage('');

    try {
      // Optimistic update
      const tempId = `temp-${Date.now()}`;
      const optimisticMessage = {
        id: tempId,
        sender_id: userId,
        recipient_id: recipientId,
        content: messageContent,
        occurrence_id: activeChatOcc.id,
        created_at: new Date().toISOString(),
        is_read: false
      };
      setChatMessages(prev => [...prev, optimisticMessage]);
      setTimeout(() => chatMessagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);

      const { error } = await supabase.from('campus_direct_messages').insert({
        sender_id: userId,
        recipient_id: recipientId,
        content: messageContent,
        occurrence_id: activeChatOcc.id
      });
      if (error) throw error;

      setActiveChatOccIds(prev => {
        const newSet = new Set(prev);
        newSet.add(activeChatOcc.id);
        return newSet;
      });

      // Send push notification to recipient
      try {
        const { data: recipientProfile } = await supabase
          .from('users')
          .select('is_campus_active')
          .eq('id', recipientId)
          .single();

        if (recipientProfile && recipientProfile.is_campus_active) {
          const { data: senderProfile } = await supabase
            .from('users')
            .select('first_name')
            .eq('id', userId)
            .single();
          const senderName = senderProfile?.first_name || 'Deine Lehrkraft';

          await supabase.functions.invoke('send-push', {
            body: {
              userId: recipientId,
              title: `Termin-Shoutbox 💬`,
              body: `${senderName}: ${messageContent}`,
              url: '/'
            }
          });
        }
      } catch (pushErr) {
        console.error('Failed to dispatch push notification for shoutbox:', pushErr);
      }

      await fetchChat(studentId, activeChatOcc.id);
    } catch (err) {
      console.error('Error sending chat message:', err);
    }
  };

  // Smart search for participants (debounced 250ms)
  useEffect(() => {
    if (!participantQuery.trim() || participantQuery.trim().length < 1) {
      setParticipantResults([]);
      setParticipantSearchOpen(false);
      return;
    }
    const timer = setTimeout(async () => {
      setParticipantLoading(true);
      try {
        const q = participantQuery.trim();
        const results: {id: string; name: string; type: 'student' | 'ensemble' | 'band'; detail?: string}[] = [];

        // Search students
        let studentQuery = supabase
          .from('users')
          .select('id, first_name, last_name, instrument')
          .eq('school_id', schoolId)
          .eq('role', 'student');

        if (role === 'teacher') {
          if (myStudentIds.length > 0) {
            studentQuery = studentQuery.in('id', myStudentIds);
          } else {
            studentQuery = studentQuery.eq('id', '00000000-0000-0000-0000-000000000000');
          }
        }

        const { data: students } = await studentQuery
          .or(`first_name.ilike.%${q}%,last_name.ilike.%${q}%`)
          .limit(8);

        if (students) {
          students.forEach((s: any) => {
            results.push({ id: s.id, name: `${s.first_name} ${s.last_name}`, type: 'student', detail: s.instrument || undefined });
          });
        }

        // Search ensembles
        const { data: ensembles } = await supabase
          .from('ensembles')
          .select('id, name, genre')
          .eq('school_id', schoolId)
          .ilike('name', `%${q}%`)
          .limit(5);
        if (ensembles) {
          ensembles.forEach((e: any) => {
            results.push({ id: e.id, name: e.name, type: 'ensemble', detail: e.genre || undefined });
          });
        }

        // Search bands
        const { data: bands } = await supabase
          .from('bands')
          .select('id, name, genre')
          .eq('school_id', schoolId)
          .ilike('name', `%${q}%`)
          .limit(5);
        if (bands) {
          bands.forEach((b: any) => {
            results.push({ id: b.id, name: b.name, type: 'band', detail: b.genre || undefined });
          });
        }

        setParticipantResults(results);
        setParticipantSearchOpen(results.length > 0);
      } catch (err) {
        console.warn('Participant search error:', err);
      } finally {
        setParticipantLoading(false);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [participantQuery, schoolId, role, myStudentIds]);



  const normalizeTitle = (t: string) => (t || '').trim().toLowerCase();
  const normalizeTime = (t: string) => {
    if (!t) return '00:00';
    const match = t.match(/^(\d{2}):(\d{2})/);
    return match ? `${match[1]}:${match[2]}` : '00:00';
  };

  const getEventColors = (ev: any) => {
    const COLOR_MAP: Record<string, { color: string, bg: string }> = {
      '#a855f7': { color: '#a855f7', bg: '#f3e8ff' }, // Lila
      '#f59e0b': { color: '#f59e0b', bg: '#fef3c7' }, // Gelb
      '#3b82f6': { color: '#3b82f6', bg: '#eff6ff' }, // Blau
      '#ef4444': { color: '#ef4444', bg: '#fee2e2' }, // Rot
      '#10b981': { color: '#10b981', bg: '#ecfdf5' }, // Grün
    };

    if (ev.color && COLOR_MAP[ev.color]) {
      return COLOR_MAP[ev.color];
    }

    const tLower = (ev.title || '').toLowerCase();
    const cLower = (ev.category || '').toLowerCase();

    if (cLower.includes('ferien') || cLower.includes('feiertag') || tLower.includes('ferien') || tLower.includes('feiertag') || tLower.includes('schulfrei') || tLower.includes('holiday') || tLower.includes('break')) {
      return { color: '#10b981', bg: '#ecfdf5' };
    }
    if (cLower.includes('vorspiel') || cLower.includes('klassenvorspiel') || tLower.includes('vorspiel') || tLower.includes('klassenvorspiel') || tLower.includes('schülervorspiel') || tLower.includes('recital')) {
      return { color: '#3b82f6', bg: '#eff6ff' };
    }
    if (cLower.includes('fest') || tLower.includes('fest') || tLower.includes('weihnachtsfeier') || tLower.includes('party') || tLower.includes('feier')) {
      return { color: '#10b981', bg: '#ecfdf5' }; // Grün (was Orange)
    }
    if (cLower.includes('konzert') || cLower.includes('auftritt') || tLower.includes('konzert') || tLower.includes('auftritt') || tLower.includes('show') || tLower.includes('gig')) {
      return { color: '#a855f7', bg: '#f3e8ff' };
    }
    if (cLower.includes('probe') || cLower.includes('ensemble') || cLower.includes('bandprobe') || tLower.includes('probe') || tLower.includes('bandprobe') || tLower.includes('ensemble') || tLower.includes('rehearsal')) {
      return { color: '#f59e0b', bg: '#fef3c7' };
    }
    if (cLower.includes('konferenz') || cLower.includes('sitzung') || cLower.includes('meeting') || tLower.includes('konferenz') || tLower.includes('sitzung') || tLower.includes('meeting') || tLower.includes('besprechung') || tLower.includes('lehrerkonferenz') || tLower.includes('fortbildung')) {
      return { color: '#ef4444', bg: '#fee2e2' };
    }

    if (ev.is_subscribed) {
      return { color: '#64748b', bg: '#f1f5f9' };
    }
    return { color: '#6366f1', bg: '#e0e7ff' };
  };

  const handleSelectEvent = (ev: any) => {
    const colors = getEventColors(ev);
    const isMyEvent = ev.created_by === userId;
    setSelectedEvent({ ...ev, isMyEvent, catColor: colors.color, catBg: colors.bg });
    // Pre-fill visibility editor for admin/secretary
    setEditVisibility(ev.visibility || 'all');
  };

  const handleActivatePlanning = async (ev: any) => {
    // Check if there is already an override/copy in customEvents
    const existingOverride = !ev.is_subscribed ? ev : customEvents.find(c => 
      normalizeTitle(c.title) === normalizeTitle(ev.title) && 
      c.event_date === ev.event_date && 
      normalizeTime(c.start_time) === normalizeTime(ev.start_time)
    );

    if (existingOverride) {
      try {
        const { data, error } = await supabase
          .from('campus_events')
          .update({ is_planning_active: true })
          .eq('id', existingOverride.id)
          .select('*, room:room_id(id, name)')
          .single();

        if (error) throw error;
        if (data) {
          setCustomEvents(prev => prev.map(x => x.id === data.id ? data : x));
          alert('Termin wurde für die Event-Planung aktiviert! 🎉');
        }
      } catch (err: any) {
        alert('Aktivieren für Event-Planung fehlgeschlagen: ' + err.message);
      }
    } else {
      // Subscribed event with no override copy yet - insert a new copy with is_planning_active = true
      try {
        const { data, error } = await supabase
          .from('campus_events')
          .insert({
            school_id: schoolId,
            title: ev.title,
            description: ev.description || '',
            event_date: ev.event_date,
            start_time: ev.start_time + ':00',
            category: ev.category || 'Schultermin',
            created_by: userId,
            visibility: ev.visibility || 'all',
            is_public: (ev.visibility || 'all') === 'all',
            is_planning_active: true
          })
          .select('*, room:room_id(id, name)')
          .single();

        if (error) throw error;
        if (data) {
          setCustomEvents(prev => [...prev, data]);
          alert('Termin wurde für die Event-Planung dupliziert und aktiviert! 🎉');
        }
      } catch (err: any) {
        alert('Aktivieren für Event-Planung fehlgeschlagen: ' + err.message);
      }
    }
  };

  const handleDragStart = (e: React.DragEvent, ev: any) => {
    e.dataTransfer.setData('text/plain', JSON.stringify(ev));
    e.dataTransfer.effectAllowed = 'copy';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    if (role === 'admin' || role === 'secretary') {
      setIsDragOverPlanning(true);
    }
  };

  const handleDragLeave = () => {
    setIsDragOverPlanning(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOverPlanning(false);
    if (role !== 'admin' && role !== 'secretary') return;
    try {
      const dataStr = e.dataTransfer.getData('text/plain');
      if (!dataStr) return;
      const ev = JSON.parse(dataStr);
      if (ev.is_planning_active) {
        alert('Dieses Event ist bereits in der Event-Planung aktiv.');
        return;
      }
      await handleActivatePlanning(ev);
    } catch (err) {
      console.error('Drag and drop error:', err);
    }
  };

  // Save ONLY visibility for a campus_event (admin/secretary only)
  const saveVisibility = async () => {
    if (!selectedEvent) return;
    setSavingVisibility(true);
    try {
      if (selectedEvent.is_subscribed) {
        // Create a custom event database override for this subscribed event
        const { data, error } = await supabase
          .from('campus_events')
          .insert({
            school_id: schoolId,
            title: selectedEvent.title,
            description: selectedEvent.description || '',
            event_date: selectedEvent.event_date,
            start_time: selectedEvent.start_time + ':00',
            category: selectedEvent.category || 'Schultermin',
            created_by: userId,
            visibility: editVisibility,
            is_public: editVisibility === 'all'
          })
          .select('*, room:room_id(id, name)')
          .single();

        if (error) throw error;
        if (data) {
          setCustomEvents(prev => [...prev, data]);
          setSelectedEvent(null); // Close modal
        }
      } else {
        const { data, error } = await supabase
          .from('campus_events')
          .update({ visibility: editVisibility, is_public: editVisibility === 'all' })
          .eq('id', selectedEvent.id)
          .select('*, room:room_id(id, name)')
          .single();
        if (error) throw error;
        if (data) {
          setCustomEvents(prev => prev.map(x => x.id === data.id ? data : x));
          setSelectedEvent(null); // Close modal
        }
      }
    } catch (err: any) {
      alert('Speichern der Sichtbarkeit fehlgeschlagen: ' + err.message);
    } finally {
      setSavingVisibility(false);
    }
  };



  // Fetch school settings for subscribed calendar
  const fetchSchoolCalendarSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('schools')
        .select('calendar_url, opening_hours')
        .eq('id', schoolId)
        .single();
      
      if (error) throw error;
      const campusSettings = data?.opening_hours?.campus_settings || {};
      setIcalActive(campusSettings.ical_active !== false);
      if (data?.calendar_url) {
        setCalendarUrl(data.calendar_url);
        fetchSubscribedCalendar(data.calendar_url);
      }
    } catch (err) {
      console.error('Error fetching calendar settings:', err);
    }
  };

  // Parse iCal / ICS data client side
  const parseICS = (icsText: string): any[] => {
    const events: any[] = [];
    const lines = icsText.split(/\r?\n/);
    let currentEvent: any = null;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line === 'BEGIN:VEVENT') {
        currentEvent = {};
      } else if (line === 'END:VEVENT' && currentEvent) {
        if (currentEvent.summary && currentEvent.dtstart) {
          events.push(currentEvent);
        }
        currentEvent = null;
      } else if (currentEvent) {
        const colonIdx = line.indexOf(':');
        if (colonIdx !== -1) {
          const key = line.substring(0, colonIdx);
          const value = line.substring(colonIdx + 1);

          if (key.startsWith('SUMMARY')) {
            currentEvent.summary = value;
          } else if (key.startsWith('DESCRIPTION')) {
            currentEvent.description = value.replace(/\\n/g, '\n');
          } else if (key.startsWith('DTSTART')) {
            currentEvent.rawStart = value;
            currentEvent.dtstart = parseICSDate(value);
          } else if (key.startsWith('DTEND')) {
            currentEvent.rawEnd = value;
            currentEvent.dtend = parseICSDate(value);
          } else if (key.startsWith('LOCATION')) {
            currentEvent.location = value;
          }
        }
      }
    }
    return events;
  };

  // Convert iCal format (e.g. 20260611T180000Z) to standard Date object
  const parseICSDate = (icsDateStr: string): Date => {
    // Clean parameter prefix e.g. VALUE=DATE:20260611
    const cleanStr = icsDateStr.includes(':') ? icsDateStr.split(':')[1] : icsDateStr;
    const year = parseInt(cleanStr.substring(0, 4));
    const month = parseInt(cleanStr.substring(4, 6)) - 1;
    const day = parseInt(cleanStr.substring(6, 8));

    if (cleanStr.includes('T')) {
      const hour = parseInt(cleanStr.substring(9, 11));
      const min = parseInt(cleanStr.substring(11, 13));
      const sec = parseInt(cleanStr.substring(13, 15));
      return new Date(Date.UTC(year, month, day, hour, min, sec));
    }
    return new Date(year, month, day);
  };

  // Fetch ICS Feed and parse
  const fetchSubscribedCalendar = async (url: string) => {
    if (!url) return;
    setLoadingCalendar(true);
    setCalendarError(null);

    try {
      // Direct client fetch fallback to proxy if blocked by CORS
      let text = '';
      try {
        const res = await fetch(url);
        if (!res.ok) throw new Error();
        text = await res.text();
      } catch (corsErr) {
        // Fallback CORS proxy helper chain
        const proxies = [
          `https://corsproxy.io/?${url}`,
          `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`
        ];

        let success = false;
        for (const proxyUrl of proxies) {
          try {
            console.log(`Trying proxy: ${proxyUrl}`);
            const res = await fetch(proxyUrl);
            if (!res.ok) continue;
            
            if (proxyUrl.includes('allorigins')) {
              const json = await res.json();
              text = json.contents;
            } else {
              text = await res.text();
            }

            if (text && text.includes('BEGIN:VCALENDAR')) {
              success = true;
              break;
            }
          } catch (proxyErr) {
            console.warn(`Proxy ${proxyUrl} failed:`, proxyErr);
          }
        }

        if (!success) {
          throw new Error('All CORS proxies failed');
        }
      }

      const parsed = parseICS(text).map((ev: any, index: number) => {
        const title = ev.summary || 'Abonnierter Termin';
        const isHoliday = title.toLowerCase().includes('ferien') || title.toLowerCase().includes('feiertag') || title.toLowerCase().includes('schulfrei');
        
        const isAllDay = ev.rawEnd && !ev.rawEnd.includes('T');
        let end = ev.dtend ? new Date(ev.dtend) : new Date(ev.dtstart);
        if (ev.dtend && isAllDay) {
          end.setDate(end.getDate() - 1);
        }
        
        const toYYYYMMDD = (d: Date) => {
          const y = d.getFullYear();
          const m = String(d.getMonth() + 1).padStart(2, '0');
          const day = String(d.getDate()).padStart(2, '0');
          return `${y}-${m}-${day}`;
        };

        return {
          id: `subscribed-${index}`,
          title: title,
          description: ev.description || '',
          event_date: ev.dtstart ? toYYYYMMDD(ev.dtstart) : '',
          event_end_date: toYYYYMMDD(end),
          start_time: ev.dtstart ? ev.dtstart.toTimeString().substring(0, 5) : '00:00',
          category: isHoliday ? 'Ferien' : 'Schultermin',
          is_subscribed: true
        };
      });

      setSubscribedEvents(parsed);
    } catch (err) {
      console.warn('CORS feed load failed, displaying default/demo calendar entries for this school URL.');
      setCalendarError('Kalender-Feed konnte nicht direkt geladen werden (CORS). Zeige Demo-Kalenderdaten.');
      
      // Inject standard school demo calendar events to ensure a perfect aesthetic
      setSubscribedEvents([
        {
          id: 'sub-demo-1',
          title: 'Großes Sommerkonzert 2026',
          description: 'Unser alljährliches Sommer-Konzert in der Stadthalle. Alle Ensembles spielen!',
          event_date: '2026-06-25',
          start_time: '18:00',
          category: 'Konzert',
          is_subscribed: true
        },
        {
          id: 'sub-demo-2',
          title: 'Lehrerkonferenz & Planungs-Meeting',
          description: 'Meeting aller Lehrkräfte zur Organisation des kommenden Semesters.',
          event_date: '2026-07-02',
          start_time: '10:00',
          category: 'Konferenz',
          is_subscribed: true
        },
        {
          id: 'sub-demo-3',
          title: 'Klassenvorspiel Klavier & Flöte',
          description: 'Schüler präsentieren ihre erlernten Stücke im Kammermusiksaal.',
          event_date: '2026-06-18',
          start_time: '16:00',
          category: 'Klassenvorspiel',
          is_subscribed: true
        }
      ]);
    } finally {
      setLoadingCalendar(false);
    }
  };

  // Fetch teaching schedules/occurrences for Column 1
  const fetchLessons = async () => {
    setLoadingLessons(true);
    try {
      const todayStr = new Date().toLocaleDateString('sv-SE');
      // School year: September 1 to July 31 of the following year (August is excluded)
      const now = new Date();
      const schoolStartYear = now.getMonth() >= 8 ? now.getFullYear() : now.getFullYear() - 1;
      const startYear = `${schoolStartYear}-09-01`;
      const endYear = `${schoolStartYear + 1}-07-31`;

      // 1. Load regular schedules
      let scheduleQuery = supabase
        .from('schedules')
        .select(`
          *,
          teacher:teacher_id(first_name, last_name),
          student:student_id(first_name, last_name)
        `);

      if (role === 'student') {
        scheduleQuery = scheduleQuery.eq('student_id', userId);
      } else {
        scheduleQuery = scheduleQuery.eq('teacher_id', userId);
      }

      const { data: schedules, error: schErr } = await scheduleQuery;
      if (schErr) throw schErr;

      // 2. Load overrides/occurrences
      let occurrenceQuery = supabase
        .from('schedule_occurrences')
        .select(`
          *,
          teacher:teacher_id(first_name, last_name),
          student:student_id(first_name, last_name)
        `);

      if (role === 'student') {
        occurrenceQuery = occurrenceQuery.eq('student_id', userId);
      } else {
        occurrenceQuery = occurrenceQuery.eq('teacher_id', userId);
      }

      const { data: occurrences, error: occErr } = await occurrenceQuery;
      if (occErr) throw occErr;

      // Extract teacher's students to filter participant search
      if (role === 'teacher') {
        const studentIdsSet = new Set<string>();
        if (schedules) {
          schedules.forEach((s: any) => {
            if (s.student_id) studentIdsSet.add(s.student_id);
          });
        }
        if (occurrences) {
          occurrences.forEach((o: any) => {
            if (o.student_id) studentIdsSet.add(o.student_id);
          });
        }
        setMyStudentIds(Array.from(studentIdsSet));
      }


      // Generate visual list of occurrences for the school year
      const schoolYearStart = new Date(startYear);
      const schoolYearEnd = new Date(endYear);
      const allMergedOccurrences: LessonOccurrence[] = [];
      const usedActualIds = new Set<string>();

      if (schedules) {
        schedules.forEach((sch: any) => {
          if (!sch.student_id) return; // Skip unassigned slots/breaks
          let current = new Date(schoolYearStart);
          while (current <= schoolYearEnd) {
            const currentDay = current.getDay() || 7;
            const diff = sch.day_of_week - currentDay;
            const targetDate = new Date(current);
            targetDate.setDate(current.getDate() + diff);

            // Skip dates in August (month index 7) — outside school year
            if (targetDate >= schoolYearStart && targetDate <= schoolYearEnd && targetDate.getMonth() !== 7) {
              const dateStr = targetDate.toLocaleDateString('sv-SE');

              // Check if override exists
              const actual = occurrences?.find((occ: any) => 
                (occ.schedule_id === sch.id) && 
                (occ.original_date === dateStr || (!occ.original_date && occ.date === dateStr))
              );

              if (actual) {
                if (actual.student_id) {
                  allMergedOccurrences.push({
                    ...actual,
                    schedule: sch
                  });
                  usedActualIds.add(actual.id);
                }
              } else {
                allMergedOccurrences.push({
                  id: `virtual-${sch.id}-${dateStr}`,
                  schedule_id: sch.id,
                  student_id: sch.student_id,
                  teacher_id: sch.teacher_id,
                  date: dateStr,
                  start_time: sch.time_slot + (sch.time_slot.split(':').length === 2 ? ':00' : ''),
                  duration: sch.duration || 45,
                  status: sch.status === 'canceled_by_teacher_sick' ? 'teacher_sick' : 'scheduled',
                  is_virtual: true,
                  teacher: sch.teacher,
                  student: sch.student,
                  schedule: sch
                });
              }
            }
            current.setDate(current.getDate() + 7);
          }
        });
      }

      if (occurrences) {
        occurrences.forEach((occ: any) => {
          if (!occ.student_id) return; // Skip unassigned slots/breaks
          if (!usedActualIds.has(occ.id)) {
            allMergedOccurrences.push(occ);
          }
        });
      }

      // Sort chronologically
      allMergedOccurrences.sort((a, b) => {
        if (a.date !== b.date) return a.date.localeCompare(b.date);
        return (a.start_time || '').localeCompare(b.start_time || '');
      });

      setLessons(allMergedOccurrences);

      // Fetch active conversations (occurrence_ids that have messages)
      const { data: activeChats } = await supabase
        .from('campus_direct_messages')
        .select('occurrence_id');

      if (activeChats) {
        const occIds = new Set<string>(activeChats.map((c: any) => c.occurrence_id).filter(Boolean));
        setActiveChatOccIds(occIds);
      }
    } catch (err) {
      console.error('Error fetching lessons schedule:', err);
    } finally {
      setLoadingLessons(false);
    }
  };

  // Fetch custom created events
  const fetchCustomEvents = async () => {
    setLoadingEvents(true);
    try {
      const { data, error } = await supabase
        .from('campus_events')
        .select('*, room:room_id(id, name)')
        .eq('school_id', schoolId)
        .order('event_date', { ascending: true })
        .order('start_time', { ascending: true });
      
      if (error) throw error;
      setCustomEvents(data || []);
    } catch (err) {
      console.error('Error fetching custom events:', err);
    } finally {
      setLoadingEvents(false);
    }
  };

  // Load all rooms for this school
  const fetchSchoolRooms = async () => {
    try {
      const { data } = await supabase
        .from('rooms')
        .select('id, name, floor')
        .eq('school_id', schoolId)
        .eq('is_campus_active', true)
        .order('sort_order', { ascending: true });
      setSchoolRooms(data || []);
    } catch (err) {
      console.warn('Could not load school rooms:', err);
    }
  };

  const fetchAnnouncements = async () => {
    try {
      const { data } = await supabase
        .from('campus_announcements')
        .select('*')
        .eq('school_id', schoolId)
        .order('created_at', { ascending: false })
        .limit(20);
      setSchoolAnnouncements(data || []);
    } catch (err) {
      console.warn('Could not load campus announcements:', err);
    }
  };

  // Fetch ensembles/bands where current student is a member
  const fetchStudentEnsembles = async () => {
    try {
      const { data, error } = await supabase
        .from('ensemble_members')
        .select('ensemble_id')
        .eq('student_id', userId);
      if (error) throw error;
      if (data) {
        setStudentEnsembleIds(data.map((m: any) => m.ensemble_id).filter(Boolean));
      }
    } catch (err) {
      console.warn('Error fetching student ensembles:', err);
    }
  };

  const fetchStudentProgramPoints = async () => {
    if (role !== 'student' || !userId) return;
    setLoadingStudentProgramPoints(true);
    try {
      const { data, error } = await supabase
        .from('campus_event_program_points')
        .select('*')
        .eq('status', 'approved');
      if (error) throw error;
      const filtered = (data || []).filter((pp: any) => {
        const assigned = pp.additional_feedback_responses?.assigned_students || [];
        return assigned.includes(userId);
      });
      setStudentProgramPoints(filtered);
    } catch (err) {
      console.error('Error fetching student program points:', err);
    } finally {
      setLoadingStudentProgramPoints(false);
    }
  };

  const fetchSelectedStudentEventPoints = async (eventId: string) => {
    setLoadingSelectedStudentEventPoints(true);
    try {
      const { data, error } = await supabase
        .from('campus_event_program_points')
        .select('*')
        .eq('event_id', eventId)
        .eq('status', 'approved')
        .order('stage_number', { ascending: true })
        .order('sort_order', { ascending: true });
      if (error) throw error;
      setSelectedEventAllPoints(data || []);
    } catch (err) {
      console.error('Error fetching selected student event program points:', err);
    } finally {
      setLoadingSelectedStudentEventPoints(false);
    }
  };


  const isAssignedToEvent = (ev: any) => {
    if (ev.student_id === userId) return true;
    if (ev.assigned_student_ids && ev.assigned_student_ids.includes(userId)) return true;
    if (ev.ensemble_id && studentEnsembleIds.includes(ev.ensemble_id)) return true;
    if (ev.band_id && studentEnsembleIds.includes(ev.band_id)) return true;
    return false;
  };



  // Check which rooms are available on a given date + time (for Column 3 create form)
  const fetchAvailableRooms = async (date: string, startTime: string, endTime: string) => {
    if (!date || !startTime || schoolRooms.length === 0) {
      setAvailableRooms(schoolRooms);
      return;
    }
    setCheckingRooms(true);

    try {
      const start = startTime; // 'HH:MM'
      const end = endTime || (() => {
        const [h, m] = startTime.split(':').map(Number);
        const endMins = h * 60 + m + 60;
        return `${String(Math.floor(endMins / 60)).padStart(2, '0')}:${String(endMins % 60).padStart(2, '0')}`;
      })();

      // Get the day_of_week for the date (1=Mon...7=Sun)
      const d = new Date(date);
      const rawDay = d.getDay();
      const dayOfWeek = rawDay === 0 ? 7 : rawDay;

      // Fetch booked room_ids: from schedules (recurring)
      const { data: schedBooked } = await supabase
        .from('schedules')
        .select('room_id, time_slot, duration')
        .eq('school_id', schoolId)
        .eq('day_of_week', dayOfWeek)
        .not('room_id', 'is', null);

      // Fetch booked room_ids: from campus_events on exact date
      const { data: evBooked } = await supabase
        .from('campus_events')
        .select('room_id, start_time, end_time')
        .eq('school_id', schoolId)
        .eq('event_date', date)
        .not('room_id', 'is', null);

      // Fetch booked room_ids: from room_bookings on exact date
      let rbBooked: any[] = [];
      try {
        const { data: rb } = await supabase
          .from('room_bookings')
          .select('room_id, start_time, end_time')
          .eq('school_id', schoolId)
          .eq('date', date);
        rbBooked = rb || [];
      } catch (_) { /* table may not exist yet */ }

      // Helper: check time overlap
      const overlaps = (aStart: string, aEnd: string, bStart: string, bEnd: string) => {
        return aStart < bEnd && aEnd > bStart;
      };

      const bookedRoomIds = new Set<string>();

      (schedBooked || []).forEach((s: any) => {
        const sStart = (s.time_slot || '00:00').substring(0, 5);
        const durMins = s.duration || 45;
        const [sh, sm] = sStart.split(':').map(Number);
        const endMins = sh * 60 + sm + durMins;
        const sEnd = `${String(Math.floor(endMins / 60)).padStart(2, '0')}:${String(endMins % 60).padStart(2, '0')}`;
        if (overlaps(sStart, sEnd, start, end)) {
          bookedRoomIds.add(s.room_id);
        }
      });

      (evBooked || []).forEach((ev: any) => {
        const evStart = (ev.start_time || '00:00').substring(0, 5);
        const evEnd = ev.end_time ? ev.end_time.substring(0, 5) : (() => {
          const [h, m] = evStart.split(':').map(Number);
          const em = h * 60 + m + 60;
          return `${String(Math.floor(em / 60)).padStart(2, '0')}:${String(em % 60).padStart(2, '0')}`;
        })();
        if (overlaps(evStart, evEnd, start, end)) {
          bookedRoomIds.add(ev.room_id);
        }
      });

      rbBooked.forEach((rb: any) => {
        const rbStart = (rb.start_time || '00:00').substring(0, 5);
        const rbEnd = rb.end_time ? rb.end_time.substring(0, 5) : (() => {
          const [h, m] = rbStart.split(':').map(Number);
          const em = h * 60 + m + 60;
          return `${String(Math.floor(em / 60)).padStart(2, '0')}:${String(em % 60).padStart(2, '0')}`;
        })();
        if (overlaps(rbStart, rbEnd, start, end)) {
          bookedRoomIds.add(rb.room_id);
        }
      });

      const filteredRooms = schoolRooms.filter(r => !bookedRoomIds.has(r.id));
      setAvailableRooms(filteredRooms);
      // Reset selected room if it's no longer available in create form
      if (formRoomId && bookedRoomIds.has(formRoomId)) {
        setFormRoomId('');
      }
    } catch (err) {
      console.warn('Room availability check failed:', err);
      setAvailableRooms(schoolRooms);
    } finally {
      setCheckingRooms(false);
    }
  };

  // Handle Event Creation (Column 3 Form Submission)

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim() || !formDate || !formStartTime || !formCategory) {
      alert('Bitte fülle alle Pflichtfelder aus.');
      return;
    }

    setSubmittingForm(true);
    try {
      const eventPayload: any = {
        school_id: schoolId,
        title: formTitle.trim(),
        description: formDescription.trim() || null,
        event_date: formDate,
        start_time: formStartTime + ':00',
        end_time: formEndTime ? formEndTime + ':00' : null,
        category: formCategory,
        created_by: userId,
        is_public: formVisibility === 'all',
        color: formColor || null,
        visibility: formVisibility,
        location_type: formLocationType,
        room_id: formLocationType === 'intern' && formRoomId ? formRoomId : null,
        location_extern: formLocationType === 'extern' && formLocationExtern.trim() ? formLocationExtern.trim() : null,
        is_planning_active: true
      };

      const { data, error } = await supabase
        .from('campus_events')
        .insert(eventPayload)
        .select('*, room:room_id(id, name)')
        .single();
      
      if (error) throw error;

      // Auto-create room booking if intern room was selected (teachers/admins/secretary only)
      if (formLocationType === 'intern' && formRoomId && role !== 'student') {
        try {
          await supabase.from('room_bookings').insert({
            school_id: schoolId,
            room_id: formRoomId,
            booked_by: userId,
            campus_event_id: data.id,
            date: formDate,
            start_time: formStartTime + ':00',
            end_time: formEndTime ? formEndTime + ':00' : null,
            title: formTitle.trim()
          });
        } catch (rbErr) {
          console.warn('Could not create room booking (table may not exist yet):', rbErr);
        }
      }

      setCustomEvents(prev => [...prev, data].sort((a, b) => {
        if (a.event_date !== b.event_date) return a.event_date.localeCompare(b.event_date);
        return a.start_time.localeCompare(b.start_time);
      }));

      // Reset Form fields
      setFormTitle('');
      setFormDate('');
      setFormStartTime('');
      setFormEndTime('');
      setFormCategory('Sonstiges');
      setFormDescription('');
      setFormIsPublic(false);
      setFormColor('');
      setFormVisibility('all');
      setSelectedParticipants([]);
      setParticipantQuery('');
      setFormLocationType('none');
      setFormRoomId('');
      setFormLocationExtern('');

      alert('Termin erfolgreich angelegt! 🎉');
    } catch (err: any) {
      alert('Fehler beim Anlegen: ' + err.message);
    } finally {
      setSubmittingForm(false);
    }
  };

  // Delete event handler
  const handleDeleteEvent = async (id: string) => {
    const ev = customEvents.find(x => x.id === id);
    const isOverride = ev && subscribedEvents.some(sub => 
      normalizeTitle(sub.title) === normalizeTitle(ev.title) && 
      sub.event_date === ev.event_date && 
      normalizeTime(sub.start_time) === normalizeTime(ev.start_time)
    );

    const confirmMsg = isOverride 
      ? 'Möchtest du die Sichtbarkeitseinstellung dieses abonnierten Termins wirklich zurücksetzen?'
      : 'Möchtest du diesen Termin wirklich löschen?';

    if (!confirm(confirmMsg)) return;

    try {
      const { error } = await supabase
        .from('campus_events')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      setCustomEvents(prev => prev.filter(ev => ev.id !== id));
    } catch (err: any) {
      alert('Löschen fehlgeschlagen: ' + err.message);
    }
  };

  // Undo cancellation handler for students/teachers
  const handleUndoCancel = async (occ: any) => {
    if (!confirm('Möchtest du diese Absage wirklich rückgängig machen?')) return;
    try {
      if (!occ.id) return;

      if (occ.id.toString().startsWith('virtual-')) {
        if (occ.status === 'teacher_sick' || occ.status === 'canceled_by_teacher_sick') {
          const { error: updErr } = await supabase
            .from('schedules')
            .update({ status: 'approved' })
            .eq('id', occ.schedule_id)
            .eq('status', 'canceled_by_teacher_sick');
          if (updErr) throw updErr;
          await fetchLessons();
        }
        return;
      }

      if (occ.schedule_id) {
        // Recurring template-derived slot: delete the cancellation override row to restore template default
        const { error: delErr } = await supabase
          .from('schedule_occurrences')
          .delete()
          .eq('id', occ.id);
        if (delErr) throw delErr;
      } else {
        // One-off slot: update status back to 'scheduled'
        const { error: updErr } = await supabase
          .from('schedule_occurrences')
          .update({ status: 'scheduled' })
          .eq('id', occ.id);
        if (updErr) throw updErr;
      }

      // Refresh local schedule state
      await fetchLessons();
    } catch (err: any) {
      console.error('Error undoing cancellation:', err);
      alert('Fehler beim Rückgängigmachen der Absage: ' + err.message);
    }
  };

  // Timeline Events merger (Column 2 merges custom + subscribed)
  const getMergedTimelineEvents = () => {
    const todayStr = new Date().toLocaleDateString('sv-SE');
    
    // Filter out subscribed events that have a customized copy (which overrides the subscription visibility/details)
    const filteredSubscribed = subscribedEvents.filter(sub => {
      const hasCustomCopy = customEvents.some(c => 
        c.visibility !== 'private' &&
        normalizeTitle(c.title) === normalizeTitle(sub.title) && 
        c.event_date === sub.event_date && 
        normalizeTime(c.start_time) === normalizeTime(sub.start_time)
      );
      return !hasCustomCopy;
    });

    // Filter custom events visible to this user
    const filteredCustom = customEvents.filter(ev => {
      // Exclude private copies of subscribed calendar events from Column 2
      if (ev.visibility === 'private') return false;

      // Admins and Secretaries can see everything
      if (role === 'admin' || role === 'secretary') return true;

      // Teachers see events created by themselves, public events, or events specifically visible to teachers (or students), or events that are active for planning
      if (role === 'teacher') {
        return ev.created_by === userId || ev.is_public || ev.visibility === 'all' || ev.visibility === 'teachers' || ev.visibility === 'students' || ev.is_planning_active;
      }

      // Students see events created by themselves, public events, events specifically visible to students, OR if they are explicitly assigned to it
      if (role === 'student') {
        const isAssigned = (ev.assigned_student_ids || []).includes(userId) || ev.student_id === userId;
        return ev.created_by === userId || ev.is_public || ev.visibility === 'all' || ev.visibility === 'students' || isAssigned;
      }

      return ev.is_public || ev.created_by === userId;
    });


    const merged = [
      ...filteredSubscribed,
      ...filteredCustom.map(ev => ({
        id: ev.id,
        title: ev.title,
        description: ev.description || '',
        event_date: ev.event_date,
        event_end_date: ev.event_end_date || ev.event_date,
        start_time: (ev.event_start_time || ev.start_time).substring(0, 5),
        end_time: ev.end_time ? ev.end_time.substring(0, 5) : undefined,
        category: ev.category,
        is_subscribed: false,
        created_by: ev.created_by,
        color: ev.color,
        visibility: ev.visibility,
        location_type: ev.location_type,
        room_id: ev.room_id,
        location_extern: ev.location_extern,
        room: ev.room,
        assigned_student_ids: ev.assigned_student_ids || []
      }))
    ];

    // Filter based on selected category tab
    const filteredByCategory = merged.filter(ev => {
      if (eventFilter === 'subscribed') return ev.is_subscribed;
      if (eventFilter === 'custom') return !ev.is_subscribed;
      return true;
    });

    // Only show upcoming events including today or events whose period extends to/beyond today, or if planning is active
    const upcomingEventsOnly = filteredByCategory.filter(ev => {
      const end = ev.event_end_date || ev.event_date;
      return end >= todayStr || ev.is_planning_active;
    });

    // Only show future/recent events (sort chronologically)
    return upcomingEventsOnly.sort((a, b) => {
      if (a.event_date !== b.event_date) return a.event_date.localeCompare(b.event_date);
      return a.start_time.localeCompare(b.start_time);
    });
  };

  // Split lesson list for Column 1
  const getFilteredLessons = () => {
    const todayStr = new Date().toLocaleDateString('sv-SE');
    const nowTimeStr = new Date().toTimeString().substring(0, 8);

    // Filter out holiday lessons
    const holidayRanges = subscribedEvents.filter(ev => ev.category === 'Ferien');

    return lessons.filter(occ => {
      const isHoliday = holidayRanges.some(h => {
        const start = h.event_date;
        const end = h.event_end_date || h.event_date;
        return occ.date >= start && occ.date <= end;
      });
      if (isHoliday) return false;



      const isPast = occ.date < todayStr || (occ.date === todayStr && occ.start_time < nowTimeStr);
      return lessonTab === 'upcoming' ? !isPast : isPast;
    });
  };

  // Helpers for formatting
  const formatDateGerman = (dateStr: string) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}.${parts[1]}.${parts[0]}`;
    }
    const d = new Date(dateStr);
    return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const formatWeekday = (dateStr: string) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
      return d.toLocaleDateString('de-DE', { weekday: 'short' });
    }
    const d = new Date(dateStr);
    return d.toLocaleDateString('de-DE', { weekday: 'short' });
  };

  const getMonthLabel = (monthKey: string) => {
    if (!monthKey) return '';
    const [year, month] = monthKey.split('-');
    const d = new Date(parseInt(year), parseInt(month) - 1, 1);
    return d.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' });
  };

  // --- Layout & Rendering Helpers ---

  // Helper to escape XML characters
  const escapeXmlForExcel = (unsafe: string): string => {
    return String(unsafe).replace(/[<>&'"]/g, (c) => {
      switch (c) {
        case '<': return '&lt;';
        case '>': return '&gt;';
        case '&': return '&amp;';
        case '\'': return '&apos;';
        case '"': return '&quot;';
        default: return c;
      }
    });
  };

  // Export CSV (Fallback)
  const handleExportCSV = () => {
    if (!selectedEvent) return;
    const headers = ['Name', 'Ensemble/Band', 'Repertoire', 'Dauer (Min)', 'Bühne', 'Status', 'Spezielle Wünsche'];
    const rows = programPoints.map(pp => {
      const songsList = pp.songs && Array.isArray(pp.songs) ? pp.songs : pp.title ? [{ title: pp.title, artist: pp.artist }] : [];
      const songsFormatted = songsList.map((song: any) => `${song.title}${song.artist ? ` (${song.artist})` : ''}`).join('; ');
      return [
        pp.name,
        pp.ensemble_band || '',
        songsFormatted,
        pp.duration,
        pp.stage_number || 1,
        pp.status,
        pp.remarks || ''
      ];
    });
    const csvContent = [headers.join(','), ...rows.map(r => r.map(val => `"${String(val).replace(/"/g, '""')}"`).join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `event_${selectedEvent.title.replace(/\s+/g, '_')}_programm.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export Excel (styled HTML table format that opens natively in Excel/OpenOffice without JRE warnings)
  const handleExportExcel = () => {
    const activeEv = secretaryPlanningEvent || selectedEvent;
    if (!activeEv) return;

    const rowsHTML = programPoints.map((pp, idx) => {
      const songsList = pp.songs && Array.isArray(pp.songs) ? pp.songs : pp.title ? [{ title: pp.title, artist: pp.artist }] : [];
      const songsFormatted = songsList.map((song: any) => `${song.title}${song.artist ? ` (${song.artist})` : ''}`).join('; ');
      const bg = idx % 2 === 0 ? '#ffffff' : '#fbfbfc';
      const statusText = pp.status === 'approved' ? 'Bestätigt' : 'Ausstehend';
      const statusColor = pp.status === 'approved' ? '#34c759' : '#ff9500';

      return `
        <tr style="background-color: ${bg}; height: 30px;">
          <td style="border: 1px solid #e3e3e8; padding: 6px 10px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 13px; color: #1d1d1f; vertical-align: middle;">${escapeXmlForExcel(pp.name || '')}</td>
          <td style="border: 1px solid #e3e3e8; padding: 6px 10px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 13px; color: #1d1d1f; vertical-align: middle;">${escapeXmlForExcel(pp.ensemble_band || '')}</td>
          <td style="border: 1px solid #e3e3e8; padding: 6px 10px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 13px; color: #1d1d1f; vertical-align: middle;">${escapeXmlForExcel(songsFormatted)}</td>
          <td style="border: 1px solid #e3e3e8; padding: 6px 10px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 13px; color: #1d1d1f; text-align: right; vertical-align: middle;">${pp.duration || 0}</td>
          <td style="border: 1px solid #e3e3e8; padding: 6px 10px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 13px; color: #1d1d1f; text-align: center; vertical-align: middle;">${pp.stage_number || 1}</td>
          <td style="border: 1px solid #e3e3e8; padding: 6px 10px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 13px; color: ${statusColor}; font-weight: 600; text-align: center; vertical-align: middle;">${statusText}</td>
          <td style="border: 1px solid #e3e3e8; padding: 6px 10px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 13px; color: #1d1d1f; vertical-align: middle;">${escapeXmlForExcel(pp.remarks || '')}</td>
        </tr>`;
    }).join('');

    const excelContent = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
<head>
<meta http-equiv="content-type" content="text/html; charset=utf-8">
<!--[if gte mso 9]>
<xml>
 <x:ExcelWorkbook>
  <x:ExcelWorksheets>
   <x:ExcelWorksheet>
    <x:Name>Programmablauf</x:Name>
    <x:WorksheetOptions>
     <x:DisplayGridlines/>
    </x:WorksheetOptions>
   </x:ExcelWorksheet>
  </x:ExcelWorksheets>
 </x:ExcelWorkbook>
</xml>
<![endif]-->
<style>
  table { border-collapse: collapse; }
  th { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 13px; font-weight: bold; }
  td { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 13px; }
</style>
</head>
<body>
  <table style="border: 1px solid #cbd5e1; border-collapse: collapse;">
    <tr style="height: 40px;">
      <th colspan="7" style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 18px; font-weight: bold; text-align: left; padding: 10px; color: #1d1d1f; border-bottom: 2px solid #cbd5e1;">${escapeXmlForExcel(activeEv.title)} - Programmliste</th>
    </tr>
    <tr style="background-color: #f5f5f7; height: 32px;">
      <th style="border: 1px solid #cbd5e1; padding: 8px 10px; text-align: left; color: #1d1d1f; width: 180px;">Beitrag / Schüler</th>
      <th style="border: 1px solid #cbd5e1; padding: 8px 10px; text-align: left; color: #1d1d1f; width: 180px;">Ensemble / Band</th>
      <th style="border: 1px solid #cbd5e1; padding: 8px 10px; text-align: left; color: #1d1d1f; width: 250px;">Repertoire</th>
      <th style="border: 1px solid #cbd5e1; padding: 8px 10px; text-align: right; color: #1d1d1f; width: 80px;">Dauer (Min)</th>
      <th style="border: 1px solid #cbd5e1; padding: 8px 10px; text-align: center; color: #1d1d1f; width: 70px;">Bühne</th>
      <th style="border: 1px solid #cbd5e1; padding: 8px 10px; text-align: center; color: #1d1d1f; width: 100px;">Status</th>
      <th style="border: 1px solid #cbd5e1; padding: 8px 10px; text-align: left; color: #1d1d1f; width: 250px;">Spezielle Wünsche / Notizen</th>
    </tr>
    ${rowsHTML}
  </table>
</body>
</html>`;

    const blob = new Blob([excelContent], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `programm_${activeEv.title.replace(/\s+/g, '_')}.xls`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export Visitor Program PDF/Print booklet
  const handleExportPDF = () => {
    const activeEv = secretaryPlanningEvent || selectedEvent;
    if (!activeEv) return;

    // Filter points scheduled on ANY stage, order by stage then sort_order
    const allScheduled = programPoints
      .filter(pp => pp.is_scheduled || pp.is_pause)
      .sort((a, b) => {
        if ((a.stage_number || 1) !== (b.stage_number || 1)) {
          return (a.stage_number || 1) - (b.stage_number || 1);
        }
        return a.sort_order - b.sort_order;
      });

    // Group by stage number
    const stagesMap: Record<number, any[]> = {};
    allScheduled.forEach(pp => {
      const st = pp.stage_number || 1;
      if (!stagesMap[st]) stagesMap[st] = [];
      stagesMap[st].push(pp);
    });

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Bitte erlauben Sie Popups für diese App, um den PDF-Export anzuzeigen.');
      return;
    }

    // Generate table content by stage
    let stagesContentHTML = '';
    const activeEventStartTime = activeEv.event_start_time || activeEv.start_time || '14:00';
    const timeMap = calculateTimelineTimes(programPoints, activeEventStartTime);
    let isFirstStage = true;

    Object.keys(stagesMap).sort((a, b) => parseInt(a) - parseInt(b)).forEach(stageKey => {
      const stageNum = parseInt(stageKey);
      const points = stagesMap[stageNum];

      stagesContentHTML += `
      <div class="stage-section" style="${!isFirstStage ? 'page-break-before: always; margin-top: 30px;' : ''}">
        <div class="stage-header">Bühne ${stageNum}</div>
        <table>
          <thead>
            <tr>
              <th style="width: 15%; text-align: left;">Zeit</th>
              <th style="width: 45%; text-align: left;">Programm &amp; Besetzung</th>
              <th style="width: 40%; text-align: left;">Repertoire / Lieder</th>
            </tr>
          </thead>
          <tbody>
            ${points.map(pp => {
              const timeInfo = timeMap[pp.id] || { start: '--:--', end: '--:--' };
              const songsList = pp.songs && Array.isArray(pp.songs) ? pp.songs : pp.title ? [{ title: pp.title, artist: pp.artist }] : [];
              
              let songsHTML = '';
              if (pp.is_pause) {
                songsHTML = '<span class="pause-badge">Pause</span>';
              } else if (songsList.length > 0) {
                songsHTML = songsList.map((song: any) => `
                  <div class="song-item">
                    <span class="song-title">${song.title}</span>
                    ${song.artist ? `<span class="song-artist">&middot; ${song.artist}</span>` : ''}
                  </div>
                `).join('');
              } else {
                songsHTML = `<span style="color:#8e8e93; font-style:italic; font-size:0.8rem;">${pp.instrument || '-'}</span>`;
              }

              return `
              <tr class="${pp.is_pause ? 'row-pause' : ''}">
                <td class="tabular-time">${timeInfo.start} &ndash; ${timeInfo.end}</td>
                <td>
                  <span class="vertical-accent"></span>
                  <div class="program-title">${pp.is_pause ? '☕ ' : ''}${pp.name}</div>
                  ${!pp.is_pause ? `<div class="program-sub">${pp.ensemble_band || 'Einzelbeitrag'}</div>` : ''}
                </td>
                <td>${songsHTML}</td>
              </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
      `;
      isFirstStage = false;
    });

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>${activeEv.title} - Programmheft</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
          body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif;
            color: #1d1d1f;
            margin: 40px 50px;
            background: #ffffff;
            line-height: 1.5;
            -webkit-font-smoothing: antialiased;
          }
          .header {
            border-bottom: 2px solid #1d1d1f;
            padding-bottom: 20px;
            margin-bottom: 35px;
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
          }
          .header h1 {
            margin: 0;
            font-size: 2rem;
            font-weight: 700;
            letter-spacing: -0.03em;
            color: #1d1d1f;
            text-transform: uppercase;
          }
          .header-meta {
            text-align: right;
            font-size: 0.82rem;
            color: #515154;
            font-weight: 500;
            line-height: 1.5;
          }
          .stage-section {
            margin-bottom: 35px;
          }
          .stage-header {
            font-size: 1.25rem;
            font-weight: 700;
            margin-bottom: 15px;
            color: #1d1d1f;
            border-bottom: 1px solid #1d1d1f;
            padding-bottom: 6px;
            text-transform: uppercase;
            letter-spacing: 0.05em;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            text-align: left;
          }
          th {
            border-bottom: 1px solid rgba(0,0,0,0.1);
            padding: 10px 8px;
            font-size: 0.72rem;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            color: #86868b;
          }
          td {
            padding: 12px 8px;
            border-bottom: 1px solid rgba(0,0,0,0.05);
            font-size: 0.85rem;
            vertical-align: top;
            position: relative;
          }
          .vertical-accent {
            position: absolute;
            left: 0;
            top: 12px;
            bottom: 12px;
            width: 3px;
            background: #007aff;
            border-radius: 2px;
            display: none;
          }
          .tabular-time {
            font-variant-numeric: tabular-nums;
            font-weight: 600;
            color: #1d1d1f;
            font-size: 0.85rem;
          }
          .program-title {
            font-weight: 600;
            font-size: 0.9rem;
            color: #1d1d1f;
          }
          .program-sub {
            font-size: 0.78rem;
            color: #86868b;
            margin-top: 2px;
          }
          .song-item {
            margin-bottom: 4px;
            font-size: 0.82rem;
            line-height: 1.4;
          }
          .song-title {
            font-weight: 600;
            color: #1c1c1e;
          }
          .song-artist {
            color: #86868b;
            margin-left: 4px;
            font-size: 0.76rem;
            font-weight: 400;
          }
          .row-pause {
            background: #fbfbfd;
          }
          .row-pause td {
            color: #86868b;
            border-bottom: 1px solid rgba(0, 0, 0, 0.05);
          }
          .row-pause .vertical-accent {
            display: block;
            background: #ff9500;
          }
          .pause-badge {
            background: rgba(255, 149, 0, 0.08);
            color: #ff9500;
            padding: 2px 6px;
            border-radius: 4px;
            font-size: 0.68rem;
            font-weight: 700;
            letter-spacing: 0.02em;
          }
          .footer {
            margin-top: 50px;
            text-align: center;
            font-size: 0.72rem;
            color: #86868b;
            border-top: 1px solid rgba(0,0,0,0.06);
            padding-top: 20px;
            font-weight: 500;
          }
          @media print {
            body { margin: 15px 20px; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <h1>Programmheft</h1>
            <div style="font-size: 1.15rem; font-weight: 600; margin-top: 4px; color: #515154;">${activeEv.title}</div>
          </div>
          <div class="header-meta">
            <div>Datum: ${new Date(activeEv.event_date).toLocaleDateString('de-DE', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}</div>
            <div>Ort: ${activeEv.location || 'Musikschule'}</div>
            <div>Einlass: ${activeEv.admission_time || '--:--'} Uhr | Beginn: ${activeEv.event_start_time || activeEv.start_time || '--:--'} Uhr</div>
          </div>
        </div>

        ${stagesContentHTML}

        <div class="footer">
          Erstellt von Campus-Groovelab &middot; &copy; ${new Date().getFullYear()}
        </div>

        <script>
          window.addEventListener('load', () => {
            setTimeout(() => {
              window.print();
            }, 500);
          });
        </script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  // Export Stage & Technical Rider PDF/Print (Apple-style iOS widgets and clean table)
  const handleExportTechRiderPDF = () => {
    const activeEv = secretaryPlanningEvent || selectedEvent;
    if (!activeEv) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Bitte erlauben Sie Popups für diese App, um den PDF-Export anzuzeigen.');
      return;
    }

    const stagePoints = programPoints
      .filter(pp => (pp.is_scheduled || pp.is_pause) && (pp.stage_number || 1) === activeStage)
      .sort((a, b) => a.sort_order - b.sort_order);

    // Compute peaks
    const totalChairs = stagePoints.reduce((acc, pp) => acc + (pp.chairs_needed || 0), 0);
    const peakChairs = stagePoints.length > 0 ? Math.max(...stagePoints.map(pp => pp.chairs_needed || 0)) : 0;
    const totalStands = stagePoints.reduce((acc, pp) => acc + (pp.music_stands_needed || 0), 0);
    const peakStands = stagePoints.length > 0 ? Math.max(...stagePoints.map(pp => pp.music_stands_needed || 0)) : 0;

    // Normalize helper inside scope
    const normalizeTechType = (type: string): string => {
      const t = type.trim().toLowerCase();
      if (t.includes('gesang') || t.includes('vocal') || t.includes('mikrofon') || t === 'mic' || t === 'mikro') return 'Mikrofon (Gesang/Amp)';
      if (t.includes('di-box') || t.includes('di box') || t.includes('d.i. box') || t.includes('direct box') || t === 'di') return 'D.I. Box';
      if (t.includes('e-bass') || t === 'bass') return 'E-Bass';
      if (t.includes('keyboard')) return 'Keyboard';
      if (t.includes('e-piano') || t === 'piano' || t === 'klavier') return 'E-Piano';
      if (t.includes('a-gitarre') || t.includes('akustik')) return 'A-Gitarre';
      if (t.includes('e-gitarre') || t === 'gitarre') return 'E-Gitarre';
      if (t.includes('schlagzeug') || t.includes('drumset') || t.includes('e-drum') || t.includes('drums')) return 'Schlagzeug-Set';
      if (t.includes('trompete')) return 'Trompete';
      return type.trim();
    };

    // Calculate peaks per type
    const audioSetup: Record<string, number> = {};
    stagePoints.forEach(pp => {
      if (pp.tech_requirements) {
        const actSetup: Record<string, number> = {};
        try {
          const cleaned = pp.tech_requirements.trim();
          if (cleaned.startsWith('[') || cleaned.startsWith('{')) {
            const items = JSON.parse(cleaned);
            if (Array.isArray(items)) {
              items.forEach((item: any) => {
                const typeName = normalizeTechType(item.type || 'Sonstiges');
                const count = parseInt(item.count, 10) || 1;
                actSetup[typeName] = (actSetup[typeName] || 0) + count;
              });
            }
          } else {
            const typeName = normalizeTechType(pp.tech_requirements);
            actSetup[typeName] = (actSetup[typeName] || 0) + 1;
          }
        } catch (e) {
          const typeName = normalizeTechType(pp.tech_requirements || 'Sonstige Inputs');
          actSetup[typeName] = (actSetup[typeName] || 0) + 1;
        }
        Object.entries(actSetup).forEach(([type, count]) => {
          if (type === 'Schlagzeug-Set') {
            if (techConfig.drumsMode === '4mic') {
              audioSetup['Schlagzeug (Kick)'] = Math.max(audioSetup['Schlagzeug (Kick)'] || 0, 1);
              audioSetup['Schlagzeug (Snare)'] = Math.max(audioSetup['Schlagzeug (Snare)'] || 0, 1);
              audioSetup['Schlagzeug (OH L)'] = Math.max(audioSetup['Schlagzeug (OH L)'] || 0, 1);
              audioSetup['Schlagzeug (OH R)'] = Math.max(audioSetup['Schlagzeug (OH R)'] || 0, 1);
            } else if (techConfig.drumsMode === 'edrum') {
              audioSetup['Schlagzeug (E-Drums, 2x DI)'] = Math.max(audioSetup['Schlagzeug (E-Drums, 2x DI)'] || 0, 1);
            } else {
              // Standard / 7 channels
              audioSetup['Schlagzeug (Kick)'] = Math.max(audioSetup['Schlagzeug (Kick)'] || 0, 1);
              audioSetup['Schlagzeug (Snare)'] = Math.max(audioSetup['Schlagzeug (Snare)'] || 0, 1);
              audioSetup['Schlagzeug (HiHat)'] = Math.max(audioSetup['Schlagzeug (HiHat)'] || 0, 1);
              audioSetup['Schlagzeug (Tom 1)'] = Math.max(audioSetup['Schlagzeug (Tom 1)'] || 0, 1);
              audioSetup['Schlagzeug (Tom 2)'] = Math.max(audioSetup['Schlagzeug (Tom 2)'] || 0, 1);
              audioSetup['Schlagzeug (Tom 3)'] = Math.max(audioSetup['Schlagzeug (Tom 3)'] || 0, 1);
              audioSetup['Schlagzeug (OH L)'] = Math.max(audioSetup['Schlagzeug (OH L)'] || 0, 1);
              audioSetup['Schlagzeug (OH R)'] = Math.max(audioSetup['Schlagzeug (OH R)'] || 0, 1);
            }
          } else if (type === 'Keyboard') {
            if (techConfig.keyboardMode === 'stereo') {
              audioSetup['Keyboard (Stereo, 2x DI)'] = Math.max(audioSetup['Keyboard (Stereo, 2x DI)'] || 0, count * 2);
            } else {
              audioSetup['Keyboard (Mono, 1x DI)'] = Math.max(audioSetup['Keyboard (Mono, 1x DI)'] || 0, count);
            }
          } else if (type === 'E-Piano') {
            if (techConfig.epianoMode === 'stereo') {
              audioSetup['E-Piano (Stereo, 2x DI)'] = Math.max(audioSetup['E-Piano (Stereo, 2x DI)'] || 0, count * 2);
            } else {
              audioSetup['E-Piano (Mono, 1x DI)'] = Math.max(audioSetup['E-Piano (Mono, 1x DI)'] || 0, count);
            }
          } else {
            audioSetup[type] = Math.max(audioSetup[type] || 0, count);
          }
        });
      }
    });

    const activeEventStartTime = activeEv.event_start_time || activeEv.start_time || '14:00';
    const timeMap = calculateTimelineTimes(programPoints, activeEventStartTime);

    // Generate table rows
    const rowsHTML = stagePoints.map((pp, idx) => {
      const timeInfo = timeMap[pp.id] || { start: '--:--', end: '--:--' };
      const prevPp = idx > 0 ? stagePoints[idx - 1] : null;
      const deltaChairs = prevPp ? (pp.chairs_needed || 0) - (prevPp.chairs_needed || 0) : 0;
      const deltaStands = prevPp ? (pp.music_stands_needed || 0) - (prevPp.music_stands_needed || 0) : 0;

      let techItems: any[] = [];
      if (pp.tech_requirements && (pp.tech_requirements.trim().startsWith('[') || pp.tech_requirements.trim().startsWith('{'))) {
        try {
          techItems = JSON.parse(pp.tech_requirements);
        } catch (e) {}
      }

      let signalHTML = '';
      if (!pp.is_pause) {
        if (techItems.length > 0) {
          signalHTML = techItems.map((item: any) => {
            const needsPhantom = item.connection?.toLowerCase().includes('+48') || item.type?.toLowerCase().includes('kondensator');
            return `
            <div class="tech-item-row">
              <span class="tech-check-circle"></span>
              <span style="font-weight: 550;">${item.count}x ${item.type}</span>
              <span class="tech-conn-label">(${item.connection})</span>
              ${needsPhantom ? '<span class="tech-p48-badge">+48V</span>' : ''}
            </div>
            `;
          }).join('');
        } else if (pp.tech_requirements) {
          signalHTML = `<div class="tech-item-row"><span class="tech-check-circle"></span><span>${pp.tech_requirements}</span></div>`;
        } else {
          signalHTML = '<span style="color:#86868b; font-style:italic;">Kein spezieller Audiobedarf</span>';
        }
      } else {
        signalHTML = '-';
      }

      let changeoverHTML = '';
      if (deltaChairs !== 0 || deltaStands !== 0) {
        if (deltaChairs !== 0) changeoverHTML += `<span class="delta-pill ${deltaChairs > 0 ? 'pos' : 'neg'}">${deltaChairs > 0 ? `+${deltaChairs}` : deltaChairs} 🪑</span> `;
        if (deltaStands !== 0) changeoverHTML += `<span class="delta-pill ${deltaStands > 0 ? 'pos' : 'neg'}">${deltaStands > 0 ? `+${deltaStands}` : deltaStands} 🎼</span> `;
      } else {
        changeoverHTML = '<span style="color:#86868b; font-size:0.75rem;">-</span>';
      }

      return `
      <tr class="${pp.is_pause ? 'row-pause' : ''}">
        <td class="tabular-time">${timeInfo.start}<br/><span style="font-size:0.68rem; color:#86868b; font-weight:400;">${timeInfo.end}</span></td>
        <td>
          <span class="vertical-accent"></span>
          <strong>${pp.is_pause ? '☕ ' : ''}${pp.name}</strong><br/>
          <span style="font-size: 0.72rem; color: #86868b;">${pp.is_pause ? '-' : (pp.ensemble_band || 'Einzelbeitrag')}</span>
        </td>
        <td>${signalHTML}</td>
        <td>
          <div style="font-weight: 600;">🪑 ${pp.chairs_needed || 0} &nbsp; 🎼 ${pp.music_stands_needed || 0}</div>
          <div style="margin-top: 4px;">${pp.is_pause ? '-' : changeoverHTML}</div>
        </td>
        <td style="font-size:0.75rem; color:#475569; font-weight:500;">${pp.remarks || '-'}</td>
      </tr>
      `;
    }).join('');

    // Generate Audio Patch list HTML (pill style)
    const audioPatchHTML = Object.entries(audioSetup).map(([name, count]) => `
      <span class="tech-patch-badge">🎙️ ${count}x ${name}</span>
    `).join('') || '<span style="color:#86868b; font-style:italic;">Keine Audiobelegungen</span>';

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Technik-Rundown - Bühne ${activeStage}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;700&display=swap');
          body {
            font-family: 'Outfit', -apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif;
            color: #1d1d1f;
            margin: 40px;
            background: #ffffff;
            line-height: 1.4;
            -webkit-font-smoothing: antialiased;
          }
          .header {
            border-bottom: 1px solid rgba(0,0,0,0.08);
            padding-bottom: 20px;
            margin-bottom: 30px;
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
          }
          .header h1 {
            margin: 0;
            font-size: 1.8rem;
            font-weight: 600;
            letter-spacing: -0.03em;
            color: #1d1d1f;
          }
          .header-meta {
            text-align: right;
            font-size: 0.82rem;
            color: #86868b;
            font-weight: 500;
          }
          .stats-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            margin-bottom: 30px;
          }
          .stats-card {
            border: 1px solid rgba(0,0,0,0.06);
            border-radius: 16px;
            padding: 16px;
            background: #f5f5f7;
            box-shadow: 0 4px 12px rgba(0,0,0,0.01);
          }
          .stats-card-title {
            font-size: 0.62rem;
            font-weight: 700;
            color: #86868b;
            text-transform: uppercase;
            letter-spacing: 0.06em;
            margin-bottom: 8px;
          }
          .tech-patch-badge {
            display: inline-block;
            background: rgba(0, 122, 255, 0.08);
            color: #007aff;
            font-weight: 600;
            font-size: 0.72rem;
            padding: 4px 8px;
            border-radius: 6px;
            margin-right: 6px;
            margin-bottom: 6px;
            border: 1px solid rgba(0, 122, 255, 0.05);
          }
          table {
            width: 100%;
            border-collapse: collapse;
            text-align: left;
          }
          th {
            background: #f5f5f7;
            color: #1d1d1f;
            padding: 10px 12px;
            font-size: 0.68rem;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            border-bottom: 1px solid rgba(0,0,0,0.08);
          }
          td {
            padding: 12px;
            border-bottom: 1px solid rgba(0,0,0,0.05);
            font-size: 0.8rem;
            vertical-align: top;
            position: relative;
          }
          .vertical-accent {
            position: absolute;
            left: 0;
            top: 12px;
            bottom: 12px;
            width: 3px;
            background: #007aff;
            border-radius: 2px;
            display: none;
          }
          .tabular-time {
            font-variant-numeric: tabular-nums;
            font-weight: 600;
          }
          .tech-item-row {
            display: flex;
            align-items: center;
            gap: 6px;
            margin-bottom: 4px;
          }
          .tech-check-circle {
            width: 10px;
            height: 10px;
            border: 1px solid #86868b;
            border-radius: 50%;
            display: inline-block;
            flex-shrink: 0;
          }
          .tech-conn-label {
            color: #86868b;
            font-size: 0.72rem;
          }
          .tech-p48-badge {
            font-size: 0.55rem;
            font-weight: 700;
            background: rgba(255, 149, 0, 0.08);
            color: #ff9500;
            padding: 0 4px;
            border-radius: 3px;
            border: 1px solid rgba(255, 149, 0, 0.05);
          }
          .delta-pill {
            font-size: 0.6rem;
            font-weight: 700;
            padding: 1px 5px;
            border-radius: 4px;
            display: inline-block;
          }
          .delta-pill.pos {
            background: rgba(52, 199, 89, 0.08);
            color: #34c759;
          }
          .delta-pill.neg {
            background: rgba(255, 59, 48, 0.08);
            color: #ff3b30;
          }
          .row-pause {
            background: #fffbeb;
          }
          .row-pause td {
            color: #b45309;
            border-bottom: 1px solid rgba(245, 158, 11, 0.15);
          }
          .row-pause .vertical-accent {
            display: block;
            background: #f59e0b;
          }
          @media print {
            body { margin: 15px; }
            th { background: #f5f5f7 !important; color: #1d1d1f !important; }
            .tech-patch-badge { border: 1px solid rgba(0, 0, 0, 0.08); background: transparent !important; color: #1d1d1f !important; }
            .stats-card { border: 1px solid rgba(0, 0, 0, 0.08); background: transparent !important; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <h1>Bühnen- &amp; Technik-Rider (Bühne ${activeStage})</h1>
            <div style="font-size: 1.05rem; font-weight: 600; color: #475569; margin-top: 4px;">${activeEv.title}</div>
          </div>
          <div class="header-meta">
            <div>Datum: ${new Date(activeEv.event_date).toLocaleDateString('de-DE')}</div>
            <div>Bühne: ${activeStage} von ${stageCount}</div>
          </div>
        </div>

        <div class="stats-grid">
          <div class="stats-card">
            <div class="stats-card-title">Bühnen-Logistik (Maximalbedarf)</div>
            <div style="display: flex; gap: 20px; align-items: center; margin-top: 6px;">
              <div><span style="font-size:1.3rem;">🪑</span> <strong style="font-size:1.15rem;">${peakChairs}</strong> <span style="font-size:0.75rem; color:#86868b; font-weight:500;">Stühle Peak (Gesamt: ${totalChairs})</span></div>
              <div><span style="font-size:1.3rem;">🎼</span> <strong style="font-size:1.15rem;">${peakStands}</strong> <span style="font-size:0.75rem; color:#86868b; font-weight:500;">Ständer Peak (Gesamt: ${totalStands})</span></div>
            </div>
          </div>
          <div class="stats-card">
            <div class="stats-card-title">FOH Audio Patch (Peak-Kanalbelegung)</div>
            <div style="margin-top: 6px;">
              ${audioPatchHTML}
            </div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th style="width: 80px;">Zeit</th>
              <th style="width: 220px;">Beitrag &amp; Besetzung</th>
              <th style="width: 260px;">Signal / Patch (FOH)</th>
              <th style="width: 140px;">Setup &amp; Umbau</th>
              <th>Notizen / Rider</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHTML}
          </tbody>
        </table>

        <div style="margin-top: 50px; text-align: center; font-size: 0.72rem; color: #86868b; border-top: 1px solid rgba(0,0,0,0.06); padding-top: 20px; font-weight: 500;">
          Erstellt von Campus-Groovelab &middot; &copy; ${new Date().getFullYear()}
        </div>

        <script>
          window.addEventListener('load', () => {
            setTimeout(() => {
              window.print();
            }, 500);
          });
        </script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  const renderLessonsColumn = () => {
    return (
      <div style={{
        background: '#ffffff',
        border: '1px solid rgba(0, 0, 0, 0.05)',
        borderRadius: '24px',
        padding: '24px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.02)',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
        height: 'calc(100vh - 120px)',
        overflow: 'hidden'
      }}>
        {/* Title & Right-Aligned Subscribe Button */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 900, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CalendarDays size={18} color={brandColor} /> Unterrichtstermine
            </h3>
            <p style={{ color: '#64748b', fontSize: '0.78rem', margin: '4px 0 0 0', fontWeight: 550 }}>
              Deine persönlichen Stundenplandaten
            </p>
          </div>

          {/* iCal Subscription Button (Noticeable Apple Red) */}
          {icalActive && (
            <button
              onClick={() => setShowIcalModal(true)}
              className="hover-scale pulse-calendar"
              title="Unterrichtstermine abonnieren (iCal)"
              style={{
                border: 'none',
                background: '#ef4444',
                color: '#ffffff',
                padding: '8px 14px',
                borderRadius: '20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                cursor: 'pointer',
                transition: 'all 0.2s',
                boxShadow: '0 4px 12px rgba(239, 68, 68, 0.35)',
                fontSize: '0.78rem',
                fontWeight: 800,
                flexShrink: 0
              }}
            >
              <CalendarPlus size={15} />
              <span>Abonnieren</span>
            </button>
          )}
        </div>

        {/* Tabs switcher */}
        <div style={{
          display: 'flex',
          background: '#f1f5f9',
          padding: '4px',
          borderRadius: '12px',
          gap: '4px'
        }}>
          <button
            onClick={() => {
              if (document.startViewTransition) {
                document.startViewTransition(() => setLessonTab('upcoming'));
              } else {
                setLessonTab('upcoming');
              }
            }}
            style={{
              flex: 1,
              border: 'none',
              background: lessonTab === 'upcoming' ? '#ffffff' : 'transparent',
              color: lessonTab === 'upcoming' ? '#0f172a' : '#64748b',
              padding: '8px 12px',
              borderRadius: '8px',
              fontWeight: 800,
              fontSize: '0.75rem',
              cursor: 'pointer',
              transition: 'all 0.2s',
              boxShadow: lessonTab === 'upcoming' ? '0 2px 4px rgba(0,0,0,0.04)' : 'none'
            }}
          >
            Kommende
          </button>
          <button
            onClick={() => {
              if (document.startViewTransition) {
                document.startViewTransition(() => setLessonTab('past'));
              } else {
                setLessonTab('past');
              }
            }}
            style={{
              flex: 1,
              border: 'none',
              background: lessonTab === 'past' ? '#ffffff' : 'transparent',
              color: lessonTab === 'past' ? '#0f172a' : '#64748b',
              padding: '8px 12px',
              borderRadius: '8px',
              fontWeight: 800,
              fontSize: '0.75rem',
              cursor: 'pointer',
              transition: 'all 0.2s',
              boxShadow: lessonTab === 'past' ? '0 2px 4px rgba(0,0,0,0.04)' : 'none'
            }}
          >
            Vergangene
          </button>
        </div>

        {/* Scrollable list */}
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', paddingRight: '2px' }}>
          {loadingLessons ? (
            <div style={{ textAlign: 'center', padding: '32px', color: '#94a3b8', fontSize: '0.8rem', fontWeight: 600 }}>
              Stundenplan lädt...
            </div>
          ) : getFilteredLessons().length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', border: '1.5px dashed #e2e8f0', borderRadius: '16px', color: '#94a3b8', fontSize: '0.8rem', fontWeight: 600 }}>
              Keine Termine vorhanden.
            </div>
          ) : (() => {
            const grouped: Record<string, any[]> = {};
            const list = getFilteredLessons();
            list.forEach(occ => {
              const monthKey = occ.date.substring(0, 7); // "YYYY-MM"
              if (!grouped[monthKey]) {
                grouped[monthKey] = [];
              }
              grouped[monthKey].push(occ);
            });

            const monthKeys = Object.keys(grouped);
            const currentMonthKey = new Date().toISOString().substring(0, 7);
            monthKeys.sort((a, b) => {
              if (a === currentMonthKey) return -1;
              if (b === currentMonthKey) return 1;
              if (lessonTab === 'past') {
                return b.localeCompare(a);
              }
              return a.localeCompare(b);
            });

            return monthKeys.map((monthKey, idx) => {
              const occs = grouped[monthKey];
              const isExpanded = expandedMonths[monthKey] !== undefined 
                ? expandedMonths[monthKey] 
                : (monthKey === currentMonthKey || idx === 0);

              return (
                <div key={monthKey} style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '8px' }}>
                  {/* Collapsible Month Header */}
                  <div 
                    onClick={() => setExpandedMonths(prev => ({ ...prev, [monthKey]: !isExpanded }))}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 14px',
                      background: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      borderRadius: '12px',
                      cursor: 'pointer',
                      userSelect: 'none',
                      transition: 'all 0.2s',
                      boxShadow: '0 2px 6px rgba(0,0,0,0.01)'
                    }}
                  >
                    <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {isExpanded ? <ChevronDown size={15} color="#64748b" /> : <ChevronRight size={15} color="#64748b" />}
                      {getMonthLabel(monthKey)}
                    </span>
                    <span style={{ fontSize: '0.7rem', fontWeight: 900, color: brandColor, background: `${brandColor}15`, padding: '2px 8px', borderRadius: '6px' }}>
                      {occs.length} {occs.length === 1 ? 'Termin' : 'Termine'}
                    </span>
                  </div>

                  {/* Month Events List */}
                  {isExpanded && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingLeft: '2px' }}>
                      {occs.map((occ) => {
                        const isCanceled = occ.status === 'canceled_by_student' || occ.status === 'cancelled' || occ.status === 'teacher_sick' || occ.status === 'canceled_by_teacher_sick';
                        const isRescheduled = occ.status === 'pending_reschedule' || occ.status === 'rescheduled_confirmed';
                        
                        let rowBg = '#ffffff';
                        let rowBorder = '1px solid #e2e8f0';
                        let textColor = '#0f172a';
                        let subColor = '#64748b';

                        if (isCanceled) {
                          rowBg = '#fef2f2';
                          rowBorder = '1px solid #fee2e2';
                          textColor = '#991b1b';
                          subColor = '#ef4444';
                        } else if (isRescheduled) {
                          rowBg = '#fffbeb';
                          rowBorder = '1px solid #fef3c7';
                          textColor = '#92400e';
                          subColor = '#d97706';
                        }

                        const opponentName = role === 'student'
                          ? `Lehrkraft: ${occ.teacher?.first_name || 'Lehrer'} ${occ.teacher?.last_name || ''}`
                          : `Schüler: ${occ.student?.first_name || 'Schüler'} ${occ.student?.last_name || ''}`;

                        return (
                          <div 
                            key={occ.id}
                            style={{
                              display: 'flex',
                              flexDirection: 'row',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '12px 14px',
                              borderRadius: '14px',
                              background: rowBg,
                              border: rowBorder,
                              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.01)',
                              transition: 'all 0.2s',
                              gap: '12px',
                              boxSizing: 'border-box'
                            }}
                            className="hover-scale-subtle"
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, flex: 1 }}>
                              {/* Date Block */}
                              <div style={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                background: isCanceled ? '#fee2e2' : isRescheduled ? '#fef3c7' : '#f8fafc',
                                borderRadius: '8px',
                                padding: '4px',
                                width: '38px',
                                height: '38px',
                                border: '1px solid rgba(0,0,0,0.03)',
                                flexShrink: 0
                              }}>
                                <span style={{ fontSize: '0.55rem', fontWeight: 900, textTransform: 'uppercase', color: subColor, lineHeight: 1 }}>
                                  {formatWeekday(occ.date)}
                                </span>
                                <span style={{ fontSize: '1rem', fontWeight: 900, color: textColor, lineHeight: 1, marginTop: '2px', fontFamily: 'monospace' }}>
                                  {occ.date.substring(8, 10)}
                                </span>
                              </div>

                               <div style={{ minWidth: 0, flex: 1 }}>
                                 <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'nowrap', minWidth: 0 }}>
                                   <span style={{ fontSize: '0.85rem', fontWeight: 800, color: textColor, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flexShrink: 1, minWidth: 0 }}>
                                     {opponentName}
                                   </span>
                                  {isCanceled && (
                                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                                      <span style={{ fontSize: '0.62rem', fontWeight: 900, textTransform: 'uppercase', color: '#ef4444', background: '#fee2e2', padding: '2px 6px', borderRadius: '6px' }}>
                                        Ausfall
                                      </span>
                                    </div>
                                  )}
                                  {isRescheduled && (
                                    <span style={{ fontSize: '0.62rem', fontWeight: 900, textTransform: 'uppercase', color: '#d97706', background: '#fef3c7', padding: '2px 6px', borderRadius: '6px', flexShrink: 0 }}>
                                      Verschoben
                                    </span>
                                  )}
                                </div>
                                
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.72rem', color: subColor, fontWeight: 700, marginTop: '1px' }}>
                                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <Calendar size={12} /> {formatDateGerman(occ.date)}
                                  </span>
                                  <span>•</span>
                                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <Clock size={12} /> {occ.start_time.substring(0, 5)} Uhr
                                  </span>
                                  <span>•</span>
                                  <span>{occ.duration} Min</span>
                                </div>
                              </div>
                            </div>

                            {/* Right Status */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
                               <button
                                 onClick={(e) => {
                                   e.stopPropagation();
                                   setActiveChatOcc(occ);
                                 }}
                                 title="1:1 Shoutbox öffnen"
                                 style={{
                                   border: 'none',
                                   background: activeChatOcc?.id === occ.id ? '#dcfce7' : '#f1f5f9',
                                   color: activeChatOcc?.id === occ.id ? '#16a34a' : '#475569',
                                   padding: '6px',
                                   borderRadius: '8px',
                                   cursor: 'pointer',
                                   display: 'inline-flex',
                                   alignItems: 'center',
                                   justifyContent: 'center'
                                 }}
                               >
                                 <MessageSquare size={15} />
                               </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            });
          })()}
        </div>
      </div>
    );
  };

  const renderTimelineColumn = () => {
    return (
      <div style={{
        background: '#ffffff',
        border: '1px solid rgba(0, 0, 0, 0.05)',
        borderRadius: '24px',
        padding: '24px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.02)',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
        height: 'calc(100vh - 120px)',
        overflow: 'hidden'
      }}>
        {/* Title */}
        <div>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 900, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Calendar size={18} color={brandColor} /> Campus &amp; Schultermine
          </h3>
          <p style={{ color: '#64748b', fontSize: '0.78rem', margin: '4px 0 0 0', fontWeight: 550 }}>
            Konzerte, Klassenvorspiele &amp; Termine
          </p>
        </div>



        {/* Unified Timeline List */}
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px', paddingRight: '2px' }}>
          {loadingEvents ? (
            <div style={{ textAlign: 'center', padding: '32px', color: '#94a3b8', fontSize: '0.8rem', fontWeight: 600 }}>
              Termine werden geladen...
            </div>
          ) : getMergedTimelineEvents().length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', border: '1.5px dashed #e2e8f0', borderRadius: '16px', color: '#94a3b8', fontSize: '0.8rem', fontWeight: 600 }}>
              Keine Termine eingetragen.
            </div>
          ) : (
            getMergedTimelineEvents().map((ev: any) => {
              const isSubscribed = ev.is_subscribed;
              const isMyEvent = ev.created_by === userId;
              const colors = getEventColors(ev);
              const catColor = colors.color;
              const hasFestInTitle = (ev.title || '').toLowerCase().includes('fest');

              return (
                <div
                  key={ev.id}
                  onClick={() => handleSelectEvent(ev)}
                  draggable={role === 'admin' || role === 'secretary'}
                  onDragStart={e => handleDragStart(e, ev)}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    padding: '16px',
                    borderRadius: '18px',
                    cursor: (role === 'admin' || role === 'secretary') ? 'grab' : 'pointer',
                    background: '#ffffff',
                    border: '1px solid rgba(0, 0, 0, 0.06)',
                    borderLeft: `4px solid ${catColor}`,
                    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.03)',
                    position: 'relative'
                  }}
                  className="hover-scale-subtle"
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                      <span style={{
                        fontSize: '0.68rem',
                        fontWeight: 650,
                        color: catColor,
                        background: `${catColor}14`,
                        padding: '3px 8px',
                        borderRadius: '6px',
                        textTransform: 'uppercase'
                      }}>
                        {ev.category}
                      </span>
                      <span style={{
                        fontSize: '0.68rem',
                        fontWeight: 650,
                        color: ev.visibility === 'teachers' ? '#d97706' : ev.visibility === 'students' ? '#2563eb' : '#64748b',
                        background: ev.visibility === 'teachers' ? '#fef3c7' : ev.visibility === 'students' ? '#dbeafe' : '#f1f5f9',
                        padding: '3px 8px',
                        borderRadius: '6px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}>
                        {ev.visibility === 'teachers' ? '🎓 Nur Lehrer' : ev.visibility === 'students' ? '🎵 Nur Schüler' : '👥 Alle'}
                      </span>
                    </div>

                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      {!isSubscribed && isMyEvent && (
                        <button
                          onClick={e => { e.stopPropagation(); handleDeleteEvent(ev.id); }}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: '#ef4444',
                            cursor: 'pointer',
                            padding: '4px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderRadius: '6px'
                          }}
                          title="Termin löschen"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
                      <h4 style={{ margin: 0, fontSize: '0.94rem', fontWeight: 700, color: '#1d1d1f', textAlign: 'left' }}>
                        {ev.title}
                      </h4>
                      {!ev.is_planning_active && (role === 'admin' || role === 'secretary') && (
                        <button
                          onClick={e => { e.stopPropagation(); handleActivatePlanning(ev); }}
                          style={{
                            background: `${brandColor}12`,
                            border: `1.5px solid ${brandColor}30`,
                            color: brandColor,
                            padding: '3px 8px',
                            borderRadius: '8px',
                            fontSize: '0.68rem',
                            fontWeight: 800,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            transition: 'all 0.15s',
                            whiteSpace: 'nowrap'
                          }}
                          onMouseOver={e => { e.currentTarget.style.background = `${brandColor}22`; }}
                          onMouseOut={e => { e.currentTarget.style.background = `${brandColor}12`; }}
                          title="Für Event-Planung aktivieren"
                        >
                          <CalendarPlus size={12} /> Planen
                        </button>
                      )}
                    </div>
                    <span style={{ fontSize: '0.72rem', fontWeight: 600, color: '#515154', background: '#f5f5f7', padding: '4px 8px', borderRadius: '8px', whiteSpace: 'nowrap' }}>
                      {formatDateGerman(ev.event_date)}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    );
  };

  const renderStudentEventsColumn = () => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    const myAssignedEvents = customEvents.filter(ev => 
      studentProgramPoints.some(pp => pp.event_id === ev.id) || isAssignedToEvent(ev)
    );

    const upcomingEvents = myAssignedEvents.filter(ev => {
      const evDate = new Date(ev.event_date);
      evDate.setHours(0, 0, 0, 0);
      return evDate >= now;
    });

    const pastEvents = myAssignedEvents.filter(ev => {
      const evDate = new Date(ev.event_date);
      evDate.setHours(0, 0, 0, 0);
      return evDate < now;
    });

    const activeEventsList = studentTab === 'upcoming' ? upcomingEvents : pastEvents;

    return (
      <div style={{
        background: '#ffffff',
        border: '1px solid rgba(0, 0, 0, 0.05)',
        borderRadius: '24px',
        padding: '24px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.02)',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
        height: 'calc(100vh - 120px)',
        overflowY: 'auto'
      }}>
        <div>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 900, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CalendarDays size={20} color={brandColor} /> Meine Events
          </h3>
          <p style={{ color: '#64748b', fontSize: '0.74rem', margin: '4px 0 0 0', fontWeight: 550, lineHeight: 1.4 }}>
            Veranstaltungen, bei denen du mitwirkst
          </p>
        </div>

        {/* Tabs switcher */}
        <div style={{
          display: 'flex',
          background: '#f1f5f9',
          padding: '4px',
          borderRadius: '12px',
          gap: '4px'
        }}>
          <button
            onClick={() => setStudentTab('upcoming')}
            style={{
              flex: 1,
              border: 'none',
              background: studentTab === 'upcoming' ? '#ffffff' : 'transparent',
              color: studentTab === 'upcoming' ? '#0f172a' : '#64748b',
              padding: '8px 12px',
              borderRadius: '8px',
              fontWeight: 800,
              fontSize: '0.72rem',
              cursor: 'pointer',
              transition: 'all 0.2s',
              boxShadow: studentTab === 'upcoming' ? '0 2px 4px rgba(0,0,0,0.04)' : 'none'
            }}
          >
            Kommende
          </button>
          <button
            onClick={() => setStudentTab('past')}
            style={{
              flex: 1,
              border: 'none',
              background: studentTab === 'past' ? '#ffffff' : 'transparent',
              color: studentTab === 'past' ? '#0f172a' : '#64748b',
              padding: '8px 12px',
              borderRadius: '8px',
              fontWeight: 800,
              fontSize: '0.72rem',
              cursor: 'pointer',
              transition: 'all 0.2s',
              boxShadow: studentTab === 'past' ? '0 2px 4px rgba(0,0,0,0.04)' : 'none'
            }}
          >
            Vergangene
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {loadingStudentProgramPoints ? (
            <div style={{ textAlign: 'center', padding: '32px', color: '#94a3b8', fontSize: '0.8rem', fontWeight: 600 }}>
              Lädt Events...
            </div>
          ) : activeEventsList.length === 0 ? (
            <div style={{
              background: '#f8fafc',
              border: '1.5px dashed #e2e8f0',
              borderRadius: '16px',
              padding: '32px 16px',
              textAlign: 'center',
              color: '#64748b',
              fontSize: '0.8rem',
              fontWeight: 600
            }}>
              Keine Veranstaltungen gefunden
            </div>
          ) : (
            activeEventsList.map((ev: any) => {
              const colors = getEventColors(ev);
              const eventPps = studentProgramPoints.filter(pp => pp.event_id === ev.id);
              return (
                <div
                  key={ev.id}
                  onClick={() => {
                    setSelectedStudentEvent(ev);
                    fetchSelectedStudentEventPoints(ev.id);
                  }}
                  style={{
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '16px',
                    padding: '16px',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px'
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(0, 0, 0, 0.05)';
                    e.currentTarget.style.borderColor = colors.color;
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.transform = 'none';
                    e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0,0,0,0.02)';
                    e.currentTarget.style.borderColor = '#e2e8f0';
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                    <span style={{
                      fontSize: '0.62rem',
                      fontWeight: 900,
                      color: colors.color,
                      background: colors.bg,
                      padding: '3px 8px',
                      borderRadius: '6px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em'
                    }}>
                      {ev.category}
                    </span>
                    <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b' }}>
                      {formatDateGerman(ev.event_date)}
                    </span>
                  </div>

                  <strong style={{ fontSize: '0.92rem', color: '#0f172a', fontWeight: 800 }}>
                    {ev.title}
                  </strong>

                  {eventPps.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '4px' }}>
                      <span style={{ fontSize: '0.68rem', fontWeight: 750, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.02em' }}>
                        Deine Beiträge:
                      </span>
                      {eventPps.map(pp => (
                        <div 
                          key={pp.id} 
                          style={{ 
                            fontSize: '0.78rem', 
                            fontWeight: 650, 
                            color: '#334155',
                            background: '#f8fafc',
                            padding: '6px 10px',
                            borderRadius: '8px',
                            borderLeft: `3px solid ${colors.color}`,
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                          }}
                        >
                          <span>{pp.name} {pp.title ? `– "${pp.title}"` : ''}</span>
                          {pp.instrument && (
                            <span style={{ fontSize: '0.68rem', background: '#e2e8f0', padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}>
                              {pp.instrument}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    );
  };

  const renderStudentEventDetailModal = () => {
    if (!selectedStudentEvent) return null;
    const ev = selectedStudentEvent;
    const colors = getEventColors(ev);
    
    // Filter the program points for this student
    const studentPps = studentProgramPoints.filter(pp => pp.event_id === ev.id);
    
    // Sort all event program points (scheduled and pause) to calculate correct timeline start times
    const eventStartTimeVal = ev.event_start_time || ev.start_time || '18:00';
    const timeMap = calculateTimelineTimes(selectedEventAllPoints, eventStartTimeVal);

    return (
      <div
        onClick={() => setSelectedStudentEvent(null)}
        style={{
          position: 'fixed', inset: 0, zIndex: 1000,
          background: 'rgba(15,23,42,0.55)',
          backdropFilter: 'blur(6px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '24px',
          animation: 'fadeIn 0.15s ease'
        }}
      >
        <div
          onClick={e => e.stopPropagation()}
          style={{
            background: '#ffffff',
            borderRadius: '24px',
            width: '100%',
            maxWidth: '500px',
            boxShadow: '0 32px 80px rgba(0,0,0,0.22)',
            overflow: 'hidden',
            fontFamily: 'Urbanist, sans-serif',
            border: '1px solid rgba(0, 0, 0, 0.08)',
            display: 'flex',
            flexDirection: 'column',
            maxHeight: '85vh'
          }}
        >
          {/* Color bar */}
          <div style={{ height: '5px', background: colors.color, width: '100%' }} />

          {/* Header */}
          <div style={{ padding: '22px 22px 0 22px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{
                fontSize: '0.65rem', fontWeight: 900, color: colors.color,
                background: colors.bg, padding: '4px 10px', borderRadius: '8px',
                textTransform: 'uppercase', letterSpacing: '0.04em'
              }}>
                {ev.category}
              </span>
              <span style={{
                fontSize: '0.62rem', fontWeight: 800,
                color: '#0369a1',
                background: '#e0f2fe',
                padding: '4px 10px', borderRadius: '8px'
              }}>
                Mein Event
              </span>
            </div>
            <button
              onClick={() => setSelectedStudentEvent(null)}
              style={{
                background: '#f1f5f9', border: 'none', borderRadius: '50%',
                width: '34px', height: '34px', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0
              }}
            >
              <X size={16} color="#64748b" />
            </button>
          </div>

          {/* Body */}
          <div style={{ padding: '16px 22px 24px 22px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Title */}
            <h2 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 900, color: '#0f172a', lineHeight: 1.25 }}>
              {ev.title}
            </h2>

            {/* Date / Time / Room */}
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#f8fafc', padding: '6px 12px', borderRadius: '10px' }}>
                <Calendar size={13} color="#64748b" />
                <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#334155' }}>
                  {new Date(ev.event_date + 'T12:00:00').toLocaleDateString('de-DE', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
                </span>
              </div>
              {(ev.event_start_time || ev.start_time) && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#f8fafc', padding: '6px 12px', borderRadius: '10px' }}>
                  <Clock size={13} color="#64748b" />
                  <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#334155' }}>
                    {(ev.event_start_time || ev.start_time).substring(0, 5)}{ev.end_time ? ` – ${ev.end_time.substring(0, 5)}` : ''} Uhr
                  </span>
                </div>
              )}
            </div>

            {/* Location Address */}
            {(ev.location_extern || (ev.location_type === 'intern' && ev.room)) && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '0.68rem', fontWeight: 750, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.02em' }}>Ort</span>
                <div style={{ fontSize: '0.84rem', fontWeight: 650, color: '#1e293b' }}>
                  {ev.location_type === 'intern' && ev.room ? `Raum: ${ev.room.name}` : ev.location_extern}
                  {ev.location_address && <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '2px' }}>{ev.location_address}</div>}
                </div>
              </div>
            )}

            {/* Description */}
            {ev.event_description && (
              <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: '12px', fontSize: '0.82rem', color: '#475569', lineHeight: 1.5 }}>
                {ev.event_description}
              </div>
            )}

            <div style={{ height: '1px', background: '#e2e8f0', margin: '4px 0' }} />

            {/* Student's contributions */}
            <div>
              <h4 style={{ margin: '0 0 10px 0', fontSize: '0.88rem', fontWeight: 800, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.02em' }}>
                🎸 Deine Auftrittsdetails
              </h4>
              
              {loadingSelectedStudentEventPoints ? (
                <div style={{ textAlign: 'center', padding: '16px', color: '#94a3b8', fontSize: '0.8rem' }}>
                  Details laden...
                </div>
              ) : studentPps.length === 0 ? (
                <div style={{ fontSize: '0.82rem', color: '#64748b', fontStyle: 'italic' }}>
                  Keine direkt zugewiesenen Beiträge gefunden. (Du bist dem Event zugeteilt)
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {studentPps.map(pp => {
                    const scheduledTimes = timeMap[pp.id];
                    return (
                      <div 
                        key={pp.id} 
                        style={{
                          background: '#f8fafc',
                          border: '1px solid #e2e8f0',
                          borderRadius: '16px',
                          padding: '16px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '10px'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <div>
                            <span style={{ fontSize: '0.62rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                              Beitrag
                            </span>
                            <div style={{ fontSize: '0.94rem', fontWeight: 850, color: '#0f172a' }}>
                              {pp.name}
                            </div>
                          </div>
                          
                          {scheduledTimes && (
                            <div style={{ background: `${colors.color}15`, padding: '6px 12px', borderRadius: '10px', textAlign: 'right' }}>
                              <span style={{ fontSize: '0.6rem', fontWeight: 800, color: colors.color, textTransform: 'uppercase', display: 'block' }}>
                                Uhrzeit
                              </span>
                              <strong style={{ fontSize: '0.88rem', fontWeight: 900, color: colors.color }}>
                                {scheduledTimes.start} - {scheduledTimes.end} Uhr
                              </strong>
                            </div>
                          )}
                        </div>

                        {/* Title / Song / Artist */}
                        {(pp.title || pp.artist) && (
                          <div style={{ display: 'flex', gap: '16px', fontSize: '0.8rem' }}>
                            {pp.title && (
                              <div>
                                <span style={{ fontSize: '0.62rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', display: 'block' }}>Titel</span>
                                <span style={{ fontWeight: 650, color: '#334155' }}>"{pp.title}"</span>
                              </div>
                            )}
                            {pp.artist && (
                              <div>
                                <span style={{ fontSize: '0.62rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', display: 'block' }}>Interpret</span>
                                <span style={{ fontWeight: 650, color: '#334155' }}>{pp.artist}</span>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Stage / Instrument / Duration */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', background: '#ffffff', padding: '10px', borderRadius: '10px', border: '1px solid #f1f5f9' }}>
                          <div>
                            <span style={{ fontSize: '0.58rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', display: 'block' }}>Bühne</span>
                            <span style={{ fontSize: '0.78rem', fontWeight: 750, color: '#334155' }}>Bühne {pp.stage_number || 1}</span>
                          </div>
                          <div>
                            <span style={{ fontSize: '0.58rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', display: 'block' }}>Instrument</span>
                            <span style={{ fontSize: '0.78rem', fontWeight: 750, color: '#334155' }}>{pp.instrument || 'Keines'}</span>
                          </div>
                          <div>
                            <span style={{ fontSize: '0.58rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', display: 'block' }}>Dauer</span>
                            <span style={{ fontSize: '0.78rem', fontWeight: 750, color: '#334155' }}>{pp.duration} Min</span>
                          </div>
                        </div>

                        {/* Remarks */}
                        {pp.remarks && (
                          <div>
                            <span style={{ fontSize: '0.62rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', display: 'block' }}>Hinweise / Kommentare</span>
                            <p style={{ margin: '2px 0 0 0', fontSize: '0.76rem', color: '#475569', fontStyle: 'italic' }}>
                              {pp.remarks}
                            </p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderAnnouncementsColumn = () => {
    return (
      <div style={{
        background: '#ffffff',
        border: '1px solid rgba(0, 0, 0, 0.05)',
        borderRadius: '24px',
        padding: '24px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.02)',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
        height: 'calc(100vh - 120px)',
        overflowY: 'auto'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 900, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Info size={20} color={brandColor} /> Infos der Verwaltung
            </h3>
            <p style={{ color: '#64748b', fontSize: '0.74rem', margin: '4px 0 0 0', fontWeight: 550, lineHeight: 1.4 }}>
              Mitteilungen &amp; Ankündigungen der Schulleitung
            </p>
          </div>
          {(role === 'admin' || role === 'secretary') && (
            <button
              onClick={() => setShowAnnForm(f => !f)}
              style={{
                background: showAnnForm ? '#f1f5f9' : brandColor,
                color: showAnnForm ? '#475569' : '#ffffff',
                border: 'none',
                borderRadius: '10px',
                padding: '7px 14px',
                fontSize: '0.75rem',
                fontWeight: 700,
                cursor: 'pointer',
                flexShrink: 0
              }}
            >
              {showAnnForm ? '✕ Schließen' : '＋ Neu'}
            </button>
          )}
        </div>

        {(role === 'admin' || role === 'secretary') && showAnnForm && (
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (!annTitle.trim() || !annMessage.trim()) return;
              setSubmittingAnn(true);
              try {
                const { error } = await supabase
                  .from('campus_announcements')
                  .insert({
                    school_id: schoolId,
                    user_id: userId,
                    title: annTitle.trim(),
                    message: annMessage.trim(),
                    target_type: annTarget
                  });
                if (!error) {
                  setAnnTitle('');
                  setAnnMessage('');
                  setAnnTarget('all');
                  setShowAnnForm(false);
                  fetchAnnouncements();
                }
              } catch (err) {
                console.error(err);
              } finally {
                setSubmittingAnn(false);
              }
            }}
            style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '16px',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px'
            }}
          >
            <input
              placeholder="Titel..."
              value={annTitle}
              onChange={e => setAnnTitle(e.target.value)}
              required
              style={{
                padding: '10px 14px',
                borderRadius: '10px',
                border: '1px solid #cbd5e1',
                fontSize: '0.82rem',
                width: '100%',
                boxSizing: 'border-box'
              }}
            />
            <textarea
              placeholder="Mitteilung schreiben..."
              value={annMessage}
              onChange={e => setAnnMessage(e.target.value)}
              required
              style={{
                padding: '10px 14px',
                borderRadius: '10px',
                border: '1px solid #cbd5e1',
                fontSize: '0.82rem',
                minHeight: '80px',
                width: '100%',
                boxSizing: 'border-box'
              }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
              <select
                value={annTarget}
                onChange={e => setAnnTarget(e.target.value as any)}
                style={{
                  padding: '6px 12px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.74rem',
                  background: '#ffffff'
                }}
              >
                <option value="all">Sichtbar für alle</option>
                <option value="teachers">Nur Lehrkräfte</option>
                <option value="students">Nur Schüler</option>
              </select>
              <button
                type="submit"
                disabled={submittingAnn}
                style={{
                  background: brandColor,
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '10px',
                  padding: '8px 18px',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Speichern
              </button>
            </div>
          </form>
        )}
        {(() => {
          const pendingQPs = programPoints.filter(pp => 
            pp.teacher_id === userId && 
            pp.additional_feedback_responses?.questions?.some((_: any, idx: number) => !pp.additional_feedback_responses.answers?.[idx])
          );
          if (pendingQPs.length === 0) return null;
          
          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <span style={{ fontSize: '0.78rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#b45309' }}>
                ⚠️ Offene Rückfragen ({pendingQPs.length})
              </span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {pendingQPs.map(pp => {
                  const ev = customEvents.find(e => e.id === pp.event_id);
                  const evName = ev ? ev.title : 'Event';
                  return (
                    <div 
                      key={pp.id} 
                      onClick={() => {
                        if (ev) {
                          setTeacherSubmissionEvent(ev);
                          setTeacherOverlayTab('feedback');
                        }
                      }}
                      style={{
                        background: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)',
                        border: '1px solid #f59e0b',
                        borderRadius: '14px',
                        padding: '12px 16px',
                        cursor: 'pointer',
                        boxShadow: '0 4px 12px rgba(245, 158, 11, 0.05)',
                        transition: 'all 0.2s',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '4px'
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.transform = 'translateY(-2px)';
                        e.currentTarget.style.boxShadow = '0 6px 16px rgba(245, 158, 11, 0.1)';
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.transform = 'none';
                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(245, 158, 11, 0.05)';
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#92400e', textTransform: 'uppercase' }}>
                          {evName}
                        </span>
                        <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#b45309' }}>→ Beantworten</span>
                      </div>
                      <strong style={{ fontSize: '0.84rem', color: '#0f172a', fontWeight: 800 }}>
                        {pp.name}
                      </strong>
                      <span style={{ fontSize: '0.74rem', color: '#451a03', fontWeight: 550 }}>
                        {pp.additional_feedback_responses.questions.filter((_: any, idx: number) => !pp.additional_feedback_responses.answers?.[idx]).length} offene Frage(n)
                      </span>
                    </div>
                  );
                })}
              </div>
              <div style={{ height: '1px', background: '#e2e8f0', margin: '8px 0' }} />
            </div>
          );
        })()}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {schoolAnnouncements.length === 0 ? (
            <div style={{
              background: '#f8fafc',
              border: '1.5px dashed #e2e8f0',
              borderRadius: '16px',
              padding: '32px 16px',
              textAlign: 'center'
            }}>
              📋 Keine Mitteilungen
            </div>
          ) : (
            schoolAnnouncements.map((ann: any, idx: number) => {
              const dateObj = new Date(ann.created_at);
              const dateStr = `${dateObj.getDate()}.${dateObj.getMonth() + 1}.${dateObj.getFullYear()}`;

              return (
                <div
                  key={ann.id}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                    paddingBottom: idx < schoolAnnouncements.length - 1 ? '16px' : '0',
                    borderBottom: idx < schoolAnnouncements.length - 1 ? '1px solid #f1f5f9' : 'none'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 600 }}>{dateStr}</span>
                  </div>
                  <strong style={{ fontSize: '0.94rem', color: '#1a253c', fontWeight: 800 }}>{ann.title}</strong>
                  <p style={{ margin: 0, fontSize: '0.82rem', color: '#475569', lineHeight: 1.5 }}>{ann.message}</p>
                </div>
              );
            })
          )}
        </div>
      </div>
    );
  };

  const renderTeacherEventPlanningColumn = () => {
    const todayStr = new Date().toLocaleDateString('sv-SE');
    const allPlanningEvents = customEvents.filter(ev => {
      if (ev.is_subscribed) return false;
      return ev.is_planning_active;
    });

    const filteredPlanningEvents = allPlanningEvents.filter(ev => {
      const end = ev.event_end_date || ev.event_date;
      if (planningEventTab === 'upcoming') {
        return end >= todayStr;
      } else {
        return end < todayStr;
      }
    });

    return (
      <div 
        onDragOver={handleDragOver}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        style={{
          background: '#ffffff',
          border: isDragOverPlanning ? `2px dashed ${brandColor}` : '1px solid rgba(0, 0, 0, 0.05)',
          borderRadius: '24px',
          padding: '24px',
          boxShadow: isDragOverPlanning ? `0 12px 40px ${brandColor}15` : '0 8px 32px rgba(0,0,0,0.02)',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px',
          height: 'calc(100vh - 120px)',
          overflowY: 'auto',
          transition: 'all 0.2s ease',
          transform: isDragOverPlanning ? 'scale(1.01)' : 'none'
        }}
      >
        <div>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 900, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Calendar size={18} color={brandColor} /> {role === 'secretary' ? 'Event-Übersicht' : 'Event-Planung (Lehrer)'}
          </h3>
          <p style={{ color: '#64748b', fontSize: '0.78rem', margin: '4px 0 0 0', fontWeight: 550 }}>
            {role === 'secretary' ? 'Wähle ein Event, um Details & Programm zu sehen' : 'Verfügbare Events zur Programmanmeldung'}
          </p>
        </div>

        {/* Tab Switcher */}
        <div style={{
          display: 'flex',
          background: '#f1f5f9',
          padding: '4px',
          borderRadius: '12px',
          gap: '4px'
        }}>
          <button
            onClick={() => {
              if (document.startViewTransition) {
                document.startViewTransition(() => setPlanningEventTab('upcoming'));
              } else {
                setPlanningEventTab('upcoming');
              }
            }}
            style={{
              flex: 1,
              border: 'none',
              background: planningEventTab === 'upcoming' ? '#ffffff' : 'transparent',
              color: planningEventTab === 'upcoming' ? '#0f172a' : '#64748b',
              padding: '8px 12px',
              borderRadius: '8px',
              fontWeight: 800,
              fontSize: '0.75rem',
              cursor: 'pointer',
              transition: 'all 0.2s',
              boxShadow: planningEventTab === 'upcoming' ? '0 2px 4px rgba(0,0,0,0.04)' : 'none'
            }}
          >
            Aktuelle
          </button>
          <button
            onClick={() => {
              if (document.startViewTransition) {
                document.startViewTransition(() => setPlanningEventTab('past'));
              } else {
                setPlanningEventTab('past');
              }
            }}
            style={{
              flex: 1,
              border: 'none',
              background: planningEventTab === 'past' ? '#ffffff' : 'transparent',
              color: planningEventTab === 'past' ? '#0f172a' : '#64748b',
              padding: '8px 12px',
              borderRadius: '8px',
              fontWeight: 800,
              fontSize: '0.75rem',
              cursor: 'pointer',
              transition: 'all 0.2s',
              boxShadow: planningEventTab === 'past' ? '0 2px 4px rgba(0,0,0,0.04)' : 'none'
            }}
          >
            Vergangene
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {filteredPlanningEvents.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 16px', border: '1.5px dashed #e2e8f0', borderRadius: '16px', color: '#94a3b8', fontSize: '0.8rem', fontWeight: 600 }}>
              {planningEventTab === 'upcoming' ? 'Keine aktuellen Planungsveranstaltungen.' : 'Keine vergangenen Planungsveranstaltungen.'}
            </div>
          ) : (
            filteredPlanningEvents.map(ev => {
              const dateStr = formatDateGerman(ev.event_date);
              return (
                <div
                  key={ev.id}
                  onClick={() => role === 'secretary' ? setSecretaryPlanningEvent(ev) : setTeacherSubmissionEvent(ev)}
                  style={{
                    padding: '16px',
                    borderRadius: '18px',
                    border: '1px solid rgba(0, 0, 0, 0.06)',
                    background: '#ffffff',
                    boxShadow: '0 4px 16px rgba(0,0,0,0.02)',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px'
                  }}
                  className="hover-scale-subtle"
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <span style={{ fontSize: '0.72rem', fontWeight: 700, color: brandColor, background: `${brandColor}12`, padding: '3px 8px', borderRadius: '6px' }}>
                      {ev.category}
                    </span>
                    <span style={{ fontSize: '0.74rem', fontWeight: 600, color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Clock size={12} /> {ev.start_time?.substring(0, 5) || '18:00'} Uhr
                    </span>
                  </div>

                  <h4 style={{ fontSize: '0.94rem', fontWeight: 800, color: '#0f172a', margin: 0, textAlign: 'left', lineHeight: 1.3 }}>
                    {ev.title}
                  </h4>

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', fontSize: '0.74rem', color: '#64748b', fontWeight: 600, borderTop: '1px solid #f1f5f9', paddingTop: '8px', marginTop: '2px' }}>
                    <span>📅 {dateStr}</span>
                    <span>🎭 {ev.stage_count || 1} Bühnen</span>
                    <span>⏱️ {ev.total_duration || 0} Min. gesamt</span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    );
  };

  const renderTeacherSubmissionFormTab = () => {
    return (
      <form onSubmit={editingPpId ? handleUpdateProgramPoint : handleCreateProgramPoint} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
        {editingPpId && (
          <div style={{ background: '#fffbeb', border: '1px solid #f59e0b', padding: '10px 14px', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 650, color: '#b45309', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span>📝 Du bearbeitest: <strong>{newPpEnsemble || newPpName}</strong></span>
              {renderSaveStatus()}
            </span>
            <button type="button" onClick={handleCancelEditing} style={{ background: 'transparent', border: 'none', color: '#ef4444', fontWeight: 800, cursor: 'pointer', fontSize: '0.74rem' }}>
              Bearbeiten beenden
            </button>
          </div>
        )}
        <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
          {editingPpId ? 'Programmpunkt bearbeiten' : 'Neuen Programmpunkt anmelden'}
        </h3>
        
        <div>
          <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '6px' }}>Ensemble / Band *</label>
          <input
            type="text"
            required
            value={newPpEnsemble}
            onChange={e => setNewPpEnsemble(e.target.value)}
            placeholder="z.B. Jazz-Ensemble oder Band XYZ"
            style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1.5px solid #cbd5e1', fontSize: '0.88rem', fontWeight: 650, boxSizing: 'border-box' }}
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '6px' }}>Name des Auftritts / Beitrags (Optional)</label>
            <input
              type="text"
              value={newPpName}
              onChange={e => setNewPpName(e.target.value)}
              placeholder="z.B. Beatles-Medley (falls abweichend)"
              style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1.5px solid #cbd5e1', fontSize: '0.88rem', fontWeight: 650, boxSizing: 'border-box' }}
            />
          </div>
          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '6px' }}>Dauer (Minuten) *</label>
            <input
              type="number"
              required
              min="1"
              value={newPpDuration}
              onChange={e => setNewPpDuration(e.target.value)}
              style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1.5px solid #cbd5e1', fontSize: '0.88rem', fontWeight: 650, boxSizing: 'border-box' }}
            />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '6px' }}>Teilnehmeranzahl</label>
            <input
              type="number"
              min="1"
              value={newPpPerformerCount}
              onChange={e => setNewPpPerformerCount(e.target.value)}
              style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1.5px solid #cbd5e1', fontSize: '0.88rem', fontWeight: 650, boxSizing: 'border-box' }}
            />
          </div>
          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '6px' }}>Wunsch-Uhrzeit (Optional)</label>
            <input
              type="text"
              value={newPpPreferredTime}
              onChange={e => setNewPpPreferredTime(e.target.value)}
              placeholder="z.B. eher am Anfang"
              style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1.5px solid #cbd5e1', fontSize: '0.88rem', fontWeight: 650, boxSizing: 'border-box' }}
            />
          </div>
        </div>

        {/* GEMA section */}
        <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '16px', marginTop: '8px' }}>
          <h4 style={{ fontSize: '0.85rem', fontWeight: 800, color: '#475569', margin: '0 0 12px 0' }}>Repertoire / GEMA</h4>
          
          {/* List of added songs */}
          {addedSongs.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
              {addedSongs.map((song, index) => (
                <div 
                  key={index}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    background: '#f8fafc',
                    padding: '8px 12px',
                    borderRadius: '10px',
                    border: '1px solid #e2e8f0'
                  }}
                >
                  <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#1e293b' }}>
                    {song.artist ? `${song.artist} - ` : ''}{song.title}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleRemoveSong(index)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: '#ef4444',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      padding: '2px'
                    }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
            <input
              placeholder="Titel des Musikstücks"
              value={newPpTitle}
              onChange={e => setNewPpTitle(e.target.value)}
              style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1.5px solid #cbd5e1', fontSize: '0.82rem', boxSizing: 'border-box' }}
            />
            <input
              placeholder="Interpret / Artist"
              value={newPpArtist}
              onChange={e => setNewPpArtist(e.target.value)}
              style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1.5px solid #cbd5e1', fontSize: '0.82rem', boxSizing: 'border-box' }}
            />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
            <input
              placeholder="Komponist"
              value={newPpComposer}
              onChange={e => setNewPpComposer(e.target.value)}
              style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1.5px solid #cbd5e1', fontSize: '0.82rem', boxSizing: 'border-box' }}
            />
            <input
              placeholder="Arrangeur / Verlag"
              value={newPpArranger}
              onChange={e => setNewPpArranger(e.target.value)}
              style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1.5px solid #cbd5e1', fontSize: '0.82rem', boxSizing: 'border-box' }}
            />
          </div>
          <button
            type="button"
            onClick={handleAddSong}
            style={{
              background: '#f1f5f9',
              color: '#475569',
              border: '1px solid #cbd5e1',
              padding: '8px 12px',
              borderRadius: '10px',
              fontSize: '0.78rem',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              width: '100%',
              transition: 'background 0.2s',
              marginBottom: '8px'
            }}
          >
            <span>+ Song hinzufügen</span>
          </button>
        </div>


        {/* Submit Buttons */}
        <div style={{ display: 'flex', gap: '12px', marginTop: '10px' }}>
          {editingPpId ? (
            <>
              <button
                type="submit"
                disabled={submittingPp}
                style={{
                  flex: 1,
                  background: brandColor,
                  color: '#ffffff',
                  border: 'none',
                  padding: '12px',
                  borderRadius: '12px',
                  fontWeight: 800,
                  fontSize: '0.88rem',
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                  opacity: submittingPp ? 0.7 : 1
                }}
              >
                Änderungen speichern
              </button>
              <button
                type="button"
                onClick={() => handleTabSwitch('technik')}
                style={{
                  background: '#f1f5f9',
                  color: '#475569',
                  border: '1px solid #cbd5e1',
                  padding: '12px 20px',
                  borderRadius: '12px',
                  fontWeight: 800,
                  fontSize: '0.88rem',
                  cursor: 'pointer'
                }}
              >
                Weiter ➜
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                if (!newPpEnsemble.trim()) {
                  alert('Bitte fülle das Feld Ensemble / Band aus.');
                  return;
                }
                handleTabSwitch('technik');
              }}
              style={{
                flex: 1,
                background: brandColor,
                color: '#ffffff',
                border: 'none',
                padding: '12px',
                borderRadius: '12px',
                fontWeight: 800,
                fontSize: '0.88rem',
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              Weiter zu Bühnenbedarf & Technik ➜
            </button>
          )}
          {editingPpId && (
            <button
              type="button"
              onClick={handleCancelEditing}
              style={{
                background: '#fef2f2',
                color: '#ef4444',
                border: 'none',
                padding: '12px 20px',
                borderRadius: '12px',
                fontWeight: 800,
                fontSize: '0.88rem',
                cursor: 'pointer'
              }}
            >
              Abbrechen
            </button>
          )}
        </div>
      </form>
    );
  };

  const renderTeacherTechnikTab = () => {
    return (
      <form onSubmit={editingPpId ? handleUpdateProgramPoint : handleCreateProgramPoint} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
        {editingPpId && (
          <div style={{ background: '#fffbeb', border: '1px solid #f59e0b', padding: '10px 14px', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 650, color: '#b45309', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span>📝 Du bearbeitest: <strong>{newPpEnsemble || newPpName}</strong></span>
              {renderSaveStatus()}
            </span>
            <button type="button" onClick={handleCancelEditing} style={{ background: 'transparent', border: 'none', color: '#ef4444', fontWeight: 800, cursor: 'pointer', fontSize: '0.74rem' }}>
              Bearbeiten beenden
            </button>
          </div>
        )}
        <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
          {editingPpId ? 'Bühnenbedarf & Technik bearbeiten' : 'Bühnenbedarf & Technik eintragen'}
        </h3>
        
        {/* Technical Rider / Bühnen-Inputs */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569' }}>Technical Rider / Bühnen-Inputs</label>
          
          {/* List of currently added items */}
          {techRiderItems.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', background: '#f8fafc', padding: '12px', borderRadius: '12px', border: '1px dashed #cbd5e1' }}>
              {techRiderItems.map((item) => {
                let emoji = '🎵';
                if (item.type.toLowerCase().includes('gesang')) emoji = '🎤';
                else if (item.type.toLowerCase().includes('gitarre')) emoji = '🎸';
                else if (item.type.toLowerCase().includes('bass')) emoji = '🎸';
                else if (item.type.toLowerCase().includes('piano') || item.type.toLowerCase().includes('keyboard')) emoji = '🎹';
                else if (item.type.toLowerCase().includes('schlagzeug') || item.type.toLowerCase().includes('drum')) emoji = '🥁';
                else if (item.type.toLowerCase().includes('di-box') || item.type.toLowerCase().includes('di box')) emoji = '🔌';

                return (
                  <div
                    key={item.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 12px',
                      background: '#ffffff',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontSize: '1.2rem' }}>{emoji}</span>
                      <div>
                        <strong style={{ fontSize: '0.82rem', color: '#1e293b' }}>
                          {item.count}x {item.type}
                        </strong>
                        <span style={{ fontSize: '0.7rem', color: '#64748b', display: 'block' }}>
                          Anschluss: {item.connection} | Bereitstellung: {item.source === 'venue' ? 'Gestellt von Schule' : 'Selbst mitgebracht'}
                          {item.notes ? ` (${item.notes})` : ''}
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveTechRiderItem(item.id)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: '#ef4444',
                        cursor: 'pointer',
                        fontSize: '0.75rem',
                        fontWeight: 800,
                        padding: '4px'
                      }}
                    >
                      Löschen
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Input builder */}
          <div
            style={{
              background: '#f8fafc',
              border: '1.5px solid #e2e8f0',
              padding: '14px',
              borderRadius: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px'
            }}
          >
            <div>
              <span style={{ fontSize: '0.62rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>
                Schnellauswahl:
              </span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {[
                  { label: '🎺 Blasmusik', value: 'Blasmusik', conn: 'Mikrofon', src: 'own' },
                  { label: '🎤 Gesang', value: 'Gesang', conn: 'Mikrofon', src: 'venue' },
                  { label: '🎸 E-Gitarre', value: 'E-Gitarre', conn: 'Mikrofon', src: 'own' },
                  { label: '🎸 A-Gitarre', value: 'A-Gitarre', conn: 'DI-Box', src: 'own' },
                  { label: '🎸 E-Bass', value: 'E-Bass', conn: 'DI-Box', src: 'own' },
                  { label: '🎹 Keyboard', value: 'E-Piano / Keyboard', conn: 'Line-In', src: 'venue' },
                  { label: '🥁 Drums', value: 'Schlagzeug / E-Drum', conn: 'Mikrofon', src: 'venue' },
                  { label: '🔌 DI-Box', value: 'DI-Box', conn: 'DI-Box', src: 'venue' }
                ].map(badge => {
                  const isSelected = badge.value === 'Blasmusik' ? isBlasmusikSelected : (builderType === badge.value && !isBlasmusikSelected);
                  return (
                    <button
                      key={badge.value}
                      type="button"
                      onClick={() => {
                        if (badge.value === 'Blasmusik') {
                          setBuilderType('');
                          setIsBlasmusikSelected(true);
                        } else {
                          setBuilderType(badge.value);
                          setIsBlasmusikSelected(false);
                        }
                        setBuilderConnection(badge.conn);
                        setBuilderSource(badge.src);
                        setTimeout(() => {
                          instrumentInputRef.current?.focus();
                        }, 50);
                      }}
                      style={{
                        padding: '5px 10px',
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1',
                        background: isSelected ? `${brandColor}10` : '#ffffff',
                        borderColor: isSelected ? brandColor : '#cbd5e1',
                        color: isSelected ? brandColor : '#334155',
                        fontSize: '0.74rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      {badge.label}
                      {badge.value === 'Blasmusik' && isBlasmusikSelected && (
                        <span style={{ color: '#007aff', marginLeft: '4px', fontWeight: 'bold' }}>✓</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1.1fr 0.7fr', gap: '8px' }}>
              <div>
                <label style={{ fontSize: '0.65rem', fontWeight: 700, color: '#64748b', display: 'block', marginBottom: '3px' }}>Instrument / Input</label>
                <input
                  ref={instrumentInputRef}
                  type="text"
                  list="default-instruments-tech"
                  value={builderType}
                  placeholder="z.B. Gesang, Percussion"
                  onChange={(e) => setBuilderType(e.target.value)}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.78rem', boxSizing: 'border-box', background: '#fff', height: '35px' }}
                />
                <datalist id="default-instruments-tech">
                  <option value="Gesang" />
                  <option value="E-Gitarre" />
                  <option value="A-Gitarre" />
                  <option value="E-Bass" />
                  <option value="E-Piano / Keyboard" />
                  <option value="Schlagzeug / E-Drum" />
                  <option value="DI-Box" />
                  <option value="Verstärker (Amp)" />
                  <option value="Line-In" />
                  <option value="Blasinstrument" />
                </datalist>
              </div>
              <div>
                <label style={{ fontSize: '0.65rem', fontWeight: 700, color: '#64748b', display: 'block', marginBottom: '3px' }}>Anschluss</label>
                <select
                  value={builderConnection}
                  onChange={(e) => setBuilderConnection(e.target.value)}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.78rem', background: '#fff', boxSizing: 'border-box', height: '35px' }}
                >
                  <option value="Mikrofon">Mikrofon</option>
                  <option value="DI-Box">DI-Box</option>
                  <option value="Line-In">Line-In</option>
                  <option value="Verstärker (Amp)">Verstärker (Amp)</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: '0.65rem', fontWeight: 700, color: '#64748b', display: 'block', marginBottom: '3px' }}>Anzahl</label>
                <input
                  type="number"
                  min="1"
                  value={builderCount}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === '') {
                      setBuilderCount('');
                    } else {
                      const parsed = parseInt(val, 10);
                      setBuilderCount(isNaN(parsed) ? '' : Math.max(1, parsed));
                    }
                  }}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.78rem', boxSizing: 'border-box', background: '#fff', height: '35px' }}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1.4fr auto', gap: '8px', alignItems: 'end' }}>
              <div>
                <label style={{ fontSize: '0.65rem', fontWeight: 700, color: '#64748b', display: 'block', marginBottom: '3px' }}>Bereitgestellt durch</label>
                <select
                  value={builderSource}
                  onChange={(e) => setBuilderSource(e.target.value)}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.78rem', background: '#fff', boxSizing: 'border-box', height: '35px' }}
                >
                  <option value="venue">Gestellt von Schule</option>
                  <option value="own">Selbst mitgebracht</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: '0.65rem', fontWeight: 700, color: '#64748b', display: 'block', marginBottom: '3px' }}>Details / Notiz</label>
                <input
                  type="text"
                  value={builderNotes}
                  placeholder="z.B. Phantomspeisung"
                  onChange={(e) => setBuilderNotes(e.target.value)}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.78rem', boxSizing: 'border-box', background: '#fff', height: '35px' }}
                />
              </div>
              <button
                type="button"
                onClick={handleAddTechRiderItem}
                style={{
                  background: '#0f172a',
                  color: '#ffffff',
                  border: 'none',
                  padding: '8px 16px',
                  borderRadius: '8px',
                  fontWeight: 900,
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                  height: '35px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '4px'
                }}
              >
                <Plus size={14} /> Add
              </button>
            </div>
          </div>
        </div>

        {/* Chairs & Stands */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '6px' }}>Anzahl Stühle</label>
            <input
              type="number"
              min="0"
              value={newPpChairs}
              onChange={e => setNewPpChairs(e.target.value)}
              style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1.5px solid #cbd5e1', fontSize: '0.88rem', boxSizing: 'border-box', height: '42px' }}
            />
          </div>
          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '6px' }}>Anzahl Notenständer</label>
            <input
              type="number"
              min="0"
              value={newPpStands}
              onChange={e => setNewPpStands(e.target.value)}
              style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1.5px solid #cbd5e1', fontSize: '0.88rem', boxSizing: 'border-box', height: '42px' }}
            />
          </div>
        </div>

        {/* Remarks */}
        <div>
          <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '6px' }}>Bemerkungen</label>
          <textarea
            value={newPpRemarks}
            onChange={e => setNewPpRemarks(e.target.value)}
            placeholder="Besondere Hinweise für den Bühnenbau..."
            style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1.5px solid #cbd5e1', fontSize: '0.88rem', minHeight: '60px', fontFamily: 'inherit', boxSizing: 'border-box' }}
          />
        </div>

        {/* Submit Buttons */}
        <div style={{ display: 'flex', gap: '12px', marginTop: '10px' }}>
          {editingPpId ? (
            <>
              <button
                type="submit"
                disabled={submittingPp}
                style={{
                  flex: 1,
                  background: brandColor,
                  color: '#ffffff',
                  border: 'none',
                  padding: '12px',
                  borderRadius: '12px',
                  fontWeight: 800,
                  fontSize: '0.88rem',
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                  opacity: submittingPp ? 0.7 : 1
                }}
              >
                Technik speichern
              </button>
              <button
                type="button"
                onClick={() => handleTabSwitch('schueler')}
                style={{
                  background: '#f1f5f9',
                  color: '#475569',
                  border: '1px solid #cbd5e1',
                  padding: '12px 20px',
                  borderRadius: '12px',
                  fontWeight: 800,
                  fontSize: '0.88rem',
                  cursor: 'pointer'
                }}
              >
                Weiter ➜
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                handleTabSwitch('schueler');
              }}
              style={{
                flex: 1,
                background: brandColor,
                color: '#ffffff',
                border: 'none',
                padding: '12px',
                borderRadius: '12px',
                fontWeight: 800,
                fontSize: '0.88rem',
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              Weiter zur Schüler-Auswahl ➜
            </button>
          )}
          {editingPpId && (
            <button
              type="button"
              onClick={handleCancelEditing}
              style={{
                background: '#fef2f2',
                color: '#ef4444',
                border: 'none',
                padding: '12px 20px',
                borderRadius: '12px',
                fontWeight: 800,
                fontSize: '0.88rem',
                cursor: 'pointer'
              }}
            >
              Abbrechen
            </button>
          )}
        </div>
      </form>
    );
  };

  const renderTeacherSchuelerTab = () => {
    const allStudents = allUsers.filter(u => u.role === 'student');
    const myStudents = allUsers.filter(u => u.role === 'student' && myStudentIds.includes(u.id));
    
    const trimmedQuery = studentSearchQuery.toLowerCase().trim();
    
    const allowedStudents = role === 'teacher' ? myStudents : allStudents;

    // Determine the list of students shown in the dropdown
    const dropdownStudents = trimmedQuery
      ? allowedStudents.filter(s => {
          const fullName = `${s.first_name || ''} ${s.last_name || ''}`.toLowerCase();
          const instrument = (s.instrument || '').toLowerCase();
          return fullName.includes(trimmedQuery) || instrument.includes(trimmedQuery);
        })
      : allowedStudents;

    // Ensure the selection index is within valid bounds
    const safeActiveIndex = dropdownStudents.length > 0 
      ? Math.min(activeStudentSuggestionIndex, dropdownStudents.length - 1)
      : 0;

    const suggestedStudent = dropdownStudents[safeActiveIndex] || null;
    const suggestedName = suggestedStudent ? `${suggestedStudent.first_name || ''} ${suggestedStudent.last_name || ''}` : '';
    const hasSuggestion = studentSearchQuery.trim() !== '' && suggestedName && suggestedName.toLowerCase().startsWith(studentSearchQuery.toLowerCase());
    const suggestionRemaining = hasSuggestion ? suggestedName.substring(studentSearchQuery.length) : '';

    const selectedStudents = allStudents.filter(s => newPpSelectedStudentIds.includes(s.id));

    return (
      <form onSubmit={editingPpId ? handleUpdateProgramPoint : handleCreateProgramPoint} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
        {editingPpId && (
          <div style={{ background: '#fffbeb', border: '1px solid #f59e0b', padding: '10px 14px', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 650, color: '#b45309', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span>📝 Du bearbeitest: <strong>{newPpEnsemble || newPpName}</strong></span>
              {renderSaveStatus()}
            </span>
            <button type="button" onClick={handleCancelEditing} style={{ background: 'transparent', border: 'none', color: '#ef4444', fontWeight: 800, cursor: 'pointer', fontSize: '0.74rem' }}>
              Bearbeiten beenden
            </button>
          </div>
        )}
        <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
          {editingPpId ? 'Teilnehmende Schüler verwalten' : 'Teilnehmende Schüler auswählen'}
        </h3>
        <p style={{ fontSize: '0.78rem', color: '#64748b', margin: 0, fontWeight: 550 }}>
          Wähle aus, welche Schüler an diesem Programmpunkt mitwirken.
        </p>

        {/* Smart Search Input */}
        <div style={{ position: 'relative' }}>
          <h4 style={{ fontSize: '0.82rem', fontWeight: 750, color: '#475569', margin: '0 0 8px 0' }}>
            Schüler suchen &amp; hinzufügen (Pfeiltasten zum Navigieren, Enter zum Auswählen):
          </h4>
          <div 
            style={{ 
              position: 'relative', 
              width: '100%', 
              height: '46px',
              borderRadius: '14px',
              border: `1.5px solid ${isSearchFocused ? brandColor : '#e2e8f0'}`,
              background: isSearchFocused ? '#ffffff' : '#f8fafc',
              boxSizing: 'border-box',
              transition: 'all 0.2s ease-in-out',
              boxShadow: isSearchFocused 
                ? `0 10px 25px -5px ${brandColor}15, 0 0 0 3px ${brandColor}22` 
                : '0 1px 2px rgba(0, 0, 0, 0.02)'
            }}
            onMouseEnter={e => {
              if (!isSearchFocused) {
                e.currentTarget.style.borderColor = '#cbd5e1';
                e.currentTarget.style.backgroundColor = '#f1f5f9';
              }
            }}
            onMouseLeave={e => {
              if (!isSearchFocused) {
                e.currentTarget.style.borderColor = '#e2e8f0';
                e.currentTarget.style.backgroundColor = '#f8fafc';
              }
            }}
          >
            {/* Inline autocomplete ghost text overlay rendered behind input */}
            {hasSuggestion && (
              <div style={{
                position: 'absolute',
                left: 0,
                top: 0,
                width: '100%',
                height: '100%',
                padding: '0 16px 0 42px',
                display: 'flex',
                alignItems: 'center',
                pointerEvents: 'none',
                fontSize: '0.9rem',
                fontWeight: 600,
                fontFamily: 'inherit',
                boxSizing: 'border-box',
                whiteSpace: 'pre',
                overflow: 'hidden',
                zIndex: 1
              }}>
                {/* Transparent spacer matching what the user has typed */}
                <span style={{ color: 'transparent' }}>{studentSearchQuery}</span>
                {/* Gray ghost suggestion text for the remainder */}
                <span style={{ color: '#94a3b8' }}>{suggestionRemaining}</span>
              </div>
            )}

            <input
              type="text"
              placeholder="Schüler-Name eingeben..."
              value={studentSearchQuery}
              onChange={(e) => {
                setStudentSearchQuery(e.target.value);
                setActiveStudentSuggestionIndex(0);
              }}
              onFocus={() => setIsSearchFocused(true)}
              onBlur={() => {
                // Short delay to allow click events to complete
                setTimeout(() => setIsSearchFocused(false), 200);
              }}
              onKeyDown={(e) => {
                if (e.key === 'ArrowDown') {
                  e.preventDefault();
                  if (dropdownStudents.length > 0) {
                    setActiveStudentSuggestionIndex(prev => (prev + 1) % dropdownStudents.length);
                  }
                } else if (e.key === 'ArrowUp') {
                  e.preventDefault();
                  if (dropdownStudents.length > 0) {
                    setActiveStudentSuggestionIndex(prev => (prev - 1 + dropdownStudents.length) % dropdownStudents.length);
                  }
                } else if (e.key === 'Tab' || e.key === 'ArrowRight') {
                  if (hasSuggestion) {
                    e.preventDefault();
                    setStudentSearchQuery(suggestedName);
                  }
                } else if (e.key === 'Enter') {
                  e.preventDefault();
                  if (suggestedStudent) {
                    const isAlreadySelected = newPpSelectedStudentIds.includes(suggestedStudent.id);
                    if (!isAlreadySelected) {
                      const maxLimit = techRiderItems.length > 0 
                        ? techRiderItems.reduce((sum, item) => sum + (parseInt(item.count, 10) || 0), 0)
                        : (parseInt(newPpPerformerCount, 10) || 1);
                      if (newPpSelectedStudentIds.length >= maxLimit) {
                        alert(techRiderItems.length > 0 
                          ? `Limit erreicht: Du kannst maximal ${maxLimit} Schüler hinzufügen, da im Tech Rider insgesamt ${maxLimit} Instrumente/Inputs eingetragen sind.`
                          : `Limit erreicht: Du kannst maximal ${maxLimit} Schüler hinzufügen, da die Teilnehmeranzahl auf ${maxLimit} eingestellt ist.`
                        );
                        return;
                      }
                      setNewPpSelectedStudentIds(prev => [...prev, suggestedStudent.id]);
                    }
                    setStudentSearchQuery('');
                    setActiveStudentSuggestionIndex(0);
                  }
                } else if (e.key === 'Escape') {
                  e.preventDefault();
                  setStudentSearchQuery('');
                  setActiveStudentSuggestionIndex(0);
                  e.currentTarget.blur();
                }
              }}
              style={{
                position: 'absolute',
                left: 0,
                top: 0,
                width: '100%',
                height: '100%',
                padding: '0 16px 0 42px',
                background: 'transparent',
                border: 'none',
                outline: 'none',
                fontSize: '0.9rem',
                fontWeight: 600,
                color: '#1e293b',
                boxSizing: 'border-box',
                zIndex: 2
              }}
            />
            <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: isSearchFocused ? brandColor : '#94a3b8', pointerEvents: 'none', display: 'flex', alignItems: 'center', transition: 'color 0.2s ease-in-out', zIndex: 3 }}>
              <Search size={18} />
            </span>
            {studentSearchQuery && (
              <button
                type="button"
                onClick={() => {
                  setStudentSearchQuery('');
                  setActiveStudentSuggestionIndex(0);
                }}
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: 0,
                  zIndex: 3
                }}
              >
                <X size={16} />
              </button>
            )}
          </div>

          {/* Autocomplete Dropdown List */}
          {isSearchFocused && dropdownStudents.length > 0 && (
            <div style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              right: 0,
              marginTop: '6px',
              border: '1px solid #e2e8f0',
              borderRadius: '14px',
              background: '#ffffff',
              boxShadow: '0 12px 30px rgba(0, 0, 0, 0.08), 0 4px 12px rgba(0, 0, 0, 0.03)',
              maxHeight: '220px',
              overflowY: 'auto',
              zIndex: 100
            }}>
              <div style={{ padding: '8px 12px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', fontSize: '0.7rem', fontWeight: 750, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {trimmedQuery ? 'Suchergebnisse (Alle Schüler)' : 'Meine Schüler'}
              </div>
              {dropdownStudents.map((student, idx) => {
                const isAlreadySelected = newPpSelectedStudentIds.includes(student.id);
                const isHighlighted = idx === safeActiveIndex;
                return (
                  <div
                    key={student.id}
                    onMouseDown={(e) => {
                      e.preventDefault(); // Prevent blur before selection completes
                      if (!isAlreadySelected) {
                        const maxLimit = techRiderItems.length > 0 
                          ? techRiderItems.reduce((sum, item) => sum + (parseInt(item.count, 10) || 0), 0)
                          : (parseInt(newPpPerformerCount, 10) || 1);
                        if (newPpSelectedStudentIds.length >= maxLimit) {
                          alert(techRiderItems.length > 0 
                            ? `Limit erreicht: Du kannst maximal ${maxLimit} Schüler hinzufügen, da im Tech Rider insgesamt ${maxLimit} Instrumente/Inputs eingetragen sind.`
                            : `Limit erreicht: Du kannst maximal ${maxLimit} Schüler hinzufügen, da die Teilnehmeranzahl auf ${maxLimit} eingestellt ist.`
                          );
                          return;
                        }
                        setNewPpSelectedStudentIds(prev => [...prev, student.id]);
                      } else {
                        setNewPpSelectedStudentIds(prev => prev.filter(id => id !== student.id));
                      }
                      setStudentSearchQuery('');
                      setActiveStudentSuggestionIndex(0);
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 14px',
                      borderBottom: '1px solid #f1f5f9',
                      cursor: 'pointer',
                      fontSize: '0.84rem',
                      fontWeight: 600,
                      background: isHighlighted 
                        ? `${brandColor}0a` 
                        : (isAlreadySelected ? '#f0fdf4' : '#ffffff'),
                      borderLeft: `3px solid ${isHighlighted ? brandColor : 'transparent'}`,
                      transition: 'all 0.1s'
                    }}
                    onMouseEnter={() => setActiveStudentSuggestionIndex(idx)}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ color: isHighlighted ? brandColor : '#0f172a' }}>{student.first_name} {student.last_name}</span>
                      {student.instrument && <span style={{ fontSize: '0.7rem', color: '#64748b' }}>{student.instrument}</span>}
                    </div>
                    <div style={{
                      width: '18px',
                      height: '18px',
                      borderRadius: '50%',
                      border: isAlreadySelected ? 'none' : '1.5px solid #cbd5e1',
                      background: isAlreadySelected ? '#22c55e' : 'transparent',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#ffffff'
                    }}>
                      {isAlreadySelected && <Check size={12} />}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Selected Students List (Pills) */}
        <div>
          <h4 style={{ fontSize: '0.82rem', fontWeight: 750, color: '#475569', margin: '0 0 8px 0' }}>
            Zugewiesene Schüler:
          </h4>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', minHeight: '36px', alignItems: 'center', background: '#f8fafc', padding: '10px 12px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
            {selectedStudents.length === 0 ? (
              <span style={{ fontSize: '0.78rem', color: '#94a3b8', fontStyle: 'italic' }}>
                Noch keine Schüler zugewiesen. Nutze die Suche oben.
              </span>
            ) : (
              selectedStudents.map(student => (
                <div 
                  key={student.id} 
                  style={{ 
                    display: 'inline-flex', 
                    alignItems: 'center', 
                    gap: '6px', 
                    padding: '4px 10px', 
                    background: '#e0f2fe',
                    color: '#0369a1',
                    borderRadius: '20px',
                    fontSize: '0.78rem',
                    fontWeight: 650,
                    border: '1px solid #bae6fd'
                  }}
                >
                  <span>{student.first_name} {student.last_name} {student.instrument && `(${student.instrument})`}</span>
                  <button
                    type="button"
                    onClick={() => setNewPpSelectedStudentIds(prev => prev.filter(id => id !== student.id))}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#0284c7',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: 0
                    }}
                  >
                    <X size={13} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        <div style={{ fontSize: '0.8rem', fontWeight: 750, color: '#334155' }}>
          Ausgewählt: <span style={{ color: brandColor }}>
            {newPpSelectedStudentIds.length} von {techRiderItems.length > 0 ? techRiderItems.reduce((sum, item) => sum + (parseInt(item.count, 10) || 0), 0) : (parseInt(newPpPerformerCount, 10) || 1)} Schülern
          </span>
          <span style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 550, marginLeft: '8px' }}>
            {techRiderItems.length > 0 
              ? '(Limit orientiert sich an der Anzahl der Instrumente)' 
              : '(Limit orientiert sich an der Teilnehmeranzahl)'}
          </span>
        </div>

        {/* Submit Buttons */}
        <div style={{ display: 'flex', gap: '12px', marginTop: '10px' }}>
          <button
            type="submit"
            disabled={submittingPp}
            style={{
              flex: 1,
              background: brandColor,
              color: '#ffffff',
              border: 'none',
              padding: '12px',
              borderRadius: '12px',
              fontWeight: 800,
              fontSize: '0.88rem',
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
              opacity: submittingPp ? 0.7 : 1
            }}
          >
            {editingPpId ? 'Schüler speichern' : 'Programmpunkt einreichen'}
          </button>
          {editingPpId && (
            <button
              type="button"
              onClick={handleCancelEditing}
              style={{
                background: '#fef2f2',
                color: '#ef4444',
                border: 'none',
                padding: '12px 20px',
                borderRadius: '12px',
                fontWeight: 800,
                fontSize: '0.88rem',
                cursor: 'pointer'
              }}
            >
              Abbrechen
            </button>
          )}
        </div>
      </form>
    );
  };

  const renderTeacherFeedbackTab = () => {
    const ppsWithQueries = programPoints.filter(pp => 
      pp.teacher_id === userId && 
      pp.event_id === teacherSubmissionEvent.id && 
      pp.additional_feedback_responses?.questions?.length > 0
    );

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', boxSizing: 'border-box' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 900, color: '#0f172a', margin: 0 }}>
            Rückmeldungen &amp; Fragen der Verwaltung
          </h3>
          <p style={{ fontSize: '0.78rem', color: '#64748b', margin: 0, fontWeight: 550 }}>
            Kläre offene Fragen zu deinen Beiträgen direkt im Chat-Verlauf.
          </p>
        </div>

        {ppsWithQueries.length === 0 ? (
          <div style={{ padding: '40px 20px', border: '1.5px dashed #e2e8f0', borderRadius: '20px', textAlign: 'center', color: '#94a3b8', fontSize: '0.82rem', fontWeight: 600 }}>
            🎉 Aktuell keine offenen Rückfragen zu diesem Event vorhanden.
          </div>
        ) : (
          ppsWithQueries.map(pp => {
            const hasUnanswered = pp.additional_feedback_responses.questions.some((_: any, i: number) => !pp.additional_feedback_responses.answers?.[i]);
            return (
              <div key={pp.id} style={{
                background: '#ffffff',
                borderRadius: '24px',
                border: '1px solid #e2e8f0',
                boxShadow: '0 4px 20px rgba(0,0,0,0.02)',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column'
              }}>
                {/* Header of contribution */}
                <div style={{
                  padding: '16px 20px',
                  background: '#f8fafc',
                  borderBottom: '1px solid #f1f5f9',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <div>
                    <span style={{ fontSize: '0.64rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', color: brandColor }}>
                      Beitrag
                    </span>
                    <strong style={{ fontSize: '0.92rem', color: '#0f172a', display: 'block', fontWeight: 800 }}>
                      {pp.name}
                    </strong>
                  </div>
                  <span style={{
                    fontSize: '0.68rem',
                    fontWeight: 800,
                    background: hasUnanswered ? '#fef3c7' : '#dcfce7',
                    color: hasUnanswered ? '#d97706' : '#15803d',
                    padding: '4px 10px',
                    borderRadius: '100px',
                    textTransform: 'uppercase'
                  }}>
                    {hasUnanswered ? '⏳ Offene Fragen' : '✅ Geklärt'}
                  </span>
                </div>

                {/* Chat Feed Area */}
                <div style={{
                  padding: '24px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '16px',
                  background: '#fafbfc'
                }}>
                  {pp.additional_feedback_responses.questions.map((q: string, idx: number) => {
                    const ansKey = `${pp.id}_${idx}`;
                    const answeredText = pp.additional_feedback_responses.answers?.[idx];
                    
                    return (
                      <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {/* Question Bubble (Verwaltung) - Left aligned */}
                        <div style={{ display: 'flex', justifyContent: 'flex-start', width: '100%' }}>
                          <div style={{
                            maxWidth: '75%',
                            background: '#ffffff',
                            color: '#1e293b',
                            padding: '12px 16px',
                            borderRadius: '16px 16px 16px 4px',
                            fontSize: '0.82rem',
                            border: '1px solid #e2e8f0',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.01)',
                            lineHeight: 1.45
                          }}>
                            <span style={{ display: 'block', fontSize: '0.64rem', fontWeight: 800, color: '#ef4444', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                              Verwaltung / Orga
                            </span>
                            {q}
                          </div>
                        </div>

                        {/* Answer Bubble (Du) - Right aligned */}
                        <div style={{ display: 'flex', justifyContent: 'flex-end', width: '100%' }}>
                          {answeredText && answeredText.trim() !== '' ? (
                            <div style={{
                              maxWidth: '75%',
                              background: brandColor,
                              color: '#ffffff',
                              padding: '12px 16px',
                              borderRadius: '16px 16px 4px 16px',
                              fontSize: '0.82rem',
                              boxShadow: '0 4px 12px ' + brandColor + '20',
                              lineHeight: 1.45
                            }}>
                              <span style={{ display: 'block', fontSize: '0.64rem', fontWeight: 800, color: 'rgba(255,255,255,0.7)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                Du (Lehrkraft)
                              </span>
                              {answeredText}
                            </div>
                          ) : (
                            <div style={{
                              width: '75%',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '6px',
                              alignItems: 'flex-end'
                            }}>
                              <textarea
                                value={feedbackAnswers[ansKey] || ''}
                                onChange={e => setFeedbackAnswers(prev => ({ ...prev, [ansKey]: e.target.value }))}
                                placeholder="Antwort schreiben..."
                                style={{
                                  width: '100%',
                                  padding: '12px 16px',
                                  borderRadius: '16px 16px 4px 16px',
                                  border: '1.5px solid #cbd5e1',
                                  fontSize: '0.82rem',
                                  minHeight: '70px',
                                  fontFamily: 'inherit',
                                  resize: 'none',
                                  outline: 'none',
                                  boxSizing: 'border-box',
                                  background: '#ffffff',
                                  transition: 'border-color 0.2s',
                                  lineHeight: 1.4
                                }}
                                onFocus={e => e.target.style.borderColor = brandColor}
                                onBlur={e => e.target.style.borderColor = '#cbd5e1'}
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Footer Send Bar */}
                {hasUnanswered && (
                  <div style={{
                    padding: '16px 24px',
                    borderTop: '1px solid #f1f5f9',
                    background: '#ffffff',
                    display: 'flex',
                    justifyContent: 'flex-end'
                  }}>
                    <button
                      type="button"
                      onClick={() => handleSaveTeacherFeedback(pp)}
                      style={{
                        background: brandColor,
                        color: '#ffffff',
                        border: 'none',
                        padding: '10px 20px',
                        borderRadius: '12px',
                        fontSize: '0.8rem',
                        fontWeight: 800,
                        cursor: 'pointer',
                        boxShadow: '0 4px 12px ' + brandColor + '30',
                        transition: 'transform 0.15s, opacity 0.15s'
                      }}
                      onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.02)'}
                      onMouseLeave={e => e.currentTarget.style.transform = 'none'}
                    >
                      ✉️ Rückmeldungen absenden
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    );
  };

  const renderTeacherPacklistTab = () => {
    const myPps = programPoints.filter(pp => pp.teacher_id === userId);
    const ownTechItems: { name: string; count: number; contributionName: string; notes?: string }[] = [];

    myPps.forEach(pp => {
      if (pp.tech_requirements) {
        try {
          const cleaned = pp.tech_requirements.trim();
          if (cleaned.startsWith('[') || cleaned.startsWith('{')) {
            const items = JSON.parse(cleaned);
            if (Array.isArray(items)) {
              items.forEach((item: any) => {
                if (item.source === 'own') {
                  ownTechItems.push({
                    name: item.type || 'Sonstiges',
                    count: parseInt(item.count, 10) || 1,
                    contributionName: pp.name,
                    notes: item.notes
                  });
                }
              });
            }
          } else if (cleaned) {
            ownTechItems.push({
              name: cleaned,
              count: 1,
              contributionName: pp.name
            });
          }
        } catch (e) {
          ownTechItems.push({
            name: pp.tech_requirements,
            count: 1,
            contributionName: pp.name
          });
        }
      }
    });

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
          Persönliche Packliste
        </h3>
        <p style={{ color: '#64748b', fontSize: '0.82rem', margin: 0 }}>
          Hier siehst du, welches Equipment du für deine Beiträge selbst mitbringen musst:
        </p>

        <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '18px', border: '1px solid #cbd5e1', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Info Banner */}
          <div style={{ display: 'flex', gap: '10px', background: 'rgba(59, 130, 246, 0.05)', border: '1px dashed rgba(59, 130, 246, 0.2)', padding: '12px 16px', borderRadius: '12px', fontSize: '0.78rem', color: '#1e3a8a', lineHeight: 1.4 }}>
            <span>ℹ️</span>
            <span>
              <strong>Bereitgestellt vor Ort:</strong> Stühle, Notenständer, Standard-Mikrofone, Gesangsanlage (PA) sowie Standard-Bühnenverkabelung werden von der Musikschule bereitgestellt und müssen nicht mitgebracht werden.
            </span>
          </div>

          <div>
            <span style={{ fontWeight: 800, fontSize: '0.85rem', display: 'block', marginBottom: '8px', color: '#1e293b' }}>
              🎸 Eigene Instrumente &amp; Zubehör (selbst mitzubringen):
            </span>
            {ownTechItems.length === 0 ? (
              <p style={{ fontSize: '0.8rem', color: '#64748b', fontStyle: 'italic', margin: '8px 0 0 0' }}>
                Keine selbst mitzubringenden Instrumente oder Zubehörteile in den Beiträgen eingetragen.
              </p>
            ) : (
              <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '0.82rem', color: '#334155', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {ownTechItems.map((item, idx) => (
                  <li key={idx} style={{ textAlign: 'left' }}>
                    <strong>{item.count}x {item.name}</strong> für den Beitrag <em>{item.contributionName}</em>
                    {item.notes ? ` (Hinweis: ${item.notes})` : ''}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderTeacherSummaryTab = () => {
    const activeEv = teacherSubmissionEvent;
    if (!activeEv) return null;

    const activeEventStartTime = activeEv.event_start_time || activeEv.start_time || '14:00';
    const timeMap = calculateTimelineTimes(programPoints, activeEventStartTime);
    const myPps = programPoints.filter(pp => pp.teacher_id === userId);

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
          Auftritts-Zusammenfassung
        </h3>
        <p style={{ color: '#64748b', fontSize: '0.82rem', margin: 0 }}>
          Hier findest du deine eingereichten Beiträge und deren geplante Auftrittszeiten:
        </p>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {myPps.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px', background: '#f8fafc', borderRadius: '18px', border: '1px dashed #cbd5e1', color: '#64748b', fontSize: '0.8rem' }}>
              Du hast noch keine Beiträge für dieses Event eingereicht.
            </div>
          ) : (
            myPps.map(pp => {
              const isScheduled = pp.is_scheduled;
              const timeInfo = timeMap[pp.id];

              return (
                <div
                  key={pp.id}
                  style={{
                    padding: '16px',
                    borderRadius: '16px',
                    border: '1px solid #e2e8f0',
                    background: '#ffffff',
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.01)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h4 style={{ margin: 0, fontSize: '0.94rem', fontWeight: 800, color: '#0f172a' }}>
                      {pp.name}
                    </h4>
                    <span style={{
                      fontSize: '0.68rem',
                      fontWeight: 700,
                      padding: '3px 8px',
                      borderRadius: '6px',
                      background: isScheduled ? '#dcfce7' : '#fef3c7',
                      color: isScheduled ? '#15803d' : '#b45309'
                    }}>
                      {isScheduled ? 'Eingeteilt' : 'Wartet auf Einteilung'}
                    </span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', fontSize: '0.78rem', color: '#475569', borderTop: '1px solid #f1f5f9', paddingTop: '10px' }}>
                    <div>
                      <strong>⏱️ Dauer:</strong> {pp.duration || 0} Minuten
                    </div>
                    <div>
                      <strong>🎭 Bühne:</strong> {isScheduled ? `Bühne ${pp.stage_number || 1}` : '—'}
                    </div>
                    <div style={{ gridColumn: 'span 2' }}>
                      <strong>🕒 Auftrittszeit:</strong> {isScheduled && timeInfo ? (
                        <span style={{ fontWeight: 800, color: brandColor, background: `${brandColor}08`, padding: '2px 6px', borderRadius: '4px' }}>
                          {timeInfo.start} - {timeInfo.end} Uhr
                        </span>
                      ) : (
                        <span style={{ fontStyle: 'italic', color: '#64748b' }}>Noch nicht im Zeitplan eingeteilt</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div style={{ padding: '20px', background: '#f8fafc', borderRadius: '18px', border: '1px solid #cbd5e1', marginTop: '10px' }}>
          <h4 style={{ fontSize: '0.88rem', fontWeight: 800, margin: '0 0 6px 0', color: '#0f172a' }}>Über das Event: {activeEv.title}</h4>
          <p style={{ fontSize: '0.78rem', color: '#475569', margin: '0 0 16px 0', lineHeight: 1.5 }}>
            📅 Datum: {formatDateGerman(activeEv.event_date)}<br />
            🕒 Startzeit: {activeEv.start_time?.substring(0, 5) || '18:00'} Uhr<br />
            🎭 Bühnen gesamt: {activeEv.stage_count || 1}
          </p>

          <button
            onClick={() => window.print()}
            style={{
              background: '#0f172a',
              color: '#ffffff',
              border: 'none',
              padding: '10px 20px',
              borderRadius: '10px',
              fontWeight: 800,
              fontSize: '0.78rem',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
            onMouseEnter={e => { e.currentTarget.style.background = '#1e293b'; }}
            onMouseLeave={e => { e.currentTarget.style.background = '#0f172a'; }}
          >
            🖨️ Programmübersicht drucken
          </button>
        </div>
      </div>
    );
  };

  const renderFullscreenTeacherSubmissionOverlay = () => {
    if (!teacherSubmissionEvent) return null;

    const pendingQuestionsPoints = programPoints.filter(pp => 
      pp.teacher_id === userId && 
      pp.event_id === teacherSubmissionEvent.id &&
      pp.additional_feedback_responses?.questions?.some((_: any, idx: number) => !pp.additional_feedback_responses.answers?.[idx])
    );

    return (
      <div style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15, 23, 42, 0.4)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        zIndex: 1200,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px',
        boxSizing: 'border-box'
      }}>
        <div style={{
          background: '#ffffff',
          borderRadius: '32px',
          width: '100%',
          maxWidth: '1200px',
          height: '100%',
          maxHeight: '800px',
          boxShadow: '0 32px 80px rgba(0, 0, 0, 0.15)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          border: '1px solid rgba(0,0,0,0.06)'
        }}>
          {/* Header */}
          <div style={{
            padding: '24px 32px',
            borderBottom: '1px solid #f1f5f9',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: 'linear-gradient(to right, #f8fafc, #ffffff)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
              <div>
                <span style={{ fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: brandColor }}>
                  Programm-Einreichung &amp; Planung
                </span>
                <h2 style={{ fontSize: '1.4rem', fontWeight: 900, color: '#0f172a', margin: '4px 0 0 0' }}>
                  {teacherSubmissionEvent.title}
                </h2>
              </div>

              {pendingQuestionsPoints.length > 0 && (
                <div style={{
                  background: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)',
                  border: '1px solid #f59e0b',
                  borderRadius: '12px',
                  padding: '8px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  boxShadow: '0 4px 12px rgba(245, 158, 11, 0.1)'
                }}>
                  <span style={{ fontSize: '1.1rem' }}>⚠️</span>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#92400e' }}>
                      Offene Rückfragen vorhanden
                    </span>
                    <span style={{ fontSize: '0.72rem', color: '#b45309', fontWeight: 500 }}>
                      Es gibt Rückfragen zu deinen Beiträgen ({pendingQuestionsPoints.length}).
                    </span>
                  </div>
                  <button
                    onClick={() => setTeacherOverlayTab('feedback')}
                    style={{
                      background: '#92400e',
                      color: '#ffffff',
                      border: 'none',
                      padding: '4px 10px',
                      borderRadius: '6px',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      marginLeft: '8px',
                      transition: 'background 0.2s'
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = '#78350f'}
                    onMouseLeave={e => e.currentTarget.style.background = '#92400e'}
                  >
                    Ansehen
                  </button>
                </div>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              {isMeEventResponsible(teacherSubmissionEvent) && (
                <button
                  type="button"
                  onClick={() => {
                    setSecretaryPlanningEvent(teacherSubmissionEvent);
                    setTeacherSubmissionEvent(null);
                  }}
                  style={{
                    background: '#f1f5f9',
                    border: '1.5px solid #cbd5e1',
                    borderRadius: '20px',
                    padding: '8px 16px',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    color: '#475569',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = '#e2e8f0';
                    e.currentTarget.style.color = '#1e293b';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = '#f1f5f9';
                    e.currentTarget.style.color = '#475569';
                  }}
                >
                  🛠️ Verwaltungsansicht
                </button>
              )}
              <button
                onClick={() => setTeacherSubmissionEvent(null)}
                style={{
                  background: '#f1f5f9',
                  border: 'none',
                  borderRadius: '50%',
                  width: '38px',
                  height: '38px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <X size={18} color="#64748b" />
              </button>
            </div>
          </div>

          {/* Tab Buttons (6 tabs) */}
          <div style={{ display: 'flex', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', padding: '0 32px', overflowX: 'auto' }}>
            {(() => {
              const isEnsembleFilled = !!newPpEnsemble.trim();
              const isTechnikFilled = techRiderItems.length > 0 || (parseInt(newPpChairs, 10) || 0) > 0 || (parseInt(newPpStands, 10) || 0) > 0;
              const isSchuelerFilled = newPpSelectedStudentIds.length > 0;

              const tabs = [
                { id: 'einreichung', label: `${isEnsembleFilled ? '✓ ' : ''}1. Programmpunkt einreichen`, disabled: false },
                { id: 'technik', label: `${isTechnikFilled ? '✓ ' : ''}2. Bühnenbedarf & Technik`, disabled: !isEnsembleFilled },
                { id: 'schueler', label: `${isSchuelerFilled ? '✓ ' : ''}3. Schüler`, disabled: !isEnsembleFilled },
                { id: 'feedback', label: '4. Rückmeldungen & Fragen', disabled: false },
                { id: 'packliste', label: '5. Packliste', disabled: false },
                { id: 'summary', label: '6. Zusammenfassung', disabled: false }
              ];

              return tabs.map(tab => {
                const isSel = teacherOverlayTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => !tab.disabled && handleTabSwitch(tab.id as any)}
                    disabled={tab.disabled}
                    style={{
                      border: 'none',
                      background: 'transparent',
                      padding: '16px 20px',
                      fontSize: '0.82rem',
                      fontWeight: 800,
                      color: tab.disabled ? '#cbd5e1' : (isSel ? brandColor : '#64748b'),
                      borderBottom: isSel ? `3px solid ${brandColor}` : '3px solid transparent',
                      cursor: tab.disabled ? 'not-allowed' : 'pointer',
                      transition: 'all 0.2s',
                      whiteSpace: 'nowrap',
                      opacity: tab.disabled ? 0.6 : 1
                    }}
                  >
                    {tab.label}
                  </button>
                );
              });
            })()}
          </div>

          {/* Content Body split into two columns */}
          <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
            {/* Left Panel */}
            <div style={{ flex: 1.2, padding: '32px', overflowY: 'auto', borderRight: '1px solid #f1f5f9' }}>
              {teacherOverlayTab === 'einreichung' && renderTeacherSubmissionFormTab()}
              {teacherOverlayTab === 'technik' && renderTeacherTechnikTab()}
              {teacherOverlayTab === 'schueler' && renderTeacherSchuelerTab()}
              {teacherOverlayTab === 'feedback' && renderTeacherFeedbackTab()}
              {teacherOverlayTab === 'packliste' && renderTeacherPacklistTab()}
              {teacherOverlayTab === 'summary' && renderTeacherSummaryTab()}
            </div>

            {/* Right Panel */}
            <div style={{ flex: 1, padding: '32px', background: '#fafbfc', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 900, color: '#0f172a', margin: 0 }}>
                Eingereichte Beiträge ({programPoints.filter(pp => pp.teacher_id === userId).length})
              </h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {programPoints.filter(pp => pp.teacher_id === userId).length === 0 ? (
                  <div style={{ padding: '40px 20px', border: '1.5px dashed #cbd5e1', borderRadius: '16px', textAlign: 'center', color: '#94a3b8', fontSize: '0.8rem', fontWeight: 600 }}>
                    Noch keine Beiträge von dir angemeldet.
                  </div>
                ) : (
                  programPoints.filter(pp => pp.teacher_id === userId).map(pp => {
                    let statusBg = '#f1f5f9';
                    let statusColor = '#475569';
                    let statusLabel = 'Eingereicht';
                    if (pp.status === 'approved') {
                      statusBg = '#ecfdf5';
                      statusColor = '#059669';
                      statusLabel = 'Freigegeben';
                    } else if (pp.status === 'rejected') {
                      statusBg = '#fef2f2';
                      statusColor = '#ef4444';
                      statusLabel = 'Abgelehnt';
                    }

                    const assignedStudents = pp.additional_feedback_responses?.assigned_students || [];
                      const hasSchueler = assignedStudents.length > 0;
                      
                      let hasTech = false;
                      try {
                        if (pp.tech_requirements) {
                          if (pp.tech_requirements.trim().startsWith('[') || pp.tech_requirements.trim().startsWith('{')) {
                            const res = JSON.parse(pp.tech_requirements);
                            hasTech = Array.isArray(res) ? res.length > 0 : !!res;
                          } else {
                            hasTech = !!pp.tech_requirements.trim();
                          }
                        }
                      } catch (e) {}
                      if ((pp.chairs_needed || 0) > 0 || (pp.music_stands_needed || 0) > 0) {
                        hasTech = true;
                      }

                      const isCurrentlyEditing = editingPpId === pp.id;

                      return (
                        <div 
                          key={pp.id} 
                          onClick={() => handleStartEditing(pp, teacherOverlayTab)}
                          style={{
                            background: isCurrentlyEditing ? `${brandColor}03` : '#ffffff',
                            border: isCurrentlyEditing ? `2px solid ${brandColor}` : '1px solid rgba(0, 0, 0, 0.05)',
                            borderRadius: '20px',
                            padding: isCurrentlyEditing ? '19px' : '20px',
                            boxShadow: isCurrentlyEditing ? `0 10px 30px ${brandColor}10` : '0 4px 20px rgba(0, 0, 0, 0.02), 0 1px 2px rgba(0, 0, 0, 0.02)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '14px',
                            transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                            position: 'relative',
                            cursor: 'pointer'
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div>
                              <h4 style={{ fontSize: '1rem', color: '#1d1d1f', fontWeight: 700, margin: 0, letterSpacing: '-0.01em' }}>
                                {pp.name}
                              </h4>
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '14px', fontSize: '0.74rem', color: '#86868b', fontWeight: 550, marginTop: '6px', alignItems: 'center' }}>
                                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                  <Clock size={12} color="#86868b" /> {pp.duration} Min.
                                </span>
                                {pp.ensemble_band && (
                                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <Users size={12} color="#86868b" /> {pp.ensemble_band}
                                  </span>
                                )}
                                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                  <MapPin size={12} color="#86868b" /> Bühne {pp.stage_number || 1}
                                </span>
                              </div>
                            </div>
                            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                              <span style={{ 
                                fontSize: '0.62rem', 
                                fontWeight: 800, 
                                background: statusBg, 
                                color: statusColor, 
                                padding: '4px 10px', 
                                borderRadius: '20px', 
                                textTransform: 'uppercase',
                                letterSpacing: '0.04em'
                              }}>
                                {statusLabel}
                              </span>
                            </div>
                          </div>

                          {/* Action links */}
                          <div style={{ 
                            position: 'absolute', 
                            right: '20px', 
                            bottom: '20px', 
                            display: 'flex', 
                            gap: '12px', 
                            alignItems: 'center', 
                            opacity: 0.8 
                          }}>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleStartEditing(pp, 'einreichung'); }}
                              style={{ 
                                background: 'transparent', 
                                border: 'none', 
                                color: '#0071e3', 
                                cursor: 'pointer', 
                                fontSize: '0.72rem', 
                                fontWeight: 700,
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                padding: 0
                              }}
                            >
                              <Edit3 size={11} /> Bearbeiten
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleDeleteProgramPoint(pp.id); }}
                              style={{ 
                                background: 'transparent', 
                                border: 'none', 
                                color: '#ff453a', 
                                cursor: 'pointer', 
                                fontSize: '0.72rem', 
                                fontWeight: 700,
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                padding: 0
                              }}
                            >
                              <Trash2 size={11} /> Löschen
                            </button>
                          </div>

                          {/* Interactive status buttons for Technik and Schüler */}
                          <div style={{ display: 'flex', gap: '10px', marginTop: '2px' }}>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleStartEditing(pp, 'technik'); }}
                              style={{
                                flex: 1,
                                background: hasTech ? '#e6f6ec' : '#fff1f2',
                                color: hasTech ? '#097939' : '#b91c1c',
                                border: 'none',
                                padding: '8px 14px',
                                borderRadius: '40px',
                                fontSize: '0.74rem',
                                fontWeight: 650,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '6px',
                                transition: 'all 0.15s ease'
                              }}
                            >
                              {hasTech ? <Check size={13} strokeWidth={3} /> : <AlertCircle size={13} strokeWidth={2.5} />}
                              {hasTech ? 'Technik' : 'Technik fehlt'}
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleStartEditing(pp, 'schueler'); }}
                              style={{
                                flex: 1,
                                background: hasSchueler ? '#e6f6ec' : '#fff3c7',
                                color: hasSchueler ? '#097939' : '#b45309',
                                border: 'none',
                                padding: '8px 14px',
                                borderRadius: '40px',
                                fontSize: '0.74rem',
                                fontWeight: 650,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '6px',
                                transition: 'all 0.15s ease'
                              }}
                            >
                              {hasSchueler ? <Check size={13} strokeWidth={3} /> : <AlertCircle size={13} strokeWidth={2.5} />}
                              {hasSchueler ? `Schüler (${assignedStudents.length})` : 'Schüler fehlen'}
                            </button>
                          </div>

                          {/* Render Songs */}
                          {(() => {
                            const songsList = pp.songs && Array.isArray(pp.songs) ? pp.songs : pp.title ? [{ title: pp.title, artist: pp.artist }] : [];
                            if (songsList.length === 0) return null;
                            return (
                              <div style={{ 
                                borderTop: '1px solid rgba(0,0,0,0.04)', 
                                paddingTop: '10px', 
                                marginTop: '2px', 
                                display: 'flex', 
                                flexDirection: 'column', 
                                gap: '6px',
                                paddingBottom: '20px' // Leave space for absolute buttons
                              }}>
                                <span style={{ 
                                  fontSize: '0.62rem', 
                                  fontWeight: 800, 
                                  color: '#86868b', 
                                  textTransform: 'uppercase', 
                                  letterSpacing: '0.08em' 
                                }}>
                                  Repertoire
                                </span>
                                {songsList.map((song: any, sIdx: number) => (
                                  <div key={sIdx} style={{ 
                                    fontSize: '0.76rem', 
                                    color: '#3a3a3c', 
                                    fontWeight: 600,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px'
                                  }}>
                                    <Music size={11} color="#86868b" /> 
                                    <span>{song.title}</span>
                                    {song.artist && <span style={{ color: '#86868b', fontWeight: 500 }}>• {song.artist}</span>}
                                  </div>
                                ))}
                              </div>
                            );
                          })()}
                        </div>
                      );
                    })
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderAdminCoordinatorPanel = (asOverlay = false) => {
    const activeEvent = secretaryPlanningEvent || selectedEvent;
    if (!activeEvent) {
      return (
        <div style={{
          background: '#ffffff',
          border: '1px solid rgba(0, 0, 0, 0.05)',
          borderRadius: '24px',
          padding: '40px 24px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.02)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '12px',
          height: 'calc(100vh - 120px)'
        }}>
          <CalendarDays size={48} color="#94a3b8" />
          <strong style={{ fontSize: '0.94rem', color: '#334155' }}>Kein Event ausgewählt</strong>
          <span style={{ fontSize: '0.8rem', color: '#94a3b8', textAlign: 'center' }}>
            Wähle ein Event aus der Liste aus, um die Koordination zu starten.
          </span>
        </div>
      );
    }

    const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
      planung:       { label: 'In Planung',    color: '#b45309', bg: '#fef3c7' },
      abgeschlossen: { label: 'Abgeschlossen', color: '#475569', bg: '#f1f5f9' },
    };

    const panelContent = (
      <div style={{
        background: asOverlay ? 'transparent' : 'rgba(255, 255, 255, 0.4)',
        border: asOverlay ? 'none' : '1px solid rgba(255, 255, 255, 0.5)',
        borderRadius: asOverlay ? '0' : '24px',
        padding: asOverlay ? '0' : '24px',
        boxShadow: asOverlay ? 'none' : '0 8px 32px rgba(0,0,0,0.03)',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
        height: '100%',
        overflow: 'hidden'
      }}>
        {/* Event Header */}
        {!asOverlay && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <span style={{ fontSize: '0.68rem', fontWeight: 800, color: brandColor, textTransform: 'uppercase', letterSpacing: '0.05em' }}>PLANUNGS-MODUL</span>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 900, color: '#1d1d1f', margin: '4px 0 0 0', letterSpacing: '-0.01em' }}>{activeEvent.title}</h3>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {isMeEventResponsible(activeEvent) && (
                <button
                  type="button"
                  onClick={() => {
                    setTeacherSubmissionEvent(activeEvent);
                    setSecretaryPlanningEvent(null);
                  }}
                  style={{
                    background: '#f1f5f9',
                    border: '1.5px solid #cbd5e1',
                    borderRadius: '20px',
                    padding: '6px 12px',
                    fontSize: '0.74rem',
                    fontWeight: 700,
                    color: '#475569',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = '#e2e8f0';
                    e.currentTarget.style.color = '#1e293b';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = '#f1f5f9';
                    e.currentTarget.style.color = '#475569';
                  }}
                >
                  📝 Einreichungen
                </button>
              )}
              <button
                onClick={() => { setSelectedEvent(null); setSecretaryPlanningEvent(null); }}
                style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <X size={15} color="#64748b" />
              </button>
            </div>
          </div>
        )}

        {/* Tab Buttons (Google Underline Tabs) & Status Chips */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '1px solid #e2e8f0',
          width: '100%',
          gap: '8px',
          paddingBottom: '0',
          flexWrap: 'wrap'
        }}>
          {/* Left side: Tab navigation */}
          <div style={{ display: 'flex', gap: '8px' }}>
            {[
              { id: 'eckdaten', label: 'Eckdaten' },
              { id: 'submissions', label: 'Alle Einreichungen' },
              { id: 'timeline', label: 'Programm' },
              { id: 'feedback', label: 'Feedback' },
              { id: 'tech', label: 'Technik' },
              { id: 'export', label: 'Export' }
            ].map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setCoordinatorTab(tab.id as any)}
                className={`google-tab ${coordinatorTab === tab.id ? 'google-tab-active' : ''}`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Right side: Status choice chips */}
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', paddingBottom: '4px' }}>
            {Object.entries(statusConfig).map(([id, cfg]) => {
              const isSelected = eventStatus === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={async () => {
                    setEventStatus(id as any);
                    const activeEv = secretaryPlanningEvent || selectedEvent;
                    if (activeEv) {
                      await supabase.from('campus_events').update({ planning_status: id }).eq('id', activeEv.id);
                    }
                  }}
                  className={`google-chip ${isSelected ? 'google-chip-selected' : ''}`}
                  style={{
                    borderColor: isSelected ? cfg.color : '#d1ebd5',
                    color: isSelected ? cfg.color : '#385c3f',
                    backgroundColor: isSelected ? `${cfg.color}18` : '#ffffff',
                    padding: '4px 12px',
                    fontSize: '0.7rem'
                  }}
                >
                  {cfg.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Tab Content */}
        <div style={{ flex: 1, overflowY: 'auto', marginTop: '12px' }}>
          {coordinatorTab === 'eckdaten' && (() => {
            const calcTotalMin = programPoints.reduce((sum, pp) => sum + (pp.duration || 0), 0);
            const calcProgMin = programPoints.filter(pp => !pp.is_pause).reduce((sum, pp) => sum + (pp.duration || 0), 0);
            const totalParticipants = programPoints.filter(pp => !pp.is_pause).reduce((sum, pp) => sum + (pp.performer_count || 0), 0);
             const fmtMin = (min: number) => min >= 60 ? `${Math.floor(min / 60)} h ${min % 60 > 0 ? (min % 60) + ' min' : ''}`.trim() : `${min} min`;
            const labelStyle: React.CSSProperties = { fontSize: '0.68rem', fontWeight: 700, color: '#444746', display: 'block', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.04em' };

            const plannedProgMin = parseInt(programDuration, 10) || activeEvent.program_duration || 0;
            const isDurationExceeded = plannedProgMin > 0 && calcProgMin > plannedProgMin;

            const hasRoomConflict = activeEvent.room_id && customEvents.some(ev => 
              ev.id !== activeEvent.id && 
              ev.room_id === activeEvent.room_id && 
              ev.event_date === activeEvent.event_date &&
              (parseTimeToMinutes(ev.start_time) < (parseTimeToMinutes(activeEvent.end_time || '23:59')) && 
               parseTimeToMinutes(activeEvent.start_time) < parseTimeToMinutes(ev.end_time || '23:59'))
            );

            return (
              <div style={{ 
                background: '#ffffff',
                borderRadius: '16px',
                border: '1px solid #cbd5e1',
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                padding: '24px',
                display: 'flex', 
                flexDirection: 'column', 
                gap: '24px'
              }}>
                {isDurationExceeded && (
                  <div style={{ background: '#fef2f2', border: '1.5px solid #fecaca', borderRadius: '12px', padding: '12px 16px', color: '#b91c1c', fontSize: '0.8rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>⚠ Warnung: Die Summe der Beiträge ({fmtMin(calcProgMin)}) überschreitet die geplante Programmdauer ({fmtMin(plannedProgMin)})!</span>
                  </div>
                )}
                {hasRoomConflict && (
                  <div style={{ background: '#fffbeb', border: '1.5px solid #fef3c7', borderRadius: '12px', padding: '12px 16px', color: '#b45309', fontSize: '0.8rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>⚠ Raumkonflikt: Der ausgewählte Raum ist an diesem Tag bereits belegt!</span>
                  </div>
                )}
                {/* Header row: Datum, Frist und Speichern */}
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'flex-end', 
                  paddingBottom: '20px', 
                  borderBottom: '1px solid #e2e8f0', 
                  gap: '16px',
                  flexWrap: 'wrap'
                }}>
                  {/* Datum (Read-only Calendar Widget Style) */}
                  <div style={{
                    padding: '10px 16px',
                    background: '#f2fdf6',
                    borderRadius: '8px',
                    border: '1px solid #d1e2d4',
                    display: 'flex',
                    gap: '12px',
                    alignItems: 'center',
                    height: '40px',
                    boxSizing: 'border-box'
                  }}>
                    <div style={{
                      background: brandColor,
                      color: '#ffffff',
                      width: '24px',
                      height: '24px',
                      borderRadius: '6px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                      <Calendar size={12} />
                    </div>
                    <div>
                      <span style={{ fontSize: '0.58rem', fontWeight: 800, color: brandColor, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block' }}>Datum</span>
                      <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#1f1f1f' }}>
                        {activeEvent.event_date ? new Date(activeEvent.event_date).toLocaleDateString('de-DE', { weekday: 'short', day: 'numeric', month: 'short' }) : '—'}
                      </span>
                    </div>
                  </div>

                  {/* Right side aligned elements */}
                  <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-end', flexWrap: 'wrap', flex: 1, justifyContent: 'flex-end' }}>

                    {/* Frist für Programmanmeldungen (Input) */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: '220px' }}>
                      <label style={{ fontSize: '0.65rem', fontWeight: 700, color: '#b45309', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        Frist für Programmanmeldungen
                      </label>
                      <input
                        type="datetime-local"
                        value={eventSubmissionDeadline}
                        onChange={e => setEventSubmissionDeadline(e.target.value)}
                        className="google-input google-input-noicon"
                        style={{
                          fontWeight: 700,
                          height: '40px'
                        }}
                      />
                    </div>

                    {/* Speichern Button */}
                    <button
                      type="button"
                      onClick={handleSaveEventSettings}
                      disabled={!!admissionTimeError}
                      className="google-btn-filled"
                      style={{
                        whiteSpace: 'nowrap',
                        height: '40px'
                      }}
                    >
                      Eckdaten speichern
                    </button>
                  </div>
                </div>

                {/* 2-Column Main Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '28px' }}>
                  {/* ── LEFT COLUMN ── */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

                    {/* Veranstaltungsort */}
                    <div>
                      <label style={labelStyle}>Veranstaltungsort</label>
                      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                        <Building2 size={15} color="#74777f" style={{ position: 'absolute', left: '12px' }} />
                        <input
                          type="text"
                          value={eventLocation}
                          onChange={e => setEventLocation(e.target.value)}
                          placeholder="z.B. Aula, Turnhalle, Stadtpark"
                          className="google-input"
                        />
                      </div>
                    </div>

                    {/* Adresse */}
                    <div>
                      <label style={labelStyle}>Adresse</label>
                      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                        <MapPin size={15} color="#74777f" style={{ position: 'absolute', left: '12px' }} />
                        <input
                          type="text"
                          value={eventLocationAddress}
                          onChange={e => setEventLocationAddress(e.target.value)}
                          placeholder="z.B. Musterstraße 12, 80333 München"
                          className="google-input"
                        />
                      </div>
                    </div>

                    {/* Beginn & Einlass Row */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                      {/* Beginn */}
                      <div>
                        <label style={labelStyle}>Beginn (Uhrzeit) *</label>
                        <input
                          type="time"
                          required
                          value={eventStartTime}
                          onChange={e => {
                            setEventStartTime(e.target.value);
                            if (eventAdmissionTime && e.target.value >= eventAdmissionTime) {
                              setAdmissionTimeError('');
                            }
                          }}
                          className="google-input google-input-noicon"
                        />
                      </div>

                      {/* Einlass with fallback logic */}
                      <div>
                        <label style={labelStyle}>
                          Einlass (Uhrzeit)
                          <span style={{ marginLeft: '4px', color: '#74777f', fontWeight: 500, textTransform: 'none', letterSpacing: 0 }}>
                            {!eventAdmissionTime && eventStartTime ? `— Fallback: ${eventStartTime} Uhr` : '(optional)'}
                          </span>
                        </label>
                        <input
                          type="time"
                          value={eventAdmissionTime}
                          onChange={e => {
                            setEventAdmissionTime(e.target.value);
                            if (e.target.value && eventStartTime && e.target.value > eventStartTime) {
                              setAdmissionTimeError('Einlass kann nicht nach dem Beginn liegen.');
                            } else {
                              setAdmissionTimeError('');
                            }
                          }}
                          placeholder={eventStartTime || undefined}
                          className="google-input google-input-noicon"
                          style={{
                            borderColor: admissionTimeError ? '#b3261e' : undefined,
                            color: eventAdmissionTime ? '#1f1f1f' : '#74777f'
                          }}
                        />
                      </div>
                    </div>
                    {admissionTimeError && (
                      <span style={{ fontSize: '0.7rem', color: '#b3261e', marginTop: '-6px', display: 'block' }}>
                        ⚠ {admissionTimeError}
                      </span>
                    )}

                    {/* Anzahl Bühnen & Budget Row */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                      {/* Anzahl Bühnen */}
                      <div>
                        <label style={labelStyle}>Anzahl Bühnen</label>
                        <select
                          value={stageCount}
                          onChange={e => setStageCount(parseInt(e.target.value, 10))}
                          className="google-input google-input-noicon"
                          style={{ background: '#ffffff url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20width%3D%2220%22%20height%3D%2220%22%20viewBox%3D%220%200%2020%2020%22%20fill%3D%22none%22%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%3E%3Cpath%20d%3D%22M5%207.5L10%2012.5L15%207.5%22%20stroke%3D%22%2374777f%22%20stroke-width%3D%221.5%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22/%3E%3C/svg%3E") no-repeat right 12px center', appearance: 'none', paddingRight: '36px' }}
                        >
                          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => <option key={n} value={n}>{n} Bühne{n !== 1 ? 'n' : ''}</option>)}
                        </select>
                      </div>

                      {/* Budget */}
                      <div>
                        <label style={labelStyle}>Budget</label>
                        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                          <span style={{ position: 'absolute', left: '12px', fontSize: '0.85rem', fontWeight: 700, color: '#74777f' }}>€</span>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={eventBudget}
                            onChange={e => setEventBudget(e.target.value)}
                            placeholder="1.500,00"
                            className="google-input"
                            style={{ paddingLeft: '28px' }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Erwartete Besucherzahl */}
                    <div>
                      <label style={labelStyle}>Erwartete Besucherzahl</label>
                      <input
                        type="number"
                        min="0"
                        value={eventAudience}
                        onChange={e => setEventAudience(e.target.value)}
                        placeholder="z.B. 300"
                        className="google-input google-input-noicon"
                      />
                    </div>

                    {/* Beschreibung */}
                    <div>
                      <label style={labelStyle}>Beschreibung der Veranstaltung</label>
                      <textarea
                        value={eventDescription}
                        onChange={e => setEventDescription(e.target.value)}
                        placeholder="Kurze Beschreibung für Besucher und das Planungsteam..."
                        rows={4}
                        className="google-input google-input-noicon"
                        style={{ resize: 'none', lineHeight: 1.5 }}
                      />
                    </div>
                  </div>

                  {/* ── RIGHT COLUMN (SIDEBAR) ── */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

                    {/* Read-only metrics block */}
                    <div className="google-card" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <span style={{ fontSize: '0.65rem', fontWeight: 800, color: '#444746', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Live-Metriken</span>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: '#f4f9f5', borderRadius: '8px' }}>
                        <span style={{ fontSize: '0.74rem', color: '#444746', fontWeight: 600 }}>Gesamtdauer</span>
                        <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#1f1f1f' }}>{fmtMin(calcTotalMin)}</span>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: isDurationExceeded ? '#fef2f2' : '#f4f9f5', borderRadius: '8px', border: isDurationExceeded ? '1px solid #fecaca' : 'none' }}>
                        <span style={{ fontSize: '0.74rem', color: isDurationExceeded ? '#b91c1c' : '#444746', fontWeight: 600 }}>Programm-Dauer</span>
                        <span style={{ fontSize: '0.82rem', fontWeight: 800, color: isDurationExceeded ? '#b91c1c' : '#1f1f1f' }}>
                          {fmtMin(calcProgMin)} {plannedProgMin > 0 && `(Max: ${fmtMin(plannedProgMin)})`}
                        </span>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: '#f4f9f5', borderRadius: '8px' }}>
                        <span style={{ fontSize: '0.74rem', color: '#444746', fontWeight: 600 }}>Teilnehmer (Schüler)</span>
                        <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#1f1f1f' }}>{totalParticipants}</span>
                      </div>
                    </div>

                    {/* Verantwortliche */}
                    <div className="google-card" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <span style={{ fontSize: '0.65rem', fontWeight: 800, color: '#444746', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Verantwortliche</span>

                      {[
                        { label: 'Programm', val: eventMainResponsible, set: setEventMainResponsible },
                        { label: 'Technik', val: eventTechResponsible, set: setEventTechResponsible },
                        { label: 'Gesamtkoordination', val: eventCoordResponsible, set: setEventCoordResponsible },
                      ].map(({ label, val, set }) => (
                        <div key={label} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <label style={{ fontSize: '0.68rem', fontWeight: 700, color: '#444746', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</label>
                          <select
                            value={val}
                            onChange={e => set(e.target.value)}
                            className="google-input google-input-noicon"
                            style={{ padding: '8px 10px', fontSize: '0.78rem', background: '#ffffff url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20width%3D%2220%22%20height%3D%2220%22%20viewBox%3D%220%200%2020%2020%22%20fill%3D%22none%22%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%3E%3Cpath%20d%3D%22M5%207.5L10%2012.5L15%207.5%22%20stroke%3D%22%2374777f%22%20stroke-width%3D%221.5%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22/%3E%3C/svg%3E") no-repeat right 10px center', appearance: 'none', paddingRight: '30px' }}
                          >
                            <option value="">— Nicht zugewiesen —</option>
                            {allUsers.filter(u => u.role === 'teacher' || u.role === 'admin' || u.role === 'secretary').map(u => {
                              const name = `${u.first_name || ''} ${u.last_name || ''}`.trim();
                              return <option key={u.id} value={name}>{name} ({u.role === 'admin' ? 'Admin' : u.role === 'secretary' ? 'Sekretariat' : 'Lehrer'})</option>;
                            })}
                          </select>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}







          {coordinatorTab === 'submissions' && (() => {
            const relevantTeachers = allUsers.filter(u => u.role === 'teacher' || u.role === 'admin' || u.role === 'secretary');

            // Apply search filter and status filter to the teachers list
            const filteredTeachers = relevantTeachers.filter(teacher => {
              // 1. Search Query filter (first_name, last_name)
              const fullName = `${teacher.first_name || ''} ${teacher.last_name || ''}`.toLowerCase();
              if (teacherSearchQuery && !fullName.includes(teacherSearchQuery.toLowerCase())) {
                return false;
              }

              // 2. Status Filter
              const hasConfirmedNoSubmission = activeEvent.no_submission_teacher_ids?.includes(teacher.id);
              const teacherPoints = programPoints.filter(pp => pp.teacher_id === teacher.id && !pp.is_pause);
              const hasPendingSubmissions = teacherPoints.some(pp => pp.status === 'submitted');
              const hasSubmissions = teacherPoints.length > 0;

              if (teacherStatusFilter === 'pending') {
                return (hasSubmissions && hasPendingSubmissions) || (!hasSubmissions && !hasConfirmedNoSubmission);
              } else if (teacherStatusFilter === 'completed') {
                return hasConfirmedNoSubmission || (hasSubmissions && !hasPendingSubmissions);
              }
              return true;
            });

            // Set default selected teacher if not set or not in list
            const activeTeacher = filteredTeachers.find(t => t.id === selectedTeacherIdForSubmissions) || filteredTeachers[0] || null;

            const getTeacherStatusBadge = (teacher: any) => {
              const hasConfirmedNoSubmission = activeEvent.no_submission_teacher_ids?.includes(teacher.id);
              const teacherPoints = programPoints.filter(pp => pp.teacher_id === teacher.id && !pp.is_pause);
              const hasPending = teacherPoints.some(pp => pp.status === 'submitted');
              const hasSubmissions = teacherPoints.length > 0;

              if (hasConfirmedNoSubmission) {
                return { label: 'Keine', bg: '#f1f5f9', color: '#64748b' };
              }
              if (!hasSubmissions) {
                return { label: 'Ausstehend', bg: '#fff9db', color: '#b28600' };
              }
              if (hasPending) {
                return { label: `${teacherPoints.filter(pp => pp.status === 'submitted').length} Offen`, bg: '#ffe8cc', color: '#ea580c' };
              }
              return { label: 'Freigegeben', bg: '#e2f8e9', color: brandColor };
            };

            return (
              <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '24px', height: 'calc(100vh - 280px)', minHeight: '500px', boxSizing: 'border-box' }}>
                
                {/* LEFT COLUMN: Teacher chat list */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', background: '#f8fafc', padding: '16px', borderRadius: '16px', border: '1px solid #e2e8f0', height: '100%', boxSizing: 'border-box' }}>
                  
                  {/* Search Bar */}
                  <input
                    type="text"
                    placeholder="Lehrer suchen..."
                    value={teacherSearchQuery}
                    onChange={e => setTeacherSearchQuery(e.target.value)}
                    className="google-input google-input-noicon"
                    style={{ height: '36px', fontSize: '0.8rem', width: '100%', boxSizing: 'border-box' }}
                  />

                  {/* Filter Pills */}
                  <div style={{ display: 'flex', gap: '6px' }}>
                    {(['all', 'pending', 'completed'] as const).map(f => (
                      <button
                        key={f}
                        type="button"
                        onClick={() => setTeacherStatusFilter(f)}
                        style={{
                          padding: '4px 10px',
                          borderRadius: '100px',
                          fontSize: '0.7rem',
                          fontWeight: 'bold',
                          border: 'none',
                          cursor: 'pointer',
                          background: teacherStatusFilter === f ? brandColor : '#ffffff',
                          color: teacherStatusFilter === f ? '#ffffff' : '#64748b',
                          boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        {f === 'all' ? 'Alle' : f === 'pending' ? 'Offen' : 'Erledigt'}
                      </button>
                    ))}
                  </div>

                  {/* Vertically scrollable teacher list */}
                  <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {filteredTeachers.length === 0 ? (
                      <div style={{ padding: '20px', textAlign: 'center', color: '#94a3b8', fontSize: '0.78rem' }}>
                        Keine Lehrer gefunden.
                      </div>
                    ) : (
                      filteredTeachers.map(teacher => {
                        const isSelected = activeTeacher && activeTeacher.id === teacher.id;
                        const badge = getTeacherStatusBadge(teacher);
                        return (
                          <div
                            key={teacher.id}
                            onClick={() => setSelectedTeacherIdForSubmissions(teacher.id)}
                            style={{
                              padding: '12px 14px',
                              borderRadius: '12px',
                              background: isSelected ? '#ffffff' : 'transparent',
                              border: isSelected ? `1px solid ${brandColor}` : '1px solid transparent',
                              cursor: 'pointer',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '4px',
                              boxShadow: isSelected ? '0 4px 12px rgba(0,0,0,0.05)' : 'none',
                              transition: 'all 0.15s ease'
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <strong style={{ fontSize: '0.84rem', color: isSelected ? brandColor : '#1f1f1f' }}>
                                {teacher.first_name} {teacher.last_name}
                              </strong>
                              <span style={{ fontSize: '0.64rem', fontWeight: 800, background: badge.bg, color: badge.color, padding: '2px 8px', borderRadius: '100px' }}>
                                {badge.label}
                              </span>
                            </div>
                            <span style={{ fontSize: '0.68rem', color: '#64748b', textTransform: 'capitalize' }}>
                              {teacher.role === 'admin' ? 'Admin' : teacher.role === 'secretary' ? 'Sekretariat' : 'Lehrer'}
                            </span>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* RIGHT COLUMN: Selected teacher details pane */}
                <div style={{ display: 'flex', flexDirection: 'column', background: '#ffffff', borderRadius: '16px', border: '1px solid #cbd5e1', height: '100%', boxSizing: 'border-box', overflow: 'hidden' }}>
                  {!activeTeacher ? (
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', gap: '8px' }}>
                      <span style={{ fontSize: '2rem' }}>👤</span>
                      <span style={{ fontSize: '0.84rem' }}>Bitte wählen Sie einen Lehrer aus der Liste aus.</span>
                    </div>
                  ) : (() => {
                    const teacher = activeTeacher;
                    const hasConfirmedNoSubmission = activeEvent.no_submission_teacher_ids?.includes(teacher.id);
                    const teacherPoints = programPoints.filter(pp => pp.teacher_id === teacher.id && !pp.is_pause);
                    const submittedCount = teacherPoints.filter(pp => pp.status === 'submitted').length;
                    const approvedCount = teacherPoints.filter(pp => pp.status === 'approved').length;

                    return (
                      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                        
                        {/* Detail Header */}
                        <div style={{ padding: '16px 20px', borderBottom: '1px solid #cbd5e1', background: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxSizing: 'border-box' }}>
                          <div>
                            <h4 style={{ margin: 0, fontSize: '0.94rem', fontWeight: 700, color: '#1f1f1f' }}>
                              {teacher.first_name} {teacher.last_name}
                            </h4>
                            <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
                              {teacherPoints.length} Beiträge insgesamt ({approvedCount} freigegeben, {submittedCount} ausstehend)
                            </span>
                          </div>
                          
                          <div style={{ display: 'flex', gap: '8px' }}>
                            {hasConfirmedNoSubmission && (
                              <button
                                type="button"
                                onClick={() => handleResetNoSubmissionStatus(teacher.id)}
                                className="google-btn-outlined"
                                style={{ height: '30px', padding: '0 12px', fontSize: '0.74rem', border: '1px solid #cbd5e1' }}
                              >
                                Zurücksetzen
                              </button>
                            )}

                            {!hasConfirmedNoSubmission && teacherPoints.length === 0 && (
                              <button
                                type="button"
                                onClick={() => alert(`Erinnerung wurde per Mail/Shoutbox an ${teacher.first_name} ${teacher.last_name} gesendet!`)}
                                className="google-btn-filled"
                                style={{ height: '30px', padding: '0 12px', fontSize: '0.74rem', background: '#ea580c' }}
                              >
                                ✉ Erinnern
                              </button>
                            )}

                            {teacherPoints.some(pp => pp.status === 'submitted') && (
                              <div style={{ display: 'flex', gap: '6px' }}>
                                <button
                                  type="button"
                                  onClick={() => handleBulkUpdateStatus(teacher.id, 'approved')}
                                  className="google-btn-filled"
                                  style={{ height: '30px', padding: '0 14px', fontSize: '0.74rem' }}
                                >
                                  Alle freigeben
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleBulkUpdateStatus(teacher.id, 'rejected')}
                                  className="google-btn-outlined"
                                  style={{ height: '30px', padding: '0 14px', fontSize: '0.74rem', border: '1.5px solid #cbd5e1' }}
                                >
                                  Alle ablehnen
                                </button>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Detail Scroll Area (Submissions List) */}
                        <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '10px', boxSizing: 'border-box' }}>
                          {hasConfirmedNoSubmission ? (
                            <div style={{ padding: '24px', textAlign: 'center', color: '#64748b', fontSize: '0.84rem', background: '#f8fafc', borderRadius: '12px', border: '1px dashed #cbd5e1' }}>
                              ℹ️ Dieser Lehrer hat gemeldet, dass er für dieses Event **keine Beiträge** einreichen wird.
                            </div>
                          ) : teacherPoints.length === 0 ? (
                            <div style={{ padding: '24px', textAlign: 'center', color: '#94a3b8', fontSize: '0.84rem', background: '#f8fafc', borderRadius: '12px', border: '1px dashed #cbd5e1' }}>
                              Bislang wurden keine Beiträge eingereicht.
                            </div>
                          ) : (
                            teacherPoints.map(pp => {
                              let ppStatusLabel = 'Eingereicht';
                              let ppStatusBg = '#fff9db';
                              let ppStatusColor = '#b28600';
                              if (pp.status === 'approved') {
                                ppStatusLabel = 'Freigegeben';
                                ppStatusBg = '#e2f8e9';
                                ppStatusColor = brandColor;
                              } else if (pp.status === 'rejected') {
                                ppStatusLabel = 'Abgelehnt';
                                ppStatusBg = '#ffebee';
                                ppStatusColor = '#b3261e';
                              }

                              const hasPendingFeedback = pp.additional_feedback_responses?.status === 'pending_response';
                              const hasRespondedFeedback = pp.additional_feedback_responses?.status === 'responded';
                              const isExpanded = expandedSubmissionDetails[pp.id] || false;

                              return (
                                <div
                                  key={pp.id}
                                  onClick={() => setExpandedSubmissionDetails(prev => ({ ...prev, [pp.id]: !prev[pp.id] }))}
                                  style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    background: isExpanded ? '#f8faf9' : '#fafbfa',
                                    padding: '14px',
                                    borderRadius: '12px',
                                    border: isExpanded ? '1px solid #cbd5e1' : '1px solid #eef3ef',
                                    cursor: 'pointer',
                                    transition: 'all 0.15s ease',
                                    boxSizing: 'border-box',
                                    position: 'relative'
                                  }}
                                >
                                  {/* Row Info */}
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                                    <div>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <strong style={{ fontSize: '0.88rem', color: '#2e3a30' }}>
                                          {pp.name} {isExpanded ? '▲' : '▼'}
                                        </strong>
                                        {pp.created_at && (
                                          <span style={{ fontSize: '0.72rem', color: '#7c8b80' }}>
                                            ({new Date(pp.created_at).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} Uhr)
                                          </span>
                                        )}
                                      </div>
                                      <div style={{ display: 'flex', gap: '12px', fontSize: '0.74rem', color: '#64748b', marginTop: '4px' }}>
                                        {pp.ensemble_band && <span>👥 Ensemble: {pp.ensemble_band}</span>}
                                        <span>⏱️ {pp.duration} Min.</span>
                                        {hasPendingFeedback && <span style={{ color: '#b45309', fontWeight: 600 }}>⏳ Rückfrage ausstehend</span>}
                                        {hasRespondedFeedback && <span style={{ color: brandColor, fontWeight: 600 }}>✅ Rückmeldung erhalten</span>}
                                      </div>
                                    </div>
                                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }} onClick={e => e.stopPropagation()}>
                                      <span style={{ fontSize: '0.64rem', fontWeight: 800, background: ppStatusBg, color: ppStatusColor, padding: '3px 8px', borderRadius: '4px', textTransform: 'uppercase' }}>
                                        {ppStatusLabel}
                                      </span>
                                      {pp.status === 'submitted' && (
                                        <div style={{ display: 'flex', gap: '6px' }}>
                                          <button
                                            type="button"
                                            onClick={() => handleUpdateProgramPointStatus(pp.id, 'approved')}
                                            className="google-btn-filled"
                                            style={{ height: '28px', padding: '0 12px', fontSize: '0.7rem' }}
                                          >
                                            Freigeben
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => handleUpdateProgramPointStatus(pp.id, 'rejected')}
                                            className="google-btn-outlined"
                                            style={{ height: '28px', padding: '0 12px', fontSize: '0.7rem', border: '1.5px solid #d1ebd5' }}
                                          >
                                            Ablehnen
                                          </button>
                                        </div>
                                      )}
                                    </div>
                                  </div>

                                  {/* Expandable Details Pane */}
                                  {isExpanded && (
                                    <div
                                      style={{
                                        marginTop: '12px',
                                        padding: '14px',
                                        background: '#ffffff',
                                        border: '1px solid #e2e8f0',
                                        borderRadius: '8px',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '10px',
                                        width: '100%',
                                        boxSizing: 'border-box',
                                        cursor: 'default'
                                      }}
                                      onClick={e => e.stopPropagation()}
                                    >
                                      {/* New Redesigned detailed card layout in columns */}
                                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', fontSize: '0.8rem', width: '100%', boxSizing: 'border-box' }}>
                                        
                                        {/* Section 1: Besetzung & Schüler */}
                                        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                          <h4 style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0f172a', margin: '0 0 4px 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            👥 Besetzung & Schüler
                                          </h4>
                                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                            {pp.performer_count !== undefined && (
                                              <div>
                                                <span style={{ color: '#64748b', fontWeight: 600 }}>Anzahl Mitwirkende:</span> {pp.performer_count}
                                              </div>
                                            )}
                                            {pp.preferred_time && (
                                              <div>
                                                <span style={{ color: '#64748b', fontWeight: 600 }}>Wunsch-Uhrzeit:</span> {pp.preferred_time}
                                              </div>
                                            )}
                                            {pp.instrument && (
                                              <div>
                                                <span style={{ color: '#64748b', fontWeight: 600 }}>Hauptinstrument:</span> {pp.instrument}
                                              </div>
                                            )}
                                            {pp.publisher && (
                                              <div>
                                                <span style={{ color: '#64748b', fontWeight: 600 }}>Verlag:</span> {pp.publisher}
                                              </div>
                                            )}
                                          </div>
                                          
                                          {/* Assigned students list */}
                                          <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '8px', marginTop: 'auto' }}>
                                            <span style={{ color: '#64748b', fontWeight: 600, display: 'block', marginBottom: '6px' }}>Zuweisungen ({ (pp.additional_feedback_responses?.assigned_students || []).length }):</span>
                                            {(() => {
                                              const studentIds = pp.additional_feedback_responses?.assigned_students || [];
                                              const assigned = allUsers.filter(u => studentIds.includes(u.id));
                                              if (assigned.length === 0) {
                                                return <span style={{ fontStyle: 'italic', color: '#94a3b8', fontSize: '0.74rem' }}>Keine Schüler zugewiesen</span>;
                                              }
                                              return (
                                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                                  {assigned.map((st: any) => (
                                                    <span key={st.id} style={{ display: 'inline-block', padding: '3px 8px', background: '#e0f2fe', color: '#0369a1', borderRadius: '12px', fontSize: '0.74rem', fontWeight: 650, border: '1px solid #bae6fd' }}>
                                                      {st.first_name} {st.last_name} {st.instrument && `(${st.instrument})`}
                                                    </span>
                                                  ))}
                                                </div>
                                              );
                                            })()}
                                          </div>
                                        </div>

                                        {/* Section 2: Repertoire & GEMA */}
                                        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                          <h4 style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0f172a', margin: '0 0 4px 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            🎼 Repertoire & GEMA
                                          </h4>
                                          {pp.songs && pp.songs.length > 0 ? (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                              {pp.songs.map((song: any, idx: number) => (
                                                <div key={idx} style={{ background: '#ffffff', padding: '8px 10px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                                                  <strong style={{ color: '#0f172a', fontSize: '0.78rem' }}>{song.title}</strong> {song.artist && <span style={{ color: '#475569', fontSize: '0.74rem' }}> von {song.artist}</span>}
                                                  <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '4px', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                                    {song.composer && <span>Komp: {song.composer}</span>}
                                                    {song.arranger && <span>Arr: {song.arranger}</span>}
                                                  </div>
                                                </div>
                                              ))}
                                            </div>
                                          ) : (
                                            <span style={{ fontStyle: 'italic', color: '#94a3b8', fontSize: '0.74rem' }}>Keine Stücke eingetragen</span>
                                          )}
                                        </div>

                                        {/* Section 3: Bühnenbedarf & Technik */}
                                        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                          <h4 style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0f172a', margin: '0 0 4px 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            🎸 Bühnenbedarf & Technik
                                          </h4>
                                          
                                          {/* Seating / Chairs / Stands */}
                                          <div style={{ display: 'flex', gap: '16px' }}>
                                            <div>
                                              <span style={{ color: '#64748b', fontWeight: 600 }}>🪑 Stühle:</span> {pp.chairs_needed || 0}
                                            </div>
                                            <div>
                                              <span style={{ color: '#64748b', fontWeight: 600 }}>🎼 Notenständer:</span> {pp.music_stands_needed || 0}
                                            </div>
                                          </div>

                                          {/* Tech rider items */}
                                          {(() => {
                                            let techItems = [];
                                            try {
                                              if (pp.tech_requirements && (pp.tech_requirements.trim().startsWith('[') || pp.tech_requirements.trim().startsWith('{'))) {
                                                techItems = JSON.parse(pp.tech_requirements);
                                              }
                                            } catch (err) {}

                                            return (
                                              <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '8px', marginTop: '4px' }}>
                                                <span style={{ color: '#64748b', fontWeight: 600, display: 'block', marginBottom: '6px' }}>Tech Rider / Inputs:</span>
                                                {techItems.length > 0 ? (
                                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                    {techItems.map((item: any, idx: number) => {
                                                      const isOwn = item.source === 'own';
                                                      const connColor = item.connection === 'XLR' || item.connection === 'Mikrofon' ? '#2563eb' : '#65a30d';
                                                      return (
                                                        <div key={idx} style={{ background: '#ffffff', padding: '6px 8px', borderRadius: '6px', border: '1px solid #e2e8f0', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '4px', fontSize: '0.74rem' }}>
                                                          <span style={{ fontWeight: 700, color: '#0f172a' }}>{item.count}x {item.type}</span>
                                                          <span style={{ padding: '1px 4px', borderRadius: '4px', background: `${connColor}15`, color: connColor, fontSize: '0.62rem', fontWeight: 700 }}>
                                                            {item.connection}
                                                          </span>
                                                          <span style={{ padding: '1px 4px', borderRadius: '4px', background: isOwn ? '#fef3c7' : '#f1f5f9', color: isOwn ? '#b45309' : '#475569', fontSize: '0.62rem', fontWeight: 700 }}>
                                                            {isOwn ? 'Eigenes' : 'Schule'}
                                                          </span>
                                                          {item.notes && <span style={{ color: '#64748b', fontStyle: 'italic', fontSize: '0.68rem' }}>({item.notes})</span>}
                                                        </div>
                                                      );
                                                    })}
                                                  </div>
                                                ) : pp.tech_requirements ? (
                                                  <div style={{ background: '#ffffff', padding: '6px 8px', borderRadius: '4px', border: '1px solid #e2e8f0', color: '#475569', fontSize: '0.74rem' }}>
                                                    {pp.tech_requirements}
                                                  </div>
                                                ) : (
                                                  <span style={{ fontStyle: 'italic', color: '#94a3b8', fontSize: '0.74rem' }}>Keine Inputs</span>
                                                )}
                                              </div>
                                            );
                                          })()}

                                          {/* Remarks */}
                                          {pp.remarks && (
                                            <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '8px', marginTop: '4px' }}>
                                              <span style={{ color: '#64748b', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Anmerkungen:</span>
                                              <div style={{ background: '#fef3c7', borderLeft: '3px solid #f59e0b', padding: '6px 8px', borderRadius: '4px', fontStyle: 'italic', color: '#b45309', fontSize: '0.74rem' }}>
                                                "{pp.remarks}"
                                              </div>
                                            </div>
                                          )}
                                        </div>

                                      </div>
                                      
                                      {/* Spacer block */}

                                    </div>
                                  )}
                                </div>
                              );
                            })
                          )}
                        </div>

                      </div>
                    );
                  })()}
                </div>

              </div>
            );
          })()}


          {coordinatorTab === 'feedback' && (() => {
            const relevantTeachers = allUsers.filter(u => u.role === 'teacher' || u.role === 'admin' || u.role === 'secretary');

            // Apply search & status filters
            const filteredTeachers = relevantTeachers.filter(teacher => {
              const fullName = `${teacher.first_name || ''} ${teacher.last_name || ''}`.toLowerCase();
              if (feedbackSearchQuery && !fullName.includes(feedbackSearchQuery.toLowerCase())) {
                return false;
              }

              const teacherPoints = programPoints.filter(pp => pp.teacher_id === teacher.id && !pp.is_pause);
              const hasPending = teacherPoints.some(pp => pp.additional_feedback_responses?.status === 'pending_response');
              
              if (feedbackStatusFilter === 'pending') {
                return hasPending;
              } else if (feedbackStatusFilter === 'completed') {
                return !hasPending && teacherPoints.some(pp => pp.additional_feedback_responses?.questions && pp.additional_feedback_responses.questions.length > 0);
              }
              // Show all teachers who have at least one submission
              return teacherPoints.length > 0;
            });

            const activeTeacher = filteredTeachers.find(t => t.id === selectedTeacherIdForFeedback) || filteredTeachers[0] || null;

            const getTeacherFeedbackBadge = (teacher: any) => {
              const teacherPoints = programPoints.filter(pp => pp.teacher_id === teacher.id && !pp.is_pause);
              const hasPending = teacherPoints.some(pp => pp.additional_feedback_responses?.status === 'pending_response');
              const hasAnyQuestions = teacherPoints.some(pp => pp.additional_feedback_responses?.questions && pp.additional_feedback_responses.questions.length > 0);

              if (hasPending) {
                return { label: '⏳ Offen', bg: '#ffe8cc', color: '#ea580c' };
              }
              if (hasAnyQuestions) {
                return { label: '✅ Klärt', bg: '#e2f8e9', color: brandColor };
              }
              return { label: 'Keine', bg: '#f1f5f9', color: '#64748b' };
            };

            return (
              <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '24px', height: 'calc(100vh - 280px)', minHeight: '500px', boxSizing: 'border-box' }}>
                
                {/* LEFT COLUMN: Teacher list */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', background: '#f8fafc', padding: '16px', borderRadius: '16px', border: '1px solid #e2e8f0', height: '100%', boxSizing: 'border-box' }}>
                  
                  {/* Search Bar */}
                  <input
                    type="text"
                    placeholder="Lehrer suchen..."
                    value={feedbackSearchQuery}
                    onChange={e => setFeedbackSearchQuery(e.target.value)}
                    className="google-input google-input-noicon"
                    style={{ height: '36px', fontSize: '0.8rem', width: '100%', boxSizing: 'border-box' }}
                  />

                  {/* Filter Pills */}
                  <div style={{ display: 'flex', gap: '6px' }}>
                    {(['all', 'pending', 'completed'] as const).map(f => (
                      <button
                        key={f}
                        type="button"
                        onClick={() => setFeedbackStatusFilter(f)}
                        style={{
                          padding: '4px 10px',
                          borderRadius: '100px',
                          fontSize: '0.7rem',
                          fontWeight: 'bold',
                          border: 'none',
                          cursor: 'pointer',
                          background: feedbackStatusFilter === f ? brandColor : '#ffffff',
                          color: feedbackStatusFilter === f ? '#ffffff' : '#64748b',
                          boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        {f === 'all' ? 'Alle' : f === 'pending' ? 'Wartend' : 'Erledigt'}
                      </button>
                    ))}
                  </div>

                  {/* Scrollable list */}
                  <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {filteredTeachers.length === 0 ? (
                      <div style={{ padding: '20px', textAlign: 'center', color: '#94a3b8', fontSize: '0.78rem' }}>
                        Keine Lehrer gefunden.
                      </div>
                    ) : (
                      filteredTeachers.map(teacher => {
                        const isSelected = activeTeacher && activeTeacher.id === teacher.id;
                        const badge = getTeacherFeedbackBadge(teacher);
                        return (
                          <div
                            key={teacher.id}
                            onClick={() => setSelectedTeacherIdForFeedback(teacher.id)}
                            style={{
                              padding: '12px 14px',
                              borderRadius: '12px',
                              background: isSelected ? '#ffffff' : 'transparent',
                              border: isSelected ? `1px solid ${brandColor}` : '1px solid transparent',
                              cursor: 'pointer',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '4px',
                              boxShadow: isSelected ? '0 4px 12px rgba(0,0,0,0.05)' : 'none',
                              transition: 'all 0.15s ease'
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <strong style={{ fontSize: '0.84rem', color: isSelected ? brandColor : '#1f1f1f' }}>
                                {teacher.first_name} {teacher.last_name}
                              </strong>
                              <span style={{ fontSize: '0.64rem', fontWeight: 800, background: badge.bg, color: badge.color, padding: '2px 8px', borderRadius: '100px' }}>
                                {badge.label}
                              </span>
                            </div>
                            <span style={{ fontSize: '0.68rem', color: '#64748b' }}>
                              {teacher.role === 'admin' ? 'Admin' : teacher.role === 'secretary' ? 'Sekretariat' : 'Lehrer'}
                            </span>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* RIGHT COLUMN: Chat history / Message thread */}
                <div style={{ display: 'flex', flexDirection: 'column', background: '#ffffff', borderRadius: '16px', border: '1px solid #cbd5e1', height: '100%', boxSizing: 'border-box', overflow: 'hidden' }}>
                  {!activeTeacher ? (
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', gap: '8px' }}>
                      <span style={{ fontSize: '2rem' }}>💬</span>
                      <span style={{ fontSize: '0.84rem' }}>Bitte wählen Sie einen Lehrer aus der Liste aus.</span>
                    </div>
                  ) : (() => {
                    const teacher = activeTeacher;
                    const teacherPoints = programPoints.filter(pp => pp.teacher_id === teacher.id && !pp.is_pause);

                    return (
                      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                        {/* Header */}
                        <div style={{ padding: '16px 20px', borderBottom: '1px solid #cbd5e1', background: '#f8fafc', boxSizing: 'border-box' }}>
                          <h4 style={{ margin: 0, fontSize: '0.94rem', fontWeight: 700, color: '#1f1f1f' }}>
                            Rückfragen & Feedback: {teacher.first_name} {teacher.last_name}
                          </h4>
                          <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
                            Kommunikation bezüglich der Beiträge des Lehrers
                          </span>
                        </div>

                        {/* Scroll Area */}
                        <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px', boxSizing: 'border-box' }}>
                          {teacherPoints.length === 0 ? (
                            <div style={{ padding: '24px', textAlign: 'center', color: '#94a3b8', fontSize: '0.84rem' }}>
                              Keine Beiträge für diesen Lehrer vorhanden.
                            </div>
                          ) : (
                            teacherPoints.map(pp => {
                              const hasPending = pp.additional_feedback_responses?.status === 'pending_response';
                              const questions = pp.additional_feedback_responses?.questions || [];
                              const answers = pp.additional_feedback_responses?.answers || [];

                              return (
                                <div key={pp.id} className="google-card" style={{ display: 'flex', flexDirection: 'column', gap: '14px', background: '#fafbfa', border: '1px solid #eef3ef', padding: '16px' }}>
                                  
                                  {/* Program Point Header */}
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px' }}>
                                    <div>
                                      <strong style={{ fontSize: '0.86rem', color: '#1e293b' }}>{pp.name}</strong>
                                      {pp.ensemble_band && <span style={{ display: 'block', fontSize: '0.7rem', color: '#64748b', marginTop: '1px' }}>👥 {pp.ensemble_band}</span>}
                                    </div>
                                    <span style={{ fontSize: '0.72rem', fontWeight: 700, color: hasPending ? '#ea580c' : brandColor }}>
                                      {hasPending ? '⏳ Warten auf Antwort' : questions.length > 0 ? '✅ Geklärt' : '💬 Keine Rückfragen'}
                                    </span>
                                  </div>

                                  {/* Centered Chat & Action Wrapper */}
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', maxWidth: '620px', width: '100%', alignSelf: 'center', boxSizing: 'border-box' }}>
                                    {/* Chat bubble list */}
                                    {questions.length > 0 && (
                                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                        {questions.map((q: string, idx: number) => {
                                          const answerText = answers[idx];
                                          return (
                                            <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                              {/* Question Bubble (sent by secretary/admin) - aligned right */}
                                              <div style={{ display: 'flex', justifyContent: 'flex-end', width: '100%' }}>
                                                <div style={{
                                                  maxWidth: '85%',
                                                  background: brandColor,
                                                  color: '#ffffff',
                                                  padding: '10px 14px',
                                                  borderRadius: '16px 16px 4px 16px',
                                                  fontSize: '0.8rem',
                                                  boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                                                }}>
                                                  <span style={{ display: 'block', fontSize: '0.64rem', fontWeight: 'bold', color: 'rgba(255,255,255,0.7)', marginBottom: '3px', textTransform: 'uppercase' }}>Sekretariat / Orga</span>
                                                  {q}
                                                </div>
                                              </div>

                                              {/* Answer Bubble (sent by teacher) - aligned left */}
                                              <div style={{ display: 'flex', justifyContent: 'flex-start', width: '100%' }}>
                                                {answerText ? (
                                                  <div style={{
                                                    maxWidth: '85%',
                                                    background: '#ffffff',
                                                    color: '#1e293b',
                                                    padding: '10px 14px',
                                                    borderRadius: '16px 16px 16px 4px',
                                                    fontSize: '0.8rem',
                                                    border: '1px solid #cbd5e1',
                                                    boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                                                  }}>
                                                    <span style={{ display: 'block', fontSize: '0.64rem', fontWeight: 'bold', color: brandColor, marginBottom: '3px', textTransform: 'uppercase' }}>{teacher.first_name} {teacher.last_name}</span>
                                                    {answerText}
                                                  </div>
                                                ) : (
                                                  <div style={{
                                                    maxWidth: '85%',
                                                    background: '#fff9db',
                                                    color: '#b28600',
                                                    padding: '8px 12px',
                                                    borderRadius: '16px 16px 16px 4px',
                                                    fontSize: '0.74rem',
                                                    fontStyle: 'italic',
                                                    border: '1px solid #ffe57f'
                                                  }}>
                                                    ⏳ Noch keine Antwort erhalten
                                                  </div>
                                                )}
                                              </div>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    )}

                                    {/* Action bar (Send new question or cancel) */}
                                    {!expandedFeedbackForms[pp.id] ? (
                                      <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                                        <button
                                          type="button"
                                          onClick={() => setExpandedFeedbackForms(prev => ({ ...prev, [pp.id]: true }))}
                                          className="google-btn-outlined"
                                          style={{ height: '30px', padding: '0 12px', fontSize: '0.74rem', border: '1px solid #cbd5e1', color: '#475569', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                                        >
                                          <MessageSquare size={13} /> {questions.length > 0 ? 'Weitere Rückfrage' : 'Rückfrage stellen'}
                                        </button>
                                        {hasPending && (
                                          <button
                                            type="button"
                                            onClick={() => handleCancelFeedbackQuestion(pp.id)}
                                            className="google-btn-outlined"
                                            style={{ height: '30px', padding: '0 12px', fontSize: '0.74rem', color: '#b3261e', border: '1.5px solid #ff8a80' }}
                                          >
                                            Storno
                                          </button>
                                        )}
                                      </div>
                                    ) : (
                                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center', marginTop: '4px' }}>
                                        <input
                                          placeholder="Neue Rückfrage formulieren..."
                                          value={feedbackQuestion[pp.id] || ''}
                                          onChange={e => setFeedbackQuestion(prev => ({ ...prev, [pp.id]: e.target.value }))}
                                          className="google-input google-input-noicon"
                                          style={{ flex: 1, minWidth: '150px', height: '36px', boxSizing: 'border-box' }}
                                        />
                                        <button
                                          type="button"
                                          onClick={() => {
                                            handleSendFeedbackQuestion(pp.id);
                                            setExpandedFeedbackForms(prev => ({ ...prev, [pp.id]: false }));
                                          }}
                                          className="google-btn-filled"
                                          style={{ height: '36px', fontSize: '0.76rem' }}
                                        >
                                          Senden
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => setExpandedFeedbackForms(prev => ({ ...prev, [pp.id]: false }))}
                                          className="google-btn-outlined"
                                          style={{ height: '36px', fontSize: '0.76rem', border: '1px solid #cbd5e1', color: '#475569' }}
                                        >
                                          Abbrechen
                                        </button>
                                      </div>
                                    )}
                                  </div>

                                </div>
                              );
                            })
                          )}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>
            );
          })()}

          {coordinatorTab === 'timeline' && (() => {
            // Unscheduled Pool: is_scheduled === false && (status === 'approved' || status === 'submitted') (and not pause)
            const unscheduledPoints = programPoints.filter(pp => !pp.is_scheduled && !pp.is_pause && (pp.status === 'approved' || pp.status === 'submitted'));

            // Scheduled Points on active stage, sorted by sort_order
            const activeStagePoints = programPoints.filter(pp => (pp.is_scheduled || pp.is_pause) && (pp.stage_number || 1) === activeStage)
              .sort((a, b) => a.sort_order - b.sort_order);

            // Compute conflicts and time map
            const activeEv = secretaryPlanningEvent || selectedEvent;
            const activeEventStartTime = activeEv?.event_start_time || activeEv?.start_time || '14:00';
            const conflicts: Record<string, string> = {};
            dbConflicts.forEach(c => {
              conflicts[c.program_point_id] = c.conflict_message;
            });
            const timeMap = calculateTimelineTimes(programPoints, activeEventStartTime);

            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {dbConflicts.length > 0 && (
                  <div style={{
                    background: '#fef2f2',
                    border: '1.5px solid rgba(255, 59, 48, 0.15)',
                    borderRadius: '12px',
                    padding: '12px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    color: '#ff3b30',
                    fontSize: '0.82rem',
                    fontWeight: 500
                  }}>
                    <AlertCircle size={18} style={{ color: '#ff3b30', flexShrink: 0 }} />
                    <div>
                      <strong style={{ fontWeight: 700 }}>Ablaufplan-Konflikte erkannt!</strong> Es gibt {dbConflicts.length} Konflikt(e) im aktuellen Ablaufplan. Bitte überprüfen Sie die Details in der Konflikt-Leiste.
                    </div>
                  </div>
                )}
                <div style={{ display: 'flex', gap: '20px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '4px' }}>
                  {/* Stage count switcher if stage_count > 1 */}
                  {stageCount > 1 && (
                    <div style={{ 
                      display: 'flex', 
                      background: 'rgba(120, 120, 128, 0.06)', 
                      padding: '3px', 
                      borderRadius: '8px', 
                      gap: '2px'
                    }}>
                      {Array.from({ length: stageCount }, (_, i) => i + 1).map(stageNum => (
                        <button
                          key={stageNum}
                          type="button"
                          onClick={() => setActiveStage(stageNum)}
                          style={{
                            padding: '5px 12px',
                            borderRadius: '6px',
                            border: 'none',
                            background: activeStage === stageNum ? '#ffffff' : 'transparent',
                            color: activeStage === stageNum ? '#1f1f1f' : '#384a3c',
                            fontWeight: 'bold',
                            fontSize: '0.78rem',
                            cursor: 'pointer',
                            boxShadow: activeStage === stageNum ? '0 1px 3px rgba(0,0,0,0.08), 0 1px 1px rgba(0,0,0,0.04)' : 'none',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          Bühne {stageNum}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Stage count editor */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#384a3c', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Bühnen Anzahl:
                    </label>
                    <select
                      value={stageCount}
                      onChange={async (e) => {
                        const val = parseInt(e.target.value, 10);
                        setStageCount(val);
                        const activeEv = secretaryPlanningEvent || selectedEvent;
                        if (activeEv) {
                          await supabase.from('campus_events').update({ stage_count: val }).eq('id', activeEv.id);
                          // Auto update active stage if it exceeds new count
                          if (activeStage > val) setActiveStage(val);
                        }
                      }}
                      className="google-input google-input-noicon"
                      style={{ width: '100px', height: '32px', padding: '0 8px', fontSize: '0.78rem' }}
                    >
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => <option key={n} value={n}>{n} Bühne{n !== 1 ? 'n' : ''}</option>)}
                    </select>
                  </div>

                  {/* Umbau-Puffer segmented control */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: 'auto' }}>
                    <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#384a3c', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Umbau-Puffer:
                    </label>
                    <div style={{ 
                      display: 'flex', 
                      background: 'rgba(120, 120, 128, 0.06)', 
                      padding: '3px', 
                      borderRadius: '8px', 
                      gap: '2px'
                    }}>
                      {[0, 5, 10, 15].map(min => (
                        <button
                          key={min}
                          type="button"
                          onClick={() => {
                            setTransitionTime(min);
                            const activeEv = secretaryPlanningEvent || selectedEvent;
                            if (activeEv) {
                              localStorage.setItem(`groovelab_event_transition_time_${activeEv.id}`, String(min));
                            }
                          }}
                          style={{
                            padding: '4px 10px',
                            borderRadius: '6px',
                            border: 'none',
                            background: transitionTime === min ? '#ffffff' : 'transparent',
                            color: transitionTime === min ? '#1f1f1f' : '#6e6e73',
                            fontWeight: 'bold',
                            fontSize: '0.74rem',
                            cursor: 'pointer',
                            boxShadow: transitionTime === min ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          {min} Min
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Start time editor */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#384a3c', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Startzeit:
                    </label>
                    <input
                      type="time"
                      value={eventStartTime || '14:00'}
                      onChange={async (e) => {
                        const val = e.target.value;
                        setEventStartTime(val);
                        const activeEv = secretaryPlanningEvent || selectedEvent;
                        if (activeEv) {
                          await supabase.from('campus_events').update({ event_start_time: val }).eq('id', activeEv.id);
                        }
                      }}
                      className="google-input google-input-noicon"
                      style={{ width: '90px', height: '32px', padding: '0 8px', fontSize: '0.78rem', fontWeight: 'bold' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '24px', height: 'calc(100vh - 280px)', minHeight: '500px' }}>
                  {/* Left Column: Pool of Unscheduled Program Points */}
                  <div
                    onDragOver={e => e.preventDefault()}
                    onDrop={handleDropOnUnscheduledPool}
                    style={{
                      flex: 1,
                      background: '#ffffff',
                      borderRadius: '16px',
                      padding: '20px',
                      border: '1.5px dashed #cbd5e1',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '16px',
                      boxSizing: 'border-box'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 700, color: '#1d1d1f' }}>Unverplante Beiträge</h4>
                      <button
                        type="button"
                        onClick={() => setIsManualEntryModalOpen(true)}
                        style={{
                          background: brandColor,
                          color: '#ffffff',
                          border: 'none',
                          padding: '6px 12px',
                          borderRadius: '8px',
                          fontSize: '0.75rem',
                          fontWeight: 'bold',
                          cursor: 'pointer',
                          transition: 'opacity 0.15s'
                        }}
                        onMouseOver={e => e.currentTarget.style.opacity = '0.9'}
                        onMouseOut={e => e.currentTarget.style.opacity = '1'}
                      >
                        + Beitrag hinzufügen
                      </button>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', overflowY: 'auto', flex: 1, paddingRight: '4px' }}>
                      {unscheduledPoints.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '40px 16px', fontSize: '0.78rem', color: '#86868b', lineHeight: 1.5 }}>
                          Keine unverplanten Beiträge.<br />Ziehe Beiträge hierher, um sie aus dem Ablaufplan zu entfernen.
                        </div>
                      ) : (
                        unscheduledPoints.map(pp => (
                          <div
                            key={pp.id}
                            draggable
                            onDragStart={e => {
                              e.dataTransfer.setData('ppId', pp.id);
                              e.dataTransfer.effectAllowed = 'move';
                            }}
                            style={{
                              padding: '12px 14px',
                              background: '#ffffff',
                              border: '1px solid #cbd5e1',
                              borderRadius: '12px',
                              boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                              cursor: 'grab',
                              fontSize: '0.8rem',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '6px'
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ fontWeight: 700, color: '#1f1f1f' }}>{pp.name}</span>
                              {pp.created_at && (
                                <span style={{ fontSize: '0.68rem', color: '#8c9e90', fontWeight: 500 }}>
                                  {new Date(pp.created_at).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} Uhr
                                </span>
                              )}
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', fontSize: '0.72rem', color: '#444746' }}>
                              {pp.ensemble_band && <span>👥 Ensemble: {pp.ensemble_band}</span>}
                              {pp.teacher_id && <span>👨‍🏫 Lehrer: {getTeacherName(pp.teacher_id)}</span>}
                              {pp.instrument && <span>🎸 Instrument: {pp.instrument}</span>}
                            </div>
                            <div style={{ fontSize: '0.74rem', color: brandColor, fontWeight: 700, marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              ⏱️ {pp.duration} Min.
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Right Column: Stage Timeline */}
                  <div
                    onDragOver={e => e.preventDefault()}
                    onDrop={e => handleDropOnTimeline(e)}
                    style={{
                      flex: 1.6,
                      background: '#ffffff',
                      borderRadius: isTimelineFullscreen ? '0' : '16px',
                      border: isTimelineFullscreen ? 'none' : '1px solid #cbd5e1',
                      boxShadow: isTimelineFullscreen ? 'none' : '0 1px 3px rgba(0,0,0,0.05)',
                      padding: isTimelineFullscreen ? '32px' : '20px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '16px',
                      boxSizing: 'border-box',
                      position: isTimelineFullscreen ? 'fixed' : 'relative',
                      top: isTimelineFullscreen ? 0 : 'auto',
                      left: isTimelineFullscreen ? 0 : 'auto',
                      right: isTimelineFullscreen ? 0 : 'auto',
                      bottom: isTimelineFullscreen ? 0 : 'auto',
                      width: isTimelineFullscreen ? '100vw' : 'auto',
                      height: isTimelineFullscreen ? '100vh' : 'auto',
                      zIndex: isTimelineFullscreen ? 99999 : 'auto'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                      <h4 style={{ margin: 0, fontSize: '0.92rem', fontWeight: 700, color: '#1f1f1f' }}>
                        Bühne {activeStage} - Ablaufplan
                      </h4>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        {activeStagePoints.length > 0 && (
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button
                              type="button"
                              onClick={() => {
                                const allExpanded = activeStagePoints.filter(pp => !pp.is_pause).every(pp => expandedPoints[pp.id]);
                                if (allExpanded) {
                                  setExpandedPoints({});
                                } else {
                                  const nextExpanded: Record<string, boolean> = {};
                                  activeStagePoints.forEach(pp => {
                                    if (!pp.is_pause) nextExpanded[pp.id] = true;
                                  });
                                  setExpandedPoints(nextExpanded);
                                }
                              }}
                              style={{
                                background: 'transparent',
                                border: '1px solid #cbd5e1',
                                color: '#475569',
                                padding: '0 12px',
                                borderRadius: '8px',
                                fontSize: '0.74rem',
                                fontWeight: 600,
                                cursor: 'pointer',
                                height: '32px',
                                display: 'inline-flex',
                                alignItems: 'center',
                                boxSizing: 'border-box'
                              }}
                            >
                              {activeStagePoints.filter(pp => !pp.is_pause).every(pp => expandedPoints[pp.id]) ? '↕ Alle einklappen' : '↕ Alle ausklappen'}
                            </button>
                            <button
                              type="button"
                              onClick={() => setIsTimelineFullscreen(prev => !prev)}
                              style={{
                                background: 'transparent',
                                border: '1px solid #cbd5e1',
                                color: '#475569',
                                padding: '0 12px',
                                borderRadius: '8px',
                                fontSize: '0.74rem',
                                fontWeight: 600,
                                cursor: 'pointer',
                                height: '32px',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                boxSizing: 'border-box'
                              }}
                            >
                              {isTimelineFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
                              {isTimelineFullscreen ? 'Verkleinern' : 'Fullscreen'}
                            </button>
                          </div>
                        )}
                        {/* Add Pause Form */}
                        <form onSubmit={handleAddPause} style={{ display: 'flex', gap: '8px' }}>
                        <input
                          type="number"
                          placeholder="Pause (Min.)"
                          value={pauseDuration}
                          onChange={e => setPauseDuration(e.target.value)}
                          className="google-input google-input-noicon"
                          style={{ 
                            width: '95px', 
                            height: '32px',
                            fontSize: '0.78rem',
                            fontWeight: 600
                          }}
                        />
                        <button
                          type="submit"
                          style={{ 
                            background: brandColor, 
                            color: '#ffffff', 
                            border: 'none', 
                            padding: '0 12px', 
                            borderRadius: '100px', 
                            fontWeight: 'bold', 
                            fontSize: '0.76rem', 
                            cursor: 'pointer',
                            height: '32px',
                            display: 'inline-flex',
                            alignItems: 'center'
                          }}
                        >
                          + Pause
                        </button>
                      </form>
                    </div>
                  </div>

                    <div style={{ 
                      display: 'flex', 
                      flexDirection: 'column', 
                      overflowY: 'auto', 
                      flex: 1, 
                      paddingRight: '4px',
                      boxSizing: 'border-box'
                    }}>
                      {activeStagePoints.length === 0 ? (
                        <div style={{ 
                          textAlign: 'center', 
                          padding: '60px 20px', 
                          border: '1.5px dashed #cbd5e1', 
                          borderRadius: '12px', 
                          color: '#86868b', 
                          fontSize: '0.8rem',
                          lineHeight: 1.5
                        }}>
                          Bühne leer.<br />Ziehe Beiträge aus der linken Spalte hierher, um sie zeitlich einzuplanen.
                        </div>
                      ) : (
                        <div style={{
                          position: 'relative',
                          paddingLeft: '85px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '12px'
                        }}>
                          <div style={{
                            position: 'absolute',
                            left: '60px',
                            top: '24px',
                            bottom: '24px',
                            width: '1px',
                            background: 'rgba(0, 0, 0, 0.08)',
                            zIndex: 0
                          }} />
                          {activeStagePoints.map((pp, idx) => {
                            const timeInfo = timeMap[pp.id] || { start: '--:--', end: '--:--' };
                            const conflictReason = conflicts[pp.id];
                            const hasConflict = !!conflictReason;
   
                             return (
                               <div
                                 key={pp.id}
                                 draggable={role === 'admin' || role === 'secretary'}
                                 onDragOver={e => {
                                    e.preventDefault();
                                    const rect = e.currentTarget.getBoundingClientRect();
                                    const relativeY = e.clientY - rect.top;
                                    const isAbove = relativeY < rect.height / 2;
                                    setDragOverId(pp.id);
                                    setDragOverPosition(isAbove ? 'above' : 'below');
                                  }}
                                  onDragLeave={() => {
                                    setDragOverId(null);
                                    setDragOverPosition(null);
                                  }}
                                  onDrop={e => {
                                    e.stopPropagation();
                                    setDragOverId(null);
                                    setDragOverPosition(null);
                                    const rect = e.currentTarget.getBoundingClientRect();
                                    const relativeY = e.clientY - rect.top;
                                    const isAbove = relativeY < rect.height / 2;
                                    handleDropOnTimeline(e, pp.id, isAbove);
                                  }}
                                 onDragStart={e => {
                                   e.dataTransfer.setData('ppId', pp.id);
                                   e.dataTransfer.effectAllowed = 'move';
                                 }}
                                 onMouseEnter={e => {
                                   e.currentTarget.style.transform = 'translateY(-2px)';
                                   e.currentTarget.style.boxShadow = '0 8px 24px rgba(0, 0, 0, 0.05)';
                                   e.currentTarget.style.borderColor = hasConflict 
                                     ? 'rgba(255, 59, 48, 0.3)' 
                                     : (pp.is_pause ? 'rgba(245, 158, 11, 0.2)' : 'rgba(0, 0, 0, 0.12)');
                                 }}
                                 onMouseLeave={e => {
                                   e.currentTarget.style.transform = 'none';
                                   e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.02), 0 1px 3px rgba(0, 0, 0, 0.01)';
                                   e.currentTarget.style.borderColor = hasConflict 
                                     ? 'rgba(255, 59, 48, 0.15)' 
                                     : (pp.is_pause ? 'rgba(245, 158, 11, 0.12)' : 'rgba(0, 0, 0, 0.06)');
                                 }}
                                 style={{
                                   padding: '14px 18px',
                                   background: hasConflict 
                                     ? 'rgba(255, 59, 48, 0.02)' 
                                     : (pp.is_pause ? '#fffbeb' : '#ffffff'),
                                   border: hasConflict 
                                     ? '1.5px solid rgba(255, 59, 48, 0.15)' 
                                     : (pp.is_pause ? '1px solid rgba(245, 158, 11, 0.15)' : '1px solid rgba(0, 0, 0, 0.06)'),
                                   borderRadius: '14px',
                                   boxShadow: '0 4px 12px rgba(0, 0, 0, 0.02), 0 1px 3px rgba(0, 0, 0, 0.01)',
                                   display: 'flex',
                                   justifyContent: 'space-between',
                                   alignItems: 'center',
                                   cursor: 'grab',
                                   gap: '16px',
                                   position: 'relative',
                                   transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)'
                                 }}
                               >
                                 {/* Drop indicator lines */}
                                 {dragOverId === pp.id && dragOverPosition === 'above' && (
                                   <div style={{
                                     position: 'absolute',
                                     top: '-8px',
                                     left: '0',
                                     right: '0',
                                     height: '4px',
                                     backgroundColor: brandColor,
                                     borderRadius: '2px',
                                     zIndex: 10
                                   }} />
                                 )}
                                 {dragOverId === pp.id && dragOverPosition === 'below' && (
                                   <div style={{
                                     position: 'absolute',
                                     bottom: '-8px',
                                     left: '0',
                                     right: '0',
                                     height: '4px',
                                     backgroundColor: brandColor,
                                     borderRadius: '2px',
                                     zIndex: 10
                                   }} />
                                 )}

                                 {/* Timeline Dot Indicator */}
                                 <div style={{
                                   position: 'absolute',
                                   left: '-29px',
                                   top: '20px',
                                   width: '8px',
                                   height: '8px',
                                   borderRadius: '50%',
                                   backgroundColor: '#ffffff',
                                   border: `2.5px solid ${hasConflict ? '#ff3b30' : (pp.is_pause ? '#f59e0b' : brandColor)}`,
                                   boxShadow: `0 0 0 4px ${hasConflict ? 'rgba(255, 59, 48, 0.1)' : (pp.is_pause ? 'rgba(245, 158, 11, 0.15)' : `${brandColor}15`)}`,
                                   zIndex: 1,
                                   transition: 'all 0.2s ease'
                                 }} />
                                 
                                 {/* Timeline Time Text */}
                                 <div style={{
                                   position: 'absolute',
                                   left: '-88px',
                                   width: '50px',
                                   textAlign: 'right',
                                   top: '16px',
                                   display: 'flex',
                                   flexDirection: 'column',
                                   gap: '2px'
                                 }}>
                                   <span style={{
                                     fontSize: '0.92rem',
                                     fontWeight: 600,
                                     color: hasConflict ? '#ff3b30' : (pp.is_pause ? '#6e6e73' : '#1d1d1f'),
                                     fontVariantNumeric: 'tabular-nums',
                                     fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                                     lineHeight: '1.1'
                                    }}>
                                     {timeInfo.start}
                                   </span>
                                   <span style={{
                                     fontSize: '0.72rem',
                                     fontWeight: 500,
                                     color: '#86868b',
                                     fontVariantNumeric: 'tabular-nums',
                                     fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                                     lineHeight: '1'
                                   }}>
                                     {timeInfo.end}
                                   </span>
                                 </div>
                                 
                                <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '12px' }}>
                                  {/* Left accent indicator bar */}
                                  <div style={{
                                    width: '4px',
                                    alignSelf: 'stretch',
                                    minHeight: '28px',
                                    borderRadius: '100px',
                                    backgroundColor: hasConflict ? '#ff3b30' : (pp.is_pause ? '#f59e0b' : brandColor),
                                    marginRight: '2px'
                                  }} />
                                  
                                  <div style={{ flex: 1 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                      {pp.is_pause && (
                                        <span style={{ 
                                          fontSize: '0.72rem', 
                                          background: 'rgba(245, 158, 11, 0.1)', color: '#d97706',
                                          padding: '2px 6px', 
                                          borderRadius: '4px', 
                                          fontWeight: 700,
                                          letterSpacing: '0.02em',
                                          textTransform: 'uppercase'
                                        }}>
                                          ☕ Pause
                                        </span>
                                      )}
                                      <strong style={{ fontSize: '0.86rem', color: hasConflict ? '#ff3b30' : (pp.is_pause ? '#6e6e73' : '#1d1d1f'), fontWeight: 600 }}>
                                        {pp.name}
                                      </strong>
                                      {!pp.is_pause && (
                                        <span style={{ fontSize: '0.72rem', color: '#86868b', fontWeight: 500, marginLeft: '4px' }}>
                                          ({pp.duration} Min.)
                                        </span>
                                      )}
                                      {!pp.is_pause && (
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setExpandedPoints(prev => ({ ...prev, [pp.id]: !prev[pp.id] }));
                                          }}
                                          style={{
                                            background: 'transparent',
                                            border: 'none',
                                            cursor: 'pointer',
                                            padding: '2px',
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            color: '#86868b',
                                            marginLeft: '4px'
                                          }}
                                        >
                                          {expandedPoints[pp.id] ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                        </button>
                                      )}
                                    </div>
  
                                    {hasConflict && (
                                      <div style={{ fontSize: '0.74rem', color: '#ff3b30', fontWeight: 700, marginTop: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        ⚠️ {conflictReason}
                                      </div>
                                    )}
  
                                    {!pp.is_pause && expandedPoints[pp.id] && (
                                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginTop: '6px', fontSize: '0.72rem', color: '#444746' }}>
                                        {pp.ensemble_band && <span>👥 Ensemble: {pp.ensemble_band}</span>}
                                        {pp.teacher_id && <span>👨‍🏫 Lehrer: {getTeacherName(pp.teacher_id)}</span>}
                                        {pp.instrument && <span>🎸 Instrument: {pp.instrument}</span>}
                                      </div>
                                    )}
                                  </div>
                                </div>
  
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                  {/* Up/Down Sorting Buttons */}
                                  {isAdminOrSecretary && (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginRight: '4px' }}>
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleMoveProgramPoint(pp.id, 'up');
                                        }}
                                        disabled={idx === 0}
                                        style={{
                                          border: 'none',
                                          background: '#f5f5f7',
                                          cursor: idx === 0 ? 'not-allowed' : 'pointer',
                                          width: '24px',
                                          height: '24px',
                                          display: 'flex',
                                          alignItems: 'center',
                                          justifyContent: 'center',
                                          borderRadius: '6px',
                                          color: idx === 0 ? '#d1d1d6' : '#1d1d1f',
                                          opacity: idx === 0 ? 0.4 : 1
                                        }}
                                        title="Nach oben verschieben"
                                      >
                                        <ChevronUp size={14} strokeWidth={2.5} />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleMoveProgramPoint(pp.id, 'down');
                                        }}
                                        disabled={idx === activeStagePoints.length - 1}
                                        style={{
                                          border: 'none',
                                          background: '#f5f5f7',
                                          cursor: idx === activeStagePoints.length - 1 ? 'not-allowed' : 'pointer',
                                          width: '24px',
                                          height: '24px',
                                          display: 'flex',
                                          alignItems: 'center',
                                          justifyContent: 'center',
                                          borderRadius: '6px',
                                          color: idx === activeStagePoints.length - 1 ? '#d1d1d6' : '#1d1d1f',
                                          opacity: idx === activeStagePoints.length - 1 ? 0.4 : 1
                                        }}
                                        title="Nach unten verschieben"
                                      >
                                        <ChevronDown size={14} strokeWidth={2.5} />
                                      </button>
                                    </div>
                                  )}
                                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '3px' }}>
                                    <label style={{ 
                                      fontSize: '0.58rem', 
                                      color: '#86868b', 
                                      fontWeight: 700, 
                                      textTransform: 'uppercase', 
                                      letterSpacing: '0.05em' 
                                    }}>
                                      Dauer
                                    </label>
                                    
                                    {/* Custom Stepper Pill */}
                                    <div style={{ 
                                      display: 'flex', 
                                      alignItems: 'center', 
                                      background: '#f5f5f7', 
                                      borderRadius: '8px', 
                                      padding: '2px',
                                      border: '1px solid rgba(0, 0, 0, 0.04)',
                                      boxSizing: 'border-box',
                                      height: '28px'
                                    }}>
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleEditDuration(pp.id, Math.max(1, pp.duration - 1));
                                        }}
                                        style={{
                                          border: 'none',
                                          background: 'transparent',
                                          cursor: 'pointer',
                                          width: '24px',
                                          height: '24px',
                                          display: 'flex',
                                          alignItems: 'center',
                                          justifyContent: 'center',
                                          borderRadius: '6px',
                                          color: '#1d1d1f',
                                          transition: 'background 0.2s'
                                        }}
                                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,0,0,0.05)'}
                                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                      >
                                        <Minus size={12} strokeWidth={2.5} />
                                      </button>
                                      
                                      <input
                                        type="number"
                                        min="1"
                                        value={pp.duration}
                                        onChange={e => handleEditDuration(pp.id, Math.max(1, parseInt(e.target.value, 10) || 1))}
                                        className="mini-time-input"
                                        style={{
                                          width: '30px',
                                          border: 'none',
                                          background: 'transparent',
                                          fontSize: '0.78rem',
                                          textAlign: 'center',
                                          fontWeight: 600,
                                          outline: 'none',
                                          padding: 0,
                                          margin: 0,
                                          color: '#1d1d1f',
                                          fontVariantNumeric: 'tabular-nums',
                                          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
                                        }}
                                      />
                                      
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleEditDuration(pp.id, pp.duration + 1);
                                        }}
                                        style={{
                                          border: 'none',
                                          background: 'transparent',
                                          cursor: 'pointer',
                                          width: '24px',
                                          height: '24px',
                                          display: 'flex',
                                          alignItems: 'center',
                                          justifyContent: 'center',
                                          borderRadius: '6px',
                                          color: '#1d1d1f',
                                          transition: 'background 0.2s'
                                        }}
                                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,0,0,0.05)'}
                                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                      >
                                        <Plus size={12} strokeWidth={2.5} />
                                      </button>
                                    </div>
                                  </div>
  
                                  {pp.is_pause && (
                                    <button
                                      type="button"
                                      onClick={async () => {
                                        const { error } = await supabase.from('campus_event_program_points').delete().eq('id', pp.id);
                                        if (!error) {
                                          setProgramPoints(prev => prev.filter(p => p.id !== pp.id));
                                        }
                                      }}
                                      style={{
                                        background: 'transparent',
                                        border: 'none',
                                        color: '#ff3b30',
                                        fontSize: '1rem',
                                        cursor: 'pointer',
                                        padding: '4px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        marginLeft: '4px'
                                      }}
                                    >
                                      <Trash2 size={16} />
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Conflict Sidebar Panel */}
                  <div style={{
                    width: '300px',
                    background: '#ffffff',
                    borderRadius: '16px',
                    border: '1px solid #cbd5e1',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                    padding: '20px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '16px',
                    boxSizing: 'border-box',
                    overflowY: 'auto'
                  }}>
                    <h4 style={{ margin: 0, fontSize: '0.92rem', fontWeight: 700, color: '#1f1f1f', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <AlertCircle size={16} style={{ color: dbConflicts.length > 0 ? '#ff3b30' : '#22c55e' }} />
                      Konflikte ({dbConflicts.length})
                    </h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1 }}>
                      {dbConflicts.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '40px 16px', fontSize: '0.78rem', color: '#86868b', lineHeight: 1.5 }}>
                          Keine Konflikte im Ablaufplan vorhanden. Alles sieht gut aus!
                        </div>
                      ) : (
                        dbConflicts.map((c, idx) => (
                          <div key={idx} style={{
                            padding: '12px',
                            background: 'rgba(255, 59, 48, 0.02)',
                            border: '1px solid rgba(255, 59, 48, 0.15)',
                            borderRadius: '10px',
                            fontSize: '0.76rem',
                            color: '#ff3b30',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '4px'
                          }}>
                            <div style={{ fontWeight: 700, color: '#ff3b30', textTransform: 'uppercase', fontSize: '0.65rem', letterSpacing: '0.05em' }}>
                              {c.conflict_type === 'lesson' ? 'Lehrer-Kollision' : 'Bühnen-Kollision'}
                            </div>
                            <div style={{ color: '#1f1f1f', fontWeight: 500 }}>{c.conflict_message}</div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>

                {/* Manual Entry Modal */}
                {isManualEntryModalOpen && (
                  <div style={{
                    position: 'fixed',
                    top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.3)',
                    backdropFilter: 'blur(10px)',
                    WebkitBackdropFilter: 'blur(10px)',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    zIndex: 10000
                  }}>
                    <div style={{
                      background: '#ffffff',
                      padding: '28px',
                      borderRadius: '20px',
                      width: '550px',
                      maxHeight: '90vh',
                      overflowY: 'auto',
                      boxShadow: '0 10px 40px rgba(0,0,0,0.1)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '16px'
                    }}>
                      <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#1d1d1f' }}>Neuen Programmpunkt anmelden</h3>
                      <form onSubmit={handleAddManualEntry} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <label style={{ fontSize: '0.74rem', fontWeight: 700, color: '#475569' }}>Ensemble / Band</label>
                          <input
                            type="text"
                            placeholder="z.B. Jazz-Ensemble oder Band XYZ"
                            value={manualEnsemble}
                            onChange={e => setManualEnsemble(e.target.value)}
                            style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.08)', outline: 'none', fontSize: '0.82rem' }}
                          />
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <label style={{ fontSize: '0.74rem', fontWeight: 700, color: '#475569' }}>Name des Auftritts / Beitrags (Optional)</label>
                          <input
                            type="text"
                            placeholder="z.B. Beatles-Medley (falls abweichend)"
                            value={manualTitle}
                            onChange={e => setManualTitle(e.target.value)}
                            style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.08)', outline: 'none', fontSize: '0.82rem' }}
                          />
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <label style={{ fontSize: '0.74rem', fontWeight: 700, color: '#475569' }}>Dauer (Minuten)</label>
                            <input
                              type="number"
                              min="1"
                              value={manualDuration}
                              onChange={e => setManualDuration(e.target.value)}
                              style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.08)', outline: 'none', fontSize: '0.82rem' }}
                            />
                          </div>

                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <label style={{ fontSize: '0.74rem', fontWeight: 700, color: '#475569' }}>Teilnehmeranzahl</label>
                            <input
                              type="number"
                              min="1"
                              value={manualPerformerCount}
                              onChange={e => setManualPerformerCount(e.target.value)}
                              style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.08)', outline: 'none', fontSize: '0.82rem' }}
                            />
                          </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <label style={{ fontSize: '0.74rem', fontWeight: 700, color: '#475569' }}>Wunsch-Uhrzeit (Optional)</label>
                            <input
                              type="text"
                              placeholder="z.B. eher am Anfang"
                              value={manualPreferredTime}
                              onChange={e => setManualPreferredTime(e.target.value)}
                              style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.08)', outline: 'none', fontSize: '0.82rem' }}
                            />
                          </div>

                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <label style={{ fontSize: '0.74rem', fontWeight: 700, color: '#475569' }}>Instrument (Optional)</label>
                            <input
                              type="text"
                              placeholder="z.B. Klavier"
                              value={manualInstrument}
                              onChange={e => setManualInstrument(e.target.value)}
                              style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.08)', outline: 'none', fontSize: '0.82rem' }}
                            />
                          </div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <label style={{ fontSize: '0.74rem', fontWeight: 700, color: '#475569' }}>Lehrer (Optional)</label>
                          <select
                            value={manualTeacherId}
                            onChange={e => setManualTeacherId(e.target.value)}
                            style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.08)', outline: 'none', fontSize: '0.82rem', background: '#ffffff' }}
                          >
                            <option value="">-- Kein Lehrer --</option>
                            {allUsers.filter(u => u.role === 'teacher' || u.role === 'admin' || u.role === 'secretary').map(u => (
                              <option key={u.id} value={u.id}>
                                {u.first_name} {u.last_name}
                              </option>
                            ))}
                          </select>
                        </div>

                        <hr style={{ border: 'none', borderTop: '1px solid #e2e8f0', margin: '6px 0' }} />

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          <h4 style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>Repertoire / GEMA</h4>
                          
                          {manualSongs.length > 0 && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '8px' }}>
                              {manualSongs.map((song, index) => (
                                <div key={index} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', padding: '6px 10px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.78rem' }}>
                                  <div>
                                    <strong style={{ color: '#0f172a' }}>{song.title}</strong>
                                    {song.artist && ` - ${song.artist}`}
                                    {(song.composer || song.arranger) && (
                                      <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '2px' }}>
                                        {song.composer && `Komp: ${song.composer}`}
                                        {song.composer && song.arranger && ' | '}
                                        {song.arranger && `Arr/Verl: ${song.arranger}`}
                                      </div>
                                    )}
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => setManualSongs(prev => prev.filter((_, idx) => idx !== index))}
                                    style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.75rem', padding: '2px 4px' }}
                                  >
                                    Löschen
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}

                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                            <input
                              type="text"
                              placeholder="Titel des Musikstücks"
                              value={manualSongTitle}
                              onChange={e => setManualSongTitle(e.target.value)}
                              style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid rgba(0,0,0,0.08)', outline: 'none', fontSize: '0.76rem' }}
                            />
                            <input
                              type="text"
                              placeholder="Interpret / Artist"
                              value={manualSongArtist}
                              onChange={e => setManualSongArtist(e.target.value)}
                              style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid rgba(0,0,0,0.08)', outline: 'none', fontSize: '0.76rem' }}
                            />
                            <input
                              type="text"
                              placeholder="Komponist"
                              value={manualSongComposer}
                              onChange={e => setManualSongComposer(e.target.value)}
                              style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid rgba(0,0,0,0.08)', outline: 'none', fontSize: '0.76rem' }}
                            />
                            <input
                              type="text"
                              placeholder="Arrangeur / Verlag"
                              value={manualSongArranger}
                              onChange={e => setManualSongArranger(e.target.value)}
                              style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid rgba(0,0,0,0.08)', outline: 'none', fontSize: '0.76rem' }}
                            />
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              if (!manualSongTitle.trim()) {
                                alert('Bitte geben Sie einen Songtitel an.');
                                return;
                              }
                              setManualSongs(prev => [...prev, {
                                title: manualSongTitle.trim(),
                                artist: manualSongArtist.trim(),
                                composer: manualSongComposer.trim(),
                                arranger: manualSongArranger.trim()
                              }]);
                              setManualSongTitle('');
                              setManualSongArtist('');
                              setManualSongComposer('');
                              setManualSongArranger('');
                            }}
                            style={{ padding: '8px', borderRadius: '8px', border: '1px dashed #cbd5e1', background: '#f8fafc', color: '#475569', cursor: 'pointer', fontSize: '0.76rem', fontWeight: 600 }}
                          >
                            + Song hinzufügen
                          </button>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '14px' }}>
                          <button
                            type="button"
                            onClick={() => {
                              setIsManualEntryModalOpen(false);
                              setManualSongs([]);
                              setManualSongTitle('');
                              setManualSongArtist('');
                              setManualSongComposer('');
                              setManualSongArranger('');
                            }}
                            style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.08)', background: '#f5f5f7', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}
                          >
                            Abbrechen
                          </button>
                          <button
                            type="submit"
                            style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', background: '#10b981', color: '#ffffff', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.8rem' }}
                          >
                            Speichern
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

          {coordinatorTab === 'tech' && (() => {
            const activeEv = secretaryPlanningEvent || selectedEvent;
            const activeEventStartTime = activeEv?.event_start_time || activeEv?.start_time || '14:00';
            const timeMap = calculateTimelineTimes(programPoints, activeEventStartTime);

            const normalizeTechType = (type: string): string => {
              const t = type.trim().toLowerCase();
              if (t.includes('gesang') || t.includes('vocal') || t.includes('mikrofon') || t === 'mic' || t === 'mikro') return 'Mikrofon (Gesang/Amp)';
              if (t.includes('di-box') || t.includes('di box') || t.includes('d.i. box') || t.includes('direct box') || t === 'di') return 'D.I. Box';
              if (t.includes('e-bass') || t === 'bass' || t === 'bassgitarre') return 'E-Bass';
              if (t.includes('keyboard')) return 'Keyboard';
              if (t.includes('e-piano') || t === 'piano' || t === 'klavier') return 'E-Piano';
              if (t.includes('a-gitarre') || t === 'akustik' || t === 'akustikgitarre' || t === 'akustik-gitarre') return 'A-Gitarre';
              if (t.includes('e-gitarre') || t === 'gitarre') return 'E-Gitarre';
              if (t.includes('schlagzeug') || t === 'drumset' || t === 'drums' || t === 'drum-set' || t === 'e-drum') return 'Schlagzeug-Set';
              if (t.includes('trompete')) return 'Trompete';
              return type.trim().charAt(0).toUpperCase() + type.trim().slice(1);
            };

            const getParsedTechMap = (pp: any): Record<string, number> => {
              const map: Record<string, number> = {};
              if (!pp || pp.is_pause || !pp.tech_requirements) return map;
              const req = pp.tech_requirements.trim();
              if (req.startsWith('[') || req.startsWith('{')) {
                try {
                  const items = JSON.parse(req);
                  if (Array.isArray(items)) {
                    items.forEach((item: any) => {
                      const typeName = normalizeTechType(item.type || 'Sonstiges');
                      const count = parseInt(item.count, 10) || 1;
                      map[typeName] = (map[typeName] || 0) + count;
                    });
                  }
                } catch (e) {}
              } else {
                const typeName = normalizeTechType(pp.tech_requirements);
                map[typeName] = 1;
              }
              return map;
            };

            // Render a single stage's tech layout
            const renderStageLayout = (stageNum: number) => {
              const stagePoints = programPoints
                .filter(pp => (pp.is_scheduled || pp.is_pause) && (pp.stage_number || 1) === stageNum)
                .sort((a, b) => a.sort_order - b.sort_order);

              // Compute logistics sums and peaks
              const totalChairs = stagePoints.reduce((acc, pp) => acc + (pp.chairs_needed || 0), 0);
              const peakChairs = stagePoints.length > 0 ? Math.max(...stagePoints.map(pp => pp.chairs_needed || 0)) : 0;
              const totalStands = stagePoints.reduce((acc, pp) => acc + (pp.music_stands_needed || 0), 0);
              const peakStands = stagePoints.length > 0 ? Math.max(...stagePoints.map(pp => pp.music_stands_needed || 0)) : 0;

              // Compute FOH Audio/Patch Peak summary
              const audioSetup: Record<string, number> = {};
              stagePoints.forEach(pp => {
                if (pp.tech_requirements) {
                  const actSetup: Record<string, number> = {};
                  try {
                    const cleaned = pp.tech_requirements.trim();
                    if (cleaned.startsWith('[') || cleaned.startsWith('{')) {
                      const items = JSON.parse(cleaned);
                      if (Array.isArray(items)) {
                        items.forEach((item: any) => {
                          const typeName = normalizeTechType(item.type || 'Sonstiges');
                          const count = parseInt(item.count, 10) || 1;
                          actSetup[typeName] = (actSetup[typeName] || 0) + count;
                        });
                      }
                    } else {
                      const typeName = normalizeTechType(pp.tech_requirements);
                      actSetup[typeName] = (actSetup[typeName] || 0) + 1;
                    }
                  } catch (err) {
                    const typeName = normalizeTechType(pp.tech_requirements || 'Sonstige Inputs');
                    actSetup[typeName] = (actSetup[typeName] || 0) + 1;
                  }

                  Object.entries(actSetup).forEach(([type, count]) => {
                    if (type === 'Schlagzeug-Set') {
                      if (techConfig.drumsMode === '4mic') {
                        audioSetup['Schlagzeug (Kick)'] = Math.max(audioSetup['Schlagzeug (Kick)'] || 0, 1);
                        audioSetup['Schlagzeug (Snare)'] = Math.max(audioSetup['Schlagzeug (Snare)'] || 0, 1);
                        audioSetup['Schlagzeug (OH L)'] = Math.max(audioSetup['Schlagzeug (OH L)'] || 0, 1);
                        audioSetup['Schlagzeug (OH R)'] = Math.max(audioSetup['Schlagzeug (OH R)'] || 0, 1);
                      } else if (techConfig.drumsMode === 'edrum') {
                        audioSetup['Schlagzeug (E-Drums, 2x DI)'] = Math.max(audioSetup['Schlagzeug (E-Drums, 2x DI)'] || 0, 1);
                      } else {
                        audioSetup['Schlagzeug (Kick)'] = Math.max(audioSetup['Schlagzeug (Kick)'] || 0, 1);
                        audioSetup['Schlagzeug (Snare)'] = Math.max(audioSetup['Schlagzeug (Snare)'] || 0, 1);
                        audioSetup['Schlagzeug (HiHat)'] = Math.max(audioSetup['Schlagzeug (HiHat)'] || 0, 1);
                        audioSetup['Schlagzeug (Tom 1)'] = Math.max(audioSetup['Schlagzeug (Tom 1)'] || 0, 1);
                        audioSetup['Schlagzeug (Tom 2)'] = Math.max(audioSetup['Schlagzeug (Tom 2)'] || 0, 1);
                        audioSetup['Schlagzeug (Tom 3)'] = Math.max(audioSetup['Schlagzeug (Tom 3)'] || 0, 1);
                        audioSetup['Schlagzeug (OH L)'] = Math.max(audioSetup['Schlagzeug (OH L)'] || 0, 1);
                        audioSetup['Schlagzeug (OH R)'] = Math.max(audioSetup['Schlagzeug (OH R)'] || 0, 1);
                      }
                    } else if (type === 'Keyboard') {
                      if (techConfig.keyboardMode === 'stereo') {
                        audioSetup['Keyboard (Stereo, 2x DI)'] = Math.max(audioSetup['Keyboard (Stereo, 2x DI)'] || 0, count * 2);
                      } else {
                        audioSetup['Keyboard (Mono, 1x DI)'] = Math.max(audioSetup['Keyboard (Mono, 1x DI)'] || 0, count);
                      }
                    } else if (type === 'E-Piano') {
                      if (techConfig.epianoMode === 'stereo') {
                        audioSetup['E-Piano (Stereo, 2x DI)'] = Math.max(audioSetup['E-Piano (Stereo, 2x DI)'] || 0, count * 2);
                      } else {
                        audioSetup['E-Piano (Mono, 1x DI)'] = Math.max(audioSetup['E-Piano (Mono, 1x DI)'] || 0, count);
                      }
                    } else {
                      audioSetup[type] = Math.max(audioSetup[type] || 0, count);
                    }
                  });
                }
              });

              return (
                <div key={stageNum} style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: techViewMode === 'all' ? '12px' : '0', borderBottom: techViewMode === 'all' ? '1px solid rgba(0,0,0,0.05)' : 'none', paddingBottom: techViewMode === 'all' ? '28px' : '0' }}>
                  {techViewMode === 'all' && (
                    <h4 style={{ margin: '12px 0 4px 0', fontSize: '1.05rem', fontWeight: 800, color: '#10b981', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      🟢 Bühne {stageNum} <span style={{ fontSize: '0.72rem', color: theme.textMuted, fontWeight: 500 }}>({stagePoints.length} Beiträge geplant)</span>
                    </h4>
                  )}

                  {/* Dashboard Summary Cards */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
                    {/* Logistics Card */}
                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '12px',
                      background: theme.cardBg,
                      border: '1px solid rgba(16, 185, 129, 0.15)',
                      borderRadius: '16px',
                      padding: '18px',
                      boxShadow: '0 4px 20px rgba(0,0,0,0.01)'
                    }}>
                      <span style={{ fontSize: '0.66rem', fontWeight: 850, color: '#10b981', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                        Bühnen-Logistik (Maximalbedarf)
                      </span>
                      <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center', marginTop: '6px' }}>
                        <div style={{ textAlign: 'center', flex: 1 }}>
                          <span style={{ fontSize: '1.8rem', display: 'block', marginBottom: '4px' }}>🪑</span>
                          <strong style={{ fontSize: '1.6rem', color: theme.text, display: 'block', fontWeight: 800, margin: '2px 0' }}>
                            {peakChairs}
                          </strong>
                          <span style={{ fontSize: '0.68rem', color: theme.textMuted, fontWeight: 600 }}>
                            Stühle Peak <span style={{ color: '#78350f', background: '#fef3c7', padding: '1px 5px', borderRadius: '4px', marginLeft: '4px', fontSize: '0.62rem' }}>Summe: {totalChairs}</span>
                          </span>
                        </div>
                        <div style={{ width: '1px', height: '50px', background: isNight ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)' }} />
                        <div style={{ textAlign: 'center', flex: 1 }}>
                          <span style={{ fontSize: '1.8rem', display: 'block', marginBottom: '4px' }}>🎼</span>
                          <strong style={{ fontSize: '1.6rem', color: theme.text, display: 'block', fontWeight: 800, margin: '2px 0' }}>
                            {peakStands}
                          </strong>
                          <span style={{ fontSize: '0.68rem', color: theme.textMuted, fontWeight: 600 }}>
                            Ständer Peak <span style={{ color: '#1e3a8a', background: '#dbeafe', padding: '1px 5px', borderRadius: '4px', marginLeft: '4px', fontSize: '0.62rem' }}>Summe: {totalStands}</span>
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Audio Card */}
                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '12px',
                      background: theme.cardBg,
                      border: '1px solid rgba(16, 185, 129, 0.15)',
                      borderRadius: '16px',
                      padding: '18px',
                      boxShadow: '0 4px 20px rgba(0,0,0,0.01)'
                    }}>
                      <span style={{ fontSize: '0.66rem', fontWeight: 850, color: '#10b981', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                        FOH Audio Patch (Gesamtbedarf)
                      </span>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '6px' }}>
                        {Object.keys(audioSetup).length === 0 ? (
                          <span style={{ fontSize: '0.74rem', color: theme.textMuted, fontStyle: 'italic', padding: '6px 0' }}>
                            Kein spezieller Audiobedarf angemeldet
                          </span>
                        ) : (
                          Object.entries(audioSetup).map(([name, count]) => (
                            <span 
                              key={name}
                              style={{
                                fontSize: '0.72rem',
                                fontWeight: 700,
                                background: 'rgba(16, 185, 129, 0.08)',
                                color: '#10b981',
                                padding: '5px 10px',
                                borderRadius: '8px',
                                border: '1px solid rgba(16, 185, 129, 0.15)',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                boxShadow: '0 1px 2px rgba(16, 185, 129, 0.02)'
                              }}
                            >
                              🎙️ {count}x {name}
                            </span>
                          ))
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Changeover rundown timeline table */}
                  <div style={{ border: theme.cardBorder, borderRadius: '16px', background: theme.cardBg, overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.01)' }}>
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '800px' }}>
                        <thead>
                          <tr style={{ background: isNight ? '#1c1c1e' : '#f8fafc', borderBottom: `1px solid ${isNight ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'}` }}>
                            <th style={{ padding: '14px 18px', fontSize: '0.7rem', fontWeight: 700, color: theme.thColor, textTransform: 'uppercase', letterSpacing: '0.06em', width: '90px' }}>Zeit</th>
                            <th style={{ padding: '14px 18px', fontSize: '0.7rem', fontWeight: 700, color: theme.thColor, textTransform: 'uppercase', letterSpacing: '0.06em', width: '220px' }}>Beitrag & Besetzung</th>
                            <th style={{ padding: '14px 18px', fontSize: '0.7rem', fontWeight: 700, color: theme.thColor, textTransform: 'uppercase', letterSpacing: '0.06em', width: '260px' }}>Signal / Patch (FOH)</th>
                            <th style={{ padding: '14px 18px', fontSize: '0.7rem', fontWeight: 700, color: theme.thColor, textTransform: 'uppercase', letterSpacing: '0.06em', width: '160px' }}>Aufbau & Umbau</th>
                            <th style={{ padding: '14px 18px', fontSize: '0.7rem', fontWeight: 700, color: theme.thColor, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Status / Notizen</th>
                          </tr>
                        </thead>
                        <tbody>
                          {stagePoints.length === 0 ? (
                            <tr>
                              <td colSpan={5} style={{ padding: '40px 20px', textAlign: 'center', fontSize: '0.78rem', color: theme.textMuted, fontStyle: 'italic' }}>
                                Keine geplanten Beiträge auf dieser Bühne.
                              </td>
                            </tr>
                          ) : (
                            stagePoints.map((pp) => {
                              const timeInfo = timeMap[pp.id] || { start: '--:--', end: '--:--' };
                              let techItems: any[] = [];
                              if (pp.tech_requirements && (pp.tech_requirements.trim().startsWith('[') || pp.tech_requirements.trim().startsWith('{'))) {
                                try {
                                  techItems = JSON.parse(pp.tech_requirements);
                                } catch (e) {}
                              }

                              return (
                                <tr key={pp.id} style={{ borderBottom: `1px solid ${isNight ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'}`, background: pp.is_pause ? (isNight ? '#1c1c1e' : '#f8fafc') : theme.cardBg, transition: 'background 0.2s' }}>
                                  {/* Time Column */}
                                  <td style={{ padding: '14px 18px', verticalAlign: 'top' }}>
                                    <strong style={{ fontSize: '0.82rem', color: pp.is_pause ? theme.textMuted : theme.text, display: 'block', fontVariantNumeric: 'tabular-nums' }}>{timeInfo.start}</strong>
                                    <span style={{ fontSize: '0.68rem', color: theme.textMuted, display: 'block', marginTop: '2px', fontVariantNumeric: 'tabular-nums' }}>{timeInfo.end}</span>
                                  </td>

                                  {/* Name & Besetzung */}
                                  <td style={{ padding: '14px 18px', verticalAlign: 'top' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                      <strong style={{ fontSize: '0.82rem', color: pp.is_pause ? theme.textMuted : theme.text }}>
                                        {pp.is_pause ? '☕ ' : ''}{pp.name}
                                      </strong>
                                      {!pp.is_pause && (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', fontSize: '0.7rem', color: theme.textMuted }}>
                                          {pp.ensemble_band && <span style={{ fontWeight: 550 }}>👥 {pp.ensemble_band}</span>}
                                          {pp.performer_count > 0 && <span>👤 {pp.performer_count} Person(en)</span>}
                                        </div>
                                      )}
                                    </div>
                                  </td>

                                  {/* Signals */}
                                  <td style={{ padding: '14px 18px', verticalAlign: 'top' }}>
                                    {!pp.is_pause && (
                                      <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                                        {pp.instrument && (
                                          <div style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '4px',
                                            fontSize: '0.76rem',
                                            fontWeight: 800,
                                            color: theme.text,
                                            marginBottom: '2px'
                                          }}>
                                            🎸 {pp.instrument}
                                          </div>
                                        )}
                                        {techItems.length > 0 ? (
                                          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                                            {techItems.map((item, i) => {
                                              const needsPhantom = item.connection?.toLowerCase().includes('+48') || item.type?.toLowerCase().includes('kondensator');
                                              return (
                                                <div key={i} style={{
                                                  display: 'flex',
                                                  alignItems: 'center',
                                                  gap: '6px',
                                                  fontSize: '0.72rem',
                                                  lineHeight: 1.2
                                                }}>
                                                  <span style={{ color: '#10b981', fontWeight: 800, fontFamily: 'monospace', minWidth: '18px' }}>
                                                    {item.count}×
                                                  </span>
                                                  <span style={{ color: theme.text, fontWeight: 550 }}>
                                                    {item.type}
                                                  </span>
                                                  <span style={{ color: theme.textMuted, fontSize: '0.66rem' }}>
                                                    ({item.connection})
                                                  </span>
                                                  {needsPhantom && (
                                                    <span style={{ fontSize: '0.52rem', fontWeight: 'bold', background: '#ff9500', color: '#ffffff', padding: '1px 4px', borderRadius: '3px' }}>+48V</span>
                                                  )}
                                                </div>
                                              );
                                            })}
                                          </div>
                                        ) : pp.tech_requirements ? (
                                          <span style={{ fontSize: '0.72rem', color: theme.textMuted, fontStyle: 'italic' }}>{pp.tech_requirements}</span>
                                        ) : (
                                          <span style={{ fontSize: '0.72rem', color: theme.textMuted, fontStyle: 'italic' }}>Kein spezieller Audiobedarf</span>
                                        )}
                                      </div>
                                    )}
                                  </td>

                                  {/* Setup */}
                                  <td style={{ padding: '14px 18px', verticalAlign: 'top' }}>
                                    {!pp.is_pause && (pp.chairs_needed > 0 || pp.music_stands_needed > 0) ? (
                                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.76rem', color: theme.text, fontWeight: 600 }}>
                                        {pp.chairs_needed > 0 && <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>🪑 {pp.chairs_needed} Stuhl/Stühle</div>}
                                        {pp.music_stands_needed > 0 && <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>🎼 {pp.music_stands_needed} Notenständer</div>}
                                      </div>
                                    ) : (
                                      <span style={{ fontSize: '0.74rem', color: '#94a3b8' }}>-</span>
                                    )}
                                  </td>

                                  {/* Remarks & Notes */}
                                  <td style={{ padding: '14px 18px', verticalAlign: 'top' }}>
                                    {pp.remarks ? (
                                      <div style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        fontSize: '0.72rem',
                                        color: theme.textMuted,
                                        lineHeight: 1.3
                                      }}>
                                        <span>📝</span>
                                        <span>{pp.remarks}</span>
                                      </div>
                                    ) : (
                                      <span style={{ color: '#94a3b8' }}>-</span>
                                    )}
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              );
            };

            const isNight = techConsoleNightMode;
            const theme = {
              bg: isNight ? '#0b0b0d' : 'transparent',
              cardBg: isNight ? '#16161a' : '#ffffff',
              cardBorder: isNight ? '1px solid #222228' : '1px solid rgba(0,0,0,0.06)',
              text: isNight ? '#f4f4f7' : '#1d1d1f',
              textMuted: isNight ? '#8e8e93' : '#86868b',
              border: isNight ? '1px solid #1f1f26' : '1px solid rgba(0,0,0,0.04)',
              headerBg: isNight ? '#1e1e24' : '#f5f5f7',
              thColor: isNight ? '#8e8e93' : '#86868b',
              liveColor: isNight ? '#ff453a' : '#ff3b30',
              nextColor: isNight ? '#30b0c7' : '#007aff',
              okColor: isNight ? '#30d158' : '#34c759',
              okBg: isNight ? 'rgba(48, 209, 88, 0.15)' : 'rgba(52, 199, 89, 0.08)',
              p48vColor: isNight ? '#ff9f0a' : '#ff9500',
              p48vBg: isNight ? 'rgba(255, 159, 10, 0.15)' : 'rgba(255, 149, 0, 0.08)',
              rowHoverBg: isNight ? '#22222a' : '#f5f5f7',
            };

            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', boxSizing: 'border-box', background: theme.bg, color: theme.text, padding: isNight ? '12px' : '0', borderRadius: isNight ? '16px' : '0', transition: 'all 0.3s' }}>
                <style>{`
                  @keyframes pulse {
                    0% { opacity: 0.6; }
                    50% { opacity: 1; }
                    100% { opacity: 0.6; }
                  }
                `}</style>
                
                {/* Header with Switch and PDF save button */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: theme.text }}>
                      Technik-Rundown & Patchplan · {techViewMode === 'all' ? 'Alle Bühnen' : `Bühne ${activeStage}`}
                    </h3>
                    <span style={{ fontSize: '0.72rem', color: theme.textMuted, fontWeight: 500 }}>
                      {techViewMode === 'all' 
                        ? `${programPoints.filter(pp => pp.is_scheduled || pp.is_pause).length} Beiträge insgesamt`
                        : `${programPoints.filter(pp => (pp.is_scheduled || pp.is_pause) && (pp.stage_number || 1) === activeStage).length} Beiträge geplant`
                      }
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    {/* iOS-Style Segmented Control */}
                    <div style={{ display: 'flex', background: isNight ? '#1e1e24' : '#f1f5f9', padding: '3px', borderRadius: '10px', border: theme.cardBorder, flexWrap: 'wrap', gap: '2px' }}>
                      {Array.from({ length: stageCount }, (_, i) => i + 1).map(stageNum => {
                        const isSelected = techViewMode === 'single' && activeStage === stageNum;
                        return (
                          <button
                            key={stageNum}
                            type="button"
                            onClick={() => {
                              setTechViewMode('single');
                              setActiveStage(stageNum);
                            }}
                            style={{
                              border: 'none',
                              padding: '6px 12px',
                              borderRadius: '8px',
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              cursor: 'pointer',
                              background: isSelected ? '#10b981' : 'transparent',
                              color: isSelected ? '#ffffff' : theme.textMuted,
                              transition: 'all 0.2s',
                              outline: 'none'
                            }}
                          >
                            Bühne {stageNum}
                          </button>
                        );
                      })}
                      <button
                        type="button"
                        onClick={() => setTechViewMode('all')}
                        style={{
                          border: 'none',
                          padding: '6px 12px',
                          borderRadius: '8px',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          background: techViewMode === 'all' ? '#10b981' : 'transparent',
                          color: techViewMode === 'all' ? '#ffffff' : theme.textMuted,
                          transition: 'all 0.2s',
                          outline: 'none'
                        }}
                      >
                        Alle Bühnen
                      </button>
                    </div>

                    {/* PDF Save/Print Button */}
                    <button
                      type="button"
                      onClick={handleExportTechRiderPDF}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        background: '#10b981',
                        color: '#ffffff',
                        border: 'none',
                        padding: '7px 14px',
                        borderRadius: '10px',
                        fontSize: '0.74rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        boxShadow: '0 2px 5px rgba(16,185,129,0.2)',
                        transition: 'all 0.2s',
                        outline: 'none'
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = '#059669'}
                      onMouseLeave={e => e.currentTarget.style.background = '#10b981'}
                    >
                      <span>💾</span>
                      <span>PDF speichern</span>
                    </button>
                  </div>
                </div>

                {/* ⚙️ Abnahme-Optionen toggle & panel */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <button
                    onClick={() => setShowTechSettings(!showTechSettings)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      alignSelf: 'flex-start',
                      gap: '6px',
                      background: 'transparent',
                      border: 'none',
                      color: isNight ? '#ff9f0a' : brandColor,
                      cursor: 'pointer',
                      fontSize: '0.76rem',
                      fontWeight: 700,
                      padding: '4px 0',
                      transition: 'all 0.2s',
                      outline: 'none'
                    }}
                  >
                    <span>⚙️</span>
                    <span>{showTechSettings ? 'Standard-Bühnenabnahme ausblenden' : 'Standard-Bühnenabnahme konfigurieren (schulweit)'}</span>
                  </button>

                  {showTechSettings && (
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                      gap: '16px',
                      background: theme.cardBg,
                      border: theme.cardBorder,
                      borderRadius: '14px',
                      padding: '16px',
                      boxShadow: isNight ? 'none' : '0 2px 8px rgba(0,0,0,0.02)'
                    }}>
                      {/* Keyboard Mode */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label style={{ fontSize: '0.72rem', fontWeight: 800, color: theme.textMuted, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Keyboard-Abnahme</label>
                        <div style={{ display: 'flex', background: isNight ? '#1e1e24' : '#f1f5f9', padding: '3px', borderRadius: '10px', gap: '4px' }}>
                          <button
                            type="button"
                            onClick={() => saveTechConfig({ ...techConfig, keyboardMode: 'mono' })}
                            style={{
                              flex: 1,
                              border: 'none',
                              padding: '6px 10px',
                              borderRadius: '7px',
                              fontSize: '0.7rem',
                              fontWeight: 'bold',
                              cursor: 'pointer',
                              background: techConfig.keyboardMode === 'mono' ? (isNight ? '#2c2c35' : '#ffffff') : 'transparent',
                              color: techConfig.keyboardMode === 'mono' ? theme.text : theme.textMuted,
                              boxShadow: techConfig.keyboardMode === 'mono' && !isNight ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
                              transition: 'all 0.2s'
                            }}
                          >
                            Mono (1x DI)
                          </button>
                          <button
                            type="button"
                            onClick={() => saveTechConfig({ ...techConfig, keyboardMode: 'stereo' })}
                            style={{
                              flex: 1,
                              border: 'none',
                              padding: '6px 10px',
                              borderRadius: '7px',
                              fontSize: '0.7rem',
                              fontWeight: 'bold',
                              cursor: 'pointer',
                              background: techConfig.keyboardMode === 'stereo' ? (isNight ? '#2c2c35' : '#ffffff') : 'transparent',
                              color: techConfig.keyboardMode === 'stereo' ? theme.text : theme.textMuted,
                              boxShadow: techConfig.keyboardMode === 'stereo' && !isNight ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
                              transition: 'all 0.2s'
                            }}
                          >
                            Stereo (2x DI)
                          </button>
                        </div>
                      </div>

                      {/* E-Piano Mode */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label style={{ fontSize: '0.72rem', fontWeight: 800, color: theme.textMuted, textTransform: 'uppercase', letterSpacing: '0.04em' }}>E-Piano-Abnahme</label>
                        <div style={{ display: 'flex', background: isNight ? '#1e1e24' : '#f1f5f9', padding: '3px', borderRadius: '10px', gap: '4px' }}>
                          <button
                            type="button"
                            onClick={() => saveTechConfig({ ...techConfig, epianoMode: 'mono' })}
                            style={{
                              flex: 1,
                              border: 'none',
                              padding: '6px 10px',
                              borderRadius: '7px',
                              fontSize: '0.7rem',
                              fontWeight: 'bold',
                              cursor: 'pointer',
                              background: techConfig.epianoMode === 'mono' ? (isNight ? '#2c2c35' : '#ffffff') : 'transparent',
                              color: techConfig.epianoMode === 'mono' ? theme.text : theme.textMuted,
                              boxShadow: techConfig.epianoMode === 'mono' && !isNight ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
                              transition: 'all 0.2s'
                            }}
                          >
                            Mono (1x DI)
                          </button>
                          <button
                            type="button"
                            onClick={() => saveTechConfig({ ...techConfig, epianoMode: 'stereo' })}
                            style={{
                              flex: 1,
                              border: 'none',
                              padding: '6px 10px',
                              borderRadius: '7px',
                              fontSize: '0.7rem',
                              fontWeight: 'bold',
                              cursor: 'pointer',
                              background: techConfig.epianoMode === 'stereo' ? (isNight ? '#2c2c35' : '#ffffff') : 'transparent',
                              color: techConfig.epianoMode === 'stereo' ? theme.text : theme.textMuted,
                              boxShadow: techConfig.epianoMode === 'stereo' && !isNight ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
                              transition: 'all 0.2s'
                            }}
                          >
                            Stereo (2x DI)
                          </button>
                        </div>
                      </div>

                      {/* Drums Mode */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label style={{ fontSize: '0.72rem', fontWeight: 800, color: theme.textMuted, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Schlagzeug-Abnahme</label>
                        <div style={{ display: 'flex', background: isNight ? '#1e1e24' : '#f1f5f9', padding: '3px', borderRadius: '10px', gap: '4px' }}>
                          <button
                            type="button"
                            onClick={() => saveTechConfig({ ...techConfig, drumsMode: 'standard' })}
                            style={{
                              flex: 1,
                              border: 'none',
                              padding: '6px 10px',
                              borderRadius: '7px',
                              fontSize: '0.7rem',
                              fontWeight: 'bold',
                              cursor: 'pointer',
                              background: techConfig.drumsMode === 'standard' ? (isNight ? '#2c2c35' : '#ffffff') : 'transparent',
                              color: techConfig.drumsMode === 'standard' ? theme.text : theme.textMuted,
                              boxShadow: techConfig.drumsMode === 'standard' && !isNight ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
                              transition: 'all 0.2s'
                            }}
                            title="Kick, Snare, HiHat, 3x Toms, 2x Overhead (7 Mics)"
                          >
                            Komplett
                          </button>
                          <button
                            type="button"
                            onClick={() => saveTechConfig({ ...techConfig, drumsMode: '4mic' })}
                            style={{
                              flex: 1,
                              border: 'none',
                              padding: '6px 10px',
                              borderRadius: '7px',
                              fontSize: '0.7rem',
                              fontWeight: 'bold',
                              cursor: 'pointer',
                              background: techConfig.drumsMode === '4mic' ? (isNight ? '#2c2c35' : '#ffffff') : 'transparent',
                              color: techConfig.drumsMode === '4mic' ? theme.text : theme.textMuted,
                              boxShadow: techConfig.drumsMode === '4mic' && !isNight ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
                              transition: 'all 0.2s'
                            }}
                            title="Kick, Snare, 2x Overhead (4 Mics)"
                          >
                            4-Mic
                          </button>
                          <button
                            type="button"
                            onClick={() => saveTechConfig({ ...techConfig, drumsMode: 'edrum' })}
                            style={{
                              flex: 1,
                              border: 'none',
                              padding: '6px 10px',
                              borderRadius: '7px',
                              fontSize: '0.7rem',
                              fontWeight: 'bold',
                              cursor: 'pointer',
                              background: techConfig.drumsMode === 'edrum' ? (isNight ? '#2c2c35' : '#ffffff') : 'transparent',
                              color: techConfig.drumsMode === 'edrum' ? theme.text : theme.textMuted,
                              boxShadow: techConfig.drumsMode === 'edrum' && !isNight ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
                              transition: 'all 0.2s'
                            }}
                            title="E-Drums / Stereo Line-In (2x DI)"
                          >
                            E-Drums
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Content Render (Single or All stages) */}
                {techViewMode === 'single' ? (
                  renderStageLayout(activeStage)
                ) : (
                  Array.from({ length: stageCount }, (_, i) => i + 1).map(stageNum => renderStageLayout(stageNum))
                )}
              </div>
            );
          })()}
          {coordinatorTab === 'export' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: '#1d1d1f' }}>
                  Ablauf &amp; Daten exportieren
                </h3>
                <span style={{ fontSize: '0.72rem', color: '#86868b', fontWeight: 500 }}>
                  Wählen Sie das passende Format für Ihr Team, die Techniker oder die Konzertbesucher.
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginTop: '4px' }}>
                {/* Excel Card */}
                <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '14px', background: '#ffffff', border: '1px solid rgba(0,0,0,0.06)', borderRadius: '14px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <span style={{ fontSize: '1.5rem' }}>📊</span>
                    <strong style={{ fontSize: '0.88rem', color: '#1d1d1f' }}>Excel-Programmliste (.xls)</strong>
                    <p style={{ margin: 0, fontSize: '0.74rem', color: '#86868b', lineHeight: 1.4 }}>
                      Erstellt eine professionell formatierte Excel-Datei mit Kopfzeilen, Spaltenbreiten und Zebra-Streifen für die einfache Weiterverarbeitung.
                    </p>
                  </div>
                  <button
                    onClick={handleExportExcel}
                    style={{
                      width: '100%',
                      background: '#1d1d1f',
                      color: '#ffffff',
                      border: 'none',
                      padding: '10px 16px',
                      borderRadius: '10px',
                      fontWeight: 700,
                      fontSize: '0.76rem',
                      cursor: 'pointer',
                      transition: 'background 0.2s',
                      textAlign: 'center'
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = '#000000'}
                    onMouseLeave={e => e.currentTarget.style.background = '#1d1d1f'}
                  >
                    Tabelle herunterladen
                  </button>
                </div>

                {/* PDF Booklet Card */}
                <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '14px', background: '#ffffff', border: '1px solid rgba(0,0,0,0.06)', borderRadius: '14px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <span style={{ fontSize: '1.5rem' }}>📄</span>
                    <strong style={{ fontSize: '0.88rem', color: '#1d1d1f' }}>Besucher-Programm (PDF)</strong>
                    <p style={{ margin: 0, fontSize: '0.74rem', color: '#86868b', lineHeight: 1.4 }}>
                      Generiert ein übersichtliches, minimalistisches Programmheft für Konzertbesucher, sortiert nach Bühnen und Uhrzeiten. Ideal zum Ausdrucken.
                    </p>
                  </div>
                  <button
                    onClick={handleExportPDF}
                    style={{
                      width: '100%',
                      background: '#007aff',
                      color: '#ffffff',
                      border: 'none',
                      padding: '10px 16px',
                      borderRadius: '10px',
                      fontWeight: 700,
                      fontSize: '0.76rem',
                      cursor: 'pointer',
                      transition: 'background 0.2s',
                      textAlign: 'center'
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = '#0062cc'}
                    onMouseLeave={e => e.currentTarget.style.background = '#007aff'}
                  >
                    Programmheft drucken / PDF
                  </button>
                </div>

                {/* Tech Rider Card */}
                <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '14px', background: '#ffffff', border: '1px solid rgba(0,0,0,0.06)', borderRadius: '14px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <span style={{ fontSize: '1.5rem' }}>🔌</span>
                    <strong style={{ fontSize: '0.88rem', color: '#1d1d1f' }}>Bühnen- &amp; Technik-Rider (PDF)</strong>
                    <p style={{ margin: 0, fontSize: '0.74rem', color: '#86868b', lineHeight: 1.4 }}>
                      Erstellt ein detailliertes Übersichtsblatt für Tontechniker und Stagehands für Bühne {activeStage} mit FOH-Patchplan und Umbau-Schritten.
                    </p>
                  </div>
                  <button
                    onClick={handleExportTechRiderPDF}
                    style={{
                      width: '100%',
                      background: '#34c759',
                      color: '#ffffff',
                      border: 'none',
                      padding: '10px 16px',
                      borderRadius: '10px',
                      fontWeight: 700,
                      fontSize: '0.76rem',
                      cursor: 'pointer',
                      transition: 'background 0.2s',
                      textAlign: 'center'
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = '#28a745'}
                    onMouseLeave={e => e.currentTarget.style.background = '#34c759'}
                  >
                    Technik-Rider drucken / PDF
                  </button>
                </div>
              </div>

              {/* Legacy CSV fallback */}
              <div style={{ marginTop: '10px', textAlign: 'center' }}>
                <button
                  onClick={handleExportCSV}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#86868b',
                    fontSize: '0.68rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    textDecoration: 'underline'
                  }}
                >
                  Als einfache CSV-Rohdaten exportieren
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );

    if (asOverlay) {
      return (
        <div
          onClick={() => { setSecretaryPlanningEvent(null); setSelectedEvent(null); }}
          className="google-dialog-overlay"
          style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(31, 31, 31, 0.4)',
            display: 'flex',
            zIndex: 9999,
            padding: 0,
            margin: 0,
            width: '100vw',
            height: '100vh',
            boxSizing: 'border-box'
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: '#ffffff',
              width: '100vw',
              height: '100vh',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              boxSizing: 'border-box'
            }}
          >
            {/* Elegant Header bar */}
            <div style={{
              padding: '16px 32px',
              borderBottom: '1px solid #e2e8f0',
              background: '#ffffff',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                <span style={{ fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: brandColor }}>Verwaltung · Planungs-Modul</span>
                <h2 style={{ fontSize: '1.35rem', fontWeight: 700, color: '#1f1f1f', margin: '4px 0 0 0', letterSpacing: '-0.01em' }}>{(secretaryPlanningEvent || selectedEvent)?.title}</h2>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                {isMeEventResponsible(secretaryPlanningEvent) && (
                  <button
                    type="button"
                    onClick={() => {
                      setTeacherSubmissionEvent(secretaryPlanningEvent);
                      setSecretaryPlanningEvent(null);
                    }}
                    style={{
                      background: '#f1f5f9',
                      border: '1.5px solid #cbd5e1',
                      borderRadius: '20px',
                      padding: '8px 16px',
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      color: '#475569',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.background = '#e2e8f0';
                      e.currentTarget.style.color = '#1e293b';
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.background = '#f1f5f9';
                      e.currentTarget.style.color = '#475569';
                    }}
                  >
                    📝 Einreichungsansicht
                  </button>
                )}
                <button 
                  onClick={() => { setSecretaryPlanningEvent(null); setSelectedEvent(null); }} 
                  style={{ 
                    background: 'transparent', 
                    border: 'none', 
                    borderRadius: '50%', 
                    width: '36px', 
                    height: '36px', 
                    cursor: 'pointer', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    transition: 'background 0.2s'
                  }}
                  onMouseOver={e => e.currentTarget.style.background = 'rgba(0,0,0,0.06)'}
                  onMouseOut={e => e.currentTarget.style.background = 'transparent'}
                >
                  <X size={20} color="#1f1f1f" />
                </button>
              </div>
            </div>
            <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', padding: '24px 32px' }}>
              {panelContent}
            </div>
          </div>
        </div>
      );
    }

    return panelContent;
  };

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: showLessons 
        ? 'minmax(320px, 1.2fr) minmax(360px, 1.5fr) minmax(300px, 1.2fr)' 
        : 'minmax(360px, 1.5fr) minmax(380px, 1.8fr) minmax(300px, 1.2fr)',
      gap: '24px',
      alignItems: 'start',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
      width: '100%',
      boxSizing: 'border-box',
      padding: '0px'
    }} className="animation-fade-in">
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes calendarPulse {
          0% {
            transform: scale(1);
            box-shadow: 0 4px 12px rgba(239, 68, 68, 0.35);
          }
          50% {
            transform: scale(1.08);
            box-shadow: 0 6px 20px rgba(239, 68, 68, 0.55);
          }
          100% {
            transform: scale(1);
            box-shadow: 0 4px 12px rgba(239, 68, 68, 0.35);
          }
        }
        .pulse-calendar {
          animation: calendarPulse 2s infinite ease-in-out;
        }
        @keyframes autoSaveFade {
          0%, 100% { opacity: 0.5; }
          50% { opacity: 1; }
        }
        .autosave-pulse {
          animation: autoSaveFade 1.5s infinite ease-in-out;
        }

        /* Google UI / Material Design 3 Styling (White/Green Theme) */
        .google-tab {
          font-family: "Roboto", "Google Sans", -apple-system, sans-serif;
          font-size: 0.88rem;
          font-weight: 500;
          color: #384a3c;
          border: none;
          background: transparent;
          padding: 12px 16px;
          cursor: pointer;
          position: relative;
          transition: color 0.15s, background-color 0.15s;
          border-radius: 4px 4px 0 0;
          outline: none;
        }
        .google-tab:hover {
          background-color: ${brandColor}08;
          color: ${brandColor};
        }
        .google-tab-active {
          color: ${brandColor} !important;
          font-weight: 600;
        }
        .google-tab-active::after {
          content: '';
          position: absolute;
          bottom: 0;
          left: 16px;
          right: 16px;
          height: 3px;
          background-color: ${brandColor};
          border-radius: 3px 3px 0 0;
        }

        .google-input {
          width: 100%;
          padding: 10px 14px 10px 36px;
          border-radius: 8px;
          border: 1.5px solid #d2ded5;
          font-size: 0.86rem;
          font-family: inherit;
          color: #1a2a1e;
          background: #ffffff;
          outline: none;
          box-sizing: border-box;
          transition: border-color 0.15s, box-shadow 0.15s;
        }
        .google-input-noicon {
          padding-left: 14px !important;
        }
        .google-input:hover {
          border-color: ${brandColor};
        }
        .google-input:focus {
          border-color: ${brandColor};
          box-shadow: 0 0 0 1px ${brandColor};
        }

        .google-chip {
          border-radius: 8px;
          border: 1.5px solid #d1ebd5;
          background: #ffffff;
          color: #385c3f;
          padding: 5px 14px;
          font-size: 0.74rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.15s;
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }
        .google-chip:hover {
          border-color: ${brandColor};
          background: ${brandColor}0d;
          color: ${brandColor};
        }
        .google-chip-selected {
          font-weight: 800;
        }

        .google-card {
          background: #ffffff;
          border: 1px solid #d2ded5;
          border-radius: 12px;
          padding: 16px;
          box-sizing: border-box;
        }

        .google-btn-filled {
          background: ${brandColor};
          color: #ffffff;
          border: none;
          padding: 10px 20px;
          border-radius: 100px;
          font-weight: 700;
          font-size: 0.8rem;
          cursor: pointer;
          transition: opacity 0.2s, box-shadow 0.15s;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          height: 38px;
          box-shadow: 0 1px 2px rgba(0,0,0,0.05);
        }
        .google-btn-filled:hover:not(:disabled) {
          opacity: 0.9;
          box-shadow: 0 2px 6px rgba(0,0,0,0.1);
        }
        .google-btn-filled:disabled {
          background: #e2eae4 !important;
          color: #8c9e90 !important;
          cursor: not-allowed;
          box-shadow: none;
        }

        .google-btn-outlined {
          border-radius: 100px;
          border: 1px solid #d1ebd5;
          background-color: transparent;
          color: ${brandColor};
          padding: 8px 16px;
          font-size: 0.8rem;
          font-weight: 700;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          transition: background-color 0.15s, border-color 0.15s;
        }
        .google-btn-outlined:hover {
          background-color: ${brandColor}0d;
          border-color: ${brandColor};
        }
      `}} />
      
      {/* COLUMN 1 */}
      {showLessons ? renderLessonsColumn() : renderTimelineColumn()}

      {/* COLUMN 2 */}
      {showLessons ? renderTimelineColumn() : renderTeacherEventPlanningColumn()}

      {/* COLUMN 3 */}
      {role === 'teacher' 
        ? renderTeacherEventPlanningColumn() 
        : role === 'student'
          ? renderStudentEventsColumn()
          : renderAnnouncementsColumn()}

      {/* Fullscreen Overlay for Teacher submissions */}
      {renderFullscreenTeacherSubmissionOverlay()}

      {/* Fullscreen Overlay for Secretary Event Planning — reuses full renderAdminCoordinatorPanel */}
      {secretaryPlanningEvent && renderAdminCoordinatorPanel(true)}

      {/* ── Event Detail Modal ── */}
      {selectedEvent && (() => {
        const ev = selectedEvent;
        const colors = getEventColors(ev);
        const hasFestInTitle = (ev.title || '').toLowerCase().includes('fest');
        const catColor = colors.color;
        const catBg = colors.bg;
        const isSubscribed = ev.is_subscribed;
        const isOverride = !isSubscribed && subscribedEvents.some(sub => 
          normalizeTitle(sub.title) === normalizeTitle(ev.title) && 
          sub.event_date === ev.event_date && 
          normalizeTime(sub.start_time) === normalizeTime(ev.start_time)
        );
        const canEditVisibility = (role === 'admin' || role === 'secretary');
        const currentVisibility = ev.visibility || 'all';

        const visibilityLabel: Record<string, string> = {
          all: '👥 Alle (Schüler & Lehrer)',
          teachers: '🎓 Nur Lehrer',
          students: '🎵 Nur Schüler'
        };

        return (
          <div
            onClick={() => setSelectedEvent(null)}
            style={{
              position: 'fixed', inset: 0, zIndex: 1000,
              background: 'rgba(15,23,42,0.55)',
              backdropFilter: 'blur(6px)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: '24px',
              animation: 'fadeIn 0.15s ease'
            }}
          >
            <div
              onClick={e => e.stopPropagation()}
              style={{
                background: '#ffffff',
                borderRadius: '24px',
                width: '100%',
                maxWidth: '460px',
                boxShadow: '0 32px 80px rgba(0,0,0,0.22)',
                overflow: 'hidden',
                fontFamily: 'Urbanist, sans-serif',
                border: '1px solid rgba(0, 0, 0, 0.08)'
              }}
            >
              {/* Color bar */}
              <div style={{ height: '5px', background: catColor, width: '100%' }} />

              {/* Header */}
              <div style={{ padding: '22px 22px 0 22px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <span style={{
                    fontSize: '0.65rem', fontWeight: 900, color: catColor,
                    background: catBg, padding: '4px 10px', borderRadius: '8px',
                    textTransform: 'uppercase', letterSpacing: '0.04em'
                  }}>
                    {ev.category}
                  </span>
                  
                  {hasFestInTitle && (
                    <span style={{
                      fontSize: '0.68rem', fontWeight: 650,
                      color: '#ff5e3a', background: '#ff5e3a14',
                      padding: '4px 10px', borderRadius: '8px',
                      textTransform: 'uppercase', letterSpacing: '0.04em',
                      display: 'inline-flex', alignItems: 'center', gap: '2px'
                    }}>
                      🎉 Fest / Event
                    </span>
                  )}

                  <span style={{
                    fontSize: '0.62rem', fontWeight: 800,
                    color: (isSubscribed || isOverride) ? '#475569' : '#0369a1',
                    background: (isSubscribed || isOverride) ? '#f1f5f9' : '#e0f2fe',
                    padding: '4px 10px', borderRadius: '8px',
                    display: 'flex', alignItems: 'center', gap: '4px'
                  }}>
                    {(isSubscribed || isOverride) ? <Globe size={10} /> : <Lock size={10} />}
                    {isSubscribed ? 'iCal Kalender' : isOverride ? 'iCal Kalender (Sichtbarkeit angepasst)' : 'Eigener Termin'}
                  </span>
                </div>
                <button
                  onClick={() => setSelectedEvent(null)}
                  style={{
                    background: '#f1f5f9', border: 'none', borderRadius: '50%',
                    width: '34px', height: '34px', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0
                  }}
                >
                  <X size={16} color="#64748b" />
                </button>
              </div>

              {/* Body — always read-only */}
              <div style={{ padding: '16px 22px 24px 22px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {/* Title */}
                <h2 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 900, color: hasFestInTitle ? '#c2410c' : '#0f172a', lineHeight: 1.25 }}>
                  {hasFestInTitle && <span style={{ marginRight: '6px' }}>🎉</span>}
                  {ev.title}
                </h2>

                {/* Date / Time */}
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#f8fafc', padding: '8px 12px', borderRadius: '10px' }}>
                    <Calendar size={14} color="#64748b" />
                    <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#334155' }}>
                      {ev.event_end_date && ev.event_end_date !== ev.event_date
                        ? `${new Date(ev.event_date + 'T12:00:00').toLocaleDateString('de-DE', { day: '2-digit', month: 'short', year: 'numeric' })} – ${new Date(ev.event_end_date + 'T12:00:00').toLocaleDateString('de-DE', { day: '2-digit', month: 'short', year: 'numeric' })}`
                        : new Date(ev.event_date + 'T12:00:00').toLocaleDateString('de-DE', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })
                      }
                    </span>
                  </div>
                  {(ev.event_start_time || ev.start_time) && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#f8fafc', padding: '8px 12px', borderRadius: '10px' }}>
                      <Clock size={14} color="#64748b" />
                      <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#334155' }}>
                        {(ev.event_start_time || ev.start_time).substring(0, 5)}{ev.end_time ? ` – ${ev.end_time.substring(0, 5)}` : ''} Uhr
                      </span>
                    </div>
                  )}
                </div>

                {/* Location */}
                {ev.location_type === 'intern' && ev.room && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: '#f0f1ff', padding: '10px 14px', borderRadius: '12px' }}>
                    <Building2 size={16} color="#6366f1" />
                    <div>
                      <div style={{ fontSize: '0.65rem', fontWeight: 900, color: '#6366f1', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Raum (intern)</div>
                      <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#1e1b4b' }}>{ev.room.name}</div>
                    </div>
                  </div>
                )}
                {ev.location_type === 'extern' && ev.location_extern && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: '#fffbeb', padding: '10px 14px', borderRadius: '12px' }}>
                    <MapPin size={16} color="#d97706" />
                    <div>
                      <div style={{ fontSize: '0.65rem', fontWeight: 900, color: '#d97706', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Externer Ort</div>
                      <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#78350f' }}>{ev.location_extern}</div>
                    </div>
                  </div>
                )}

                {/* Description */}
                {ev.description && (
                  <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: '12px', fontSize: '0.85rem', color: '#475569', lineHeight: 1.6, fontWeight: 500 }}>
                    {ev.description}
                  </div>
                )}

                {/* Current visibility badge — admin/secretary only */}
                {(role === 'admin' || role === 'secretary') && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', borderRadius: '12px', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                    <Eye size={14} color="#64748b" />
                    <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#475569' }}>
                      Sichtbar für: {visibilityLabel[currentVisibility] || '👥 Alle'}
                    </span>
                  </div>
                )}

                {/* Visibility editor — admin/secretary only, for non-subscribed events */}
                {canEditVisibility && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', borderTop: '1px solid #f1f5f9', paddingTop: '14px', marginTop: '2px' }}>
                    <label style={{ fontSize: '0.68rem', fontWeight: 900, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Sichtbarkeit ändern
                    </label>
                    <div style={{ display: 'flex', background: '#f1f5f9', padding: '4px', borderRadius: '12px', gap: '4px', border: '1px solid #e2e8f0' }}>
                      {([
                        { value: 'all', label: '👥 Alle' },
                        { value: 'teachers', label: '🎓 Nur Lehrer' },
                        { value: 'students', label: '🎵 Nur Schüler' }
                      ] as const).map(opt => {
                        const isSel = editVisibility === opt.value;
                        return (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => setEditVisibility(opt.value)}
                            style={{
                              flex: 1,
                              border: 'none',
                              background: isSel ? '#ffffff' : 'transparent',
                              color: isSel ? '#0f172a' : '#64748b',
                              padding: '8px 4px',
                              borderRadius: '8px',
                              fontWeight: 800,
                              fontSize: '0.68rem',
                              cursor: 'pointer',
                              transition: 'all 0.15s',
                              boxShadow: isSel ? '0 2px 6px rgba(0,0,0,0.06)' : 'none'
                            }}
                          >
                            {opt.label}
                          </button>
                        );
                      })}
                    </div>
                    <button
                      type="button"
                      onClick={saveVisibility}
                      disabled={savingVisibility || editVisibility === (ev.visibility || 'all')}
                      style={{
                        background: editVisibility === (ev.visibility || 'all') ? '#e2e8f0' : brandColor,
                        color: editVisibility === (ev.visibility || 'all') ? '#94a3b8' : '#ffffff',
                        border: 'none',
                        padding: '10px',
                        borderRadius: '10px',
                        fontWeight: 800,
                        fontSize: '0.82rem',
                        cursor: editVisibility === (ev.visibility || 'all') ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        boxShadow: editVisibility === (ev.visibility || 'all') ? 'none' : '0 4px 12px rgba(0,0,0,0.08)',
                        transition: 'all 0.2s'
                      }}
                    >
                      <Check size={14} /> {savingVisibility ? 'Wird gespeichert...' : 'Sichtbarkeit speichern'}
                    </button>
                  </div>
                )}

                {/* Activate for Event Planning button — admin/secretary only */}
                {!ev.is_planning_active && (role === 'admin' || role === 'secretary') && (
                  <button
                    onClick={async () => {
                      await handleActivatePlanning(ev);
                      setSelectedEvent(null);
                    }}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                      background: '#ecfdf5', border: '1.5px solid #a7f3d0', color: '#059669',
                      padding: '10px', borderRadius: '12px', cursor: 'pointer',
                      fontWeight: 800, fontSize: '0.82rem',
                      transition: 'all 0.15s',
                      marginTop: '6px'
                    }}
                    onMouseOver={e => { e.currentTarget.style.background = '#d1fae5'; }}
                    onMouseOut={e => { e.currentTarget.style.background = '#ecfdf5'; }}
                  >
                    <CalendarPlus size={14} />
                    Für Event-Planung aktivieren
                  </button>
                )}

                {/* Planungs-Modul öffnen button — admin/secretary only */}
                {ev.is_planning_active && (role === 'admin' || role === 'secretary') && (
                  <button
                    onClick={() => {
                      setSecretaryPlanningEvent(ev);
                      setSelectedEvent(null);
                    }}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                      background: brandColor, color: '#ffffff',
                      border: 'none',
                      padding: '10px', borderRadius: '12px', cursor: 'pointer',
                      fontWeight: 800, fontSize: '0.82rem',
                      transition: 'opacity 0.15s',
                      marginTop: '6px',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.08)'
                    }}
                    onMouseOver={e => { e.currentTarget.style.opacity = '0.9'; }}
                    onMouseOut={e => { e.currentTarget.style.opacity = '1'; }}
                  >
                    <Settings size={14} />
                    Planungs-Modul öffnen
                  </button>
                )}

                {/* Delete button — admin/secretary, non-subscribed, own events */}
                {!isSubscribed && ev.isMyEvent && (role === 'admin' || role === 'secretary') && (
                  <button
                    onClick={() => { handleDeleteEvent(ev.id); setSelectedEvent(null); }}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                      background: '#fef2f2', border: '1.5px solid #fee2e2', color: '#ef4444',
                      padding: '10px', borderRadius: '12px', cursor: 'pointer',
                      fontWeight: 800, fontSize: '0.82rem',
                      transition: 'all 0.15s'
                    }}
                    onMouseOver={e => { e.currentTarget.style.background = '#fee2f2'; }}
                    onMouseOut={e => { e.currentTarget.style.background = '#fef2f2'; }}
                  >
                    <Trash2 size={14} />
                    {isOverride ? 'Sichtbarkeit zurücksetzen' : 'Termin löschen'}
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* Student Event Detail Modal */}
      {selectedStudentEvent && renderStudentEventDetailModal()}

      {/* iCal Subscription Modal */}

      {showIcalModal && (() => {
        const supabaseUrlStr = import.meta.env.VITE_SUPABASE_URL || supabase?.supabaseUrl || 'https://supabase.178.105.10.2.sslip.io';
        const cleanSupabaseUrl = supabaseUrlStr.replace('https://', '');
        const token = userQrToken || userId;

        return (
          <div
            onClick={() => setShowIcalModal(false)}
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 1100,
              background: 'rgba(0, 0, 0, 0.4)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '20px',
              animation: 'fadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
            }}
          >
            <div
              onClick={e => e.stopPropagation()}
              style={{
                background: '#ffffff',
                borderRadius: '24px',
                width: '100%',
                maxWidth: '460px',
                boxShadow: '0 20px 40px rgba(0, 0, 0, 0.12), 0 1px 3px rgba(0, 0, 0, 0.05)',
                overflow: 'hidden',
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
                position: 'relative',
                padding: '32px 24px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'stretch'
              }}
            >
              {/* iOS close button */}
              <button
                onClick={() => setShowIcalModal(false)}
                style={{
                  position: 'absolute',
                  top: '16px',
                  right: '16px',
                  border: 'none',
                  background: 'rgba(0, 0, 0, 0.05)',
                  borderRadius: '50%',
                  width: '30px',
                  height: '30px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: '#86868b',
                  transition: 'background 0.2s, color 0.2s',
                  zIndex: 10
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0, 0, 0, 0.08)'; e.currentTarget.style.color = '#1d1d1f'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(0, 0, 0, 0.05)'; e.currentTarget.style.color = '#86868b'; }}
              >
                <X size={14} strokeWidth={2.5} />
              </button>

              {/* Dynamic Apple Calendar App Icon */}
              <div style={{
                width: '68px',
                height: '68px',
                borderRadius: '16px',
                background: '#ffffff',
                boxShadow: '0 8px 24px rgba(0, 0, 0, 0.08), 0 0 0 1px rgba(0, 0, 0, 0.04)',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                margin: '8px auto 20px auto',
                userSelect: 'none'
              }}>
                <div style={{
                  background: '#ff3b30',
                  height: '20px',
                  color: '#ffffff',
                  fontSize: '9.5px',
                  fontWeight: 800,
                  letterSpacing: '0.06em',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  textTransform: 'uppercase'
                }}>
                  {new Date().toLocaleDateString('de-DE', { weekday: 'short' }).replace('.', '')}
                </div>
                <div style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '26px',
                  fontWeight: 700,
                  color: '#1d1d1f',
                  lineHeight: 1
                }}>
                  {new Date().getDate()}
                </div>
              </div>

              {/* Header Text */}
              <div style={{ textAlign: 'center', marginBottom: '28px' }}>
                <h3 style={{
                  margin: 0,
                  fontSize: '22px',
                  fontWeight: 700,
                  color: '#1d1d1f',
                  letterSpacing: '-0.02em'
                }}>
                  Kalender abonnieren
                </h3>
                <p style={{
                  margin: '8px 0 0 0',
                  color: '#86868b',
                  fontSize: '13.5px',
                  lineHeight: 1.45,
                  fontWeight: 450,
                  padding: '0 10px'
                }}>
                  Synchronisiere deine Unterrichtstermine live. Neue Termine aktualisieren sich vollautomatisch auf deinem Smartphone.
                </p>
              </div>

              {/* Content / Buttons */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                
                {/* Option 1: Direct Subscription */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <a
                    href={`webcal://${cleanSupabaseUrl}/functions/v1/ical-feed?token=${token}`}
                    style={{
                      textDecoration: 'none',
                      background: '#007aff',
                      color: '#ffffff',
                      padding: '14px 20px',
                      borderRadius: '12px',
                      fontWeight: 600,
                      fontSize: '15px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      transition: 'background 0.2s',
                      textAlign: 'center',
                      boxShadow: '0 4px 12px rgba(0, 122, 255, 0.15)'
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = '#0066cc'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = '#007aff'; }}
                  >
                    <CalendarPlus size={16} /> Auf diesem Gerät abonnieren
                  </a>
                  <p style={{
                    margin: '4px 0 0 0',
                    color: '#86868b',
                    fontSize: '11px',
                    lineHeight: 1.4,
                    fontWeight: 500,
                    textAlign: 'center',
                    padding: '0 8px'
                  }}>
                    💡 <strong>Entwickler-Tipp:</strong> Wir empfehlen, das automatische Aktualisierungsintervall in den Einstellungen deines Kalenders auf <strong>1 Std.</strong> einzustellen, um Änderungen zeitnah zu synchronisieren.
                  </p>
                </div>

                {/* Divider */}
                <div style={{ display: 'flex', alignItems: 'center', margin: '4px 0' }}>
                  <div style={{ flex: 1, height: '1px', background: 'rgba(0, 0, 0, 0.06)' }}></div>
                  <span style={{ fontSize: '12px', color: '#86868b', padding: '0 12px', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 550 }}>oder</span>
                  <div style={{ flex: 1, height: '1px', background: 'rgba(0, 0, 0, 0.06)' }}></div>
                </div>

                {/* Option 2: Copy link / Google Calendar */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  
                  {/* Google Calendar Direct Import */}
                  <a
                    href={`https://calendar.google.com/calendar/render?cid=${encodeURIComponent(`webcal://${cleanSupabaseUrl}/functions/v1/ical-feed?token=${token}`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      textDecoration: 'none',
                      background: '#f5f5f7',
                      color: '#007aff',
                      padding: '14px 20px',
                      borderRadius: '12px',
                      fontWeight: 600,
                      fontSize: '15px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      transition: 'background 0.2s'
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = '#e8e8ed'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = '#f5f5f7'; }}
                  >
                    <Globe size={16} color="#007aff" /> In Google Kalender importieren
                  </a>

                  {/* Copy Link Input Bar */}
                  <div style={{ display: 'flex', background: '#f5f5f7', borderRadius: '12px', padding: '4px', alignItems: 'center', marginTop: '4px' }}>
                    <input
                      type="text"
                      readOnly
                      value={`${supabaseUrlStr}/functions/v1/ical-feed?token=${token}`}
                      style={{
                        flex: 1,
                        background: 'transparent',
                        border: 'none',
                        padding: '10px 12px',
                        fontSize: '12px',
                        color: '#1d1d1f',
                        fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
                        outline: 'none',
                        textOverflow: 'ellipsis'
                      }}
                      onClick={e => (e.target as HTMLInputElement).select()}
                    />
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(`${supabaseUrlStr}/functions/v1/ical-feed?token=${token}`);
                        setCopied(true);
                        setTimeout(() => setCopied(false), 2000);
                      }}
                      style={{
                        border: 'none',
                        background: copied ? '#34c759' : '#007aff',
                        color: '#ffffff',
                        padding: '10px 16px',
                        borderRadius: '10px',
                        fontWeight: 600,
                        fontSize: '13px',
                        cursor: 'pointer',
                        transition: 'background 0.2s',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      {copied ? <Check size={14} strokeWidth={2.5} /> : null}
                      {copied ? 'Kopiert' : 'Kopieren'}
                    </button>
                  </div>
                </div>

                {/* Instructions */}
                <div style={{
                  background: '#f5f5f7',
                  borderRadius: '16px',
                  padding: '16px',
                  fontSize: '12.5px',
                  color: '#515154',
                  lineHeight: 1.5,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  marginTop: '8px'
                }}>
                  <span style={{ fontWeight: 650, color: '#1d1d1f' }}>💡 Kurzanleitung:</span>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <span>• <b>iOS / macOS</b>: Auf "Auf diesem Gerät abonnieren" tippen.</span>
                    <span>• <b>Google / Android</b>: Auf "In Google Kalender importieren" tippen.</span>
                    <span>• <b>Andere Apps</b>: Link kopieren und als Netzwerk-/Web-Kalender hinzufügen.</span>
                  </div>
                </div>

              </div>
            </div>
          </div>
        );
      })()}

      {/* 1:1 Shoutbox Overlay Modal */}
      {activeChatOcc && (() => {
        const studentName = activeChatOcc.student?.first_name || 'Schüler';
        const teacherName = activeChatOcc.teacher?.first_name || 'Lehrer';
        const titleText = `1:1 Shoutbox: ${role === 'student' ? teacherName : studentName}`;
        
        let isFrozen = false;
        try {
          const timePart = activeChatOcc.start_time.includes(':') ? activeChatOcc.start_time : `${activeChatOcc.start_time}:00`;
          const lessonDateTime = new Date(`${activeChatOcc.date}T${timePart}`);
          isFrozen = Date.now() > lessonDateTime.getTime() + 48 * 60 * 60 * 1000;
        } catch (e) {}

        return (
          <div
            onClick={() => setActiveChatOcc(null)}
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 1100,
              background: 'rgba(15,23,42,0.65)',
              backdropFilter: 'blur(8px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '24px',
              animation: 'fadeIn 0.15s ease'
            }}
          >
            <div
              onClick={e => e.stopPropagation()}
              style={{
                background: '#ffffff',
                borderRadius: '24px',
                width: '100%',
                maxWidth: '480px',
                boxShadow: '0 32px 80px rgba(0,0,0,0.25)',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                position: 'relative',
                maxHeight: '85vh'
              }}
            >
              {/* Header */}
              <div style={{
                background: `linear-gradient(135deg, ${brandColor || '#16a34a'} 0%, #15803d 100%)`,
                padding: '24px',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 900, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>💬</span> {titleText}
                  </h3>
                  <p style={{ margin: '4px 0 0 0', color: 'rgba(255, 255, 255, 0.85)', fontSize: '0.75rem', fontWeight: 600 }}>
                    Termin am {new Date(activeChatOcc.date).toLocaleDateString('de-DE')} um {activeChatOcc.start_time.substring(0, 5)} Uhr
                  </p>
                </div>
                <button
                  onClick={() => setActiveChatOcc(null)}
                  style={{
                    border: 'none',
                    background: 'rgba(255, 255, 255, 0.2)',
                    borderRadius: '50%',
                    width: '32px',
                    height: '32px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    color: '#ffffff',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.3)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)'}
                >
                  <X size={16} />
                </button>
              </div>

              {/* Messages Viewport */}
              <div style={{
                flex: 1,
                overflowY: 'auto',
                padding: '24px',
                background: '#fafbfc',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                minHeight: '280px',
                maxHeight: '400px'
              }} className="custom-scrollbar">
                {isFrozen && (
                  <div style={{ background: '#fef2f2', border: '1px solid #fee2f2', color: '#991b1b', padding: '8px 12px', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center', textAlign: 'center' }}>
                    🔒 Shoutbox eingefroren (Schreibschutz nach 48h aktiv)
                  </div>
                )}
                {chatMessages.length === 0 ? (
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#86868b', fontSize: '0.85rem', textAlign: 'center', padding: '32px', gap: '8px' }}>
                    <MessageSquare size={32} style={{ opacity: 0.3 }} />
                    <span>Noch keine Nachrichten für diesen Termin. Schreibe die erste Nachricht für Terminabsprachen.</span>
                  </div>
                ) : (
                  chatMessages.map((msg, idx) => {
                    const isMe = msg.sender_id === userId;
                    return (
                      <div key={msg.id || idx} style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignSelf: isMe ? 'flex-end' : 'flex-start',
                        maxWidth: '80%',
                        alignItems: isMe ? 'flex-end' : 'flex-start',
                        gap: '2px'
                      }}>
                        <div style={{
                          background: isMe ? 'linear-gradient(135deg, #16a34a, #15803d)' : '#ffffff',
                          color: isMe ? '#ffffff' : '#1e293b',
                          padding: '10px 14px',
                          borderRadius: isMe ? '16px 16px 2px 16px' : '16px 16px 16px 2px',
                          fontSize: '0.85rem',
                          lineHeight: 1.4,
                          wordBreak: 'break-word',
                          border: isMe ? 'none' : '1px solid #e2e8f0',
                          boxShadow: '0 1px 4px rgba(0,0,0,0.02)'
                        }}>
                          {msg.content}
                        </div>
                        <span style={{ fontSize: '0.62rem', color: '#86868b', marginTop: '2px' }}>
                          {new Date(msg.created_at).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    );
                  })
                )}
                <div ref={chatMessagesEndRef} />
              </div>

               {(() => {
                 const isNoRecipient = role === 'student' ? !activeChatOcc.teacher_id : !activeChatOcc.student_id;
                 const isDisabled = isFrozen || isNoRecipient;
                 const placeholderText = isFrozen 
                   ? "Eingefroren..." 
                   : isNoRecipient 
                     ? "Kein Chat-Teilnehmer..." 
                     : "Schreibe eine Nachricht...";
                 return (
                   <form onSubmit={handleSendChatMessage} style={{
                     padding: '16px 24px',
                     borderTop: '1px solid #f1f5f9',
                     background: '#f8fafc',
                     display: 'flex',
                     gap: '10px'
                   }}>
                     <input
                       type="text"
                       placeholder={placeholderText}
                       disabled={isDisabled}
                       value={chatTypedMessage}
                       onChange={e => setChatTypedMessage(e.target.value)}
                       style={{
                         flex: 1,
                         padding: '10px 14px',
                         borderRadius: '12px',
                         border: '1px solid #e2e8f0',
                         background: isDisabled ? '#f1f5f9' : '#ffffff',
                         fontSize: '0.85rem',
                         outline: 'none',
                         fontWeight: 600
                       }}
                     />
                     <button
                       type="submit"
                       disabled={isDisabled || !chatTypedMessage.trim()}
                       style={{
                         background: isDisabled ? '#cbd5e1' : 'linear-gradient(135deg, #16a34a, #15803d)',
                         color: '#ffffff',
                         border: 'none',
                         borderRadius: '12px',
                         padding: '10px 16px',
                         fontSize: '0.85rem',
                         fontWeight: 800,
                         cursor: isDisabled ? 'not-allowed' : 'pointer',
                         display: 'flex',
                         alignItems: 'center',
                         justifyContent: 'center',
                         transition: 'all 0.2s'
                       }}
                     >
                       Senden
                     </button>
                   </form>
                 );
               })()}
            </div>
          </div>
        );
      })()}
      {toast && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          zIndex: 99999,
          background: toast.type === 'success' ? '#16a34a' : toast.type === 'error' ? '#dc2626' : '#2563eb',
          color: '#ffffff',
          padding: '12px 20px',
          borderRadius: '12px',
          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '0.88rem',
          fontWeight: 700,
          pointerEvents: 'none'
        }}>
          {toast.type === 'success' ? '✅' : toast.type === 'error' ? '❌' : 'ℹ️'} {toast.message}
        </div>
      )}
    </div>
  );
}