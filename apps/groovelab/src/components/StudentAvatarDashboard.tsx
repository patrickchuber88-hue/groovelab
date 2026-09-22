import React, { useState, useEffect, useRef, useMemo, useCallback, lazy, Suspense } from 'react';
import { supabase } from '../lib/supabase';
import { Sparkles, Shield } from 'lucide-react';
import { formatTeacherFullName } from '../utils/nameHelper';
import { CampusUiLevel } from './campus/CampusLevelSwitcher';
import { StudentBriefingTab } from './student/tabs/StudentBriefingTab';
import { StudentHeroTab } from './student/tabs/StudentHeroTab';
import { StudentModalsHub } from './student/modals/StudentModalsHub';
import { useStudentProfile } from './student/hooks/useStudentProfile';
import { useStudentPracticeSession } from './student/hooks/useStudentPracticeSession';
import { useStudentStreaks } from './student/hooks/useStudentStreaks';
import { useStudentParentControls } from './student/hooks/useStudentParentControls';
import { useStudentSchedule } from './student/hooks/useStudentSchedule';
import { useStudentFeed } from './student/hooks/useStudentFeed';
import { useStudentSongsData } from './student/hooks/useStudentSongsData';
import { useStudentJuniorMission } from './student/hooks/useStudentJuniorMission';
import { buildStudentBriefingProps } from './student/tabs/buildStudentBriefingProps';
import { buildStudentSettingsProps } from './student/tabs/buildStudentSettingsProps';
import { 
  playOrbitLaunchSound, 
  playCelestialVictoryChime 
} from './student/utils/juniorRocketAudio';
import { 
  HomeworkBookErrorBoundary, 
  HomeworkBookLoadingFallback 
} from './student/meisterwerk/HomeworkBookErrorBoundary';

// 🚀 High-Performance Lazy Loaded Tabs
const StudentPracticeTab = lazy(() => import('./student/tabs/StudentPracticeTab').then(m => ({ default: m.StudentPracticeTab })));
const StudentSongsTab = lazy(() => import('./student/tabs/StudentSongsTab').then(m => ({ default: m.StudentSongsTab })));
const StudentProfileTab = lazy(() => import('./student/tabs/StudentProfileTab').then(m => ({ default: m.StudentProfileTab })));
const StudentSettingsTab = lazy(() => import('./student/tabs/StudentSettingsTab').then(m => ({ default: m.StudentSettingsTab })));
const StudentCampusCupTab = lazy(() => import('./student/tabs/StudentCampusCupTab').then(m => ({ default: m.StudentCampusCupTab })));
const CampusEventsBoard = lazy(() => import('./CampusEventsBoard').then(m => ({ default: m.CampusEventsBoard })));
const MeisterwerkDocumentationModal = lazy(() => import('./MeisterwerkDocumentationModal').then(m => ({ default: m.MeisterwerkDocumentationModal || (m as any).default })));


export interface StudentAvatarDashboardProps {
  studentId: string;
  initialUser?: any;
  parentActiveTab?: string;
  onTabChange?: (tab: string) => void;
  onProfileUpdate?: (updatedFields: any) => void;
}

export function StudentAvatarDashboard({
  studentId,
  initialUser,
  parentActiveTab,
  onTabChange,
  onProfileUpdate
}: StudentAvatarDashboardProps) {
  // 1. Profile & UI-Level Domain Hook
  const profile = useStudentProfile({
    studentId,
    initialUser,
    parentActiveTab,
    onTabChange,
    onProfileUpdate
  });

  // 2. Practice & Recording Domain Hook
  const practice = useStudentPracticeSession({
    studentId,
    studentUser: profile.studentUser,
    avatar: null,
    studentUiLevel: profile.studentUiLevel,
    isTeacherSession: profile.isTeacherSession,
    getTargetMinutes: (streak: number) => (streak >= 14 ? 20 : streak >= 7 ? 15 : streak >= 3 ? 10 : 5)
  });

  // 3. Streaks & Flame Engine Domain Hook
  const streaks = useStudentStreaks({
    studentId,
    studentUser: profile.studentUser,
    fokusLogs: practice.fokusLogs,
    sessionActive: practice.sessionActive,
    secondsElapsed: practice.secondsElapsed
  });

  // 4. Parent Controls Domain Hook
  const parent = useStudentParentControls({
    studentId,
    studentUser: profile.studentUser,
    isAdultStudent: profile.isAdultStudent,
    isIOS: false,
    isMobile: profile.isMobile,
    onProfileUpdate
  });

  // 5. Schedule & Cancellations Domain Hook
  const schedule = useStudentSchedule({
    studentId,
    studentUser: profile.studentUser,
    studentUiLevel: profile.studentUiLevel,
    inMemoryParentPinRef: parent.inMemoryParentPinRef
  });

  // 6. Feed & TTS Domain Hook
  const feed = useStudentFeed({
    studentId,
    studentUser: profile.studentUser
  });

  // 7. Mediathek, Songs & Lehrwerke Domain Hook
  const songsData = useStudentSongsData({
    studentId,
    studentUser: profile.studentUser
  });
  const {
    assignedCampusSongs,
    lehrwerke,
    progressItems,
    localProgress,
    activeSongSkills,
    setActiveSongSkills,
    isSongMastered,
    progressLoading
  } = songsData;
  const [selectedSongForDetail, setSelectedSongForDetail] = useState<any | null>(null);
  const [selectedLehrwerkForDetail, setSelectedLehrwerkForDetail] = useState<any | null>(null);
  const [selectedTopic, setSelectedTopic] = useState('');
  const [homeworkBookTab, setHomeworkBookTab] = useState<'document' | 'logbook' | 'stickeralbum' | 'skillradar' | 'audiobiography'>('document');
  const [homeworkBookViewMode, setHomeworkBookViewMode] = useState<'document' | 'recordings' | 'loopstation' | 'practice'>('document');
  const [homeworkRetryKey, setHomeworkRetryKey] = useState(0);

  useEffect(() => {
    const handleReset = () => {
      setHomeworkBookTab('document');
      setHomeworkBookViewMode('document');
    };
    window.addEventListener('campus_reset_homework_board', handleReset);
    return () => window.removeEventListener('campus_reset_homework_board', handleReset);
  }, []);
  const [songSearch, setSongSearch] = useState('');
  const [juniorMediathekFilter, setJuniorMediathekFilter] = useState<'all' | 'songs' | 'lehrwerke' | 'homework'>('all');

  // 🚀 Junior Space Mission & Sticker Engine Hook (Isomorphic Extraction)
  const {
    showJuniorStickerModal,
    setShowJuniorStickerModal,
    juniorStickerCategory,
    setJuniorStickerCategory,
    juniorSelectedPreviewSticker,
    setJuniorSelectedPreviewSticker,
    juniorAwardedStickerToCelebrate,
    setJuniorAwardedStickerToCelebrate,
    showJuniorPreFlightModal,
    setShowJuniorPreFlightModal,
    juniorSelectedTrackIndex,
    setJuniorSelectedTrackIndex,
    juniorMissionPhase,
    setJuniorMissionPhase,
    juniorLaunchStage,
    setJuniorLaunchStage,
    juniorMissionTier,
    setJuniorMissionTier,
    juniorCelebrationSummary,
    setJuniorCelebrationSummary,
    isJuniorTabPaused,
    setIsJuniorTabPaused,
    isJuniorMissionPaused,
    setIsJuniorMissionPaused,
    isJuniorMissionPausedRef,
    showJuniorCheatSheet,
    setShowJuniorCheatSheet,
    juniorMissionCountdown,
    setJuniorMissionCountdown,
    expandedMonths,
    setExpandedMonths,
    totalPracticeMinutes,
    unifiedStickersMap,
    getJuniorMissionDetails,
    startJuniorMissionImmediately,
    handleFinishJuniorMission,
    handleEmergencyExitJuniorMission,
    handleCloseJuniorCelebration
  } = useStudentJuniorMission({
    studentId,
    studentUser: profile.studentUser,
    studentUiLevel: profile.studentUiLevel,
    practice,
    streaks,
    localProgress,
    lehrwerke,
    progressItems,
    activeSongSkills,
    assignedCampusSongs
  });

  // Miscellaneous modal states
  const [showRulesModal, setShowRulesModal] = useState(false);
  const [contributionsModalData, setContributionsModalData] = useState<any | null>(null);
  const [showStudentToolbox, setShowStudentToolbox] = useState(false);
  const [showPushSoftPrompt, setShowPushSoftPrompt] = useState(false);
  const [isHelpCenterOpen, setIsHelpCenterOpen] = useState(false);
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);
  const [matchCelebrationData, setMatchCelebrationData] = useState<any | null>(null);

  // Level change handler with authoritative security check
  const handleLevelChange = async (newLevel: CampusUiLevel) => {
    if (!profile.isAdultStudent && !parent.checkIsParentSessionActiveLocal()) {
      parent.setShowParentGateModal(true);
      return;
    }

    profile.setStudentUiLevel(newLevel);
    profile.setShowLevelModal(false);

    try {
      await parent.applyAndSaveParentControls({ uiLevel: newLevel });
      await supabase.rpc('save_parent_controls', {
        p_student_id: studentId,
        p_settings: { campus_ui_level: newLevel }
      });
      profile.setUiLevelToast(`Alters-UI erfolgreich auf „${newLevel}“ eingestellt 🛡️`);
    } catch (e) {
      console.warn('save_parent_controls error:', e);
    }
  };

  const handleOpenHomeworkBookWithView = useCallback((
    targetTab: 'document' | 'logbook' | 'stickeralbum' | 'skillradar' | 'audiobiography' = 'document',
    targetViewMode: 'document' | 'recordings' | 'loopstation' | 'practice' = 'document'
  ) => {
    setHomeworkBookTab(targetTab);
    setHomeworkBookViewMode(targetViewMode);
    profile.setActiveTab('homework_book');
    if (onTabChange) onTabChange('homework_book');
  }, [onTabChange, profile]);

  const briefingTabProps = useMemo(() => buildStudentBriefingProps({
    studentId,
    profile,
    practice,
    streaks,
    parent,
    schedule,
    feed,
    assignedCampusSongs,
    activeSongSkills,
    lehrwerke,
    localProgress,
    progressItems,
    homeworkBookTab,
    homeworkBookViewMode,
    selectedLehrwerkForDetail,
    selectedSongForDetail,
    selectedTopic,
    setCertificateSong: profile.setCertificateSong,
    setContributionsModalData,
    setHomeworkBookTab,
    setHomeworkBookViewMode,
    setJuniorSelectedPreviewSticker,
    setSelectedLehrwerkForDetail,
    setSelectedSongForDetail,
    setSelectedTopic,
    setShowJuniorPreFlightModal,
    setShowJuniorStickerModal,
    setShowRulesModal,
    setShowStudentToolbox,
    setShowPushSoftPrompt,
    handleOpenHomeworkBookWithView,
    totalPracticeMinutes,
    unifiedStickersMap
  }), [
    studentId,
    profile,
    practice,
    streaks,
    parent,
    schedule,
    feed,
    assignedCampusSongs,
    activeSongSkills,
    lehrwerke,
    localProgress,
    progressItems,
    homeworkBookTab,
    homeworkBookViewMode,
    selectedLehrwerkForDetail,
    selectedSongForDetail,
    selectedTopic,
    handleOpenHomeworkBookWithView,
    totalPracticeMinutes,
    unifiedStickersMap
  ]);

  const settingsTabProps = useMemo(() => buildStudentSettingsProps({
    studentId,
    profile,
    practice,
    streaks,
    parent,
    schedule,
    feed,
    onProfileUpdate,
    setIsHelpCenterOpen,
    setShowPushSoftPrompt
  }), [
    studentId,
    profile,
    practice,
    streaks,
    parent,
    schedule,
    feed,
    onProfileUpdate
  ]);

  return (
    <div 
      className={`cg-full-height-board fluid-board-scroll-container ${profile.isMusicStandMode ? 'cg-music-stand-mode' : ''}`} 
      style={{ 
        fontFamily: '"Outfit", "Inter", sans-serif', 
        maxWidth: '100%', 
        margin: '0 auto', 
        width: '100%', 
        overflowX: 'clip',
        padding: profile.isMobile ? '0 0 var(--mobile-scroll-clearance-bottom, 140px) 0' : '0 0 40px 0', 
        boxSizing: 'border-box'
      }}
    >
      {/* 1. Übe-Board / Practice Tab */}
      {profile.visitedTabs.has('practice_board') && (
        <Suspense fallback={<div style={{ padding: '40px', textAlign: 'center', color: '#64748b', fontWeight: 600 }}>Lade Übepfad...</div>}>
          <StudentPracticeTab
            activeTab={profile.activeTab}
            studentUiLevel={profile.studentUiLevel}
            juniorMissionPhase={juniorMissionPhase}
            preStartCountdown={juniorMissionCountdown}
            studentId={studentId}
            studentUser={profile.studentUser}
            avatar={streaks.avatar}
            effectivePracticeMinutes={totalPracticeMinutes}
            secondsElapsedRef={{ current: practice.secondsElapsed }}
            isJuniorMissionPausedRef={isJuniorMissionPausedRef}
            startJuniorMissionImmediately={startJuniorMissionImmediately}
            handleFinishJuniorMission={handleFinishJuniorMission}
            handleEmergencyExitJuniorMission={handleEmergencyExitJuniorMission}
            handleCloseJuniorCelebration={handleCloseJuniorCelebration}
            handleStartPracticeSession={async () => { practice.setSessionActive(true); }}
            finishPracticeSession={practice.finishPracticeSession}
            logParentGuidedPractice={async () => {}}
            handleOpenHomeworkBookWithView={handleOpenHomeworkBookWithView}
            playMilestoneSound={playOrbitLaunchSound}
            playStarChimeSound={playCelestialVictoryChime}
            getDeterministicWeekMetrics={streaks.getDeterministicWeekMetrics}
            getGroupedLogs={() => []}
            getJuniorMissionDetails={getJuniorMissionDetails}
            getTargetMinutes={(s?: number) => streaks.getTargetMinutes(s ?? streaks.streakFlamesCount)}
            sessionActive={practice.sessionActive}
            isPhoneFlat={practice.isPhoneFlat}
            secondsElapsed={practice.secondsElapsed}
            isMobile={profile.isMobile}
            isMusicStandMode={profile.isMusicStandMode}
            flamesActive={streaks.flamesActive}
            xpActive={true}
            assignedCampusSongs={assignedCampusSongs}
            lehrwerke={lehrwerke}
            progressItems={progressItems}
            fokusLogs={practice.fokusLogs}
            activeSongSkills={activeSongSkills}
            showJuniorPracticeSettingsModal={false}
            setShowJuniorPracticeSettingsModal={() => {}}
            showJuniorStickerModal={showJuniorStickerModal}
            setShowJuniorStickerModal={setShowJuniorStickerModal}
            practiceAnchor={null}
            setPracticeAnchor={() => {}}
            juniorMissionTier={juniorMissionTier}
            juniorMissionCountdown={juniorMissionCountdown}
            isJuniorMissionPaused={isJuniorMissionPaused}
            setIsJuniorMissionPaused={setIsJuniorMissionPaused}
            showJuniorCheatSheet={showJuniorCheatSheet}
            setShowJuniorCheatSheet={setShowJuniorCheatSheet}
            juniorSelectedTrackIndex={juniorSelectedTrackIndex}
            isJuniorTabPaused={isJuniorTabPaused}
            juniorCelebrationSummary={juniorCelebrationSummary}
            juniorLaunchStage={juniorLaunchStage}
            expandedMonths={expandedMonths}
            setExpandedMonths={setExpandedMonths}
          />
        </Suspense>
      )}

      {/* 2. Songs Tab */}
      {(profile.visitedTabs.has('songs') || profile.visitedTabs.has('mediathek')) && (
        <Suspense fallback={<div style={{ padding: '40px', textAlign: 'center', color: '#64748b', fontWeight: 600 }}>Lade Songs &amp; Repertoire...</div>}>
          <StudentSongsTab
            activeTab={profile.activeTab}
            progressLoading={progressLoading}
            assignedCampusSongs={assignedCampusSongs}
            lehrwerke={lehrwerke}
            isMobile={profile.isMobile}
            studentUser={profile.studentUser}
            studentId={studentId}
            juniorMediathekFilter={juniorMediathekFilter}
            setJuniorMediathekFilter={setJuniorMediathekFilter}
            songSearch={songSearch}
            setSongSearch={setSongSearch}
            songSearchDebounced={songSearch}
            progressItems={progressItems}
            setSelectedTopic={setSelectedTopic}
            handleTabChangeLocal={profile.handleTabChangeLocal}
            setSelectedSongForDetail={setSelectedSongForDetail}
            setCertificateSong={profile.setCertificateSong}
            setSelectedLehrwerkForDetail={setSelectedLehrwerkForDetail}
            isSongMastered={isSongMastered}
            localProgress={localProgress}
            activeSongSkills={activeSongSkills}
            isMusicStandMode={profile.isMusicStandMode}
          />
        </Suspense>
      )}

      {/* 3. Campus Cup Tab */}
      {profile.activeTab === 'campus_cup' && (
        <Suspense fallback={<div style={{ padding: '40px', textAlign: 'center', color: '#64748b', fontWeight: 600 }}>Lade Campus Cup...</div>}>
          <StudentCampusCupTab
            activeTab={profile.activeTab}
            rankingLoading={false}
            studentUser={profile.studentUser}
            sessionActive={practice.sessionActive}
            secondsElapsed={practice.secondsElapsed}
            classMins={0}
            classWeeklyFocus={0}
            otherClassMins={0}
            classmateIds={[]}
            studentId={studentId}
            classFocusLogs={[]}
            classCount={1}
            classGoals={[]}
            classHighlights={[]}
            highlightsLoading={false}
            isMobile={profile.isMobile}
          />
        </Suspense>
      )}

      {/* 4. Events Board */}
      <div style={{ display: profile.activeTab === 'events' ? 'block' : 'none', width: '100%', boxSizing: 'border-box' }}>
        {profile.activeTab === 'events' && (
          <Suspense fallback={<div style={{ padding: '40px', textAlign: 'center', color: '#64748b', fontWeight: 600 }}>Lade Termine &amp; Kalender...</div>}>
            <CampusEventsBoard 
              userId={studentId}
              role="student"
              schoolId={profile.studentUser?.school_id || ''}
              supabase={supabase}
              brandColor={profile.studentUser?.schools?.brand_color || '#34a853'}
              studentUser={profile.studentUser}
              parentAllowChat={true}
              parentAllowAbsences={true}
            />
          </Suspense>
        )}
      </div>

      {/* 5. Hausaufgaben & Meisterwerk Modal Embed */}
      <div style={{ display: (profile.activeTab === 'homework_book' && profile.studentUser) ? 'block' : 'none', marginTop: '0px', width: '100%' }}>
        {profile.activeTab === 'homework_book' && profile.studentUser && (
          <HomeworkBookErrorBoundary key={homeworkRetryKey} onRetry={() => setHomeworkRetryKey(k => k + 1)}>
            <Suspense fallback={<HomeworkBookLoadingFallback onReload={() => setHomeworkRetryKey(k => k + 1)} />}>
              <MeisterwerkDocumentationModal
                key={`hw-modal-${studentId}-${homeworkRetryKey}`}
                student={profile.modalStudentUser!}
                schoolName={profile.resolvedSchoolName}
                onClose={() => profile.handleTabChangeLocal('briefing')}
                teacherId={profile.studentUser ? profile.studentUser.teacher_id : null}
                teacherName={formatTeacherFullName(profile.studentUser?.teacher_name || profile.studentUser?.teacher || schedule.briefingData?.todayLesson?.teacher_name)}
                schoolId={profile.studentUser?.school_id}
                readOnly={!profile.isTeacherSession}
                isTeacherTools={profile.isTeacherSession}
                isEmbed={true}
                initialModalTab={homeworkBookTab}
                initialViewMode={homeworkBookViewMode}
                uiLevel={profile.studentUiLevel || profile.studentUser?.campus_ui_level || undefined}
                initialXp={streaks.currentXp}
                initialStreak={streaks.streakFlamesCount}
                initialPracticeMinutes={Math.floor(practice.secondsElapsed / 60)}
                initialMasteredSongsCount={0}
                hasTresorStorage={true}
                isParentUnlocked={parent.isParentUnlocked || parent.checkIsParentUnlockedGlobal()}
                parentPermissions={(profile.studentUser as any)?.parent_permissions}
                onSaveParentOverrides={() => {}}
                isSoftLocked={false}
                onTriggerSoftLock={() => parent.setShowSoftLockModal(true)}
                initialLehrwerke={lehrwerke}
                initialSongs={assignedCampusSongs}
                initialProgressItems={progressItems}
                initialLocalProgress={localProgress}
                onSongsUpdated={(updatedSkills) => {
                  if (Array.isArray(updatedSkills) && updatedSkills.length > 0) {
                    setActiveSongSkills(updatedSkills);
                  }
                }}
              />
            </Suspense>
          </HomeworkBookErrorBoundary>
        )}
      </div>

      {/* 6. Briefing Tab */}
      <StudentBriefingTab {...briefingTabProps} />

      
      {/* 7. Hero Tab */}
      <StudentHeroTab
        activeTab={profile.activeTab}
        avatar={streaks.avatar}
        effectiveLevel={streaks.currentLevel}
        xpActive={true}
        levelTitle={streaks.levelTitle}
        hasMasteryCrown={streaks.hasMasteryCrown}
        currentLevel={streaks.currentLevel}
        currentXp={streaks.currentXp}
        nextThreshold={streaks.nextThreshold}
        xpPercentage={streaks.xpPercentage}
        showMissionsFeature={false}
        studentMissionProgress={null}
        progressItems={progressItems}
        studentUser={profile.studentUser}
        startTour={() => {}}
      />

      {/* 8. Profile Tab */}
      {profile.visitedTabs.has('profile') && (
        <Suspense fallback={<div style={{ padding: '40px', textAlign: 'center', color: '#64748b', fontWeight: 600 }}>Lade Profil...</div>}>
          <StudentProfileTab
            avatar={streaks.avatar}
            activeTab={profile.activeTab}
            studentUser={profile.studentUser}
            studentId={studentId}
            editingProfile={profile.editingProfile}
            setEditingProfile={profile.setEditingProfile}
            showEditProfile={profile.showEditProfile}
            setShowEditProfile={profile.setShowEditProfile}
            savingProfile={profile.savingProfile}
            handleSaveProfile={profile.handleSaveProfile}
            showAvatarSelector={profile.showAvatarSelector}
            setShowAvatarSelector={profile.setShowAvatarSelector}
            avatarCategoryFilter={profile.avatarCategoryFilter}
            setAvatarCategoryFilter={profile.setAvatarCategoryFilter}
            showSecondEmail={profile.showSecondEmail}
            setShowSecondEmail={profile.setShowSecondEmail}
            familyProfiles={parent.familyProfiles}
            handleSwitchFamilyStudent={parent.handleSwitchFamilyStudent}
            setIsAddSiblingModalOpen={parent.setIsAddSiblingModalOpen}
            showOwnQr={profile.showOwnQr}
            setShowOwnQr={profile.setShowOwnQr}
            studentSchedules={profile.studentSchedules}
            monthlyFocusMinutes={practice.monthlyFocusMinutes || 0}
            fokusLogs={practice.fokusLogs}
            sessionActive={practice.sessionActive}
            secondsElapsed={practice.secondsElapsed}
            isMusicStandMode={profile.isMusicStandMode}
            flamesActive={streaks.flamesActive}
            xpActive={true}
          />
        </Suspense>
      )}

      {/* 9. Settings Tab */}
      {profile.visitedTabs.has('settings') && (
        <Suspense fallback={<div style={{ padding: '40px', textAlign: 'center', color: '#64748b', fontWeight: 600 }}>Lade Einstellungen...</div>}>
          <StudentSettingsTab {...settingsTabProps} />
        </Suspense>
      )}

      {/* 10. Modals & Overlays Hub */}
      <StudentModalsHub
        showLevelModal={profile.showLevelModal}
        setShowLevelModal={profile.setShowLevelModal}
        studentUiLevel={profile.studentUiLevel}
        handleLevelChange={handleLevelChange}
        showGlobalParentPinModal={schedule.showGlobalParentPinModal}
        setShowGlobalParentPinModal={schedule.setShowGlobalParentPinModal}
        globalPinInput={schedule.globalPinInput}
        setGlobalPinInput={schedule.setGlobalPinInput}
        globalPinError={schedule.globalPinError}
        setGlobalPinError={schedule.setGlobalPinError}
        handleVerifyGlobalParentPin={schedule.handleVerifyGlobalParentPin}
        handleBiometricUnlockForGlobalPin={schedule.handleBiometricUnlockForGlobalPin}
        pendingSiblingUnlock={parent.pendingSiblingUnlock}
        setPendingSiblingUnlock={parent.setPendingSiblingUnlock}
        executeSwitchFamilyStudent={parent.executeSwitchFamilyStudent}
        showJuniorPreFlightModal={showJuniorPreFlightModal}
        setShowJuniorPreFlightModal={setShowJuniorPreFlightModal}
        juniorMissionDetails={getJuniorMissionDetails()}
        targetMins={streaks.getTargetMinutes(streaks.streakFlamesCount)}
        juniorSelectedTrackIndex={juniorSelectedTrackIndex}
        setJuniorSelectedTrackIndex={setJuniorSelectedTrackIndex}
        onStartJuniorMission={() => {
          profile.handleTabChangeLocal('practice_board');
          startJuniorMissionImmediately();
        }}
        showJuniorStickerModal={showJuniorStickerModal}
        setShowJuniorStickerModal={setShowJuniorStickerModal}
        unifiedStickersMap={unifiedStickersMap}
        juniorStickerCategory={juniorStickerCategory}
        setJuniorStickerCategory={setJuniorStickerCategory}
        juniorSelectedPreviewSticker={juniorSelectedPreviewSticker}
        setJuniorSelectedPreviewSticker={setJuniorSelectedPreviewSticker}
        onStartJuniorInstrument={() => {
          profile.handleTabChangeLocal('practice_board');
          startJuniorMissionImmediately();
        }}
        assignedCampusSongs={assignedCampusSongs}
        progressItems={progressItems}
        isSongMastered={isSongMastered}
        onStartRocket={() => {
          setJuniorSelectedPreviewSticker(null);
          setShowJuniorStickerModal(false);
          profile.handleTabChangeLocal('practice_board');
          startJuniorMissionImmediately();
        }}
        juniorAwardedStickerToCelebrate={juniorAwardedStickerToCelebrate}
        setJuniorAwardedStickerToCelebrate={setJuniorAwardedStickerToCelebrate}
        showCelebration={profile.studentUiLevel !== 'junior' && practice.showCelebration}
        setShowCelebration={practice.setShowCelebration}
        celebrationDetails={practice.celebrationDetails}
        celebrationRingProgress={practice.celebrationRingProgress}
        matchCelebrationData={matchCelebrationData}
        setMatchCelebrationData={setMatchCelebrationData}
        showAppointmentChat={schedule.showAppointmentChat}
        setShowAppointmentChat={schedule.setShowAppointmentChat}
        appointmentChatData={schedule.appointmentChatData}
        setAppointmentChatData={schedule.setAppointmentChatData}
        rescheduleChatDraft={schedule.rescheduleChatDraft}
        studentId={studentId}
        studentUser={profile.studentUser}
        isParentUnlocked={parent.isParentUnlocked}
        onRefreshData={schedule.fetchSchedule}
        isRescheduleSheetOpen={schedule.isRescheduleSheetOpen}
        closeRescheduleBottomSheet={() => schedule.setIsRescheduleSheetOpen(false)}
        activeRescheduleBottomSheetOcc={schedule.activeRescheduleBottomSheetOcc}
        isRescheduleLoading={schedule.isRescheduleLoading}
        isStudentRescheduleAllowed={true}
        handleConfirmReschedule={schedule.handleConfirmReschedule}
        handleVerifyGlobalParentPinAsync={schedule.handleVerifyGlobalParentPinAsync}
        showDetox={false}
        setShowDetox={() => {}}
        detoxCompleted={false}
        setDetoxCompleted={() => {}}
        detoxMinutes={15}
        detoxSecondsLeft={0}
        isFaceDown={false}
        setIsDetoxActive={() => {}}
        xpActive={true}
        contributionsModalData={contributionsModalData}
        setContributionsModalData={setContributionsModalData}
        loadingContributions={false}
        showRulesModal={showRulesModal}
        setShowRulesModal={setShowRulesModal}
        avatar={streaks.avatar}
        unreadCrisisNotifs={schedule.unreadCrisisNotifs}
        setUnreadCrisisNotifs={schedule.setUnreadCrisisNotifs}
        showPushSoftPrompt={showPushSoftPrompt}
        setShowPushSoftPrompt={setShowPushSoftPrompt}
        pushNotifScheduleChanges={true}
        pushNotifHomework={true}
        pushNotifAllFeatures={true}
        setPushEnabled={() => {}}
        showStudentToolbox={showStudentToolbox}
        setShowStudentToolbox={setShowStudentToolbox}
        showParentActivationModal={parent.showParentActivationModal}
        setShowParentActivationModal={parent.setShowParentActivationModal}
        showSoftLockModal={parent.showSoftLockModal}
        setShowSoftLockModal={parent.setShowSoftLockModal}
        isHelpCenterOpen={isHelpCenterOpen}
        setIsHelpCenterOpen={setIsHelpCenterOpen}
        currentPlatform={profile.currentPlatform}
        resolvedSchoolName={profile.resolvedSchoolName}
        activeTab={profile.activeTab}
        setActiveTab={profile.setActiveTab}
        isFeedbackModalOpen={isFeedbackModalOpen}
        setIsFeedbackModalOpen={setIsFeedbackModalOpen}
        certificateSong={profile.certificateSong}
        setCertificateSong={profile.setCertificateSong}
        briefingData={schedule.briefingData}
        selectedSongForDetail={selectedSongForDetail}
        setSelectedSongForDetail={setSelectedSongForDetail}
        selectedLehrwerkForDetail={selectedLehrwerkForDetail}
        setSelectedLehrwerkForDetail={setSelectedLehrwerkForDetail}
        lehrwerke={lehrwerke}
        localProgress={localProgress}
        isMobile={profile.isMobile}
        handleTabChangeLocal={profile.handleTabChangeLocal}
        setSelectedTopic={setSelectedTopic}
      />

      {/* 11. Toast Notifications */}
      {profile.welcomeToast && (
        <div
          role="status"
          aria-live="polite"
          style={{
            position: 'fixed',
            top: '24px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 99999,
            background: '#0f172a',
            color: '#ffffff',
            padding: '12px 24px',
            borderRadius: '100px',
            fontSize: '0.95rem',
            fontWeight: 800,
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            boxShadow: '0 12px 32px rgba(0,0,0,0.3)',
            fontFamily: "'Plus Jakarta Sans', sans-serif"
          }}
        >
          <Sparkles size={18} className="text-amber-400" />
          <span>{profile.welcomeToast}</span>
        </div>
      )}

      {profile.uiLevelToast && (
        <div
          role="status"
          aria-live="polite"
          style={{
            position: 'fixed',
            top: '24px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 99999,
            background: '#0f172a',
            color: '#ffffff',
            padding: '12px 24px',
            borderRadius: '100px',
            fontSize: '0.95rem',
            fontWeight: 800,
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            boxShadow: '0 12px 32px rgba(0,0,0,0.3)',
            fontFamily: "'Plus Jakarta Sans', sans-serif"
          }}
        >
          <Shield size={18} className="text-emerald-400" />
          <span>{profile.uiLevelToast}</span>
        </div>
      )}
    </div>
  );
}
