import React from 'react';
import { TeacherStudioComposerView } from './TeacherStudioComposerView';

export interface TeacherStudioBoardViewProps {
  teacher: any;
  allStudents: any[];
  todayStudents?: any[];
  schoolData?: any;
  activePlatform?: 'campus' | 'groovelab';
  onClose?: () => void;
}

export const TeacherStudioBoardView: React.FC<TeacherStudioBoardViewProps> = ({
  teacher,
  allStudents = [],
  todayStudents = [],
  schoolData,
  activePlatform = 'campus',
  onClose
}) => {
  return (
    <TeacherStudioComposerView
      teacher={teacher}
      allStudents={allStudents}
      todayStudents={todayStudents}
      schoolData={schoolData}
      activePlatform={activePlatform}
      onClose={onClose}
    />
  );
};
