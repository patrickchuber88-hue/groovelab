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
  MessageSquare,
  Palmtree,
  Building2,
  ExternalLink,
  Eye,
  Edit3,
  CalendarPlus
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
}

export function CampusEventsBoard({ userId, role, schoolId, supabase, brandColor }: CampusEventsBoardProps) {
  // Tabs for Column 1 (My Lessons)
  const [lessonTab, setLessonTab] = useState<'upcoming' | 'past'>('upcoming');

  // Expanded/Collapsed months state for Column 1
  const [expandedMonths, setExpandedMonths] = useState<Record<string, boolean>>({});

  // Filter for Column 2 (School / Subscribed Events Timeline)
  const [eventFilter, setEventFilter] = useState<'all' | 'subscribed' | 'custom'>('all');
  const [isDragOverPlanning, setIsDragOverPlanning] = useState(false);

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
  const [admissionTimeError, setAdmissionTimeError] = useState('');

  // States for pause insertion
  const [pauseDuration, setPauseDuration] = useState<string>('');

  // States for additional feedback queries
  const [feedbackQuestion, setFeedbackQuestion] = useState<Record<string, string>>({}); // ppId -> question text

  // Coordinator active tab
  const [coordinatorTab, setCoordinatorTab] = useState<'eckdaten' | 'feedback' | 'timeline' | 'tech' | 'export'>('eckdaten');

  // Teacher fullscreen overlay state
  const [teacherSubmissionEvent, setTeacherSubmissionEvent] = useState<any | null>(null);
  const [teacherOverlayTab, setTeacherOverlayTab] = useState<'einreichung' | 'feedback' | 'packliste' | 'summary'>('einreichung');

  // Secretary planning fullscreen overlay state (separate from selectedEvent to avoid visibility modal)
  const [secretaryPlanningEvent, setSecretaryPlanningEvent] = useState<any | null>(null);
  
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

  // State to edit an existing program point for teacher
  const [editingPpId, setEditingPpId] = useState<string | null>(null);

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

  useEffect(() => {
    const fetchUsers = async () => {
      if (!schoolId) return;
      try {
        const { data, error } = await supabase
          .from('users')
          .select('id, first_name, last_name, role')
          .eq('school_id', schoolId)
          .in('role', ['teacher', 'admin', 'secretary']);
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
          responsible_coordination: eventCoordResponsible
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
    } catch (err: any) {
      alert('Fehler bei der Status-Aktualisierung: ' + err.message);
    }
  };

  const handleAddPause = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEvent) return;
    const durationVal = parseInt(pauseDuration, 10);
    if (isNaN(durationVal) || durationVal <= 0) {
      alert('Bitte geben Sie eine gültige Pausendauer ein (eine positive Zahl).');
      return;
    }
    try {
      const { data, error } = await supabase
        .from('campus_event_program_points')
        .insert({
          event_id: selectedEvent.id,
          school_id: schoolId,
          name: 'Pause / Unterbrechung',
          duration: durationVal,
          is_pause: true,
          status: 'approved',
          sort_order: programPoints.length
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
      const newFeedback = {
        questions: [questionText],
        status: 'pending_response'
      };
      const { data, error } = await supabase
        .from('campus_event_program_points')
        .update({ additional_feedback_responses: newFeedback })
        .eq('id', ppId)
        .select()
        .single();
      if (error) throw error;
      setProgramPoints(prev => prev.map(pp => pp.id === ppId ? data : pp));
      setFeedbackQuestion(prev => ({ ...prev, [ppId]: '' }));
      alert('Rückfrage erfolgreich gesendet!');
    } catch (err: any) {
      alert('Fehler beim Senden der Rückfrage: ' + err.message);
    }
  };

  const handleCancelFeedbackQuestion = async (ppId: string) => {
    try {
      const { data, error } = await supabase
        .from('campus_event_program_points')
        .update({ additional_feedback_responses: {} })
        .eq('id', ppId)
        .select()
        .single();
      if (error) throw error;
      setProgramPoints(prev => prev.map(pp => pp.id === ppId ? data : pp));
      alert('Rückfrage erfolgreich storniert!');
    } catch (err: any) {
      alert('Fehler beim Stornieren der Rückfrage: ' + err.message);
    }
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
          tech_requirements: newPpTechRequirements.trim() || null,
          chairs_needed: chairs,
          music_stands_needed: stands,
          remarks: newPpRemarks.trim() || null,
          status: 'submitted',
          sort_order: programPoints.length,
          songs: finalSongs
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
      setNewPpChairs('0');
      setNewPpStands('0');
      setNewPpRemarks('');
      setAddedSongs([]);
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

      const { data, error } = await supabase
        .from('campus_event_program_points')
        .update({
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
          tech_requirements: newPpTechRequirements.trim() || null,
          chairs_needed: chairs,
          music_stands_needed: stands,
          remarks: newPpRemarks.trim() || null,
          songs: finalSongs
        })
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
      setNewPpChairs('0');
      setNewPpStands('0');
      setNewPpRemarks('');
      setAddedSongs([]);
      alert('Programmpunkt erfolgreich aktualisiert!');
    } catch (err: any) {
      alert('Fehler beim Aktualisieren: ' + err.message);
    }
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
    const qCount = pp.additional_feedback_responses?.questions?.length || 0;
    const answers: string[] = [];
    for (let i = 0; i < qCount; i++) {
      const ansKey = `${pp.id}_${i}`;
      answers.push(feedbackAnswers[ansKey] || '');
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
    }
  }, [userId, schoolId, role]);


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
      return { color: '#f97316', bg: '#ffedd5' }; // Orange
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
      const todayStr = new Date().toISOString().substring(0, 10);
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
              const dateStr = targetDate.toISOString().substring(0, 10);

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
    const todayStr = new Date().toISOString().substring(0, 10);
    
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

      // Teachers see events created by themselves, public events, or events specifically visible to teachers (or students)
      if (role === 'teacher') {
        return ev.created_by === userId || ev.is_public || ev.visibility === 'all' || ev.visibility === 'teachers' || ev.visibility === 'students';
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
        start_time: ev.start_time.substring(0, 5),
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

    // Only show upcoming events including today or events whose period extends to/beyond today
    const upcomingEventsOnly = filteredByCategory.filter(ev => {
      const end = ev.event_end_date || ev.event_date;
      return end >= todayStr;
    });

    // Only show future/recent events (sort chronologically)
    return upcomingEventsOnly.sort((a, b) => {
      if (a.event_date !== b.event_date) return a.event_date.localeCompare(b.event_date);
      return a.start_time.localeCompare(b.start_time);
    });
  };

  // Split lesson list for Column 1
  const getFilteredLessons = () => {
    const todayStr = new Date().toISOString().substring(0, 10);
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

  // Export CSV
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
            onClick={() => setLessonTab('upcoming')}
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
            onClick={() => setLessonTab('past')}
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

        {/* Filter Switcher */}
        <div style={{
          display: 'flex',
          background: '#f1f5f9',
          padding: '4px',
          borderRadius: '12px',
          gap: '4px'
        }}>
          <button
            onClick={() => setEventFilter('all')}
            style={{
              flex: 1.2,
              border: 'none',
              background: eventFilter === 'all' ? '#ffffff' : 'transparent',
              color: eventFilter === 'all' ? '#0f172a' : '#64748b',
              padding: '8px 8px',
              borderRadius: '8px',
              fontWeight: 800,
              fontSize: '0.72rem',
              cursor: 'pointer'
            }}
          >
            Alle Termine
          </button>
          <button
            onClick={() => setEventFilter('subscribed')}
            style={{
              flex: 1.5,
              border: 'none',
              background: eventFilter === 'subscribed' ? '#ffffff' : 'transparent',
              color: eventFilter === 'subscribed' ? '#0f172a' : '#64748b',
              padding: '8px 8px',
              borderRadius: '8px',
              fontWeight: 800,
              fontSize: '0.72rem',
              cursor: 'pointer'
            }}
          >
            Abonnierte Termine
          </button>
          <button
            onClick={() => setEventFilter('custom')}
            style={{
              flex: 1.3,
              border: 'none',
              background: eventFilter === 'custom' ? '#ffffff' : 'transparent',
              color: eventFilter === 'custom' ? '#0f172a' : '#64748b',
              padding: '8px 8px',
              borderRadius: '8px',
              fontWeight: 800,
              fontSize: '0.72rem',
              cursor: 'pointer'
            }}
          >
            Eigene Termine
          </button>
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
    const activePlanningEvents = customEvents.filter(ev => {
      if (ev.is_subscribed) return false;
      return ev.is_planning_active;
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

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {activePlanningEvents.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 16px', border: '1.5px dashed #e2e8f0', borderRadius: '16px', color: '#94a3b8', fontSize: '0.8rem', fontWeight: 600 }}>
              Keine aktiven Planungsveranstaltungen.
            </div>
          ) : (
            activePlanningEvents.map(ev => {
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

        {/* Equipment & Tech details */}
        <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '16px', marginTop: '8px' }}>
          <h4 style={{ fontSize: '0.85rem', fontWeight: 800, color: '#475569', margin: '0 0 12px 0' }}>Bühnen-Bedarf & Technik</h4>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '12px' }}>
            <div>
              <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b' }}>Anzahl Stühle</label>
              <input
                type="number"
                min="0"
                value={newPpChairs}
                onChange={e => setNewPpChairs(e.target.value)}
                style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1.5px solid #cbd5e1', fontSize: '0.82rem', boxSizing: 'border-box' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b' }}>Anzahl Notenständer</label>
              <input
                type="number"
                min="0"
                value={newPpStands}
                onChange={e => setNewPpStands(e.target.value)}
                style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1.5px solid #cbd5e1', fontSize: '0.82rem', boxSizing: 'border-box' }}
              />
            </div>
          </div>
          <div>
            <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b' }}>Technische Anforderungen (Mikros, Amps, DI...)</label>
            <textarea
              placeholder="z.B. 2 Gesangsmikros, 1x DI-Box für Keyboard"
              value={newPpTechRequirements}
              onChange={e => setNewPpTechRequirements(e.target.value)}
              style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1.5px solid #cbd5e1', fontSize: '0.82rem', minHeight: '60px', boxSizing: 'border-box', fontFamily: 'inherit' }}
            />
          </div>
        </div>

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
            {editingPpId ? 'Änderungen speichern' : 'Programmpunkt einreichen'}
          </button>
          {editingPpId && (
            <button
              type="button"
              onClick={() => {
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
                setNewPpChairs('0');
                setNewPpStands('0');
                setNewPpRemarks('');
                setAddedSongs([]);
              }}
              style={{
                background: '#f1f5f9',
                color: '#475569',
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
    const ppsWithQueries = programPoints.filter(pp => pp.teacher_id === userId && pp.additional_feedback_responses?.questions?.length > 0);

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
          Rückmeldungen &amp; Fragen der Verwaltung
        </h3>
        {ppsWithQueries.length === 0 ? (
          <div style={{ padding: '40px 20px', border: '1.5px dashed #cbd5e1', borderRadius: '16px', textAlign: 'center', color: '#94a3b8', fontSize: '0.8rem', fontWeight: 600 }}>
            Aktuell keine offenen Rückfragen vorhanden.
          </div>
        ) : (
          ppsWithQueries.map(pp => {
            return (
              <div key={pp.id} style={{ padding: '20px', background: '#f8fafc', borderRadius: '18px', border: '1px solid #e2e8f0' }}>
                <strong style={{ fontSize: '0.9rem', color: '#0f172a', display: 'block', marginBottom: '12px' }}>
                  Beitrag: {pp.name}
                </strong>
                {pp.additional_feedback_responses.questions.map((q: string, idx: number) => {
                  const ansKey = `${pp.id}_${idx}`;
                  return (
                    <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px' }}>
                      <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#475569' }}>❓ {q}</span>
                      <textarea
                        value={feedbackAnswers[ansKey] || ''}
                        onChange={e => setFeedbackAnswers(prev => ({ ...prev, [ansKey]: e.target.value }))}
                        placeholder="Deine Antwort eingeben..."
                        style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1.5px solid #cbd5e1', fontSize: '0.82rem', minHeight: '60px', fontFamily: 'inherit', boxSizing: 'border-box' }}
                      />
                    </div>
                  );
                })}
                <button
                  type="button"
                  onClick={() => handleSaveTeacherFeedback(pp)}
                  style={{
                    background: brandColor,
                    color: '#ffffff',
                    border: 'none',
                    padding: '8px 16px',
                    borderRadius: '8px',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  Rückmeldung absenden
                </button>
              </div>
            );
          })
        )}
      </div>
    );
  };

  const renderTeacherPacklistTab = () => {
    const myPps = programPoints.filter(pp => pp.teacher_id === userId);
    let totalChairs = 0;
    let totalStands = 0;
    const requirements: string[] = [];

    myPps.forEach(pp => {
      totalChairs += pp.chairs_needed || 0;
      totalStands += pp.music_stands_needed || 0;
      if (pp.tech_requirements) {
        requirements.push(`${pp.name}: ${pp.tech_requirements}`);
      }
    });

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
          Persönliche Packliste
        </h3>
        <p style={{ color: '#64748b', fontSize: '0.82rem', margin: 0 }}>
          Zusammenfassung der benötigten Utensilien für deine Beiträge:
        </p>

        <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '18px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px' }}>
            <span style={{ fontWeight: 700, fontSize: '0.85rem' }}>🪑 Stühle gesamt</span>
            <span style={{ fontWeight: 900, color: brandColor }}>{totalChairs} Stück</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px' }}>
            <span style={{ fontWeight: 700, fontSize: '0.85rem' }}>🎼 Notenständer gesamt</span>
            <span style={{ fontWeight: 900, color: brandColor }}>{totalStands} Stück</span>
          </div>
          {requirements.length > 0 && (
            <div>
              <span style={{ fontWeight: 700, fontSize: '0.85rem', display: 'block', marginBottom: '6px' }}>🎸 Technisches Equipment</span>
              <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '0.8rem', color: '#475569', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {requirements.map((req, i) => <li key={i}>{req}</li>)}
              </ul>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderTeacherSummaryTab = () => {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
          Auftritts-Zusammenfassung
        </h3>
        
        <div style={{ padding: '24px', background: '#f8fafc', borderRadius: '18px', border: '1px solid #cbd5e1' }}>
          <h4 style={{ fontSize: '1rem', fontWeight: 900, margin: '0 0 12px 0' }}>{teacherSubmissionEvent.title}</h4>
          <p style={{ fontSize: '0.82rem', color: '#475569', margin: '0 0 16px 0', lineHeight: 1.5 }}>
            📅 Datum: {formatDateGerman(teacherSubmissionEvent.event_date)}<br />
            🕒 Startzeit: {teacherSubmissionEvent.start_time?.substring(0, 5) || '18:00'} Uhr<br />
            🎭 Bühnen: {teacherSubmissionEvent.stage_count || 1} Bühnen
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
              cursor: 'pointer'
            }}
          >
            🖨️ Programmübersicht drucken
          </button>
        </div>
      </div>
    );
  };

  const renderFullscreenTeacherSubmissionOverlay = () => {
    if (!teacherSubmissionEvent) return null;

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
            <div>
              <span style={{ fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: brandColor }}>
                Programm-Einreichung &amp; Planung
              </span>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 900, color: '#0f172a', margin: '4px 0 0 0' }}>
                {teacherSubmissionEvent.title}
              </h2>
            </div>
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

          {/* Tab Buttons (4 tabs) */}
          <div style={{ display: 'flex', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', padding: '0 32px' }}>
            {[
              { id: 'einreichung', label: '1. Programmpunkt einreichen' },
              { id: 'feedback', label: '2. Rückmeldungen & Fragen' },
              { id: 'packliste', label: '3. Equipment-Packliste' },
              { id: 'summary', label: '4. Zusammenfassung' }
            ].map(tab => {
              const isSel = teacherOverlayTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setTeacherOverlayTab(tab.id as any)}
                  style={{
                    border: 'none',
                    background: 'transparent',
                    padding: '16px 20px',
                    fontSize: '0.82rem',
                    fontWeight: 800,
                    color: isSel ? brandColor : '#64748b',
                    borderBottom: isSel ? `3px solid ${brandColor}` : '3px solid transparent',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Content Body split into two columns */}
          <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
            {/* Left Panel */}
            <div style={{ flex: 1.2, padding: '32px', overflowY: 'auto', borderRight: '1px solid #f1f5f9' }}>
              {teacherOverlayTab === 'einreichung' && renderTeacherSubmissionFormTab()}
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

                    return (
                      <div key={pp.id} style={{
                        background: '#ffffff',
                        border: '1px solid rgba(0, 0, 0, 0.05)',
                        borderRadius: '16px',
                        padding: '16px',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.01)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <strong style={{ fontSize: '0.88rem', color: '#0f172a', fontWeight: 800 }}>{pp.name}</strong>
                          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <span style={{ fontSize: '0.68rem', fontWeight: 800, background: statusBg, color: statusColor, padding: '2px 8px', borderRadius: '6px', textTransform: 'uppercase' }}>
                              {statusLabel}
                            </span>
                            <button
                              onClick={() => {
                                setEditingPpId(pp.id);
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
                                setNewPpTechRequirements(pp.tech_requirements || '');
                                setNewPpChairs(String(pp.chairs_needed || 0));
                                setNewPpStands(String(pp.music_stands_needed || 0));
                                setNewPpRemarks(pp.remarks || '');
                                
                                const loadedSongs = pp.songs && Array.isArray(pp.songs) ? pp.songs : [];
                                if (loadedSongs.length === 0 && pp.title) {
                                  setAddedSongs([{
                                    title: pp.title,
                                    artist: pp.artist || '',
                                    composer: pp.composer || '',
                                    arranger: pp.arranger || ''
                                  }]);
                                  setNewPpTitle('');
                                  setNewPpArtist('');
                                  setNewPpComposer('');
                                  setNewPpArranger('');
                                } else {
                                  setAddedSongs(loadedSongs);
                                  setNewPpTitle('');
                                  setNewPpArtist('');
                                  setNewPpComposer('');
                                  setNewPpArranger('');
                                }
                                
                                setTeacherOverlayTab('einreichung');
                              }}
                              style={{ background: 'transparent', border: 'none', color: brandColor, cursor: 'pointer', fontSize: '0.74rem', fontWeight: 800 }}
                            >
                              Bearbeiten
                            </button>
                            <button
                              onClick={() => handleDeleteProgramPoint(pp.id)}
                              style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '0.74rem', fontWeight: 800 }}
                            >
                              Löschen
                            </button>
                          </div>
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', fontSize: '0.74rem', color: '#64748b', fontWeight: 600 }}>
                          <span>⏱️ {pp.duration} Min.</span>
                          {pp.ensemble_band && <span>👥 {pp.ensemble_band}</span>}
                          <span>🎭 Stufe/Bühne {pp.stage_number || 1}</span>
                        </div>
                        {/* Render Songs */}
                        {(() => {
                          const songsList = pp.songs && Array.isArray(pp.songs) ? pp.songs : pp.title ? [{ title: pp.title, artist: pp.artist }] : [];
                          if (songsList.length === 0) return null;
                          return (
                            <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '8px', marginTop: '4px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                              <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Repertoire:</span>
                              {songsList.map((song: any, sIdx: number) => (
                                <div key={sIdx} style={{ fontSize: '0.76rem', color: '#475569', fontWeight: 650 }}>
                                  🎵 {song.artist ? `${song.artist} - ` : ''}{song.title}
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

    const panelContent = (
      <div style={{
        background: '#ffffff',
        border: asOverlay ? 'none' : '1px solid rgba(0, 0, 0, 0.05)',
        borderRadius: asOverlay ? '0' : '24px',
        padding: '24px',
        boxShadow: asOverlay ? 'none' : '0 8px 32px rgba(0,0,0,0.02)',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
        height: asOverlay ? '100%' : 'calc(100vh - 120px)',
        overflow: 'hidden'
      }}>
        {/* Event Header */}
        {!asOverlay && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <span style={{ fontSize: '0.68rem', fontWeight: 800, color: brandColor, textTransform: 'uppercase' }}>PLANUNGS-MODUL</span>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 900, color: '#0f172a', margin: '4px 0 0 0' }}>{activeEvent.title}</h3>
            </div>
            <button
              onClick={() => { setSelectedEvent(null); setSecretaryPlanningEvent(null); }}
              style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <X size={15} color="#64748b" />
            </button>
          </div>
        )}

        {/* Tab Buttons */}
        <div style={{ display: 'flex', background: '#f8fafc', padding: '4px', borderRadius: '12px', gap: '4px' }}>
          {[
            { id: 'eckdaten', label: 'Eckdaten' },
            { id: 'feedback', label: 'Feedback' },
            { id: 'timeline', label: 'Programm' },
            { id: 'tech', label: 'Technik' },
            { id: 'export', label: 'Export' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setCoordinatorTab(tab.id as any)}
              style={{
                flex: 1,
                border: 'none',
                background: coordinatorTab === tab.id ? '#ffffff' : 'transparent',
                color: coordinatorTab === tab.id ? '#0f172a' : '#64748b',
                padding: '8px 4px',
                borderRadius: '8px',
                fontWeight: 800,
                fontSize: '0.72rem',
                cursor: 'pointer'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div style={{ flex: 1, overflowY: 'auto', paddingRight: '2px' }}>
          {coordinatorTab === 'eckdaten' && (() => {
            const calcTotalMin = programPoints.reduce((sum, pp) => sum + (pp.duration || 0), 0);
            const calcProgMin = programPoints.filter(pp => !pp.is_pause).reduce((sum, pp) => sum + (pp.duration || 0), 0);
            const totalParticipants = programPoints.filter(pp => !pp.is_pause).reduce((sum, pp) => sum + (pp.performer_count || 0), 0);
            const fmtMin = (min: number) => min >= 60 ? `${Math.floor(min / 60)} h ${min % 60 > 0 ? (min % 60) + ' min' : ''}`.trim() : `${min} min`;
            const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
              planung:       { label: 'In Planung',    color: '#b45309', bg: '#fef3c7' },
              bestaetigt:    { label: 'Bestätigt',     color: '#1d4ed8', bg: '#dbeafe' },
              laufend:       { label: 'Laufend',       color: '#15803d', bg: '#dcfce7' },
                      abgeschlossen: { label: 'Abgeschlossen', color: '#475569', bg: '#f1f5f9' },
            };
            const currentStatus = statusConfig[eventStatus] || statusConfig.planung;
            const inputStyle: React.CSSProperties = { width: '100%', padding: '9px 12px', borderRadius: '10px', border: '1.5px solid #e2e8f0', fontSize: '0.82rem', boxSizing: 'border-box', background: '#fff', outline: 'none', fontFamily: 'inherit', color: '#0f172a' };
            const labelStyle: React.CSSProperties = { fontSize: '0.68rem', fontWeight: 700, color: '#94a3b8', display: 'block', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.04em' };
            const readOnlyBadge: React.CSSProperties = { padding: '9px 12px', borderRadius: '10px', border: '1.5px solid #f1f5f9', background: '#f8fafc', color: '#334155', fontSize: '0.82rem', fontWeight: 700 };

            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
                {/* Status Row: Buttons on the left, current status indicator on the right */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '20px' }}>
                  {/* Status Buttons */}
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {Object.entries(statusConfig).map(([id, cfg]) => {
                      const isSelected = eventStatus === id;
                      return (
                        <button
                          key={id}
                          type="button"
                          onClick={() => setEventStatus(id as any)}
                          style={{
                            border: `1.5px solid ${isSelected ? cfg.color : '#e2e8f0'}`,
                            background: isSelected ? cfg.bg : '#fafafa',
                            color: isSelected ? cfg.color : '#94a3b8',
                            padding: '5px 12px', borderRadius: '20px',
                            fontSize: '0.72rem', fontWeight: 800, cursor: 'pointer',
                            transition: 'all 0.15s'
                          }}
                        >
                          {cfg.label}
                        </button>
                      );
                    })}
                  </div>

                  {/* Current Status Badge */}
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: '6px',
                    padding: '5px 14px', borderRadius: '20px',
                    background: currentStatus.bg,
                    color: currentStatus.color,
                    fontSize: '0.72rem', fontWeight: 800,
                    border: `1px solid ${currentStatus.color}22`,
                    letterSpacing: '0.02em'
                  }}>
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: currentStatus.color, display: 'inline-block' }} />
                    {currentStatus.label}
                  </span>
                </div>

                {/* Datum (Read-only Calendar Widget Style) */}
                <div style={{
                  marginBottom: '20px',
                  padding: '12px 16px',
                  background: 'linear-gradient(135deg, #f0fdf4 0%, #ffffff 100%)',
                  borderRadius: '16px',
                  border: '1px solid #dcfce7',
                  display: 'flex',
                  gap: '12px',
                  alignItems: 'center'
                }}>
                  <div style={{
                    background: '#10b981',
                    color: '#ffffff',
                    width: '36px',
                    height: '36px',
                    borderRadius: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 4px 10px rgba(16, 185, 129, 0.2)'
                  }}>
                    <Calendar size={18} />
                  </div>
                  <div>
                    <span style={{ fontSize: '0.62rem', fontWeight: 800, color: '#10b981', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block' }}>Datum & Tag</span>
                    <span style={{ fontSize: '0.9rem', fontWeight: 800, color: '#0f172a' }}>
                      {activeEvent.event_date ? new Date(activeEvent.event_date).toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : '—'}
                    </span>
                  </div>
                </div>

                {/* 2-Column Main Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 0.9fr', gap: '28px' }}>
                  {/* ── LEFT COLUMN ── */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

                    {/* Veranstaltungsort */}
                    <div>
                      <label style={labelStyle}>Veranstaltungsort</label>
                      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                        <Building2 size={15} color="#94a3b8" style={{ position: 'absolute', left: '12px' }} />
                        <input
                          type="text"
                          value={eventLocation}
                          onChange={e => setEventLocation(e.target.value)}
                          placeholder="z.B. Aula, Turnhalle, Stadtpark"
                          style={{ ...inputStyle, paddingLeft: '32px' }}
                        />
                      </div>
                    </div>

                    {/* Adresse */}
                    <div>
                      <label style={labelStyle}>Adresse</label>
                      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                        <MapPin size={15} color="#94a3b8" style={{ position: 'absolute', left: '12px' }} />
                        <input
                          type="text"
                          value={eventLocationAddress}
                          onChange={e => setEventLocationAddress(e.target.value)}
                          placeholder="z.B. Musterstraße 12, 80333 München"
                          style={{ ...inputStyle, paddingLeft: '32px' }}
                        />
                      </div>
                    </div>

                    {/* Beginn */}
                    <div>
                      <label style={labelStyle}>Beginn (Uhrzeit) *</label>
                      <input
                        type="time"
                        required
                        value={eventStartTime}
                        onChange={e => {
                          setEventStartTime(e.target.value);
                          // Clear admission error if now beginn is moved later
                          if (eventAdmissionTime && e.target.value >= eventAdmissionTime) {
                            setAdmissionTimeError('');
                          }
                        }}
                        style={{ ...inputStyle, border: `1.5px solid ${eventStartTime ? '#a3e635' : '#e2e8f0'}` }}
                      />
                    </div>

                    {/* Einlass with fallback logic */}
                    <div>
                      <label style={labelStyle}>
                        Einlass (Uhrzeit)
                        <span style={{ marginLeft: '6px', color: '#94a3b8', fontWeight: 500, textTransform: 'none', letterSpacing: 0 }}>
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
                        style={{
                          ...inputStyle,
                          border: `1.5px solid ${admissionTimeError ? '#f87171' : '#e2e8f0'}`,
                          color: eventAdmissionTime ? '#0f172a' : '#94a3b8'
                        }}
                      />
                      {admissionTimeError && (
                        <span style={{ fontSize: '0.7rem', color: '#ef4444', marginTop: '4px', display: 'block' }}>
                          ⚠ {admissionTimeError}
                        </span>
                      )}
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
                        style={inputStyle}
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
                        style={{ ...inputStyle, resize: 'none', lineHeight: 1.5 }}
                      />
                    </div>
                  </div>

                  {/* ── RIGHT COLUMN (SIDEBAR) ── */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

                    {/* Read-only metrics block */}
                    <div style={{ background: '#f8fafc', borderRadius: '14px', border: '1px solid #f1f5f9', padding: '14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <span style={{ fontSize: '0.65rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Live-Metriken</span>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', background: '#fff', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
                        <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>Gesamtdauer</span>
                        <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#0f172a' }}>{fmtMin(calcTotalMin)}</span>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', background: '#fff', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
                        <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>Programm-Dauer</span>
                        <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#0f172a' }}>{fmtMin(calcProgMin)}</span>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', background: '#fff', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
                        <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>Teilnehmer (Schüler)</span>
                        <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#0f172a' }}>{totalParticipants}</span>
                      </div>
                    </div>

                    {/* Anzahl Bühnen */}
                    <div>
                      <label style={labelStyle}>Anzahl Bühnen</label>
                      <select
                        value={stageCount}
                        onChange={e => setStageCount(parseInt(e.target.value, 10))}
                        style={{ ...inputStyle }}
                      >
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => <option key={n} value={n}>{n} Bühne{n !== 1 ? 'n' : ''}</option>)}
                      </select>
                    </div>

                    {/* Budget */}
                    <div>
                      <label style={labelStyle}>Budget</label>
                      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                        <span style={{ position: 'absolute', left: '12px', fontSize: '0.85rem', fontWeight: 800, color: '#94a3b8' }}>€</span>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={eventBudget}
                          onChange={e => setEventBudget(e.target.value)}
                          placeholder="1.500,00"
                          style={{ ...inputStyle, paddingLeft: '28px' }}
                        />
                      </div>
                    </div>

                    {/* Verantwortliche */}
                    <div style={{ background: '#f8fafc', borderRadius: '14px', border: '1px solid #f1f5f9', padding: '14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <span style={{ fontSize: '0.65rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Verantwortliche</span>

                      {[
                        { label: 'Programm', val: eventMainResponsible, set: setEventMainResponsible },
                        { label: 'Technik', val: eventTechResponsible, set: setEventTechResponsible },
                        { label: 'Gesamtkoordination', val: eventCoordResponsible, set: setEventCoordResponsible },
                      ].map(({ label, val, set }) => (
                        <div key={label}>
                          <label style={{ ...labelStyle, marginBottom: '4px' }}>{label}</label>
                          <select
                            value={val}
                            onChange={e => set(e.target.value)}
                            style={{ ...inputStyle, padding: '8px 10px', fontSize: '0.78rem' }}
                          >
                            <option value="">— Nicht zugewiesen —</option>
                            {allUsers.map(u => {
                              const name = `${u.first_name || ''} ${u.last_name || ''}`.trim();
                              return <option key={u.id} value={name}>{name} ({u.role})</option>;
                            })}
                          </select>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Save Button */}
                <button
                  onClick={handleSaveEventSettings}
                  disabled={!!admissionTimeError}
                  style={{
                    marginTop: '24px',
                    background: admissionTimeError ? '#e2e8f0' : brandColor,
                    color: admissionTimeError ? '#94a3b8' : '#ffffff',
                    border: 'none',
                    padding: '13px 24px',
                    borderRadius: '12px',
                    fontWeight: 900,
                    fontSize: '0.84rem',
                    cursor: admissionTimeError ? 'not-allowed' : 'pointer',
                    transition: 'opacity 0.2s',
                    alignSelf: 'flex-start'
                  }}
                  onMouseOver={e => { if (!admissionTimeError) e.currentTarget.style.opacity = '0.88'; }}
                  onMouseOut={e => { e.currentTarget.style.opacity = '1'; }}
                >
                  Eckdaten speichern
                </button>
              </div>
            );
          })()}







          {coordinatorTab === 'feedback' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {programPoints.filter(pp => !pp.is_pause).map(pp => {
                const hasPending = pp.additional_feedback_responses?.status === 'pending_response';
                return (
                  <div key={pp.id} style={{ padding: '14px', background: '#f8fafc', borderRadius: '14px', border: '1px solid #e2e8f0' }}>
                    <strong style={{ fontSize: '0.85rem', color: '#0f172a' }}>{pp.name}</strong>
                    <span style={{ fontSize: '0.74rem', color: '#64748b', display: 'block', marginTop: '2px' }}>
                      Status: {hasPending ? '⏳ Warten auf Antwort' : '✅ Keine offenen Fragen'}
                    </span>
                    
                    <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                      <input
                        placeholder="Rückfrage stellen..."
                        value={feedbackQuestion[pp.id] || ''}
                        onChange={e => setFeedbackQuestion(prev => ({ ...prev, [pp.id]: e.target.value }))}
                        style={{ flex: 1, padding: '6px 10px', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontSize: '0.78rem' }}
                      />
                      <button
                        onClick={() => handleSendFeedbackQuestion(pp.id)}
                        style={{ background: brandColor, color: '#ffffff', border: 'none', padding: '6px 12px', borderRadius: '8px', fontSize: '0.74rem', cursor: 'pointer' }}
                      >
                        Fragen
                      </button>
                      {hasPending && (
                        <button
                          onClick={() => handleCancelFeedbackQuestion(pp.id)}
                          style={{ background: '#ef4444', color: '#ffffff', border: 'none', padding: '6px 12px', borderRadius: '8px', fontSize: '0.74rem', cursor: 'pointer' }}
                        >
                          Storno
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {coordinatorTab === 'timeline' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Insert Pause Form */}
              <form onSubmit={handleAddPause} style={{ display: 'flex', gap: '8px', borderBottom: '1px solid #f1f5f9', paddingBottom: '14px' }}>
                <input
                  type="number"
                  placeholder="Pausendauer in Min."
                  value={pauseDuration}
                  onChange={e => setPauseDuration(e.target.value)}
                  style={{ flex: 1, padding: '10px 12px', borderRadius: '10px', border: '1.5px solid #cbd5e1', fontSize: '0.82rem' }}
                />
                <button
                  type="submit"
                  style={{ background: '#0f172a', color: '#ffffff', border: 'none', padding: '10px 16px', borderRadius: '10px', fontWeight: 800, fontSize: '0.82rem', cursor: 'pointer' }}
                >
                  + Pause einfügen
                </button>
              </form>

              {/* Points List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {programPoints.map((pp, idx) => (
                  <div key={pp.id} style={{
                    padding: '12px 14px',
                    background: pp.is_pause ? '#fffbeb' : '#ffffff',
                    border: pp.is_pause ? '1px solid #fef3c7' : '1px solid rgba(0,0,0,0.06)',
                    borderRadius: '12px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <div>
                      <strong style={{ fontSize: '0.85rem' }}>{pp.name}</strong>
                      <span style={{ display: 'block', fontSize: '0.72rem', color: '#64748b' }}>⏱️ {pp.duration} Min.</span>
                      {/* Render Songs */}
                      {(() => {
                        const songsList = pp.songs && Array.isArray(pp.songs) ? pp.songs : pp.title ? [{ title: pp.title, artist: pp.artist }] : [];
                        if (songsList.length === 0) return null;
                        return (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginTop: '6px' }}>
                            {songsList.map((song: any, sIdx: number) => (
                              <div key={sIdx} style={{ fontSize: '0.72rem', color: '#475569', fontWeight: 600 }}>
                                🎵 {song.artist ? `${song.artist} - ` : ''}{song.title}
                              </div>
                            ))}
                          </div>
                        );
                      })()}
                    </div>

                    <div style={{ display: 'flex', gap: '6px' }}>
                      {idx > 0 && (
                        <button
                          type="button"
                          onClick={() => handleSwapProgramPoints(pp, programPoints[idx - 1])}
                          style={{ border: 'none', background: '#f1f5f9', padding: '4px 8px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.7rem' }}
                        >
                          ⬆️
                        </button>
                      )}
                      {idx < programPoints.length - 1 && (
                        <button
                          type="button"
                          onClick={() => handleSwapProgramPoints(pp, programPoints[idx + 1])}
                          style={{ border: 'none', background: '#f1f5f9', padding: '4px 8px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.7rem' }}
                        >
                          ⬇️
                        </button>
                      )}
                      {!pp.is_pause && pp.status !== 'approved' && (
                        <button
                          type="button"
                          onClick={() => handleUpdateProgramPointStatus(pp.id, 'approved')}
                          style={{ border: 'none', background: '#dcfce7', color: '#16a34a', padding: '4px 8px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.7rem', fontWeight: 800 }}
                        >
                          Freigeben
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {coordinatorTab === 'tech' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ padding: '16px', background: '#f8fafc', borderRadius: '14px', border: '1px solid #e2e8f0' }}>
                <strong style={{ fontSize: '0.9rem', color: '#0f172a', display: 'block', marginBottom: '8px' }}>Materialbedarf</strong>
                <span style={{ fontSize: '0.8rem', color: '#475569', display: 'block' }}>
                  🪑 Stühle benötigt: {programPoints.reduce((acc, pp) => acc + (pp.chairs_needed || 0), 0)}<br />
                  🎼 Notenständer benötigt: {programPoints.reduce((acc, pp) => acc + (pp.music_stands_needed || 0), 0)}
                </span>
              </div>
            </div>
          )}

          {coordinatorTab === 'export' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <button
                onClick={handleExportCSV}
                style={{ background: '#0f172a', color: '#ffffff', border: 'none', padding: '12px', borderRadius: '12px', fontWeight: 800, fontSize: '0.82rem', cursor: 'pointer' }}
              >
                📊 Programmliste exportieren (CSV)
              </button>
            </div>
          )}
        </div>
      </div>
    );

    if (asOverlay) {
      return (
        <div
          onClick={() => setSecretaryPlanningEvent(null)}
          style={{
            position: 'fixed', inset: 0, zIndex: 1200,
            background: 'rgba(15,23,42,0.45)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '40px', boxSizing: 'border-box'
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: '#ffffff', borderRadius: '32px',
              width: '100%', maxWidth: '1100px', maxHeight: '88vh',
              boxShadow: '0 32px 80px rgba(0,0,0,0.18)',
              display: 'flex', flexDirection: 'column',
              overflow: 'hidden', border: '1px solid rgba(0,0,0,0.06)'
            }}
          >
            <div style={{ padding: '20px 32px', borderBottom: '1px solid #f1f5f9', background: 'linear-gradient(to right, #f0fdf4, #fff)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: brandColor }}>Verwaltung · Planungs-Modul</span>
                <h2 style={{ fontSize: '1.4rem', fontWeight: 900, color: '#0f172a', margin: '4px 0 0 0' }}>{(secretaryPlanningEvent || selectedEvent)?.title}</h2>
              </div>
              <button onClick={() => { setSecretaryPlanningEvent(null); setSelectedEvent(null); }} style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', width: '38px', height: '38px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <X size={18} color="#64748b" />
              </button>
            </div>
            <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
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
      `}} />
      
      {/* COLUMN 1 */}
      {showLessons ? renderLessonsColumn() : renderTimelineColumn()}

      {/* COLUMN 2 */}
      {showLessons ? renderTimelineColumn() : (role === 'secretary' ? renderTeacherEventPlanningColumn() : renderAdminCoordinatorPanel())}

      {/* COLUMN 3 */}
      {role === 'teacher' 
        ? renderTeacherEventPlanningColumn() 
        : (role === 'secretary' ? renderAdminCoordinatorPanel() : renderAnnouncementsColumn())}

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
                  {ev.start_time && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#f8fafc', padding: '8px 12px', borderRadius: '10px' }}>
                      <Clock size={14} color="#64748b" />
                      <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#334155' }}>
                        {ev.start_time.substring(0, 5)}{ev.end_time ? ` – ${ev.end_time.substring(0, 5)}` : ''} Uhr
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
    </div>
  );
}
