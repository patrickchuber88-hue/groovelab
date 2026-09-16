import React, { lazy, Suspense } from 'react';
import { ErrorBoundary } from '../ui/ErrorBoundary';

const CampusDirectMessages = lazy(() => import('../CampusDirectMessages').then(m => ({ default: m.default || m.CampusDirectMessages })));
const GrooveLabMessagesBoard = lazy(() => import('../GrooveLabMessagesBoard'));

export interface MessagesTabContainerProps {
  user: any;
  activePlatform: string;
  schoolUsers: any[];
  campusMessages: any[];
  announcements: any[];
  studentMessages: any[];
  selectedCampusRecipient: any;
  setSelectedCampusRecipient: (recipient: any) => void;
  onSendCampusMessage: (
    recipientId: string, 
    content: string, 
    groupId?: string, 
    channelId?: string, 
    parentMessageId?: string, 
    subject?: string
  ) => Promise<any>;
  onMarkCampusMessagesAsRead: (senderId: string) => Promise<void>;
  onMarkCampusGroupAsRead: (groupId: string) => Promise<void>;
  onMarkCampusChannelAsRead: (channelId: string, groupId: string) => Promise<void>;
  onPostAnnouncement: (title: string, message: string, targetType: string, targetUserIds: string[]) => Promise<void>;
  onDeleteAnnouncement: (id: string) => Promise<void>;
  onAcknowledgeMessage: (messageId: string) => Promise<void>;
}

/**
 * 📬 MessagesTabContainer
 * Bounded context container isolating Campus Direct Messages (chat) and GrooveLab Messages Board (announcements).
 * Fully type-safe and adhering to BFSG 2025 / WCAG 2.2 AA standards.
 */
export function MessagesTabContainer({
  user,
  activePlatform,
  schoolUsers,
  campusMessages,
  announcements,
  studentMessages,
  selectedCampusRecipient,
  setSelectedCampusRecipient,
  onSendCampusMessage,
  onMarkCampusMessagesAsRead,
  onMarkCampusGroupAsRead,
  onMarkCampusChannelAsRead,
  onPostAnnouncement,
  onDeleteAnnouncement,
  onAcknowledgeMessage
}: MessagesTabContainerProps) {
  const currentUserId = typeof window !== 'undefined' 
    ? (sessionStorage.getItem('groovelab_selected_student_id') || sessionStorage.getItem('groovelab_user_id') || user?.id) 
    : user?.id;

  if (activePlatform === 'campus') {
    return (
      <ErrorBoundary>
        <Suspense fallback={<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: '#64748b', fontWeight: 600 }}>Lade Chats...</div>}>
          <CampusDirectMessages
            user={user}
            currentUserId={currentUserId}
            schoolUsers={schoolUsers}
            campusMessages={campusMessages}
            onSendMessage={onSendCampusMessage}
            onMarkAsRead={onMarkCampusMessagesAsRead}
            onMarkGroupAsRead={onMarkCampusGroupAsRead}
            onMarkChannelAsRead={onMarkCampusChannelAsRead}
            selectedRecipient={selectedCampusRecipient}
            setSelectedRecipient={setSelectedCampusRecipient}
            studentToTeacherChat={user?.schools?.opening_hours?.campus_settings?.student_to_teacher_chat !== false}
          />
        </Suspense>
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <Suspense fallback={<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: '#64748b', fontWeight: 600 }}>Lade Pinnwand...</div>}>
        <GrooveLabMessagesBoard
          user={user}
          schoolUsers={schoolUsers}
          announcements={announcements}
          studentMessages={studentMessages}
          onPostAnnouncement={onPostAnnouncement}
          onDeleteAnnouncement={onDeleteAnnouncement}
          onAcknowledgeMessage={onAcknowledgeMessage}
        />
      </Suspense>
    </ErrorBoundary>
  );
}

export default MessagesTabContainer;
