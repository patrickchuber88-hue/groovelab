import { useState, useCallback } from 'react';
import { CampusEvent } from '../types/campusEvents.types';
import { supabase as defaultSupabase } from '../../../../lib/supabase';

interface UseCampusEventPlanningParams {
  schoolId: string;
  userId: string;
  supabase?: any;
  onRefreshEvents?: () => void;
  onEventCreatedOrUpdated?: () => void;
  role?: string;
}

export function useCampusEventPlanning({
  schoolId,
  userId,
  supabase = defaultSupabase,
  onRefreshEvents,
  onEventCreatedOrUpdated,
  role
}: UseCampusEventPlanningParams) {
  const [teacherSubmissionEvent, setTeacherSubmissionEvent] = useState<CampusEvent | null>(null);
  const [teacherOverlayTab, setTeacherOverlayTab] = useState<'einreichung' | 'technik' | 'schueler' | 'feedback' | 'packliste' | 'summary'>('einreichung');
  const [secretaryPlanningEvent, setSecretaryPlanningEvent] = useState<CampusEvent | null>(null);

  // Form states for creating/editing events
  const [formTitle, setFormTitle] = useState('');
  const [formDate, setFormDate] = useState('');
  const [formStartTime, setFormStartTime] = useState('');
  const [formEndTime, setFormEndTime] = useState('');
  const [formCategory, setFormCategory] = useState('Sonstiges');
  const [formDescription, setFormDescription] = useState('');
  const [formIsPublic, setFormIsPublic] = useState(false);
  const [formColor, setFormColor] = useState('');
  const [formVisibility, setFormVisibility] = useState<'all' | 'teachers' | 'students' | 'private'>('all');
  const [formLocationType, setFormLocationType] = useState<'none' | 'intern' | 'extern'>('none');
  const [formRoomId, setFormRoomId] = useState('');
  const [formLocationExtern, setFormLocationExtern] = useState('');
  const [submittingForm, setSubmittingForm] = useState(false);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);

  // Participant assignment search states
  const [participantQuery, setParticipantQuery] = useState('');
  const [participantResults, setParticipantResults] = useState<{ id: string; name: string; type: 'student' | 'ensemble' | 'band'; detail?: string }[]>([]);
  const [selectedParticipants, setSelectedParticipants] = useState<any[]>([]);
  const [participantSearchOpen, setParticipantSearchOpen] = useState(false);
  const [participantLoading, setParticipantLoading] = useState(false);

  const resetForm = useCallback(() => {
    setFormTitle('');
    setFormDate('');
    setFormStartTime('');
    setFormEndTime('');
    setFormCategory('Sonstiges');
    setFormDescription('');
    setFormIsPublic(false);
    setFormColor('');
    setFormVisibility('all');
    setFormLocationType('none');
    setFormRoomId('');
    setFormLocationExtern('');
    setSelectedParticipants([]);
    setEditingEventId(null);
  }, []);

  const handleCreateOrUpdateEvent = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim() || !formDate) {
      alert('Bitte Titel und Datum ausfüllen.');
      return;
    }

    setSubmittingForm(true);
    try {
      const payload: any = {
        school_id: schoolId,
        title: formTitle.trim(),
        event_date: formDate,
        start_time: formStartTime || '14:00',
        end_time: formEndTime || null,
        category: formCategory,
        description: formDescription.trim() || null,
        is_public: formVisibility === 'all',
        visibility: formVisibility,
        color: formColor || null,
        location_type: formLocationType,
        room_id: formLocationType === 'intern' ? formRoomId || null : null,
        location_extern: formLocationType === 'extern' ? formLocationExtern.trim() || null : null,
        assigned_student_ids: selectedParticipants.filter(p => p.type === 'student').map(p => p.id)
      };

      if (editingEventId) {
        const { error } = await supabase
          .from('campus_events')
          .update(payload)
          .eq('id', editingEventId);
        if (error) throw error;
      } else {
        payload.created_by = userId;
        const { error } = await supabase
          .from('campus_events')
          .insert(payload);
        if (error) throw error;
      }

      resetForm();
      if (onRefreshEvents) onRefreshEvents();
      if (onEventCreatedOrUpdated) onEventCreatedOrUpdated();
    } catch (err: any) {
      console.error('Error saving event:', err);
      alert('Fehler beim Speichern: ' + err.message);
    } finally {
      setSubmittingForm(false);
    }
  }, [
    formTitle, formDate, formStartTime, formEndTime, formCategory, formDescription,
    formVisibility, formColor, formLocationType, formRoomId, formLocationExtern,
    selectedParticipants, editingEventId, schoolId, userId, supabase, resetForm, onRefreshEvents
  ]);

  return {
    teacherSubmissionEvent,
    setTeacherSubmissionEvent,
    teacherOverlayTab,
    setTeacherOverlayTab,
    secretaryPlanningEvent,
    setSecretaryPlanningEvent,
    formTitle,
    setFormTitle,
    formDate,
    setFormDate,
    formStartTime,
    setFormStartTime,
    formEndTime,
    setFormEndTime,
    formCategory,
    setFormCategory,
    formDescription,
    setFormDescription,
    formIsPublic,
    setFormIsPublic,
    formColor,
    setFormColor,
    formVisibility,
    setFormVisibility,
    formLocationType,
    setFormLocationType,
    formRoomId,
    setFormRoomId,
    formLocationExtern,
    setFormLocationExtern,
    submittingForm,
    editingEventId,
    setEditingEventId,
    participantQuery,
    setParticipantQuery,
    participantResults,
    setParticipantResults,
    selectedParticipants,
    setSelectedParticipants,
    participantSearchOpen,
    setParticipantSearchOpen,
    participantLoading,
    resetForm,
    handleCreateOrUpdateEvent
  };
}
