import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Calendar, 
  Landmark, 
  Sparkles, 
  Star, 
  Info 
} from 'lucide-react';
import { usePremiumOnboardingTour } from './PremiumOnboardingTour';

// Domain Hooks
import { useCampusParentPinGate } from './campus/events/hooks/useCampusParentPinGate';
import { useCampusTimelineEvents } from './campus/events/hooks/useCampusTimelineEvents';
import { useCampusLessons } from './campus/events/hooks/useCampusLessons';
import { useCampusEventPlanning } from './campus/events/hooks/useCampusEventPlanning';
import { useCampusConcertCoordinator } from './campus/events/hooks/useCampusConcertCoordinator';

// Domain Views
import { CampusLessonsColumn } from './campus/events/views/CampusLessonsColumn';
import { CampusTimelineColumn } from './campus/events/views/CampusTimelineColumn';
import { CampusEventPlanningColumn } from './campus/events/views/CampusEventPlanningColumn';
import { CampusAnnouncementsColumn } from './campus/events/views/CampusAnnouncementsColumn';
import { CampusComingSoonColumn } from './campus/events/views/CampusComingSoonColumn';
import { CampusConcertCoordinatorPanel } from './campus/events/views/CampusConcertCoordinatorPanel';
import { CampusTeacherSubmissionOverlay } from './campus/events/views/CampusTeacherSubmissionOverlay';

// Modals Hub
import { CampusEventsModalsHub } from './campus/events/modals/CampusEventsModalsHub';
import { CampusEvent, LessonOccurrence } from './campus/events/types/campusEvents.types';

export interface CampusEventsBoardProps {
  userId: string;
  role: 'student' | 'teacher' | 'admin' | 'secretary';
  schoolId: string;
  supabase?: any;
  brandColor?: string;
  studentUser?: any;
  parentAllowChat?: boolean;
  parentAllowAbsences?: boolean;
  initialEventId?: string;
  openIcalDirectly?: boolean;
  onCloseIcalDirectly?: () => void;
  teacherBookingEventId?: string | null;
  onTeacherBookingHandled?: () => void;
  coordinatorEventId?: string | null;
  onCoordinatorHandled?: () => void;
}

export function CampusEventsBoard({
  userId,
  role,
  schoolId,
  supabase,
  brandColor: passedBrandColor,
  studentUser,
  parentAllowChat = true,
  parentAllowAbsences = true,
  initialEventId,
  openIcalDirectly = false,
  onCloseIcalDirectly,
  teacherBookingEventId,
  onTeacherBookingHandled,
  coordinatorEventId,
  onCoordinatorHandled
}: CampusEventsBoardProps) {
  // ── Brand Color & Platform Theme Resolution ──
  const activePlatformStored = typeof window !== 'undefined' 
    ? (sessionStorage.getItem('groovelab_active_platform') || localStorage.getItem('groovelab_active_platform') || 'campus') 
    : 'campus';
  const isGroovelab = passedBrandColor === '#eab308' || activePlatformStored === 'groovelab';
  const isAdminPlatform = passedBrandColor === '#ea4335' || activePlatformStored === 'admin';
  const isCampus = !isGroovelab && !isAdminPlatform;

  let brandColor = '#34a853'; // Campus Green default
  if (passedBrandColor) {
    brandColor = passedBrandColor;
  } else if (isAdminPlatform) {
    brandColor = '#ea4335';
  } else if (isGroovelab) {
    brandColor = '#eab308';
  }

  // ── Responsive Viewport State ──
  const [windowWidth, setWindowWidth] = useState<number>(typeof window !== 'undefined' ? window.innerWidth : 1200);
  const [orientationTick, setOrientationTick] = useState(0);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [eventsCardIndex, setEventsCardIndex] = useState<number>(0);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    const handleOrientationChange = () => setOrientationTick(prev => prev + 1);

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleOrientationChange);
    window.addEventListener('groovelab_orientation_changed', handleOrientationChange);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleOrientationChange);
      window.removeEventListener('groovelab_orientation_changed', handleOrientationChange);
    };
  }, []);

  const isMobilePortrait = useMemo(() => {
    if (typeof document !== 'undefined') {
      const isSimMobileOrPortrait = Boolean(document.querySelector('.sim-viewport-mobile, .sim-viewport-portrait'));
      const isSimLandscape = Boolean(document.querySelector('.sim-viewport-landscape'));
      if (isSimMobileOrPortrait) return true;
      if (isSimLandscape) return false;
    }
    return windowWidth <= 900;
  }, [windowWidth, orientationTick]);

  // ── 1. Parent Master PIN & Biometrics Gate Domain ──
  const pinGate = useCampusParentPinGate({
    userId,
    role,
    schoolId,
    supabase,
    studentUser,
    parentAllowChat,
    parentAllowAbsences
  });

  // ── 2. School Timeline & Subscribed Calendar Domain ──
  const timeline = useCampusTimelineEvents({
    schoolId,
    userId,
    role,
    supabase
  });

  // ── 3. Personal Music Lessons & Schedule Domain ──
  const lessonsDomain = useCampusLessons({
    userId,
    role,
    schoolId,
    supabase,
    brandColor,
    studentUser,
    openParentPinGate: pinGate.openParentPinGate,
    checkIsParentUnlocked: pinGate.checkIsParentUnlocked,
    openIcalDirectly,
    onCloseIcalDirectly
  });

  // ── 4. Event Planning Domain (Teacher/Secretary/Admin) ──
  const eventPlanning = useCampusEventPlanning({
    schoolId,
    userId,
    role,
    supabase,
    onRefreshEvents: () => {
      timeline.fetchCustomEvents();
    }
  });

  // ── Active Coordinator / Submission Overlays ──
  const [teacherSubmissionEvent, setTeacherSubmissionEvent] = useState<CampusEvent | null>(null);
  const [secretaryPlanningEvent, setSecretaryPlanningEvent] = useState<CampusEvent | null>(null);

  // ── 5. Concert Coordinator & Multi-Stage Domain ──
  const concertCoordinator = useCampusConcertCoordinator({
    activeEvent: secretaryPlanningEvent,
    schoolId,
    userId,
    supabase
  });

  const handleActivatePlanning = useCallback(async (ev: CampusEvent) => {
    try {
      const { error } = await supabase
        .from('campus_events')
        .update({ is_planning_active: true })
        .eq('id', ev.id);
      if (error) throw error;
      timeline.fetchCustomEvents();
    } catch (e) {
      console.error('Failed to activate planning:', e);
    }
  }, [supabase, timeline]);

  // Auto-route to requested event if props provided
  useEffect(() => {
    if (coordinatorEventId && timeline.customEvents.length > 0) {
      const target = timeline.customEvents.find(e => e.id === coordinatorEventId);
      if (target) {
        setSecretaryPlanningEvent(target);
        onCoordinatorHandled?.();
      }
    }
  }, [coordinatorEventId, timeline.customEvents, onCoordinatorHandled]);

  useEffect(() => {
    if (teacherBookingEventId && timeline.customEvents.length > 0) {
      const target = timeline.customEvents.find(e => e.id === teacherBookingEventId);
      if (target) {
        setTeacherSubmissionEvent(target);
        onTeacherBookingHandled?.();
      }
    }
  }, [teacherBookingEventId, timeline.customEvents, onTeacherBookingHandled]);

  useEffect(() => {
    if (initialEventId && timeline.customEvents.length > 0) {
      const target = timeline.customEvents.find(e => e.id === initialEventId);
      if (target) {
        timeline.setSelectedEvent(target);
      }
    }
  }, [initialEventId, timeline.customEvents]);

  // If planning event is active, load its program points
  useEffect(() => {
    if (secretaryPlanningEvent) {
      concertCoordinator.fetchProgramPoints(secretaryPlanningEvent.id);
    }
  }, [secretaryPlanningEvent]);

  // ── Onboarding Tour Setup ──
  const studentTourSteps = useMemo(() => [
    {
      title: "Willkommen im Campus-Groovelab Termin-Board! 🎉",
      description: "Hier hast du deine Musikstunden, Proben und Schulveranstaltungen immer im Blick.",
      selector: undefined
    },
    {
      title: "Deine Unterrichtstermine 🎶",
      description: "Hier siehst du deinen Stundenplan. Du kannst Termine bei Verhinderung rechtzeitig absagen oder mit deiner Lehrkraft chatten.",
      selector: "tour-lessons-column"
    },
    {
      title: "Schultermine & Konzerte 🏛️",
      description: "In dieser Übersicht findest du alle Konzerte, Schulfeste und Ferientermine der Musikschule.",
      selector: "tour-timeline-column"
    },
    {
      title: "Deine Event-Mitwirkungen 🌟",
      description: "Hier werden deine Konzertauftritte, Soundchecks und Ablaufzeiten aufgelistet.",
      selector: "tour-student-events"
    }
  ], []);

  const teacherTourSteps = useMemo(() => [
    {
      title: "Willkommen im Lehrkraft-Terminboard! 🎵",
      description: "Verwalte deine Unterrichtstage, Schultermine und Event-Beiträge an einem Ort.",
      selector: undefined
    },
    {
      title: "Dein Unterrichtskalender 📅",
      description: "Überblick über deine Unterrichte, Stornierungen und Ausfälle. Du kannst Termine synchronisieren und mit Schülern kommunizieren.",
      selector: "tour-lessons-column"
    },
    {
      title: "Schultermine 🏛️",
      description: "Alle zentralen Veranstaltungen, Konzerte und Ferien der Musikschule auf einen Blick.",
      selector: "tour-timeline-column"
    },
    {
      title: "Event-Planung & Mitwirkungen ⭐",
      description: "Reiche deine Schüler und Ensembles für Schülervorspiele und Konzerte ein und plane deinen Bühnenbeitrag.",
      selector: "tour-planning-column"
    }
  ], []);

  const coordinatorTourSteps = useMemo(() => [
    {
      title: "Willkommen im Koordinator-Panel! 👑",
      description: "Als Administrator oder Sekretär koordinierst du hier den gesamten Veranstaltungs- und Terminbetrieb der Musikschule.",
      selector: undefined
    },
    {
      title: "Schultermine & Events 🏛️",
      description: "Die Timeline zeigt dir alle Events an. Wähle eine Veranstaltung aus, um das Planungsmodul und den Ablaufplan zu öffnen.",
      selector: "tour-timeline-column"
    },
    {
      title: "Der Ablaufplaner ⚙️",
      description: "Koordiniere Programmpunkte per Drag & Drop, belege Bühnen und verwalte die Technik-Rider in Echtzeit.",
      selector: "tour-planning-column"
    },
    {
      title: "Infos & News 📢",
      description: "Verfasse hier offizielle Ankündigungen und News, die direkt im Dashboard angezeigt werden.",
      selector: "tour-announcements-column"
    }
  ], []);

  const activeTourSteps = useMemo(() => {
    if (role === 'student') return studentTourSteps;
    if (role === 'admin' || role === 'secretary') return coordinatorTourSteps;
    return teacherTourSteps;
  }, [role, studentTourSteps, coordinatorTourSteps, teacherTourSteps]);

  const { TourComponent } = usePremiumOnboardingTour({
    tourKey: `campus_groovelab_events_tour_completed_${role}_${userId}`,
    steps: activeTourSteps,
    platformTheme: isCampus ? 'campus' : (isGroovelab ? 'groovelab' : (isAdminPlatform ? 'admin' : 'campus'))
  });

  const showLessons = role !== 'secretary';

  // ── Column Renderers ──
  const renderLessons = () => (
    <CampusLessonsColumn
      lessons={lessonsDomain.lessons}
      loadingLessons={lessonsDomain.loadingLessons}
      lessonTab={lessonsDomain.lessonTab}
      setLessonTab={lessonsDomain.setLessonTab}
      brandColor={brandColor}
      role={role}
      userId={userId}
      studentUser={studentUser}
      isMobilePortrait={isMobilePortrait}
      icalActive={timeline.icalActive}
      calendarToken={lessonsDomain.calendarToken}
      generatingToken={lessonsDomain.generatingToken}
      fetchOrCreateCalendarToken={lessonsDomain.fetchOrCreateCalendarToken}
      setShowIcalModal={lessonsDomain.setShowIcalModal}
      activeChatOccIds={lessonsDomain.activeChatOccIds}
      onOpenChat={occ => lessonsDomain.setActiveChatOcc(occ)}
      onCancelOcc={occ => lessonsDomain.handleCancelOccWithDoubleConfirm(occ)}
      isAbsenceAllowed={parentAllowAbsences}
      isChatAllowed={parentAllowChat}
      onRequestPinGate={pinGate.openParentPinGate}
      checkIsParentUnlocked={pinGate.checkIsParentUnlocked}
    />
  );

  const renderTimeline = () => (
    <CampusTimelineColumn
      customEvents={timeline.customEvents}
      subscribedEvents={timeline.subscribedEvents}
      loadingEvents={timeline.loadingEvents}
      brandColor={brandColor}
      role={role}
      userId={userId}
      isMobilePortrait={isMobilePortrait}
      onSelectEvent={ev => {
        if (role === 'student') {
          timeline.setSelectedStudentEvent(ev);
        } else {
          timeline.setSelectedEvent(ev);
        }
      }}
      onDeleteEvent={timeline.handleDeleteEvent}
      onActivatePlanning={handleActivatePlanning}
    />
  );

  const renderEventPlanning = () => (
    <CampusEventPlanningColumn
      customEvents={timeline.customEvents}
      brandColor={brandColor}
      role={role}
      userId={userId}
      isMobilePortrait={isMobilePortrait}
      onOpenSubmission={ev => setTeacherSubmissionEvent(ev)}
      onOpenCoordinator={ev => setSecretaryPlanningEvent(ev)}
    />
  );

  const renderAnnouncements = () => (
    <CampusAnnouncementsColumn
      schoolAnnouncements={timeline.schoolAnnouncements}
      programPoints={concertCoordinator.programPoints}
      customEvents={timeline.customEvents}
      role={role}
      schoolId={schoolId}
      userId={userId}
      brandColor={brandColor}
      fetchAnnouncements={timeline.fetchAnnouncements}
      onOpenTeacherFeedback={ev => setTeacherSubmissionEvent(ev)}
    />
  );

  const renderComingSoon = (isStudent: boolean) => (
    <CampusComingSoonColumn
      isForStudent={isStudent}
      brandColor={brandColor}
    />
  );

  // ── Mobile Tabs Definition ──
  const mobileTabs = useMemo(() => {
    if (role === 'teacher') {
      return [
        { id: 0, label: 'Termine', icon: Calendar, render: renderLessons },
        { id: 1, label: 'Schultermine', icon: Landmark, render: renderTimeline },
        { id: 2, label: 'Mitwirkung', icon: Sparkles, render: renderEventPlanning }
      ];
    }
    if (role === 'student') {
      return [
        { id: 0, label: 'Termine', icon: Calendar, render: renderLessons },
        { id: 1, label: 'Schultermine', icon: Landmark, render: renderTimeline },
        { id: 2, label: 'Events', icon: Sparkles, render: () => renderComingSoon(true) }
      ];
    }
    // Admin / Secretary
    return [
      { id: 0, label: 'Schultermine', icon: Landmark, render: renderTimeline },
      { id: 1, label: 'Planung', icon: Star, render: renderEventPlanning },
      { id: 2, label: 'Infos & News', icon: Info, render: renderAnnouncements }
    ];
  }, [role, lessonsDomain, timeline, concertCoordinator, isMobilePortrait]);

  return (
    <div 
      className="campus-events-board animation-fade-in"
      style={{
        width: '100%',
        boxSizing: 'border-box',
        padding: 0,
        fontFamily: 'Urbanist, sans-serif'
      }}
    >
      {/* ── Responsive Column Grid ── */}
      {!isMobilePortrait ? (
        <div 
          className="campus-events-desktop-grid"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
            gap: '20px',
            width: '100%',
            alignItems: 'start'
          }}
        >
          {/* COLUMN 1 */}
          {showLessons ? renderLessons() : renderTimeline()}

          {/* COLUMN 2 */}
          {showLessons ? renderTimeline() : renderEventPlanning()}

          {/* COLUMN 3 */}
          {role === 'student' 
            ? renderComingSoon(true) 
            : role === 'teacher'
              ? renderEventPlanning()
              : role === 'secretary'
                ? renderAnnouncements()
                : renderEventPlanning()}
        </div>
      ) : (
        /* Mobile Portrait View with Segmented Switcher & Swipe */
        <div
          className="campus-events-mobile-container no-scrollbar"
          onTouchStart={e => setTouchStartX(e.touches[0].clientX)}
          onTouchEnd={e => {
            if (touchStartX === null) return;
            const deltaX = e.changedTouches[0].clientX - touchStartX;
            if (deltaX < -50 && eventsCardIndex < mobileTabs.length - 1) {
              setEventsCardIndex(prev => prev + 1);
            } else if (deltaX > 50 && eventsCardIndex > 0) {
              setEventsCardIndex(prev => prev - 1);
            }
            setTouchStartX(null);
          }}
          style={{
            width: '100%',
            maxWidth: '740px',
            margin: '0 auto',
            padding: '0 4px',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
            boxSizing: 'border-box'
          }}
        >
          {/* Segmented Top Pill Switcher */}
          <div 
            role="tablist"
            aria-label="Kalender-Ansichten"
            style={{
              display: 'grid',
              gridTemplateColumns: `repeat(${mobileTabs.length}, 1fr)`,
              gap: '4px',
              background: '#f1f5f9',
              padding: '4px',
              borderRadius: '16px',
              width: '100%',
              maxWidth: '680px',
              margin: '0 auto',
              boxSizing: 'border-box'
            }}
          >
            {mobileTabs.map((tab, idx) => {
              const TabIcon = tab.icon;
              const isActive = eventsCardIndex === idx;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => setEventsCardIndex(idx)}
                  style={{
                    padding: '9px 4px',
                    borderRadius: '12px',
                    border: 'none',
                    background: isActive ? brandColor : 'transparent',
                    color: isActive ? '#ffffff' : '#64748b',
                    fontWeight: isActive ? 800 : 700,
                    fontSize: '0.78rem',
                    whiteSpace: 'nowrap',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '5px',
                    transition: 'all 0.2s',
                    boxShadow: isActive ? `0 2px 8px ${brandColor}40` : 'none',
                    flexShrink: 0
                  }}
                >
                  <TabIcon size={14} /> {tab.label}
                </button>
              );
            })}
          </div>

          {/* Active Card Body */}
          <div 
            role="tabpanel"
            style={{ animation: 'fadeIn 0.2s ease-out' }}
          >
            {mobileTabs[eventsCardIndex]?.render()}
          </div>

          {/* Page Indicator Dots */}
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px', padding: '8px 0' }}>
            {mobileTabs.map((_, idx) => (
              <div
                key={idx}
                role="button"
                tabIndex={0}
                aria-label={`Gehe zu Tab ${idx + 1}`}
                onClick={() => setEventsCardIndex(idx)}
                onKeyDown={e => {
                  if (e.key === 'Enter' || e.key === ' ') setEventsCardIndex(idx);
                }}
                style={{
                  width: eventsCardIndex === idx ? '18px' : '6px',
                  height: '6px',
                  borderRadius: '4px',
                  background: eventsCardIndex === idx ? brandColor : '#cbd5e1',
                  cursor: 'pointer',
                  transition: 'all 0.25s'
                }}
              />
            ))}
          </div>
        </div>
      )}

      {/* ── Fullscreen Teacher Submission Overlay ── */}
      {teacherSubmissionEvent && (
        <CampusTeacherSubmissionOverlay
          event={teacherSubmissionEvent}
          onClose={() => setTeacherSubmissionEvent(null)}
          brandColor={brandColor}
          userId={userId}
          schoolId={schoolId}
          supabase={supabase}
          onSubmitted={() => {
            timeline.fetchCustomEvents();
            if (secretaryPlanningEvent) {
              concertCoordinator.fetchProgramPoints(secretaryPlanningEvent.id);
            }
          }}
        />
      )}

      {/* ── Fullscreen Concert & Stage Coordinator Overlay (Secretary/Admin) ── */}
      {secretaryPlanningEvent && (
        <CampusConcertCoordinatorPanel
          activeEvent={secretaryPlanningEvent}
          onClose={() => setSecretaryPlanningEvent(null)}
          brandColor={brandColor}
          programPoints={concertCoordinator.programPoints}
          loadingProgramPoints={concertCoordinator.loadingProgramPoints}
          activeStage={concertCoordinator.activeStage}
          setActiveStage={concertCoordinator.setActiveStage}
          stageCount={concertCoordinator.stageCount}
          techViewMode={concertCoordinator.techViewMode}
          setTechViewMode={concertCoordinator.setTechViewMode}
          coordinatorTab={concertCoordinator.coordinatorTab}
          setCoordinatorTab={concertCoordinator.setCoordinatorTab}
          techConsoleNightMode={concertCoordinator.techConsoleNightMode}
          setTechConsoleNightMode={concertCoordinator.setTechConsoleNightMode}
          handleExportPDF={concertCoordinator.handleExportPDF}
          handleExportTechRiderPDF={concertCoordinator.handleExportTechRiderPDF}
          handleExportCSV={concertCoordinator.handleExportCSV}
          handleUpdateProgramPointStatus={concertCoordinator.handleUpdateProgramPointStatus}
          handleDeleteProgramPoint={concertCoordinator.handleDeleteProgramPoint}
          handleMoveProgramPoint={concertCoordinator.handleMoveProgramPoint}
          onOpenTeacherSubmission={ev => setTeacherSubmissionEvent(ev)}
          asOverlay={true}
        />
      )}

      {/* ── Enterprise Modals Hub (All Dialogs & PIN Gates) ── */}
      <CampusEventsModalsHub
        userId={userId}
        role={role}
        schoolId={schoolId}
        brandColor={brandColor}
        isMobilePortrait={isMobilePortrait}
        studentUser={studentUser}
        lessons={lessonsDomain.lessons}
        fetchLessons={lessonsDomain.fetchLessons}

        selectedEvent={timeline.selectedEvent}
        onCloseSelectedEvent={() => timeline.setSelectedEvent(null)}
        subscribedEvents={timeline.subscribedEvents}
        onActivatePlanning={handleActivatePlanning}
        onOpenPlanningModule={ev => {
          setSecretaryPlanningEvent(ev);
        }}
        onDeleteEvent={timeline.handleDeleteEvent}
        onSaveVisibilitySuccess={timeline.fetchCustomEvents}

        selectedStudentEvent={timeline.selectedStudentEvent}
        onCloseSelectedStudentEvent={() => timeline.setSelectedStudentEvent(null)}
        studentProgramPoints={timeline.studentProgramPoints}
        selectedEventAllPoints={timeline.selectedEventAllPoints}
        loadingSelectedStudentEventPoints={timeline.loadingSelectedStudentEventPoints}

        showIcalModal={lessonsDomain.showIcalModal}
        onCloseIcalModal={() => lessonsDomain.setShowIcalModal(false)}
        calendarToken={lessonsDomain.calendarToken}
        generatingToken={lessonsDomain.generatingToken}
        onRotateToken={() => lessonsDomain.fetchOrCreateCalendarToken(true)}

        activeChatOcc={lessonsDomain.activeChatOcc}
        onCloseChatOcc={() => lessonsDomain.setActiveChatOcc(null)}
        onChatOccStatusChange={(newStatus, updatedOcc) => {
          if (lessonsDomain.activeChatOcc) {
            lessonsDomain.setActiveChatOcc(prev => prev ? ({ ...prev, status: newStatus as any, ...updatedOcc }) : null);
          }
          lessonsDomain.fetchLessons();
        }}

        showPinGateModal={pinGate.showPinGateModal}
        onClosePinGateModal={() => {
          pinGate.setShowPinGateModal(false);
          pinGate.setPinGatePendingAction(null);
        }}
        pinGateInput={pinGate.pinGateInput}
        setPinGateInput={pinGate.setPinGateInput}
        pinGateError={pinGate.pinGateError}
        setPinGateError={pinGate.setPinGateError}
        isVerifyingPin={pinGate.isVerifyingPin}
        handleVerifyParentPin={pinGate.handleVerifyParentPin}
        handleBiometricUnlock={pinGate.handleBiometricUnlock}
        isWebAuthnSupported={pinGate.isWebAuthnSupported}
        isParentUnlocked={pinGate.isParentUnlocked}
        onOpenPinGate={pinGate.openParentPinGate}

        collisionConflictData={lessonsDomain.collisionConflictData}
        onCloseCollisionModal={() => lessonsDomain.setCollisionConflictData(null)}
        onOpenShoutboxFromConflict={occ => lessonsDomain.setActiveChatOcc(occ)}
      />

      {/* ── Interactive Tour Component ── */}
      <TourComponent />
    </div>
  );
}