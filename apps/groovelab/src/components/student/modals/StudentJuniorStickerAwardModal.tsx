import React from "react";
import { StudentStickerAwardCelebrationModal } from "./StudentStickerAwardCelebrationModal";

export interface StudentJuniorStickerAwardModalProps {
  sticker: any;
  assignedCampusSongs?: any[];
  progressItems?: any[];
  isSongMastered?: (song: any) => boolean;
  onDownloadJpg: (sticker: any, topicOverride?: string) => void;
  onStickInAlbum: () => void;
  actualStudentName?: string;
  studentInstrument?: string | null;
  schoolName?: string;
  selectedSchoolYear?: string;
}

export const StudentJuniorStickerAwardModal: React.FC<StudentJuniorStickerAwardModalProps> = ({
  sticker,
  assignedCampusSongs = [],
  progressItems = [],
  isSongMastered = () => false,
  onDownloadJpg,
  onStickInAlbum,
  actualStudentName,
  studentInstrument,
  schoolName,
  selectedSchoolYear,
}) => {
  if (!sticker || typeof document === "undefined") return null;

  const masteredSong = assignedCampusSongs.find(s => isSongMastered(s)) || assignedCampusSongs[0];
  const songTitleDisplay = masteredSong 
    ? `${masteredSong.artist} – ${masteredSong.title}` 
    : (progressItems.find(p => p.status === 'MASTERED')?.topic_name || '');

  return (
    <StudentStickerAwardCelebrationModal
      sticker={sticker}
      actualStudentName={actualStudentName}
      studentInstrument={studentInstrument}
      schoolName={schoolName}
      selectedSchoolYear={selectedSchoolYear}
      topicName={songTitleDisplay}
      onDownloadJpg={onDownloadJpg}
      onStickInAlbum={onStickInAlbum}
    />
  );
};
