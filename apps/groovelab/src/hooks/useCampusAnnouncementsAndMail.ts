import React, { useState } from 'react';

export interface UseCampusAnnouncementsAndMailReturn {
  annBandId: string | null;
  setAnnBandId: React.Dispatch<React.SetStateAction<string | null>>;
  announcements: any[];
  setAnnouncements: React.Dispatch<React.SetStateAction<any[]>>;
  announcementTitle: string;
  setAnnouncementTitle: React.Dispatch<React.SetStateAction<string>>;
  announcementMessage: string;
  setAnnouncementMessage: React.Dispatch<React.SetStateAction<string>>;
  announcementTarget: 'all' | 'students' | 'teachers' | 'specific';
  setAnnouncementTarget: React.Dispatch<React.SetStateAction<'all' | 'students' | 'teachers' | 'specific'>>;
  selectedTargetUserIds: string[];
  setSelectedTargetUserIds: React.Dispatch<React.SetStateAction<string[]>>;
  recipientSearchText: string;
  setRecipientSearchText: React.Dispatch<React.SetStateAction<string>>;
  activeAnnouncement: any;
  setActiveAnnouncement: React.Dispatch<React.SetStateAction<any>>;
  schoolUsers: any[];
  setSchoolUsers: React.Dispatch<React.SetStateAction<any[]>>;
  selectedMailMessage: any;
  setSelectedMailMessage: React.Dispatch<React.SetStateAction<any>>;
  isMailComposing: boolean;
  setIsMailComposing: React.Dispatch<React.SetStateAction<boolean>>;
}

export const useCampusAnnouncementsAndMail = (): UseCampusAnnouncementsAndMailReturn => {
  const [annBandId, setAnnBandId] = useState<string | null>(null);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [announcementTitle, setAnnouncementTitle] = useState('');
  const [announcementMessage, setAnnouncementMessage] = useState('');
  const [announcementTarget, setAnnouncementTarget] = useState<'all' | 'students' | 'teachers' | 'specific'>('all');
  const [selectedTargetUserIds, setSelectedTargetUserIds] = useState<string[]>([]);
  const [recipientSearchText, setRecipientSearchText] = useState('');
  const [activeAnnouncement, setActiveAnnouncement] = useState<any>(null);
  const [schoolUsers, setSchoolUsers] = useState<any[]>([]);
  const [selectedMailMessage, setSelectedMailMessage] = useState<any>(null);
  const [isMailComposing, setIsMailComposing] = useState(false);

  return {
    annBandId,
    setAnnBandId,
    announcements,
    setAnnouncements,
    announcementTitle,
    setAnnouncementTitle,
    announcementMessage,
    setAnnouncementMessage,
    announcementTarget,
    setAnnouncementTarget,
    selectedTargetUserIds,
    setSelectedTargetUserIds,
    recipientSearchText,
    setRecipientSearchText,
    activeAnnouncement,
    setActiveAnnouncement,
    schoolUsers,
    setSchoolUsers,
    selectedMailMessage,
    setSelectedMailMessage,
    isMailComposing,
    setIsMailComposing,
  };
};
