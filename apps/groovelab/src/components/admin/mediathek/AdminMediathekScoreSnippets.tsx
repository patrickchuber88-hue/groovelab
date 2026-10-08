/**
 * 🏛️ Campus-Groovelab 0,1% Goldstandard: Mediathek Board Notenschnipsel
 * AdminMediathekScoreSnippets.tsx
 * 
 * Autarker Feature-Monolith für das Mediathek Board (Vierte Säule):
 * - Kapselt 100% der Notenschnipsel-UI im vollwertigen Mediathek Board (AdminSongsView)
 * - Verknüpft TeacherLibraryScoreSnippetsTab, TeacherLibraryShareHomeworkModal & MicroScoreStudioModal
 * - Single Source of Truth via teacherScoreSnippetService (Cloud & Offline SWR)
 * - BFSG 2025 & WCAG 2.2 AA konform
 */

import React, { useState, useEffect, useCallback } from 'react';
import { MicroScoreSnippet } from '../../student/meisterwerk/microscore/microScore.types';
import { MicroScoreStudioModal } from '../../student/meisterwerk/microscore/MicroScoreStudioModal';
import { TeacherLibraryScoreSnippetsTab } from '../../teacher/mediathek/tabs/TeacherLibraryScoreSnippetsTab';
import { TeacherLibraryShareHomeworkModal } from '../../teacher/mediathek/TeacherLibraryShareHomeworkModal';
import {
  fetchTeacherScoreSnippets,
  saveTeacherScoreSnippet,
  deleteTeacherScoreSnippet
} from '../../../services/teacherScoreSnippetService';
import { supabase } from '../../../lib/supabase';

export interface AdminMediathekScoreSnippetsProps {
  mediathekTab: 'songs' | 'lehrwerke' | 'schnelltext' | 'notenschnipsel';
  brandColor: string;
  songSearch: string;
  userId: string;
  schoolId?: string;
  students?: any[];
}

export const AdminMediathekScoreSnippets: React.FC<AdminMediathekScoreSnippetsProps> = ({
  mediathekTab,
  brandColor,
  songSearch,
  userId,
  schoolId,
  students = []
}) => {
  const [snippets, setSnippets] = useState<MicroScoreSnippet[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedInstrumentFilter, setSelectedInstrumentFilter] = useState('Alle');
  const [resolvedStudents, setResolvedStudents] = useState<any[]>(students);

  // Homework Share & Studio Modal States
  const [sharingSnippet, setSharingSnippet] = useState<MicroScoreSnippet | null>(null);
  const [editingSnippet, setEditingSnippet] = useState<MicroScoreSnippet | null>(null);
  const [isStudioOpen, setIsStudioOpen] = useState(false);

  // Hydrate students if not provided directly
  useEffect(() => {
    if (students && students.length > 0) {
      setResolvedStudents(students);
      return;
    }
    if (schoolId) {
      supabase
        .from('students')
        .select('*')
        .eq('school_id', schoolId)
        .eq('is_deleted', false)
        .order('last_name', { ascending: true })
        .then(({ data, error }) => {
          if (!error && data && data.length > 0) {
            setResolvedStudents(data);
          }
        });
    }
  }, [students, schoolId]);

  // Load score snippets
  const loadSnippets = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await fetchTeacherScoreSnippets(userId, schoolId);
      setSnippets(data);
    } catch (err) {
      console.warn('[AdminMediathekScoreSnippets] Error loading snippets:', err);
    } finally {
      setIsLoading(false);
    }
  }, [userId, schoolId]);

  useEffect(() => {
    loadSnippets();
    const handleUpdate = () => loadSnippets();
    window.addEventListener('campus_teacher_score_snippets_updated', handleUpdate);
    return () => {
      window.removeEventListener('campus_teacher_score_snippets_updated', handleUpdate);
    };
  }, [loadSnippets]);

  // Handlers
  const handleAssign = (snippet: MicroScoreSnippet) => {
    setSharingSnippet(snippet);
  };

  const handleEdit = (snippet: MicroScoreSnippet) => {
    setEditingSnippet(snippet);
    setIsStudioOpen(true);
  };

  const handleNewSnippet = () => {
    setEditingSnippet(null);
    setIsStudioOpen(true);
  };

  const handleDelete = async (snippetId: string) => {
    const success = await deleteTeacherScoreSnippet(snippetId, userId || 'admin');
    if (success) {
      setSnippets(prev => prev.filter(s => s.id !== snippetId));
    }
  };

  const handleStudioSave = async (savedSnippet: MicroScoreSnippet) => {
    const res = await saveTeacherScoreSnippet(userId || 'admin', schoolId || '', savedSnippet);
    if (res.success) {
      setSnippets(prev => {
        const idx = prev.findIndex(s => s.id === savedSnippet.id);
        if (idx >= 0) {
          const updated = [...prev];
          updated[idx] = res.snippet || savedSnippet;
          return updated;
        }
        return [res.snippet || savedSnippet, ...prev];
      });
      setIsStudioOpen(false);
      setEditingSnippet(null);
    }
  };

  return (
    <div
      style={{
        display: mediathekTab === 'notenschnipsel' ? 'flex' : 'none',
        flexDirection: 'column',
        gap: '16px',
        width: '100%'
      }}
      className={`mediathek-col-card mediathek-col-notenschnipsel ${
        mediathekTab === 'notenschnipsel' ? 'mobile-active-card' : 'mobile-hidden-card'
      }`}
    >
      <TeacherLibraryScoreSnippetsTab
        snippets={snippets}
        onAssign={handleAssign}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onNewSnippet={handleNewSnippet}
        searchQuery={songSearch}
        selectedInstrumentFilter={selectedInstrumentFilter}
        setSelectedInstrumentFilter={setSelectedInstrumentFilter}
      />

      {/* 1-Tap Hausaufgaben-Zuweisung Modal */}
      {sharingSnippet && (
        <TeacherLibraryShareHomeworkModal
          isOpen={!!sharingSnippet}
          onClose={() => setSharingSnippet(null)}
          item={sharingSnippet}
          itemType="score_snippet"
          students={resolvedStudents}
          teacherId={userId}
          schoolId={schoolId}
        />
      )}

      {/* Micro-Score Studio Modal */}
      {isStudioOpen && (
        <MicroScoreStudioModal
          isOpen={isStudioOpen}
          onClose={() => {
            setIsStudioOpen(false);
            setEditingSnippet(null);
          }}
          initialSnippet={editingSnippet}
          onSaveSnippet={handleStudioSave}
        />
      )}
    </div>
  );
};
