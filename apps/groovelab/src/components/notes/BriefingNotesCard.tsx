import React, { useState } from 'react';
import { useNotes } from '../../hooks/useNotes';
import { TeacherNotesBoardModal } from './TeacherNotesBoardModal';
import { TeacherNotesWidget } from '../teacher/notes/TeacherNotesWidget';

export const INSTRUMENT_SYNONYMS: Record<string, string[]> = {
  klavier: ['klavier', 'piano', 'e-piano', 'flügel', 'fluegel', 'synth', 'tasten', 'digitalpiano', 'epiano', 'clavinova', 'keyboard', 'rhodes'],
  piano: ['klavier', 'piano', 'e-piano', 'flügel', 'fluegel', 'synth', 'tasten', 'digitalpiano', 'epiano', 'clavinova', 'keyboard', 'rhodes'],
  epiano: ['e-piano', 'epiano', 'digitalpiano', 'clavinova', 'stagepiano', 'keyboard', 'synthesizer'],
  fluegel: ['flügel', 'fluegel', 'konzertflügel', 'fluegel', 'steinway', 'yamaha'],
  flügel: ['flügel', 'fluegel', 'konzertflügel', 'fluegel', 'steinway', 'yamaha'],
  drum: ['drum', 'schlagzeug', 'e-drum', 'edrum', 'snare', 'becken', 'cajon', 'hihat', 'percussion', 'tom', 'kick', 'beckenset'],
  schlagzeug: ['drum', 'schlagzeug', 'e-drum', 'edrum', 'snare', 'becken', 'cajon', 'hihat', 'percussion', 'tom', 'kick', 'beckenset'],
  edrum: ['e-drum', 'edrum', 'roland drum', 'alesis', 'mesh', 'drum'],
  gitarre: ['gitarre', 'guitar', 'e-gitarre', 'westerngitarre', 'konzertgitarre', 'akustikgitarre', 'bass', 'e-bass', 'ukulele', 'strat'],
  guitar: ['gitarre', 'guitar', 'e-gitarre', 'westerngitarre', 'konzertgitarre', 'akustikgitarre', 'bass', 'e-bass', 'ukulele', 'strat'],
  bass: ['bass', 'e-bass', 'kontrabass', 'akustikbass', 'precision', 'jazzbass'],
  amp: ['amp', 'verstärker', 'verstaerker', 'box', 'combo', 'speaker', 'pa', 'mischpult', 'lautsprecher', 'marshall', 'fender', 'roland'],
  mic: ['mikrofon', 'mic', 'micro', 'shure', 'rode', 'funkmikro', 'gesangsmikro'],
  kabel: ['kabel', 'klinkenkabel', 'xlr', 'stromkabel', 'netzteil', 'adapter', 'patchkabel'],
  staender: ['ständer', 'staender', 'notenständer', 'gitarrenständer', 'mikrofonständer', 'keyboardständer'],
  ständer: ['ständer', 'staender', 'notenständer', 'gitarrenständer', 'mikrofonständer', 'keyboardständer']
};

export interface BriefingNotesCardProps {
  user: any;
  schoolId?: number | string;
  activeStudent?: any;
  allStudents?: any[];
  todayStudents?: any[];
  rooms?: any[];
  currentRoom?: string;
  teacherTodayRooms?: string[];
  onOpenDrawer?: () => void;
  onOpenHomeworkModal?: (student: any) => void;
  widgetState?: string;
}

export const BriefingNotesCard: React.FC<BriefingNotesCardProps> = ({
  user,
  schoolId,
  activeStudent,
  allStudents = [],
  todayStudents = [],
  rooms = [],
  currentRoom = '',
  teacherTodayRooms = [],
  onOpenDrawer,
  onOpenHomeworkModal,
  widgetState = 'ACTIVE'
}) => {
  const {
    notes,
    createNote,
    deleteNote,
    toggleCompleteTodo,
    updateNote,
    togglePin,
    toggleArchive,
    resolveRoomIssue,
    dismissRoomIssueForTeacher
  } = useNotes({ user, schoolId, activeStudent });

  const [showBoardModal, setShowBoardModal] = useState<boolean>(false);

  return (
    <>
      <TeacherNotesWidget
        user={user}
        schoolId={schoolId}
        activeStudent={activeStudent}
        allStudents={allStudents}
        todayStudents={todayStudents}
        rooms={rooms}
        currentRoom={currentRoom}
        teacherTodayRooms={teacherTodayRooms}
        notes={notes}
        onCreateNote={createNote}
        onDeleteNote={deleteNote}
        onToggleCompleteTodo={toggleCompleteTodo}
        onOpenBoard={() => setShowBoardModal(true)}
        widgetState={widgetState}
      />

      {showBoardModal && (
        <TeacherNotesBoardModal
          isOpen={showBoardModal}
          onClose={() => setShowBoardModal(false)}
          notes={notes}
          allStudents={allStudents}
          todayStudents={todayStudents}
          user={user}
          onCreateNote={createNote}
          onUpdateNote={updateNote}
          onDeleteNote={deleteNote}
          onTogglePin={togglePin}
          onToggleCompleteTodo={toggleCompleteTodo}
          onToggleArchive={toggleArchive}
          onResolveRoomIssue={resolveRoomIssue}
          onDismissRoomIssue={dismissRoomIssueForTeacher}
          onOpenHomeworkModal={onOpenHomeworkModal}
        />
      )}
    </>
  );
};
