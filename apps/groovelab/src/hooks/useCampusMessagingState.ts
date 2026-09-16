import React, { useState, useEffect } from 'react';

export interface UseCampusMessagingStateParams {
  userId?: string | null;
}

export interface UseCampusMessagingStateReturn {
  studentMessages: any[];
  setStudentMessages: React.Dispatch<React.SetStateAction<any[]>>;
  studentMessagesLoading: boolean;
  setStudentMessagesLoading: React.Dispatch<React.SetStateAction<boolean>>;
  selectedStudentMessage: any;
  setSelectedStudentMessage: React.Dispatch<React.SetStateAction<any>>;
  studentMessagesFilter: 'all' | 'school' | 'band';
  setStudentMessagesFilter: React.Dispatch<React.SetStateAction<'all' | 'school' | 'band'>>;
  deletedMessageIds: string[];
  setDeletedMessageIds: React.Dispatch<React.SetStateAction<string[]>>;
  campusMessages: any[];
  setCampusMessages: React.Dispatch<React.SetStateAction<any[]>>;
  campusMessagesLoading: boolean;
  setCampusMessagesLoading: React.Dispatch<React.SetStateAction<boolean>>;
  campusUnreadCount: number;
  setCampusUnreadCount: React.Dispatch<React.SetStateAction<number>>;
  selectedCampusRecipient: any;
  setSelectedCampusRecipient: React.Dispatch<React.SetStateAction<any>>;
}

export const useCampusMessagingState = ({
  userId
}: UseCampusMessagingStateParams): UseCampusMessagingStateReturn => {
  const [studentMessages, setStudentMessages] = useState<any[]>([]);
  const [studentMessagesLoading, setStudentMessagesLoading] = useState(false);
  const [selectedStudentMessage, setSelectedStudentMessage] = useState<any>(null);
  const [studentMessagesFilter, setStudentMessagesFilter] = useState<'all' | 'school' | 'band'>('all');
  const [deletedMessageIds, setDeletedMessageIds] = useState<string[]>([]);

  // Campus 1-on-1 Direct Messaging states
  const [campusMessages, setCampusMessages] = useState<any[]>([]);
  const [campusMessagesLoading, setCampusMessagesLoading] = useState(false);
  const [campusUnreadCount, setCampusUnreadCount] = useState(0);
  const [selectedCampusRecipient, setSelectedCampusRecipient] = useState<any>(null);

  // Sync deletedMessageIds with localStorage per user
  useEffect(() => {
    if (userId) {
      const stored = localStorage.getItem(`groovelab_deleted_messages_${userId}`);
      if (stored) {
        try {
          setDeletedMessageIds(JSON.parse(stored));
        } catch (e) {
          setDeletedMessageIds([]);
        }
      } else {
        setDeletedMessageIds([]);
      }
    } else {
      setDeletedMessageIds([]);
    }
  }, [userId]);

  return {
    studentMessages,
    setStudentMessages,
    studentMessagesLoading,
    setStudentMessagesLoading,
    selectedStudentMessage,
    setSelectedStudentMessage,
    studentMessagesFilter,
    setStudentMessagesFilter,
    deletedMessageIds,
    setDeletedMessageIds,
    campusMessages,
    setCampusMessages,
    campusMessagesLoading,
    setCampusMessagesLoading,
    campusUnreadCount,
    setCampusUnreadCount,
    selectedCampusRecipient,
    setSelectedCampusRecipient,
  };
};
