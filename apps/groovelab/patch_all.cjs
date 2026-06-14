const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/components/SecretaryDashboard.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// --- 1. STATE & DATA FETCHING ---
const schoolState = `  const [schoolName, setSchoolName] = useState<string>('');`;
const openingHoursState = `  const [schoolName, setSchoolName] = useState<string>('');
  const [openingHours, setOpeningHours] = useState<any>(null);`;

if (content.includes(schoolState)) {
  content = content.replace(schoolState, openingHoursState);
  console.log("State openingHours added.");
} else {
  console.error("Could not find schoolName state!");
}

const selectFields = `.select('name, logo_url, primary_color, calendar_url, groovelab_kiosk_token, campus_login_token, allow_messages_global, has_campus_subscription, has_groovelab_subscription, is_paused, limits_enabled, user_quota, pending_user_quota, campus_activated_this_month, groovelab_activated_this_month, student_billing_option, zip_code, city, street, contract_ends_at, created_at, is_billing_booked, contract_start_date, extra_billing_option')`;
const newSelectFields = `.select('name, logo_url, primary_color, calendar_url, groovelab_kiosk_token, campus_login_token, allow_messages_global, has_campus_subscription, has_groovelab_subscription, is_paused, limits_enabled, user_quota, pending_user_quota, campus_activated_this_month, groovelab_activated_this_month, student_billing_option, zip_code, city, street, contract_ends_at, created_at, is_billing_booked, contract_start_date, extra_billing_option, opening_hours')`;

if (content.includes(selectFields)) {
  content = content.replace(selectFields, newSelectFields);
  console.log("Query updated to include opening_hours.");
} else {
  console.error("Could not find selectFields in schools query!");
}

const schoolDataSet = `        setSchoolName(schoolData.name);`;
const newSchoolDataSet = `        setSchoolName(schoolData.name);
        setOpeningHours(schoolData.opening_hours);`;

if (content.includes(schoolDataSet)) {
  content = content.replace(schoolDataSet, newSchoolDataSet);
  console.log("Opening hours setter added to fetchDashboardData.");
} else {
  console.error("Could not find schoolName setter!");
}


// --- 2. DRAG START MATRIC LOGIC & SAFARI SUPPORT ---
const dragStartDef = `  const handleDragStartMatrix = (planId: string) => {
    setDraggedPlanId(planId);
    const plan = matrixAllocations.find(p => p.id === planId);
    setDraggedPlanDay(plan?.dayOfWeek ?? null);
  };`;

const newDragStartDef = `  const handleDragStartMatrix = (e: React.DragEvent, planId: string) => {
    try {
      e.dataTransfer.setData("text/plain", planId);
      e.dataTransfer.effectAllowed = "move";
    } catch (err) {
      console.warn("dataTransfer error", err);
    }
    setDraggedPlanId(planId);
    const plan = matrixAllocations.find(p => p.id === planId);
    setDraggedPlanDay(plan?.dayOfWeek ?? null);
  };`;

if (content.includes(dragStartDef)) {
  content = content.replace(dragStartDef, newDragStartDef);
  console.log("Updated handleDragStartMatrix definition successfully.");
} else {
  console.error("Could not find handleDragStartMatrix definition!");
}


// --- 3. MATRIX STACK AND PLAN CARDS GRABBING (POINTER EVENTS & DRAGSTART PARAMS) ---

// Top card drag site
const topDragStart = `onDragStart={() => handleDragStartMatrix(topPlan.id)}`;
const newTopDragStart = `onDragStart={(e) => handleDragStartMatrix(e, topPlan.id)}`;
if (content.includes(topDragStart)) {
  content = content.replace(topDragStart, newTopDragStart);
  console.log("Updated topPlan onDragStart.");
} else {
  console.error("Could not find topPlan onDragStart!");
}

// Inside top plan spans
const topSpan1 = `<span style={{ fontSize: '0.73rem', fontWeight: 800, color: '#92400e', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{getPlanDisplayName(topPlan)}</span>`;
const newTopSpan1 = `<span style={{ pointerEvents: 'none', fontSize: '0.73rem', fontWeight: 800, color: '#92400e', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{getPlanDisplayName(topPlan)}</span>`;
if (content.includes(topSpan1)) {
  content = content.replace(topSpan1, newTopSpan1);
}

const topSpan2 = `<span style={{ fontSize: '0.6rem', fontWeight: 700, color: '#b45309' }}>{topPlan.instrument}</span>`;
const newTopSpan2 = `<span style={{ pointerEvents: 'none', fontSize: '0.6rem', fontWeight: 700, color: '#b45309' }}>{topPlan.instrument}</span>`;
if (content.includes(topSpan2)) {
  content = content.replace(topSpan2, newTopSpan2);
}

const topSpan3 = `<span style={{ fontSize: '0.62rem', fontWeight: 900, fontFamily: 'monospace', color: '#d97706' }}>⏱ {topPlan.startTime}–{topPlan.endTime}</span>`;
const newTopSpan3 = `<span style={{ pointerEvents: 'none', fontSize: '0.62rem', fontWeight: 900, fontFamily: 'monospace', color: '#d97706' }}>⏱ {topPlan.startTime}–{topPlan.endTime}</span>
                                               {(() => {
                                                 // Only validate for GrooveLab slots
                                                 const topPlanRoom = topPlan.roomId ? rooms.find(r => r.id === topPlan.roomId) : null;
                                                 const isGroovelabPlan = topPlan.teacherId === 'groovelab' || (topPlanRoom && topPlanRoom.name.toLowerCase().includes('groovelab'));
                                                 if (!isGroovelabPlan) return null;

                                                 const dayKeys = ['', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
                                                 const dayHours = openingHours?.[dayKeys[dayNum]];
                                                 if (!dayHours) return null;
                                                 if (dayHours.active === false) {
                                                   return <span style={{ pointerEvents: 'none', fontSize: '0.55rem', fontWeight: 900, color: '#ef4444', background: '#fef2f2', border: '1px solid #fee2e2', padding: '2px 4px', borderRadius: '4px', marginTop: '2px', alignSelf: 'flex-start' }}>⚠️ Tag geschlossen</span>;
                                                 }
                                                 if (dayHours.start && dayHours.end && (topPlan.startTime < dayHours.start || topPlan.endTime > dayHours.end)) {
                                                   return <span style={{ pointerEvents: 'none', fontSize: '0.55rem', fontWeight: 900, color: '#ef4444', background: '#fef2f2', border: '1px solid #fee2e2', padding: '2px 4px', borderRadius: '4px', marginTop: '2px', alignSelf: 'flex-start' }} title={\`Öffnungszeiten: \${dayHours.start} - \${dayHours.end}\`}>⚠️ Außerhalb Betriebszeit (\${dayHours.start}–\${dayHours.end})</span>;
                                                 }
                                                 return null;
                                               })()}`;
if (content.includes(topSpan3)) {
  content = content.replace(topSpan3, newTopSpan3);
  console.log("Top plan warning and grabbability patched.");
} else {
  console.error("Could not find topSpan3!");
}


// Cell plan card drag site
const cellDragStart = `onDragStart={() => handleDragStartMatrix(plan.id)}`;
const newCellDragStart = `onDragStart={(e) => handleDragStartMatrix(e, plan.id)}`;
if (content.includes(cellDragStart)) {
  content = content.replace(cellDragStart, newCellDragStart);
  console.log("Updated cell plan onDragStart.");
} else {
  console.error("Could not find cell plan onDragStart!");
}

// Inside cell plan spans
const cellSpan1 = `<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '4px' }}>
                                                  <span style={{ fontSize: '0.73rem', fontWeight: 800, color: themeText, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>`;
const newCellSpan1 = `<div style={{ pointerEvents: 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '4px' }}>
                                                  <span style={{ fontSize: '0.73rem', fontWeight: 800, color: themeText, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>`;
if (content.includes(cellSpan1)) {
  content = content.replace(cellSpan1, newCellSpan1);
}

const cellSpan2 = `<span style={{ fontSize: '0.6rem', fontWeight: 700, color: '#94a3b8' }}>{plan.instrument}</span>`;
const newCellSpan2 = `<span style={{ pointerEvents: 'none', fontSize: '0.6rem', fontWeight: 700, color: '#94a3b8' }}>{plan.instrument}</span>`;
if (content.includes(cellSpan2)) {
  content = content.replace(cellSpan2, newCellSpan2);
}

const cellSpan3 = `<span style={{ fontSize: '0.62rem', fontWeight: 900, fontFamily: 'monospace', color: hasOverlap ? '#ef4444' : '#059669' }}>
                                                  ⏱ {plan.startTime}–{plan.endTime}
                                                </span>`;
const newCellSpan3 = `<span style={{ pointerEvents: 'none', fontSize: '0.62rem', fontWeight: 900, fontFamily: 'monospace', color: hasOverlap ? '#ef4444' : '#059669' }}>
                                                  ⏱ {plan.startTime}–{plan.endTime}
                                                </span>
                                                {(() => {
                                                  // Only validate for GrooveLab slots
                                                  const planRoom = plan.roomId ? rooms.find(r => r.id === plan.roomId) : null;
                                                  const isGroovelabPlan = plan.teacherId === 'groovelab' || (planRoom && planRoom.name.toLowerCase().includes('groovelab'));
                                                  if (!isGroovelabPlan) return null;

                                                  const dayKeys = ['', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
                                                  const dayHours = openingHours?.[dayKeys[dayNum]];
                                                  if (!dayHours) return null;
                                                  if (dayHours.active === false) {
                                                    return <span style={{ pointerEvents: 'none', fontSize: '0.55rem', fontWeight: 900, color: '#ef4444', background: '#fef2f2', border: '1px solid #fee2e2', padding: '2px 4px', borderRadius: '4px', marginTop: '2px', alignSelf: 'flex-start' }}>⚠️ Tag geschlossen</span>;
                                                  }
                                                  if (dayHours.start && dayHours.end && (plan.startTime < dayHours.start || plan.endTime > dayHours.end)) {
                                                    return <span style={{ pointerEvents: 'none', fontSize: '0.55rem', fontWeight: 900, color: '#ef4444', background: '#fef2f2', border: '1px solid #fee2e2', padding: '2px 4px', borderRadius: '4px', marginTop: '2px', alignSelf: 'flex-start' }} title={\`Öffnungszeiten: \${dayHours.start} - \${dayHours.end}\`}>⚠️ Außerhalb Betriebszeit (\${dayHours.start}–\${dayHours.end})</span>;
                                                  }
                                                  return null;
                                                })()}`;
if (content.includes(cellSpan3)) {
  content = content.replace(cellSpan3, newCellSpan3);
  console.log("Cell warning and grabbability patched.");
} else {
  console.error("Could not find cellSpan3!");
}


// --- 4. SIDEBAR VIRTUAL GROOVELAB TEACHER & DRAGSTART PARAMS ---
const sidebarDragStart = `onDragStart={() => handleDragStartMatrix(block.id)}`;
const newSidebarDragStart = `onDragStart={(e) => handleDragStartMatrix(e, block.id)}`;
if (content.includes(sidebarDragStart)) {
  content = content.replace(sidebarDragStart, newSidebarDragStart);
  console.log("Updated sidebar block onDragStart.");
} else {
  console.error("Could not find sidebar block onDragStart!");
}

const sidebarDiv = `<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                  <span style={{ fontSize: '0.72rem', fontWeight: 600, color: '#1c1c1e', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                    <Calendar size={11} style={{ color: '#007aff' }} />`;
const newSidebarDiv = `<div style={{ pointerEvents: 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                  <span style={{ fontSize: '0.72rem', fontWeight: 600, color: '#1c1c1e', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                    <Calendar size={11} style={{ color: '#007aff' }} />`;
if (content.includes(sidebarDiv)) {
  content = content.replace(sidebarDiv, newSidebarDiv);
  console.log("Sidebar div pointerEvents patched.");
} else {
  console.error("Could not find sidebarDiv!");
}

const teacherPushTarget = `                        [...(campusTeachers || []), ...(bypassTeachers || []), ...(coaches || [])].forEach(t => {
                          if (t && t.id && !seenIds.has(t.id)) {
                            seenIds.add(t.id);
                            allTeachersList.push(t);
                          }
                        });`;

const teacherPushReplacement = `                        [...(campusTeachers || []), ...(bypassTeachers || []), ...(coaches || [])].forEach(t => {
                          if (t && t.id && !seenIds.has(t.id)) {
                            seenIds.add(t.id);
                            allTeachersList.push(t);
                          }
                        });
                        // Inject virtual GrooveLab teacher
                        allTeachersList.push({
                          id: 'groovelab',
                          firstName: 'Groove',
                          lastName: 'Lab',
                          instrument: 'Plattform',
                          role: 'teacher'
                        });`;

if (content.includes(teacherPushTarget)) {
  content = content.replace(teacherPushTarget, teacherPushReplacement);
  console.log("GrooveLab virtual teacher injected into sidebar list.");
} else {
  console.error("Could not find teacherPushTarget!");
}


// --- 5. MATRIX DROP VALIDATION ---
const dropMatrixDef = `  const handleDropOnMatrix = (targetRoomId: string | null, targetDay: number) => {
    if (!draggedPlanId || draggedPlanDay === null) return;
    // ── Day-lock: only allow drops within the same weekday column ──
    if (targetDay !== draggedPlanDay) {
      setDraggedPlanId(null);
      setDraggedPlanDay(null);
      return;
    }`;

const newDropMatrixDef = `  const handleDropOnMatrix = (targetRoomId: string | null, targetDay: number) => {
    if (!draggedPlanId || draggedPlanDay === null) return;
    // ── Day-lock: only allow drops within the same weekday column ──
    if (targetDay !== draggedPlanDay) {
      setDraggedPlanId(null);
      setDraggedPlanDay(null);
      return;
    }
    const dayKeys = ['', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    const dayHours = openingHours?.[dayKeys[targetDay]];
    const plan = matrixAllocations.find(p => p.id === draggedPlanId);
    const targetRoom = targetRoomId ? rooms.find(r => r.id === targetRoomId) : null;
    const isGroovelabPlan = plan && (plan.teacherId === 'groovelab' || (targetRoom && targetRoom.name.toLowerCase().includes('groovelab')));
    
    if (isGroovelabPlan && dayHours) {
      if (dayHours.active === false) {
        if (!confirm('Das Groovelab ist an diesem Tag geschlossen. Möchtest du die Zuweisung trotzdem durchführen?')) {
          setDraggedPlanId(null);
          setDraggedPlanDay(null);
          return;
        }
      } else {
        if (plan && dayHours.start && dayHours.end && (plan.startTime < dayHours.start || plan.endTime > dayHours.end)) {
          if (!confirm(\`Die Unterrichtszeit (\${plan.startTime}–\${plan.endTime}) liegt außerhalb der Öffnungszeiten des Groovelabs (\${dayHours.start}–\${dayHours.end}). Zuweisung trotzdem durchführen?\`)) {
            setDraggedPlanId(null);
            setDraggedPlanDay(null);
            return;
          }
        }
      }
    }`;

if (content.includes(dropMatrixDef)) {
  content = content.replace(dropMatrixDef, newDropMatrixDef);
  console.log("Matrix drop validation added.");
} else {
  console.error("Could not find handleDropOnMatrix definition!");
}


// --- 6. TIMELINE VIEWS IN LIVE SCREEN ---
const roomsLiveTimelineHeader = `                            {/* Hour Header Bar */}
                            <div style={{ display: 'flex', marginBottom: '16px', borderBottom: '2px solid #f1f5f9', paddingBottom: '10px' }}>`;

const newRoomsLiveTimelineHeader = `                            {/* Closed notification overlay */}
                            {(() => {
                              const dayKeys = ['', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
                              const liveHours = openingHours?.[dayKeys[liveViewDay]];
                              const isLiveClosed = liveHours?.active === false;
                              if (isLiveClosed) {
                                return (
                                  <div style={{ background: '#fef2f2', border: '1.5px solid #fee2e2', color: '#ef4444', padding: '16px', borderRadius: '16px', display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
                                    <AlertCircle size={20} />
                                    <div>
                                      <strong style={{ fontSize: '0.88rem', display: 'block', fontWeight: 800 }}>Groovelab geschlossen</strong>
                                      <span style={{ fontSize: '0.78rem', opacity: 0.9, fontWeight: 600 }}>Das Groovelab ist am {['','Montag','Dienstag','Mittwoch','Donnerstag','Freitag','Samstag','Sonntag'][liveViewDay]} geschlossen. (Die hier gezeigten Timelines gelten für Groovelab-Räume)</span>
                                    </div>
                                  </div>
                                );
                              }
                              return null;
                            })()}
                            
                            {/* Hour Header Bar */}
                            <div style={{ display: 'flex', marginBottom: '16px', borderBottom: '2px solid #f1f5f9', paddingBottom: '10px' }}>`;

if (content.includes(roomsLiveTimelineHeader)) {
  content = content.replace(roomsLiveTimelineHeader, newRoomsLiveTimelineHeader);
  console.log("Timeline closed header notice added.");
} else {
  console.error("Could not find roomsLiveTimelineHeader!");
}

const visualGridLines = `                                      {/* Visual Hour Grid lines */}
                                      <div style={{ position: 'absolute', inset: 0, display: 'flex', justifyContent: 'space-between', pointerEvents: 'none', paddingLeft: '20px', paddingRight: '20px' }}>
                                        {[1,2,3,4,5,6,7,8,9].map(i => (
                                          <div key={i} style={{ borderLeft: '1.5px dashed rgba(226, 232, 240, 0.7)', height: '100%' }} />
                                        ))}
                                      </div>`;

const newVisualGridLines = `                                      {/* Visual Hour Grid lines */}
                                      <div style={{ position: 'absolute', inset: 0, display: 'flex', justifyContent: 'space-between', pointerEvents: 'none', paddingLeft: '20px', paddingRight: '20px' }}>
                                        {[1,2,3,4,5,6,7,8,9].map(i => (
                                          <div key={i} style={{ borderLeft: '1.5px dashed rgba(226, 232, 240, 0.7)', height: '100%' }} />
                                        ))}
                                      </div>

                                      {/* Inactive/Closed Zone Overlays */}
                                      {(() => {
                                        // Only show inactive overlays for GrooveLab rooms
                                        const isGroovelabRoom = room.name.toLowerCase().includes('groovelab');
                                        if (!isGroovelabRoom) return null;

                                        const dayKeys = ['', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
                                        const liveHours = openingHours?.[dayKeys[liveViewDay]];
                                        if (!liveHours || liveHours.active === false) return null;
                                        if (!liveHours.start || !liveHours.end) return null;

                                        const tToM = (t: string) => {
                                          const [h, m] = t.split(':').map(Number);
                                          return h * 60 + m;
                                        };

                                        const startMin = tToM(liveHours.start);
                                        const endMin = tToM(liveHours.end);

                                        // Timeline is 13:00 (780 mins) to 21:00 (1260 mins). Duration 480 mins.
                                        const leftZoneWidth = Math.max(0, Math.min(100, ((startMin - 780) / 480) * 100));
                                        const rightZoneLeft = Math.max(0, Math.min(100, ((endMin - 780) / 480) * 100));
                                        const rightZoneWidth = 100 - rightZoneLeft;

                                        return (
                                          <>
                                            {leftZoneWidth > 0 && (
                                              <div style={{
                                                position: 'absolute',
                                                left: 0,
                                                top: 0,
                                                bottom: 0,
                                                width: \`\${leftZoneWidth}%\`,
                                                background: 'repeating-linear-gradient(45deg, rgba(241,245,249,0.5), rgba(241,245,249,0.5) 5px, rgba(226,232,240,0.5) 5px, rgba(226,232,240,0.5) 10px)',
                                                borderRight: '1px solid rgba(203,213,225,0.4)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                color: '#94a3b8',
                                                fontSize: '0.62rem',
                                                fontWeight: 800,
                                                pointerEvents: 'none',
                                                zIndex: 1
                                              }}>
                                                Geschlossen
                                              </div>
                                            )}
                                            {rightZoneWidth > 0 && (
                                              <div style={{
                                                position: 'absolute',
                                                left: \`\${rightZoneLeft}%\`,
                                                top: 0,
                                                bottom: 0,
                                                width: \`\${rightZoneWidth}%\`,
                                                background: 'repeating-linear-gradient(45deg, rgba(241,245,249,0.5), rgba(241,245,249,0.5) 5px, rgba(226,232,240,0.5) 5px, rgba(226,232,240,0.5) 10px)',
                                                borderLeft: '1px solid rgba(203,213,225,0.4)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                color: '#94a3b8',
                                                fontSize: '0.62rem',
                                                fontWeight: 800,
                                                pointerEvents: 'none',
                                                zIndex: 1
                                              }}>
                                                Geschlossen
                                              </div>
                                            )}
                                          </>
                                        );
                                      })()}`;

if (content.includes(visualGridLines)) {
  content = content.replace(visualGridLines, newVisualGridLines);
  console.log("Timeline closed overlays added.");
} else {
  console.error("Could not find visualGridLines!");
}

fs.writeFileSync(filePath, content, 'utf8');
console.log("Successfully patched both grabbability and opening hours into SecretaryDashboard.");
