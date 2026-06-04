import os

dashboard_path = '/Users/patrickhuber/Documents/Antigravity Projects/Groovelab app/apps/groovelab/src/components/AdminDashboard.tsx'

with open(dashboard_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Let's find the start of renderCampusRoomsTab and the start of renderGroovelabRoomsTab
start_marker = "  const renderCampusRoomsTab = () => {"
end_marker = "  const renderGroovelabRoomsTab = () => {"

start_idx = content.find(start_marker)
end_idx = content.find(end_marker)

if start_idx == -1 or end_idx == -1:
    print("Error: markers not found!")
    exit(1)

new_render_campus_rooms_tab = """  const renderCampusRoomsTab = () => {
    const selectedRoom = rooms.find(r => r.id === selectedCampusRoomId) || rooms[0];

    // Helper to extract unique floors for this school's rooms
    const uniqueFloors = Array.from(new Set(rooms.map(r => r.floor || 'Allgemein'))).sort((a, b) => {
      const order = ['ug', 'eg', 'og', 'allgemein'];
      const getIndex = (f: string) => {
        const lf = f.toLowerCase();
        if (lf.includes('ug')) return 0;
        if (lf.includes('eg')) return 1;
        if (lf.includes('og')) {
          const num = parseInt(lf.replace(/[^0-9]/g, '')) || 1;
          return 2 + num / 10;
        }
        return 10;
      };
      return getIndex(a) - getIndex(b);
    });

    const changeWeek = (weeks: number) => {
      const d = new Date(bookingDate);
      d.setDate(d.getDate() + weeks * 7);
      setBookingDate(d.toISOString().split('T')[0]);
    };

    const getCalendarWeek = (dateStr: string) => {
      const date = new Date(dateStr);
      const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
      const dayNum = d.getUTCDay() || 7;
      d.setUTCDate(d.getUTCDate() + 4 - dayNum);
      const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
      return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
    };

    const getWeekRange = (dateStr: string) => {
      const d = new Date(dateStr);
      const day = d.getDay();
      const diff = d.getDate() - (day === 0 ? 6 : day - 1);
      const mon = new Date(d.setDate(diff));
      const sun = new Date(mon);
      sun.setDate(mon.getDate() + 6);
      const format = (dt: Date) => dt.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
      return `${format(mon)} - ${format(sun)}.${d.getFullYear() !== mon.getFullYear() ? ' ' + sun.getFullYear() : ''}`;
    };

    const getWeekdayDate = (dayIdx: number, baseDateStr: string) => {
      const d = new Date(baseDateStr);
      const day = d.getDay();
      const diff = d.getDate() - (day === 0 ? 6 : day - 1) + dayIdx;
      const targetDate = new Date(d.setDate(diff));
      return targetDate.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
    };

    const isTodayInWeek = (baseDateStr: string) => {
      const today = new Date();
      const d = new Date(baseDateStr);
      const day = d.getDay();
      const diff = d.getDate() - (day === 0 ? 6 : day - 1);
      const mon = new Date(d.setDate(diff));
      mon.setHours(0,0,0,0);
      const sun = new Date(mon);
      sun.setDate(mon.getDate() + 6);
      sun.setHours(23,59,59,999);
      return today >= mon && today <= sun;
    };

    const isDayToday = (dayIdx: number, baseDateStr: string) => {
      const today = new Date();
      const d = new Date(baseDateStr);
      const day = d.getDay();
      const diff = d.getDate() - (day === 0 ? 6 : day - 1) + dayIdx;
      const targetDate = new Date(d.setDate(diff));
      return today.toDateString() === targetDate.toDateString();
    };

    const handleCancelBooking = (bookingId: string | string[]) => {
      const ids = Array.isArray(bookingId) ? bookingId : [bookingId];
      setCampusBookings(prev => prev.filter(b => !ids.includes(b.id)));
    };

    // Filter rooms by floor
    const roomsToRender = (rooms.filter(room => {
      if (selectedFloor === 'Alle') return true;
      return room.floor === selectedFloor;
    })).sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));

    // Map bookings and weekly schedules
    const getBookingsForSlot = (dayIdx: number, hourStr: string) => {
      if (!selectedRoom) return [];
      
      const currentSelectedDate = new Date(bookingDate);
      const dayOfWeek = currentSelectedDate.getDay();
      const diffToMon = currentSelectedDate.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1);
      const mondayOfSelectedWeek = new Date(currentSelectedDate.setDate(diffToMon));
      mondayOfSelectedWeek.setHours(0,0,0,0);

      const sundayOfSelectedWeek = new Date(mondayOfSelectedWeek);
      sundayOfSelectedWeek.setDate(mondayOfSelectedWeek.getDate() + 6);
      sundayOfSelectedWeek.setHours(23,59,59,999);

      // 1. Manual bookings
      const manualForSlot = campusBookings.filter((b: any) => {
        if (b.roomId !== selectedRoom.id) return false;
        const bDate = new Date(b.date);
        if (bDate < mondayOfSelectedWeek || bDate > sundayOfSelectedWeek) return false;
        
        const bDayIndex = getWeekdayIndex(b.date);
        if (bDayIndex !== dayIdx) return false;

        const slotHour = parseInt(hourStr.split(':')[0]);
        const startHour = parseInt(b.startTime.split(':')[0]);
        const endHour = parseInt(b.endTime.split(':')[0]);
        
        return slotHour >= startHour && slotHour < endHour;
      });

      // 2. Weekly recurring schedules
      const DAYS_MAP = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
      const targetDay = DAYS_MAP[dayIdx];
      const schedulesForSlot = schedules.filter((s: any) => {
        if (s.room_id !== selectedRoom.id) return false;
        if (s.day_of_week !== targetDay) return false;

        const slotHour = parseInt(hourStr.split(':')[0]);
        const startHour = parseInt(s.start_time.split(':')[0]);
        const endHour = parseInt(s.end_time.split(':')[0]);
        
        return slotHour >= startHour && slotHour < endHour;
      });

      // Convert schedules to booking format
      const mappedSchedules = schedulesForSlot.map((s: any) => {
        const isApproved = s.status === 'approved' || s.is_approved === true;
        return {
          id: s.id,
          roomId: s.room_id,
          roomName: selectedRoom.name,
          date: '', // Weekly recurring
          startTime: s.start_time,
          endTime: s.end_time,
          purpose: s.purpose || (s.subject_name ? `Unterricht: ${s.subject_name}` : 'Regulärer Unterricht'),
          teacherId: s.teacher_id,
          teacherName: s.teacher_name || 'Lehrer',
          isSchedule: true,
          isApproved
        };
      });

      return [...manualForSlot, ...mappedSchedules];
    };

    // Check if room is occupied during selected time slot
    const isRoomOccupied = (roomId: string) => {
      const dateBookings = campusBookings.filter((b: any) => b.date === bookingDate);
      const DAYS_MAP = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const targetDay = DAYS_MAP[new Date(bookingDate).getDay()];

      const hasBooking = dateBookings.some((b: any) => {
        if (b.roomId !== roomId) return false;
        return !(b.endTime <= bookingStartTime || b.startTime >= bookingEndTime);
      });

      const hasSchedule = schedules.some((s: any) => {
        if (s.room_id !== roomId) return false;
        if (s.day_of_week !== targetDay) return false;
        return !(s.end_time <= bookingStartTime || s.start_time >= bookingEndTime);
      });

      return hasBooking || hasSchedule;
    };

    const handleAddBooking = (roomId: string) => {
      const roomName = rooms.find(r => r.id === roomId)?.name || 'Raum';
      const newBooking = {
        id: 'cb_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
        roomId,
        roomName,
        date: bookingDate,
        startTime: bookingStartTime,
        endTime: bookingEndTime,
        purpose: bookingPurpose || 'Unterricht',
        teacherId: userId,
        teacherName: admin ? `${admin.first_name} ${admin.last_name}` : 'Lehrer'
      };

      setCampusBookings(prev => [...prev, newBooking]);
      setSuccessAnimationRoomId(roomId);
      setTimeout(() => setSuccessAnimationRoomId(null), 1000);
    };

    const handleCellClick = (dayIdx: number, hourStr: string) => {
      const currentSelectedDate = new Date(bookingDate);
      const dayOfWeek = currentSelectedDate.getDay();
      const diffToMon = currentSelectedDate.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1);
      const targetDate = new Date(currentSelectedDate.setDate(diffToMon + dayIdx));
      const targetDateStr = targetDate.toISOString().split('T')[0];

      const startH = parseInt(hourStr.split(':')[0]);
      const startStr = `${String(startH).padStart(2, '0')}:00`;
      const endStr = `${String(startH + 1).padStart(2, '0')}:00`;

      setBookingDate(targetDateStr);
      setBookingStartTime(startStr);
      setBookingEndTime(endStr);
      setIsDateFilterActive(true);

      const slotBookings = getBookingsForSlot(dayIdx, hourStr);
      if (slotBookings.length === 0 && selectedRoom) {
        const roomName = selectedRoom.name;
        const newBooking = {
          id: 'cb_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
          roomId: selectedRoom.id,
          roomName,
          date: targetDateStr,
          startTime: startStr,
          endTime: endStr,
          purpose: bookingPurpose || 'Unterricht',
          teacherId: userId,
          teacherName: admin ? `${admin.first_name} ${admin.last_name}` : 'Lehrer'
        };
        setCampusBookings(prev => [...prev, newBooking]);
        setSuccessAnimationRoomId(selectedRoom.id);
        setTimeout(() => setSuccessAnimationRoomId(null), 1000);
      }
    };

    // Merge overlapping/consecutive bookings for "Meine Buchungen" sidebar
    const groupedMyBookings: { [key: string]: any[] } = {};
    campusBookings.filter((b: any) => b.teacherId === userId).forEach((b: any) => {
      const key = `${b.roomId}_${b.date}`;
      if (!groupedMyBookings[key]) {
        groupedMyBookings[key] = [];
      }
      groupedMyBookings[key].push(b);
    });

    const myBookings: any[] = [];
    Object.values(groupedMyBookings).forEach((list: any[]) => {
      const parsed = list.map((b: any) => {
        const [shStr, smStr] = b.startTime.split(':');
        const sh = parseInt(shStr) || 0;
        const sm = parseInt(smStr) || 0;
        const [ehStr, emStr] = b.endTime.split(':');
        const eh = parseInt(ehStr) || 0;
        const em = parseInt(emStr) || 0;
        const startMin = sh * 60 + sm;
        let endMin = eh * 60 + em;
        if (endMin <= startMin) {
          endMin = startMin + 30;
        }
        return { ...b, startMin, endMin };
      });

      parsed.sort((a, b) => a.startMin - b.startMin);

      const mergedList: any[] = [];
      parsed.forEach((item) => {
        if (mergedList.length === 0) {
          mergedList.push({
            ...item,
            ids: [item.id]
          });
        } else {
          const last = mergedList[mergedList.length - 1];
          if (item.startMin <= last.endMin) {
            last.endMin = Math.max(last.endMin, item.endMin);
            last.ids.push(item.id);
            if (last.purpose && item.purpose && last.purpose !== item.purpose) {
              const cleanedPurpose = item.purpose.replace(/^Unterricht:\s*/i, '');
              if (!last.purpose.includes(cleanedPurpose)) {
                last.purpose = `${last.purpose} & ${cleanedPurpose}`;
              }
            }
          } else {
            mergedList.push({
              ...item,
              ids: [item.id]
            });
          }
        }
      });

      mergedList.forEach((m: any) => {
        const sh = String(Math.floor(m.startMin / 60)).padStart(2, '0');
        const sm = String(m.startMin % 60).padStart(2, '0');
        const eh = String(Math.floor(m.endMin / 60)).padStart(2, '0');
        const em = String(m.endMin % 60).padStart(2, '0');
        myBookings.push({
          ...m,
          startTime: `${sh}:${sm}`,
          endTime: `${eh}:${em}`
        });
      });
    });

    const DAYS_OF_WEEK = [
      { label: 'Montag', value: 'Monday', short: 'Mo' },
      { label: 'Dienstag', value: 'Tuesday', short: 'Di' },
      { label: 'Mittwoch', value: 'Wednesday', short: 'Mi' },
      { label: 'Donnerstag', value: 'Thursday', short: 'Do' },
      { label: 'Freitag', value: 'Friday', short: 'Fr' },
      { label: 'Samstag', value: 'Saturday', short: 'Sa' },
      { label: 'Sonntag', value: 'Sunday', short: 'So' }
    ];

    const TIME_SLOTS = Array.from({ length: 14 }, (_, i) => {
      const hour = 8 + i;
      return `${String(hour).padStart(2, '0')}:00`;
    });

    const getWeekdayIndex = (dateStr: string) => {
      const d = new Date(dateStr);
      const day = d.getDay();
      return day === 0 ? 6 : day - 1;
    };

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginTop: '0px' }}>
        <style>{`
          .custom-calendar-scrollbar::-webkit-scrollbar {
            width: 6px;
            height: 6px;
          }
          .custom-calendar-scrollbar::-webkit-scrollbar-track {
            background: #f8fafc;
            border-radius: 4px;
          }
          .custom-calendar-scrollbar::-webkit-scrollbar-thumb {
            background: #cbd5e1;
            border-radius: 4px;
          }
          .custom-calendar-scrollbar::-webkit-scrollbar-thumb:hover {
            background: #94a3b8;
          }
          @media (max-width: 1024px) {
            .calendar-header-flex {
              flex-direction: column !important;
              align-items: stretch !important;
              gap: 12px !important;
            }
            .calendar-controls-wrapper {
              width: 100% !important;
              justify-content: space-between !important;
              gap: 12px !important;
            }
            .calendar-today-btn {
              padding: 8px 16px !important;
              font-size: 0.8rem !important;
              height: 40px !important;
              border-radius: 12px !important;
              min-width: 80px !important;
            }
            .calendar-week-pagination {
              padding: 6px 12px !important;
              border-radius: 14px !important;
              height: 40px !important;
              flex-grow: 1 !important;
              justify-content: space-between !important;
            }
            .calendar-week-chevron-btn {
              padding: 8px 12px !important;
              border-radius: 10px !important;
              min-width: 36px !important;
            }
          }
        `}</style>

        <div style={{ display: 'grid', gridTemplateColumns: showMyBookingsOnly ? '1fr 340px' : '1fr 340px', gap: '20px', alignItems: 'stretch' }}>
          {/* Left Column: Room catalog and weekly calendar */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            {/* Room Horizontal Picker */}
            <div 
              className="glass-panel" 
              style={{ 
                background: 'white', 
                borderRadius: '20px', 
                border: '1px solid rgba(0, 0, 0, 0.05)', 
                padding: '16px 20px', 
                boxShadow: '0 4px 20px -2px rgba(0, 0, 0, 0.02), 0 2px 8px -1px rgba(0, 0, 0, 0.01)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
                <h2 style={{ fontSize: '1.4rem', fontWeight: 900, color: '#18181b', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                  <div style={{ background: `${brandColor}15`, color: brandColor, padding: '5px', borderRadius: '8px', display: 'flex', alignItems: 'center' }}>
                    <Box size={16} />
                  </div>
                  Campus Räumlichkeiten
                </h2>

                <div style={{ 
                  background: '#f1f5f9', 
                  borderRadius: '12px', 
                  padding: '3px', 
                  display: 'flex', 
                  gap: '2px', 
                  border: '1px solid rgba(0,0,0,0.02)',
                  alignItems: 'center',
                  flexWrap: 'wrap'
                }}>
                  {['Alle', ...uniqueFloors].map((floor) => {
                    const isSelected = selectedFloor === floor;
                    return (
                      <button
                        key={floor}
                        onClick={() => setSelectedFloor(floor)}
                        style={{
                          padding: '6px 14px',
                          borderRadius: '9px',
                          border: 'none',
                          background: isSelected ? '#ffffff' : 'transparent',
                          color: isSelected ? brandColor : '#64748b',
                          fontWeight: isSelected ? 800 : 600,
                          fontSize: '0.75rem',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                          boxShadow: isSelected ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                        }}
                      >
                        {floor === 'Allgemein' ? 'Standard' : floor}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Active Filter Info Banner */}
              {isDateFilterActive && (
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center', 
                  background: '#fffbeb', 
                  border: '1px solid #fef3c7', 
                  borderRadius: '12px', 
                  padding: '10px 14px', 
                  marginBottom: '14px',
                  animation: 'fadeIn 0.2s ease'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.78rem', color: '#b45309', fontWeight: 700 }}>
                    <span>📅</span>
                    <span>Anzeige gefiltert für: {new Date(bookingDate).toLocaleDateString('de-DE', { weekday: 'long', day: '2-digit', month: '2-digit' })}, {bookingStartTime} - {bookingEndTime} Uhr</span>
                  </div>
                  <button 
                    onClick={() => {
                      setIsDateFilterActive(false);
                      setBookingDate(new Date().toISOString().split('T')[0]);
                    }}
                    style={{ 
                      background: 'transparent', 
                      border: 'none', 
                      color: '#b45309', 
                      fontWeight: 800, 
                      fontSize: '0.75rem', 
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    Filter zurücksetzen ✕
                  </button>
                </div>
              )}

              <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '4px' }}>
                {roomsToRender.map((room) => {
                  const isSelected = selectedCampusRoomId === room.id;
                  const occupied = isRoomOccupied(room.id);
                  return (
                    <div
                      key={room.id}
                      onClick={() => setSelectedCampusRoomId(room.id)}
                      style={{
                        minWidth: '180px',
                        padding: '12px 14px',
                        background: isSelected ? `${brandColor}08` : 'white',
                        border: isSelected ? `2px solid ${brandColor}` : '1.5px solid #e2e8f0',
                        borderRadius: '14px',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        boxShadow: isSelected ? `0 4px 12px ${brandColor}15` : 'none',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '6px',
                        opacity: (isDateFilterActive && occupied) ? 0.4 : 1
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ fontWeight: 800, fontSize: '0.85rem', color: isSelected ? brandColor : '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '120px' }}>
                          {room.name}
                        </div>
                        <span style={{ 
                          width: '8px', 
                          height: '8px', 
                          borderRadius: '50%', 
                          background: occupied ? '#ef4444' : '#22c55e',
                          display: 'inline-block',
                          boxShadow: '0 0 4px rgba(0,0,0,0.05)'
                        }} title={occupied ? 'Belegt' : 'Verfügbar'} />
                      </div>
                      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', alignItems: 'center' }}>
                        <span style={{ padding: '2px 6px', background: '#f1f5f9', borderRadius: '6px', fontSize: '0.65rem', fontWeight: 700, color: '#475569' }}>
                          Kapazität: {room.capacity || 4}
                        </span>
                        {occupied && (
                          <span style={{ padding: '2px 6px', background: '#fee2e2', borderRadius: '6px', fontSize: '0.65rem', fontWeight: 800, color: '#ef4444' }}>
                            Belegt
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Weekly Availability Calendar Grid */}
            <div 
              className="glass-panel" 
              style={{ 
                background: 'white', 
                borderRadius: '20px', 
                border: '1px solid rgba(0, 0, 0, 0.05)', 
                padding: '18px 20px', 
                boxShadow: '0 4px 20px -2px rgba(0, 0, 0, 0.02), 0 2px 8px -1px rgba(0, 0, 0, 0.01)'
              }}
            >
              <div className="calendar-header-flex" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 900, color: '#1e293b', margin: 0 }}>
                    Wochenübersicht: {selectedRoom?.name || 'Wähle einen Raum'}
                  </h3>
                  <p style={{ fontSize: '0.72rem', color: '#64748b', margin: '2px 0 0 0', fontWeight: 600 }}>
                    Angezeigt für die Woche der Buchungsauswahl ({new Date(bookingDate).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })})
                  </p>
                </div>

                {/* Week Pagination and Today Button */}
                <div className="calendar-controls-wrapper" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button
                    onClick={() => {
                      const today = new Date();
                      const dateStr = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0');
                      setBookingDate(dateStr);
                    }}
                    className="calendar-today-btn"
                    style={{
                      border: '1px solid #e2e8f0',
                      background: 'white',
                      cursor: 'pointer',
                      padding: '6px 12px',
                      borderRadius: '10px',
                      color: '#475569',
                      fontSize: '0.72rem',
                      fontWeight: 800,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'all 0.2s',
                      boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
                      height: '32px'
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.borderColor = brandColor; e.currentTarget.style.color = brandColor; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'white'; e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.color = '#475569'; }}
                  >
                    Heute
                  </button>

                  <div className="calendar-week-pagination" style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#f8fafc', padding: '4px 8px', borderRadius: '12px', border: '1px solid #e2e8f0', height: '32px' }}>
                    <button
                      onClick={() => changeWeek(-1)}
                      className="calendar-week-chevron-btn"
                      style={{
                        border: 'none',
                        background: 'none',
                        cursor: 'pointer',
                        padding: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        color: '#64748b'
                      }}
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <span className="calendar-week-label" style={{ fontSize: '0.74rem', fontWeight: 800, color: '#334155', minWidth: '150px', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                      <span style={{ color: brandColor, fontWeight: 800 }}>KW {getCalendarWeek(bookingDate)}</span>
                      <span style={{ fontSize: '0.68rem', fontWeight: 600, color: '#64748b' }}>({getWeekRange(bookingDate)})</span>
                    </span>
                    <button
                      onClick={() => changeWeek(1)}
                      className="calendar-week-chevron-btn"
                      style={{
                        border: 'none',
                        background: 'none',
                        cursor: 'pointer',
                        padding: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        color: '#64748b'
                      }}
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Calendar Grid Container */}
              <div style={{ display: 'flex', flexDirection: 'column', border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden' }}>
                {/* Header Row */}
                <div style={{ display: 'grid', gridTemplateColumns: '80px repeat(7, 1fr)', background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                  <div style={{ padding: '10px', fontSize: '0.7rem', fontWeight: 800, color: '#64748b', textAlign: 'center', borderRight: '1px solid #e2e8f0' }}>Zeit</div>
                  {DAYS_OF_WEEK.map((day, dayIdx) => {
                    const isToday = isTodayInWeek(bookingDate) && isDayToday(dayIdx, bookingDate);
                    return (
                      <div 
                        key={day.value} 
                        style={{ 
                          padding: '10px 4px', 
                          fontSize: '0.72rem', 
                          fontWeight: 800, 
                          color: '#1e293b', 
                          textAlign: 'center', 
                          borderRight: dayIdx < 6 ? '1px solid #e2e8f0' : 'none',
                          position: 'relative',
                          background: isToday ? `${brandColor}06` : '#f8fafc'
                        }}
                      >
                        {isToday && (
                          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: brandColor }} />
                        )}
                        <div>{day.label}</div>
                        <div style={{ fontSize: '0.62rem', color: '#64748b', marginTop: '2px', fontWeight: 700 }}>
                          {getWeekdayDate(dayIdx, bookingDate)}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Hourly Rows */}
                <div className="custom-calendar-scrollbar" style={{ display: 'flex', flexDirection: 'column', maxHeight: '420px', overflowY: 'auto', position: 'relative' }}>
                  {TIME_SLOTS.map((hour) => {
                    const slotHourInt = parseInt(hour.split(':')[0]);
                    
                    return (
                      <div key={hour} style={{ display: 'grid', gridTemplateColumns: '80px repeat(7, 1fr)', borderBottom: '1px solid #f1f5f9', minHeight: '52px', position: 'relative' }}>
                        {/* Time cell */}
                        <div style={{ padding: '10px 4px', fontSize: '0.72rem', fontWeight: 800, color: '#64748b', textAlign: 'center', background: '#f8fafc', borderRight: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {hour}
                        </div>
                        {/* Day cells */}
                        {DAYS_OF_WEEK.map((day, dayIdx) => {
                          const slotBookings = getBookingsForSlot(dayIdx, hour);
                          const isToday = isTodayInWeek(bookingDate) && isDayToday(dayIdx, bookingDate);
                          const currentHour = new Date().getHours();
                          const currentMin = new Date().getMinutes();
                          const showTimeIndicator = isToday && currentHour === slotHourInt;

                          return (
                            <div
                              key={day.value}
                              onClick={() => handleCellClick(dayIdx, hour)}
                              style={{
                                padding: '4px',
                                borderRight: dayIdx < 6 ? '1px solid #f1f5f9' : 'none',
                                position: 'relative',
                                background: isToday ? `${brandColor}02` : 'white',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '3px',
                                justifyContent: 'stretch',
                                cursor: 'pointer'
                              }}
                            >
                              {/* Real-time indicator line */}
                              {showTimeIndicator && (
                                <div style={{ 
                                  position: 'absolute', 
                                  top: `${(currentMin / 60) * 100}%`, 
                                  left: 0, 
                                  right: 0, 
                                  height: '2px', 
                                  background: '#ef4444', 
                                  zIndex: 10,
                                  pointerEvents: 'none',
                                  display: 'flex',
                                  alignItems: 'center'
                                }}>
                                  <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#ef4444', marginLeft: '-3px' }} />
                                </div>
                              )}

                              {slotBookings.map((b: any) => {
                                const isOwnBooking = b.teacherId === userId;
                                const isSchedule = b.isSchedule;
                                
                                // Color Scheme
                                let bg = '#f1f5f9';
                                let borderStyle = '1px solid #cbd5e1';
                                let textColor = '#475569';
                                let leftAccentColor = '#94a3b8';

                                if (isSchedule) {
                                  if (b.isApproved) {
                                    bg = '#e0f2fe';
                                    borderStyle = '1px solid #bae6fd';
                                    textColor = '#0369a1';
                                    leftAccentColor = '#0284c7';
                                  } else {
                                    bg = '#fef3c7';
                                    borderStyle = '1px dashed #fde68a';
                                    textColor = '#b45309';
                                    leftAccentColor = '#d97706';
                                  }
                                } else if (isOwnBooking) {
                                  // Meine Buchung (lila/purple)
                                  bg = '#f3e8ff';
                                  borderStyle = '1px solid #e9d5ff';
                                  textColor = '#6b21a8';
                                  leftAccentColor = '#8b5cf6';
                                }

                                const [shStr, smStr] = b.startTime.split(':');
                                const sh = parseInt(shStr) || 0;
                                const sm = parseInt(smStr) || 0;
                                const [ehStr, emStr] = b.endTime.split(':');
                                const eh = parseInt(ehStr) || 0;
                                const em = parseInt(emStr) || 0;
                                const durationHrs = (eh * 60 + em - (sh * 60 + sm)) / 60;
                                const slotH = parseInt(hour.split(':')[0]);
                                
                                // Only draw on starting hour slot
                                if (slotH !== sh) return null;

                                return (
                                  <div
                                    key={b.id}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedBooking(b);
                                    }}
                                    title={`${b.purpose} (${b.startTime} - ${b.endTime}) - ${b.teacherName}`}
                                    style={{
                                      background: bg,
                                      border: borderStyle,
                                      borderRadius: '8px',
                                      padding: '4px 6px 4px 8px',
                                      fontSize: '0.62rem',
                                      fontWeight: 800,
                                      color: textColor,
                                      position: 'absolute',
                                      top: '4px',
                                      left: '4px',
                                      right: '4px',
                                      height: `calc(${durationHrs * 100}% - 8px)`,
                                      zIndex: 5,
                                      display: 'flex',
                                      flexDirection: 'column',
                                      justifyContent: 'flex-start',
                                      boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis'
                                    }}
                                  >
                                    <div style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: '4px', background: leftAccentColor, borderRadius: '8px 0 0 8px' }} />
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.55rem', opacity: 0.8, marginBottom: '2px', fontWeight: 700 }}>
                                      <span>{b.startTime} - {b.endTime}</span>
                                    </div>
                                    <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', width: '100%' }}>
                                      {isSchedule ? `🎓 ${b.purpose}` : b.purpose}
                                    </div>
                                    {durationHrs >= 1 && (
                                      <div style={{ fontSize: '0.55rem', opacity: 0.8, marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        {isOwnBooking ? 'Meine Buchung' : b.teacherName}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Right Sidebar: Booking Form & Meine Buchungen */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', height: '100%', alignSelf: 'stretch' }}>
            
            {/* Meine Buchungen (Promoted to the top) */}
            <div 
              className="glass-panel" 
              style={{ 
                background: 'white', 
                borderRadius: '20px', 
                border: '1px solid rgba(0, 0, 0, 0.05)', 
                padding: '18px', 
                boxShadow: '0 4px 20px -2px rgba(0, 0, 0, 0.02), 0 2px 8px -1px rgba(0, 0, 0, 0.01)',
                display: 'flex',
                flexDirection: 'column',
                flexGrow: showMyBookingsOnly ? 1 : 0,
                transition: 'all 0.3s ease',
                height: showMyBookingsOnly ? '100%' : 'auto'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 900, color: '#1e293b', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                  Meine Buchungen
                  <span style={{ fontSize: '0.72rem', background: '#f3e8ff', color: '#8b5cf6', padding: '2px 6px', borderRadius: '6px', fontWeight: 800 }}>
                    {myBookings.length}
                  </span>
                </h3>

                <button
                  onClick={() => setShowMyBookingsOnly(!showMyBookingsOnly)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#94a3b8',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    padding: '4px',
                    transition: 'color 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.color = brandColor}
                  onMouseLeave={(e) => e.currentTarget.style.color = '#94a3b8'}
                >
                  {showMyBookingsOnly ? <ArrowLeft size={16} /> : <Maximize2 size={16} />}
                </button>
              </div>

              {/* Cancel All Button */}
              {myBookings.length >= 2 && (
                <button
                  onClick={() => {
                    const allIds = myBookings.flatMap(b => b.ids || [b.id]);
                    handleCancelBooking(allIds);
                  }}
                  style={{
                    background: '#fff1f2',
                    color: '#ef4444',
                    border: '1px solid #fecaca',
                    padding: '6px 12px',
                    borderRadius: '10px',
                    fontSize: '0.72rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    marginBottom: '10px',
                    width: '100%',
                    textAlign: 'center',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = '#ffe4e6'}
                  onMouseLeave={(e) => e.currentTarget.style.background = '#fff1f2'}
                >
                  Alle stornieren
                </button>
              )}

              <div className="custom-calendar-scrollbar" style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: showMyBookingsOnly ? 'calc(100vh - 300px)' : '180px', overflowY: 'auto' }}>
                {myBookings.length === 0 ? (
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 700, textAlign: 'center', padding: '12px', border: '1.5px dashed #cbd5e1', borderRadius: '10px', background: '#f9f9fb' }}>
                    Du hast noch keine Buchungen vorgenommen.
                  </div>
                ) : (
                  myBookings.map((b: any) => (
                    <div
                      key={b.id}
                      style={{
                        padding: '10px 12px',
                        background: '#f8fafc',
                        border: '1px solid #cbd5e1',
                        borderRadius: '12px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}
                    >
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0 }}>
                        <span style={{ fontSize: '0.78rem', fontWeight: 850, color: '#1e293b', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                          {b.roomName}
                        </span>
                        <span style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 700 }}>
                          {new Date(b.date).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })} • {b.startTime} - {b.endTime}
                        </span>
                      </div>
                      <button
                        onClick={() => handleCancelBooking(b.ids || b.id)}
                        style={{
                          background: '#fff1f2',
                          color: '#ef4444',
                          border: 'none',
                          borderRadius: '8px',
                          width: '28px',
                          height: '28px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          transition: 'background 0.2s'
                        }}
                        title="Buchung stornieren"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Booking Form (Hidden when Maximized) */}
            {!showMyBookingsOnly && (
              <div 
                className="glass-panel" 
                style={{ 
                  background: 'white', 
                  borderRadius: '20px', 
                  border: '1px solid rgba(0, 0, 0, 0.05)', 
                  padding: '18px', 
                  boxShadow: '0 4px 20px -2px rgba(0, 0, 0, 0.02), 0 2px 8px -1px rgba(0, 0, 0, 0.01)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px'
                }}
              >
                <h3 style={{ fontSize: '1.05rem', fontWeight: 900, color: '#1e293b', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ color: brandColor }}>⚡</span> Raum buchen
                </h3>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '0.7rem', fontWeight: 850, color: '#64748b', textTransform: 'uppercase' }}>Datum</label>
                  <input
                    type="date"
                    value={bookingDate}
                    onChange={(e) => {
                      setBookingDate(e.target.value);
                      setIsDateFilterActive(true);
                    }}
                    onFocus={() => setIsDateFilterActive(true)}
                    style={{
                      padding: '8px 12px',
                      borderRadius: '10px',
                      border: `1.5px solid ${isDateFilterActive ? brandColor : '#cbd5e1'}`,
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      outline: 'none',
                      color: isDateFilterActive ? '#000000' : '#cbd5e1',
                      background: isDateFilterActive ? '#ffffff' : '#f8fafc',
                      height: '40px',
                      transition: 'all 0.2s ease'
                    }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '0.7rem', fontWeight: 850, color: '#64748b', textTransform: 'uppercase' }}>Von</label>
                    <select
                      value={bookingStartTime}
                      onChange={(e) => {
                        setBookingStartTime(e.target.value);
                        setIsDateFilterActive(true);
                      }}
                      onFocus={() => setIsDateFilterActive(true)}
                      style={{
                        padding: '8px 10px',
                        borderRadius: '10px',
                        border: `1.5px solid ${isDateFilterActive ? brandColor : '#cbd5e1'}`,
                        fontSize: '0.8rem',
                        fontWeight: 700,
                        outline: 'none',
                        color: isDateFilterActive ? '#000000' : '#cbd5e1',
                        background: isDateFilterActive ? '#ffffff' : '#f8fafc',
                        height: '40px',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      {Array.from({ length: 27 }, (_, i) => {
                        const min = i * 30 + 480;
                        const hh = String(Math.floor(min / 60)).padStart(2, '0');
                        const mm = String(min % 60).padStart(2, '0');
                        return `${hh}:${mm}`;
                      }).map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '0.7rem', fontWeight: 850, color: '#64748b', textTransform: 'uppercase' }}>Bis</label>
                    <select
                      value={bookingEndTime}
                      onChange={(e) => {
                        setBookingEndTime(e.target.value);
                        setIsDateFilterActive(true);
                      }}
                      onFocus={() => setIsDateFilterActive(true)}
                      style={{
                        padding: '8px 10px',
                        borderRadius: '10px',
                        border: `1.5px solid ${isDateFilterActive ? brandColor : '#cbd5e1'}`,
                        fontSize: '0.8rem',
                        fontWeight: 700,
                        outline: 'none',
                        color: isDateFilterActive ? '#000000' : '#cbd5e1',
                        background: isDateFilterActive ? '#ffffff' : '#f8fafc',
                        height: '40px',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      {Array.from({ length: 27 }, (_, i) => {
                        const min = (i + 1) * 30 + 480;
                        const hh = String(Math.floor(min / 60)).padStart(2, '0');
                        const mm = String(min % 60).padStart(2, '0');
                        return `${hh}:${mm}`;
                      }).filter(t => t > bookingStartTime).map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '0.7rem', fontWeight: 850, color: '#64748b', textTransform: 'uppercase' }}>Verwendungszweck</label>
                  <input
                    placeholder="z.B. Klavierunterricht"
                    value={bookingPurpose}
                    onChange={(e) => setBookingPurpose(e.target.value)}
                    style={{
                      padding: '8px 12px',
                      borderRadius: '10px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      outline: 'none',
                      color: '#1e293b',
                      height: '40px'
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };"""

# Replace the text
rebuilt_content = content[:start_idx] + new_render_campus_rooms_tab + content[end_idx:]

with open(dashboard_path, 'w', encoding='utf-8') as f:
    f.write(rebuilt_content)

print("SUCCESS: renderCampusRoomsTab replaced completely.")
