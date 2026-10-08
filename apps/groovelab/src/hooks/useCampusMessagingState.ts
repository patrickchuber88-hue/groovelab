import React, { useState, useEffect } from 'react';
import { getLocalMessagesCache, setLocalMessagesCache } from './useCampusMessagingData';

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

  // Campus 1-on-1 Direct Messaging states (0.1% Goldstandard SWR Instant Hydration)
  const effectiveUid = userId || (typeof window !== 'undefined' ? (sessionStorage.getItem('groovelab_selected_student_id') || sessionStorage.getItem('groovelab_user_id')) : null) || '';
  const [campusMessages, setCampusMessages] = useState<any[]>(() => getLocalMessagesCache(effectiveUid));
  const [campusMessagesLoading, setCampusMessagesLoading] = useState(false);
  const [campusUnreadCount, setCampusUnreadCount] = useState(0);
  const [selectedCampusRecipient, setSelectedCampusRecipient] = useState<any>(null);

  // Sync campusMessages with localStorage SWR cache per user
  useEffect(() => {
    if (effectiveUid && campusMessages.length > 0) {
      setLocalMessagesCache(effectiveUid, campusMessages);
    }
  }, [effectiveUid, campusMessages]);

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
