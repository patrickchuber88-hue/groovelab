import React, { useState, useEffect, useRef, lazy, Suspense } from 'react';
import { supabase } from '../lib/supabase';
import { useRealNamesVisibility, formatTeacherFullName } from '../utils/nameHelper';
import { resolveCampusStudentAvatar } from './StudioAvatar';
import { deleteStudentFully } from '../utils/studentDeletionService';

// Domain Hooks
import { useAdminDashboardData } from '../hooks/admin/useAdminDashboardData';
import { useAdminStudents } from '../hooks/admin/useAdminStudents';
import { useAdminTeachers } from '../hooks/admin/useAdminTeachers';
import { useAdminBands } from '../hooks/admin/useAdminBands';
import { useAdminSongs } from '../hooks/admin/useAdminSongs';
import { useAdminCampusRooms } from '../hooks/admin/useAdminCampusRooms';

// Tab Components
import { AdminStudentsView } from './admin/AdminStudentsView';
import { AdminTeachersView } from './admin/AdminTeachersView';
import { AdminBandsView } from './admin/AdminBandsView';
import { AdminCampusRoomsView } from './admin/AdminCampusRoomsView';
import { AdminGroovelabRoomsView } from './admin/AdminGroovelabRoomsView';
import { AdminSongsView } from './admin/AdminSongsView';
import { GrooveLabSongsView } from './admin/GrooveLabSongsView';
import { AdminStatsView } from './admin/AdminStatsView';
import { AdminMissionsView } from './admin/AdminMissionsView';
import { AdminIDGalleryView as IDGallery } from './admin/AdminIDGalleryView';
import { AdminDeviceSetupView as DeviceSetupScreen } from './admin/AdminDeviceSetupView';

// Modals Hub
import { AdminModalsMasterHub } from './admin/modals/AdminModalsMasterHub';
const ConfirmDeleteStudentModal = lazy(() => import('./ConfirmDeleteStudentModal').then(m => ({ default: m.ConfirmDeleteStudentModal })));
const AdminQRModal = lazy(() => import('./admin/modals/AdminQRModal'));
const TeacherDashboard = lazy(() => import('./TeacherDashboard').then(m => ({ default: m.TeacherDashboard })));
const CampusSetupScreen = lazy(() => import('./CampusSetupScreen').then(m => ({ default: m.CampusSetupScreen })));

export interface AdminDashboardProps {
  userId: string;
  onLogout: () => void;
  forceTab?: string;
  onTabChange?: (tab: string) => void;
  onOpenBandProfile?: (band: any) => void;
  activePlatform?: 'campus' | 'groovelab';
  session?: any;
  onSessionChange?: (session: any) => void;
  locationMode?: 'lab' | 'home';
  onLocationModeChange?: (mode: 'lab' | 'home') => void;
  hideHeader?: boolean;
  onSwitchPlatform?: (platform: 'campus' | 'groovelab') => void;
}

export function AdminDashboard({ 
  userId, 
  onLogout, 
  forceTab, 
  onTabChange, 
  onOpenBandProfile, 
  activePlatform = 'groovelab',
  session,
  onSessionChange,
  locationMode,
  onLocationModeChange,
  hideHeader = false,
  onSwitchPlatform
}: AdminDashboardProps) {
  const brandColor = activePlatform === 'campus' ? '#34a853' : '#facc15';
  const { visible: showRealNames, toggleVisibility: toggleRealNames } = useRealNamesVisibility();

  // 1. Root Data Hook
  const {
    activeTab,
    setActiveTab,
    admin,
    setAdmin,
    schoolObj,
    students,
    setStudents,
    teachers,
    setTeachers,
    rooms,
    setRooms,
    stations,
    setStations,
    setupRooms,
    setupStations,
    allBands,
    songs,
    setSongs,
    kiosks,
    schedules,
    stats,
    submissions,
    setSubmissions,
    activeSessions,
    isGhostActive,
    ghostTargetRole,
    handleToggleGhostMode,
    handleGhostImpersonate,
    fetchData
  } = useAdminDashboardData({ userId, activePlatform, forceTab });

  // 2. Modals state
  const [showAVVModal, setShowAVVModal] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // 3. Domain Hooks
  const studentsState = useAdminStudents({
    admin,
    schoolObj,
    students,
    setStudents,
    teachers,
    setShowAVVModal,
    fetchData
  });

  const teachersState = useAdminTeachers({
    admin,
    userId,
    schoolObj,
    teachers,
    setTeachers,
    setShowAVVModal,
    fetchData
  });

  const bandsState = useAdminBands({
    admin,
    userId,
    fetchData
  });

  const songsState = useAdminSongs({
    admin,
    userId,
    activePlatform,
    songs,
    setSongs
  });

  const roomsState = useAdminCampusRooms({
    admin,
    rooms,
    setRooms,
    stations,
    setStations,
    fetchData
  });

  // UI helpers
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200);
  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  const isMobile = windowWidth <= 768;

  const resolveUserAvatarBound = (u: any, platform?: string): string => {
    if (!u) return '/avatar_ghost.jpg';
    const role = (u.role || '').toLowerCase();
    if (role === 'admin' || role === 'secretary') return '/campus_login_hero.png';
    if (platform === 'campus' || activePlatform === 'campus') {
      return resolveCampusStudentAvatar(u, teachers, schedules);
    }
    return u.photo_url || '/avatar_ghost.jpg';
  };

  // Missions handlers
  const handleApproveSubmission = async (subId: string) => {
    setSubmissions(prev => prev.filter(s => s.id !== subId));
    try {
      const { data: sub } = await supabase.from('user_song_skills').select('user_id, song_id, instrument, songs(title)').eq('id', subId).single();
      await supabase.from('user_song_skills').update({ is_pending_approval: false, is_stage_ready: true, verified_by_id: userId }).eq('id', subId);
      if (sub) {
        const channel = supabase.channel(`realtime_student_progress_${sub.user_id}`);
        channel.subscribe(status => {
          if (status === 'SUBSCRIBED') {
            channel.send({
              type: 'broadcast',
              event: 'challenge-approved',
              payload: { songId: sub.song_id, instrument: sub.instrument }
            });
            setTimeout(() => supabase.removeChannel(channel), 1000);
          }
        });
      }
      fetchData();
    } catch (err: any) {
      alert('Fehler beim Bestätigen: ' + err.message);
    }
  };

  const handleRejectSubmission = async (subId: string, reason?: string) => {
    setSubmissions(prev => prev.filter(s => s.id !== subId));
    try {
      await supabase.from('user_song_skills').update({ is_pending_approval: false, is_stage_ready: false }).eq('id', subId);
      fetchData();
    } catch (err: any) {
      alert('Fehler beim Ablehnen: ' + err.message);
    }
  };

  return (
    <div 
      role="tabpanel"
      id={`admin-tabpanel-${activeTab}`}
      aria-label={`Campus-Groovelab Admin Dashboard: ${activeTab}`}
      tabIndex={0}
      style={{ 
        flex: 1, 
        padding: hideHeader ? '0px' : (activeTab === 'live' ? (isMobile ? '0px' : '0px 10px 10px 10px') : (isMobile ? '0px' : '10px')), 
        overflowY: activeTab === 'live' ? (isMobile ? 'visible' : 'hidden') : 'auto',
        height: activeTab === 'live' ? (isMobile ? 'auto' : '100%') : 'auto',
        display: 'flex',
        flexDirection: 'column',
        minWidth: 0,
        width: '100%',
        overflowX: 'hidden'
      }}
    >
      {/* Ghost Mode Support Banner */}
      {isGhostActive && (
        <div style={{
          background: 'linear-gradient(90deg, #6366f1 0%, #a855f7 100%)',
          color: 'white',
          padding: '12px 20px',
          borderRadius: '16px',
          margin: '12px 16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          boxShadow: '0 4px 20px rgba(99, 102, 241, 0.3)',
          zIndex: 100
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '1.2rem' }}>👻</span>
            <div>
              <div style={{ fontWeight: 900, fontSize: '0.85rem', letterSpacing: '0.02em', textTransform: 'uppercase' }}>
                Campus-Groovelab Support Ghost-Modus aktiv
              </div>
              <div style={{ fontSize: '0.75rem', opacity: 0.9 }}>
                Angemeldet als: <b>{admin?.first_name}</b> ({ghostTargetRole.toUpperCase()})
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => handleToggleGhostMode(ghostTargetRole === 'admin' ? 'teacher' : 'admin')}
              style={{
                background: 'rgba(255,255,255,0.2)',
                border: '1px solid rgba(255,255,255,0.4)',
                color: 'white',
                padding: '6px 14px',
                borderRadius: '10px',
                fontWeight: 700,
                fontSize: '0.75rem',
                cursor: 'pointer'
              }}
            >
              Wechsel zu {ghostTargetRole === 'admin' ? 'Lehrer' : 'Admin'}
            </button>
          </div>
        </div>
      )}

      {/* Header Quotas (when not in Live mode) */}
      {!hideHeader && activeTab !== 'live' && activeTab !== 'schedule' && schoolObj?.limits_enabled && (
        <header style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'flex-start', marginBottom: '24px', marginTop: '16px', gap: '20px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: '20px', background: '#ffffff', padding: '12px 20px', borderRadius: '18px', border: '1.5px solid #f1f5f9', boxShadow: '0 2px 8px rgba(0,0,0,0.01)', flexWrap: 'wrap' }}>
            {[
              { label: 'Lehrkräfte', cur: teachers.length, max: schoolObj.max_teachers ?? 2, color: '#3b82f6' },
              { label: 'Schüler', cur: students.length, max: schoolObj.max_students ?? 6, color: '#34a853' }
            ].map((item, i) => {
              const pct = Math.min(100, (item.cur / item.max) * 100);
              const isClose = pct >= 90;
              const barColor = isClose ? '#ef4444' : item.color;
              return (
                <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: '100px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', fontWeight: 800, color: isClose ? '#ef4444' : '#64748b' }}>
                    <span>{item.label}</span>
                    <span>{item.cur}/{item.max}</span>
                  </div>
                  <div style={{ width: '100%', height: '6px', borderRadius: '3px', background: '#f1f5f9', overflow: 'hidden' }}>
                    <div style={{ width: `${pct}%`, height: '100%', background: barColor, borderRadius: '3px', transition: 'width 0.3s ease' }}></div>
                  </div>
                </div>
              );
            })}
          </div>
        </header>
      )}

      {/* TAB 1: LIVE LAB */}
      {activeTab === 'live' && (
        <Suspense fallback={<div style={{ padding: "40px", textAlign: "center", color: "#64748b" }}>Lehrer-Dashboard wird geladen...</div>}>
          <TeacherDashboard 
            key={`teacher-dashboard-view-${activePlatform}`}
            userId={userId} 
            initialTeacher={admin}
            hideHeader={activePlatform === 'campus' ? false : true} 
            hideSidebar={true}
            viewMode="admin" 
            activePlatform={activePlatform as any}
            initialTab={activePlatform === 'campus' ? 'briefing' : 'live'}
            onTabChange={(id) => onTabChange?.(id)}
            isSidebarCollapsed={isSidebarCollapsed}
            setIsSidebarCollapsed={setIsSidebarCollapsed}
            session={session}
            onSessionChange={onSessionChange}
            locationMode={locationMode}
            onLocationModeChange={onLocationModeChange}
          />
        </Suspense>
      )}

      {/* TAB 2: STUDENTS */}
      {activeTab === 'students' && (
        <Suspense fallback={<div style={{ padding: "40px", textAlign: "center", color: "#64748b" }}>Schüler-Verwaltung wird geladen...</div>}>
          <AdminStudentsView
            activePlatform={activePlatform}
            admin={admin}
            userId={userId}
            schoolObj={schoolObj}
            students={students}
            setStudents={setStudents}
            studentSearch={studentsState.studentSearch}
            setStudentSearch={studentsState.setStudentSearch}
            listType={studentsState.listType}
            setListType={studentsState.setListType}
            instrumentFilter={studentsState.instrumentFilter}
            setInstrumentFilter={studentsState.setInstrumentFilter}
            showAddStudent={studentsState.showAddStudent}
            setShowAddStudent={studentsState.setShowAddStudent}
            showBulkAddStudents={studentsState.showBulkAddStudents}
            setShowBulkAddStudents={studentsState.setShowBulkAddStudents}
            bulkInput={studentsState.bulkInput}
            setBulkInput={studentsState.setBulkInput}
            parsedStudents={studentsState.parsedStudents}
            setParsedStudents={studentsState.setParsedStudents}
            defaultInstrumentForBulk={studentsState.defaultInstrumentForBulk}
            setDefaultInstrumentForBulk={studentsState.setDefaultInstrumentForBulk}
            isBulkSaving={studentsState.isBulkSaving}
            setIsBulkSaving={studentsState.setIsBulkSaving}
            newStudent={studentsState.newStudent}
            setNewStudent={studentsState.setNewStudent}
            editingStudent={studentsState.editingStudent}
            setEditingStudent={studentsState.setEditingStudent}
            showRealNames={showRealNames}
            toggleRealNames={toggleRealNames}
            canManageStudents={true}
            hasTimetableOnboarding={() => false}
            windowWidth={windowWidth}
            isMobile={isMobile}
            setSelectedStudent={studentsState.setSelectedStudent}
            setSelectedQRUser={studentsState.setSelectedQRUser}
            setSelectedTimetableStudent={studentsState.setSelectedTimetableStudent}
            setSelectedStudentForTageskompass={studentsState.setSelectedStudentForTageskompass}
            setShowTageskompassModal={studentsState.setShowTageskompassModal}
            setShowParentInfoSheetModal={studentsState.setShowParentInfoSheetModal}
            fetchStudentProfile={(student) => studentsState.setSelectedStudent(student)}
            handleAddStudent={studentsState.handleAddStudent}
            handleBulkAddSubmit={studentsState.handleBulkAddSubmit}
            handleDeleteStudent={studentsState.handleDeleteStudent}
            handleUpdateStudent={studentsState.handleUpdateStudent}
            parseBulkInput={studentsState.parseBulkInput}
            resolveUserAvatar={resolveUserAvatarBound}
          />
        </Suspense>
      )}

      {/* TAB 3: BANDS */}
      {activeTab === 'bands' && (
        <Suspense fallback={<div style={{ padding: "40px", textAlign: "center", color: "#64748b" }}>Bands-Verwaltung wird geladen...</div>}>
          <AdminBandsView
            activePlatform={activePlatform}
            allBands={allBands}
            bandSearch={bandsState.bandSearch}
            setBandSearch={bandsState.setBandSearch}
            bandLetter={bandsState.bandLetter}
            setBandLetter={bandsState.setBandLetter}
            selectedCoachId={bandsState.selectedCoachId}
            setSelectedCoachId={bandsState.setSelectedCoachId}
            showAddBand={bandsState.showAddBand}
            setShowAddBand={bandsState.setShowAddBand}
            newBand={bandsState.newBand}
            setNewBand={bandsState.setNewBand}
            setEditingBand={bandsState.setEditingBand}
            teachers={teachers}
            songs={songs}
            students={students}
            showRealNames={showRealNames}
            onOpenBandProfile={onOpenBandProfile}
            handleCreateBandManually={bandsState.handleCreateBandManually}
            selectedMembers={bandsState.selectedMembers}
            setSelectedMembers={bandsState.setSelectedMembers}
            memberToSearch={bandsState.memberToSearch}
            setMemberToSearch={bandsState.setMemberToSearch}
            showAddMember={bandsState.showAddMember}
            setShowAddMember={bandsState.setShowAddMember}
            memberSearch={bandsState.memberSearch}
            setMemberSearch={bandsState.setMemberSearch}
            fetchData={fetchData}
          />
        </Suspense>
      )}

      {/* TAB 4: TEACHERS / TEAM */}
      {activeTab === 'team' && (
        <Suspense fallback={<div style={{ padding: "40px", textAlign: "center", color: "#64748b" }}>Team wird geladen...</div>}>
          <AdminTeachersView
            activePlatform={activePlatform}
            admin={admin}
            userId={userId}
            teachers={teachers}
            canManageTeachers={admin?.role === 'admin' || admin?.role === 'secretary' || !!admin?.is_master_admin}
            showAddTeacher={teachersState.showAddTeacher}
            setShowAddTeacher={teachersState.setShowAddTeacher}
            newTeacher={teachersState.newTeacher}
            setNewTeacher={teachersState.setNewTeacher}
            editingTeacher={teachersState.editingTeacher}
            setEditingTeacher={teachersState.setEditingTeacher}
            handleAddTeacher={teachersState.handleAddTeacher}
            handleUpdateTeacher={teachersState.handleUpdateTeacher}
            handleDeleteTeacher={teachersState.handleDeleteTeacher}
            handleToggleObserver={teachersState.handleToggleObserver}
            setSelectedQRUser={studentsState.setSelectedQRUser}
            windowWidth={typeof window !== 'undefined' ? window.innerWidth : 1200}
          />
        </Suspense>
      )}

      {/* TAB 5: ROOMS */}
      {activeTab === 'rooms' && (
        activePlatform === 'campus' ? (
          <Suspense fallback={<div style={{ padding: "40px", textAlign: "center", color: "#64748b" }}>Raumplaner wird geladen...</div>}>
            <AdminCampusRoomsView
              activePlatform={activePlatform}
              admin={admin}
              userId={userId}
              rooms={rooms}
              setRooms={setRooms}
              schoolObj={schoolObj}
              students={students}
              schedules={schedules}
              setSchedules={() => {}}
              campusBookings={roomsState.campusBookings}
              setCampusBookings={roomsState.setCampusBookings}
              dbRoomBookings={roomsState.dbRoomBookings}
              scheduleOccurrences={roomsState.scheduleOccurrences}
              holidays={roomsState.holidays}
              roomSearchQuery={roomsState.roomSearchQuery}
              setRoomSearchQuery={roomsState.setRoomSearchQuery}
              selectedCampusRoomId={roomsState.selectedCampusRoomId}
              setSelectedCampusRoomId={roomsState.setSelectedCampusRoomId}
              selectedFloor={roomsState.selectedFloor}
              setSelectedFloor={roomsState.setSelectedFloor}
              selectedEquipmentFilter={roomsState.selectedEquipmentFilter}
              setSelectedEquipmentFilter={roomsState.setSelectedEquipmentFilter}
              showOnlyFreeNow={roomsState.showOnlyFreeNow}
              setShowOnlyFreeNow={roomsState.setShowOnlyFreeNow}
              showMyBookingsOnly={roomsState.showMyBookingsOnly}
              setShowMyBookingsOnly={roomsState.setShowMyBookingsOnly}
              isDateFilterActive={roomsState.isDateFilterActive}
              setIsDateFilterActive={roomsState.setIsDateFilterActive}
              bookingDate={roomsState.bookingDate}
              setBookingDate={roomsState.setBookingDate}
              bookingStartTime={roomsState.bookingStartTime}
              setBookingStartTime={roomsState.setBookingStartTime}
              bookingEndTime={roomsState.bookingEndTime}
              setBookingEndTime={roomsState.setBookingEndTime}
              bookingPurpose={roomsState.bookingPurpose}
              setBookingPurpose={roomsState.setBookingPurpose}
              bookingType={roomsState.bookingType}
              setBookingType={roomsState.setBookingType}
              bookingStudentId={roomsState.bookingStudentId}
              setBookingStudentId={roomsState.setBookingStudentId}
              bookingTargetType={roomsState.bookingTargetType}
              setBookingTargetType={roomsState.setBookingTargetType}
              externalBookingPartnerName={roomsState.externalBookingPartnerName}
              setExternalBookingPartnerName={roomsState.setExternalBookingPartnerName}
              selectedBooking={roomsState.selectedBooking}
              setSelectedBooking={roomsState.setSelectedBooking}
              isRecurring={roomsState.isRecurring}
              setIsRecurring={roomsState.setIsRecurring}
              recurringInterval={roomsState.recurringInterval}
              setRecurringInterval={roomsState.setRecurringInterval}
              showPreviewField={roomsState.showPreviewField}
              setShowPreviewField={roomsState.setShowPreviewField}
              showMobileRoomSlider={roomsState.showMobileRoomSlider}
              setShowMobileRoomSlider={roomsState.setShowMobileRoomSlider}
              mobileSelectedDayIdx={roomsState.mobileSelectedDayIdx}
              setMobileSelectedDayIdx={roomsState.setMobileSelectedDayIdx}
              favoriteRoomId={roomsState.favoriteRoomId}
              setFavoriteRoomId={roomsState.setFavoriteRoomId}
              dragOverCell={roomsState.dragOverCell}
              setDragOverCell={roomsState.setDragOverCell}
              showRoomFinderBar={roomsState.showRoomFinderBar}
              setShowRoomFinderBar={roomsState.setShowRoomFinderBar}
              finderStartTime={roomsState.finderStartTime}
              setFinderStartTime={roomsState.setFinderStartTime}
              finderEndTime={roomsState.finderEndTime}
              setFinderEndTime={roomsState.setFinderEndTime}
              roomBlockedSlots={roomsState.roomBlockedSlots}
              calendarScrollRef={roomsState.calendarScrollRef}
              fetchData={fetchData}
              showRealNames={showRealNames}
              isMobile={isMobile}
              hoveredInstrumentIdx={roomsState.hoveredInstrumentIdx}
              setHoveredInstrumentIdx={roomsState.setHoveredInstrumentIdx}
              setDraftBooking={roomsState.setDraftBooking}
              setFinderResultCount={roomsState.setFinderResultCount}
              setIsRoomSearchDropdownOpen={roomsState.setIsRoomSearchDropdownOpen}
              setStudentSearchTerm={roomsState.setStudentSearchTerm}
              setSuccessAnimationRoomId={roomsState.setSuccessAnimationRoomId}
            />
          </Suspense>
        ) : (
          <AdminGroovelabRoomsView
            rooms={rooms}
            stations={stations}
            draggedRoomId={roomsState.draggedRoomId}
            dragOverRoomId={roomsState.dragOverRoomId}
            handleRoomDragStart={roomsState.handleRoomDragStart}
            handleRoomDragOver={roomsState.handleRoomDragOver}
            handleRoomDragEnter={roomsState.handleRoomDragEnter}
            handleRoomDragLeave={roomsState.handleRoomDragLeave}
            handleRoomDrop={roomsState.handleRoomDrop}
            handleRoomDragEnd={roomsState.handleRoomDragEnd}
            setCustomizingRoom={roomsState.setCustomizingRoom}
            triggerBatchAddStations={roomsState.triggerBatchAddStations}
            handleDeleteRoom={roomsState.handleDeleteRoom}
            handleDeleteStation={roomsState.handleDeleteStation}
            brandColor={brandColor}
          />
        )
      )}

      {/* TAB 6: SONGS / MEDIATHEK */}
      {activeTab === 'songs' && (
        <Suspense fallback={<div style={{ padding: "40px", textAlign: "center", color: "#64748b" }}>{activePlatform === 'campus' ? 'Mediathek wird geladen...' : 'Songs werden geladen...'}</div>}>
          {activePlatform === 'campus' ? (
            <AdminSongsView
              activePlatform={activePlatform}
              admin={admin}
              userId={userId}
              songs={songs}
              lehrwerke={songsState.lehrwerke}
              setLehrwerke={songsState.setLehrwerke}
              songSearch={songsState.songSearch}
              setSongSearch={songsState.setSongSearch}
              mediathekTab={songsState.mediathekTab}
              setMediathekTab={songsState.setMediathekTab}
              bulkModeSongs={songsState.bulkModeSongs}
              setBulkModeSongs={songsState.setBulkModeSongs}
              bulkTextSongs={songsState.bulkTextSongs}
              setBulkTextSongs={songsState.setBulkTextSongs}
              bulkModeLehrwerke={songsState.bulkModeLehrwerke}
              setBulkModeLehrwerke={songsState.setBulkModeLehrwerke}
              bulkTextLehrwerke={songsState.bulkTextLehrwerke}
              setBulkTextLehrwerke={songsState.setBulkTextLehrwerke}
              showAddSong={songsState.showAddSong}
              setShowAddSong={songsState.setShowAddSong}
              showAddLehrwerk={songsState.showAddLehrwerk}
              setShowAddLehrwerk={songsState.setShowAddLehrwerk}
              editingSong={songsState.editingSong}
              setEditingSong={songsState.setEditingSong}
              editingLehrwerk={songsState.editingLehrwerk}
              setEditingLehrwerk={songsState.setEditingLehrwerk}
              newSong={songsState.newSong}
              setNewSong={songsState.setNewSong}
              newLehrwerk={songsState.newLehrwerk}
              setNewLehrwerk={songsState.setNewLehrwerk}
              textbausteine={songsState.textbausteine}
              copiedTbId={songsState.copiedTbId}
              setCopiedTbId={songsState.setCopiedTbId}
              selectedSongForDetail={songsState.selectedSongForDetail}
              selectedLehrwerkForDetail={songsState.selectedLehrwerkForDetail}
              selectedStudentForProgress={songsState.selectedStudentForProgress}
              setShowTeacherToolsModal={songsState.setShowTeacherToolsModal}
              setShowTextbausteinModal={songsState.setShowTextbausteinModal}
              setPreviewingTextbaustein={songsState.setPreviewingTextbaustein}
              setNewHomeworkNoteText={songsState.setNewHomeworkNoteText}
              setSongLessonNotes={songsState.setSongLessonNotes}
              handleAddSong={songsState.handleAddSong}
              handleDeleteSong={songsState.handleDeleteSong}
              handleUpdateSong={songsState.handleUpdateSong}
              handleMediathekTouchStart={songsState.handleMediathekTouchStart}
              handleMediathekTouchEnd={songsState.handleMediathekTouchEnd}
            />
          ) : (
            <GrooveLabSongsView
              admin={admin}
              userId={userId}
              songs={songs}
              songSearch={songsState.songSearch}
              setSongSearch={songsState.setSongSearch}
              showAddSong={songsState.showAddSong}
              setShowAddSong={songsState.setShowAddSong}
              editingSong={songsState.editingSong}
              setEditingSong={songsState.setEditingSong}
              newSong={songsState.newSong}
              setNewSong={songsState.setNewSong}
              bulkModeSongs={songsState.bulkModeSongs}
              setBulkModeSongs={songsState.setBulkModeSongs}
              bulkTextSongs={songsState.bulkTextSongs}
              setBulkTextSongs={songsState.setBulkTextSongs}
              handleAddSong={songsState.handleAddSong}
              handleDeleteSong={songsState.handleDeleteSong}
              handleUpdateSong={songsState.handleUpdateSong}
            />
          )}
        </Suspense>
      )}

      {/* TAB 7: STATS */}
      {activeTab === 'stats' && (
        <Suspense fallback={<div style={{ padding: "40px", textAlign: "center", color: "#64748b" }}>Statistiken werden geladen...</div>}>
          <AdminStatsView
            activePlatform={activePlatform}
            admin={admin}
            userId={userId}
            students={students}
            teachers={teachers}
            stats={stats}
            isMobile={isMobile}
            showRealNames={showRealNames}
            showAddGoalForm={false}
            setShowAddGoalForm={() => {}}
            newGoalTitle=""
            setNewGoalTitle={() => {}}
            newGoalMinutes=""
            setNewGoalMinutes={() => {}}
            newGoalDeadline=""
            setNewGoalDeadline={() => {}}
            handleAddGoal={async () => {}}
            handleDeleteGoal={async () => {}}
            resolveUserAvatar={resolveUserAvatarBound}
          />
        </Suspense>
      )}

      {/* TAB 8: ID GALLERY */}
      {activeTab === 'gallery' && (
        <IDGallery 
          users={[...(teachers || []), ...(students || [])]} 
          brandColor={brandColor} 
          onShowQR={studentsState.setSelectedQRUser} 
          activePlatform={activePlatform} 
        />
      )}

      {/* TAB 9: SETUP / SETTINGS */}
      {activeTab === 'setup' && (
        activePlatform === 'campus' ? (
          <CampusSetupScreen 
            school={schoolObj} 
            admin={admin} 
            brandColor={brandColor} 
            onUpdate={() => fetchData()} 
          />
        ) : (
          <DeviceSetupScreen 
            rooms={setupRooms} 
            stations={setupStations} 
            brandColor={brandColor} 
            activeSessions={activeSessions}
            students={students}
            school={schoolObj}
            admin={admin}
            kiosks={kiosks || []}
            onUpdate={() => fetchData()}
            onCleanupPlanning={() => {}}
            onResetPlanning={() => {}}
            activePlatform={activePlatform}
          />
        )
      )}

      {/* TAB 10: MISSIONS */}
      {activeTab === 'missions' && (
        <Suspense fallback={<div style={{ padding: "40px", textAlign: "center", color: "#64748b" }}>Missions werden geladen...</div>}>
          <AdminMissionsView
            activePlatform={activePlatform}
            submissions={submissions}
            missionSearch=""
            setMissionSearch={() => {}}
            missionsActiveSubTab="approvals"
            setMissionsActiveSubTab={() => {}}
            missionFilter="all"
            setMissionFilter={() => {}}
            editingTemplateConfig={null}
            setEditingTemplateConfig={() => {}}
            isEditingTemplate={false}
            setIsEditingTemplate={() => {}}
            studentMissionsMap={{}}
            missionTemplates={[]}
            activeSessions={activeSessions}
            students={students}
            songs={songs}
            showRealNames={showRealNames}
            handleApproveSubmission={handleApproveSubmission}
            handleRejectSubmission={handleRejectSubmission}
            handleSaveTemplate={async () => {}}
            handleCreateNewTemplate={() => {}}
            handleAssignTemplate={async () => {}}
            handleGeneratePin={async () => {}}
            handleUpdateStudentLevel={async () => {}}
            resolveUserAvatar={resolveUserAvatarBound}
          />
        </Suspense>
      )}

      {/* Delete Student Confirmation Modal */}
      {studentsState.deleteStudentModalData && (
        <Suspense fallback={null}>
          <ConfirmDeleteStudentModal
            isOpen={!!studentsState.deleteStudentModalData}
            student={studentsState.deleteStudentModalData}
            activePlatform={activePlatform === 'campus' ? 'campus' : activePlatform === 'groovelab' ? 'groovelab' : 'all'}
            onClose={() => studentsState.setDeleteStudentModalData(null)}
            onConfirm={async (studentId) => {
              const res = await deleteStudentFully(studentId, {
                activePlatform: activePlatform === 'campus' ? 'campus' : 'groovelab'
              });
              if (res.success) {
                setStudents(prev => prev.filter(s => s.id !== studentId));
                fetchData(true);
              }
            }}
          />
        </Suspense>
      )}

      {/* QR Code Quick View Modal */}
      {studentsState.selectedQRUser && (
        <Suspense fallback={null}>
          <AdminQRModal
            user={studentsState.selectedQRUser}
            onClose={() => studentsState.setSelectedQRUser(null)}
            activePlatform={activePlatform}
            admin={admin}
            schoolObj={schoolObj}
            showRealNames={showRealNames}
            supabase={supabase}
            onUserUpdated={() => fetchData(true)}
          />
        </Suspense>
      )}

      {/* Unified Modals Master Hub */}
      <AdminModalsMasterHub
        showBatchiPadModal={roomsState.showBatchiPadModal}
        setShowBatchiPadModal={roomsState.setShowBatchiPadModal}
        onExecuteBatchiPad={roomsState.executeBatchAddStations}
        selectedStudent={studentsState.selectedStudent}
        setSelectedStudent={studentsState.setSelectedStudent}
        admin={admin}
        userId={userId}
        activePlatform={activePlatform}
        onSwitchPlatform={onSwitchPlatform}
        showLogoutConfirm={showLogoutConfirm}
        setShowLogoutConfirm={setShowLogoutConfirm}
        onLogout={onLogout}
        showAVVModal={showAVVModal}
        setShowAVVModal={setShowAVVModal}
        schoolObj={schoolObj}
        setAdmin={setAdmin}
        onFetchData={fetchData}
        selectedSongForDetail={songsState.selectedSongForDetail}
        setSelectedSongForDetail={songsState.setSelectedSongForDetail}
        students={students}
        supabase={supabase}
        textbausteine={songsState.textbausteine}
        setTextbausteine={songsState.setTextbausteine}
        songLessonNotes={songsState.songLessonNotes}
        setSongLessonNotes={songsState.setSongLessonNotes}
        setSongs={setSongs}
        showTextbausteinModal={songsState.showTextbausteinModal}
        setShowTextbausteinModal={songsState.setShowTextbausteinModal}
        previewingTextbaustein={songsState.previewingTextbaustein}
        setPreviewingTextbaustein={songsState.setPreviewingTextbaustein}
        copiedTbId={songsState.copiedTbId}
        setCopiedTbId={songsState.setCopiedTbId}
        showTageskompassModal={studentsState.showTageskompassModal}
        setShowTageskompassModal={studentsState.setShowTageskompassModal}
        selectedStudentForTageskompass={studentsState.selectedStudentForTageskompass}
        setSelectedStudentForTageskompass={studentsState.setSelectedStudentForTageskompass}
        initialLehrwerkIdForTageskompass={null}
        setInitialLehrwerkIdForTageskompass={() => {}}
        lehrwerke={songsState.lehrwerke}
        showTeacherToolsModal={songsState.showTeacherToolsModal}
        setShowTeacherToolsModal={songsState.setShowTeacherToolsModal}
        editingBand={bandsState.editingBand}
        setEditingBand={bandsState.setEditingBand}
        onSaveBandEdit={bandsState.handleSaveBandEdit}
        teachers={teachers}
        schedules={schedules}
        onRemoveMember={bandsState.handleRemoveMember}
        onAddMember={bandsState.handleAddMember}
        brandColor={brandColor}
      />
    </div>
  );
}
