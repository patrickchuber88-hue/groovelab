import fs from 'fs';
import path from 'path';

const filePath = path.resolve('apps/groovelab/src/components/CampusEventsBoard.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Redefine handleAddPause
const oldHandleAddPause = `  const handleAddPause = async (e: React.FormEvent) => {
    e.preventDefault();
    const activeEvent = secretaryPlanningEvent || selectedEvent;
    if (!activeEvent) return;
    const durationVal = parseInt(pauseDuration, 10);
    if (isNaN(durationVal) || durationVal <= 0) {
      alert('Bitte geben Sie eine gültige Pausendauer ein (eine positive Zahl).');
      return;
    }
    const activeStagePoints = programPoints.filter(pp => (pp.is_scheduled || pp.is_pause) && (pp.stage_number || 1) === activeStage);
    const nextSortOrder = activeStagePoints.length;
    try {
      const { data, error } = await supabase
        .from('campus_event_program_points')
        .insert({
          event_id: activeEvent.id,
          school_id: activeEvent.school_id || schoolId,
          name: 'Pause / Unterbrechung',
          duration: durationVal,
          is_pause: true,
          status: 'approved',
          sort_order: nextSortOrder,
          stage_number: activeStage,
          is_scheduled: true
        })
        .select()
        .single();
      if (error) throw error;
      setProgramPoints(prev => [...prev, data]);
      setPauseDuration('');
    } catch (err: any) {
      alert('Fehler beim Einfügen der Pause: ' + err.message);
    }
  };`;

const newHandleAddPause = `  const handleAddPause = async (defaultDuration: number = 15) => {
    const activeEvent = secretaryPlanningEvent || selectedEvent;
    if (!activeEvent) return;
    const activeStagePoints = programPoints.filter(pp => (pp.is_scheduled || pp.is_pause) && (pp.stage_number || 1) === activeStage);
    const nextSortOrder = activeStagePoints.length;
    try {
      const { data, error } = await supabase
        .from('campus_event_program_points')
        .insert({
          event_id: activeEvent.id,
          school_id: activeEvent.school_id || schoolId,
          name: 'Pause / Unterbrechung',
          duration: defaultDuration,
          is_pause: true,
          status: 'approved',
          sort_order: nextSortOrder,
          stage_number: activeStage,
          is_scheduled: true
        })
        .select()
        .single();
      if (error) throw error;
      setProgramPoints(prev => [...prev, data]);
    } catch (err: any) {
      alert('Fehler beim Einfügen der Pause: ' + err.message);
    }
  };`;

// 2. Adjust Transition Time Button Map from 0, 5, 10, 15 to 0, 1, 2, 5
const oldTransitionTimeMap = `                      {[0, 5, 10, 15].map(min => (`;
const newTransitionTimeMap = `                      {[0, 1, 2, 5].map(min => (`;

// 3. Remove Stage count editor & Start time editor
const oldEditorsContainer = `                  {/* Stage count editor */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#384a3c', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Bühnen Anzahl:
                    </label>
                    <select
                      value={stageCount}
                      onChange={async (e) => {
                        const val = parseInt(e.target.value, 10);
                        setStageCount(val);
                        const activeEv = secretaryPlanningEvent || selectedEvent;
                        if (activeEv) {
                          await supabase.from('campus_events').update({ stage_count: val }).eq('id', activeEv.id);
                          // Auto update active stage if it exceeds new count
                          if (activeStage > val) setActiveStage(val);
                        }
                      }}
                      className="google-input google-input-noicon"
                      style={{ width: '100px', height: '32px', padding: '0 8px', fontSize: '0.78rem' }}
                    >
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => <option key={n} value={n}>{n} Bühne{n !== 1 ? 'n' : ''}</option>)}
                    </select>
                  </div>

                  {/* Umbau-Puffer segmented control */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: 'auto' }}>
                    <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#384a3c', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Umbau-Puffer:
                    </label>
                    <div style={{ 
                      display: 'flex', 
                      background: 'rgba(120, 120, 128, 0.06)', 
                      padding: '3px', 
                      borderRadius: '8px', 
                      gap: '2px'
                    }}>
                      {[0, 1, 2, 5].map(min => (
                        <button
                          key={min}
                          type="button"
                          onClick={() => {
                            setTransitionTime(min);
                            const activeEv = secretaryPlanningEvent || selectedEvent;
                            if (activeEv) {
                              localStorage.setItem(\`groovelab_event_transition_time_\${activeEv.id}\`, String(min));
                            }
                          }}
                          style={{
                            padding: '4px 10px',
                            borderRadius: '6px',
                            border: 'none',
                            background: transitionTime === min ? '#ffffff' : 'transparent',
                            color: transitionTime === min ? '#1f1f1f' : '#6e6e73',
                            fontWeight: 'bold',
                            fontSize: '0.74rem',
                            cursor: 'pointer',
                            boxShadow: transitionTime === min ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          {min} Min
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Start time editor */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#384a3c', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Startzeit:
                    </label>
                    <input
                      type="time"
                      value={eventStartTime || '14:00'}
                      onChange={async (e) => {
                        const val = e.target.value;
                        setEventStartTime(val);
                        const activeEv = secretaryPlanningEvent || selectedEvent;
                        if (activeEv) {
                          await supabase.from('campus_events').update({ event_start_time: val }).eq('id', activeEv.id);
                        }
                      }}
                      className="google-input google-input-noicon"
                      style={{ width: '90px', height: '32px', padding: '0 8px', fontSize: '0.78rem', fontWeight: 'bold' }}
                    />
                  </div>`;

const newEditorsContainer = `                  {/* Umbau-Puffer segmented control */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: 'auto' }}>
                    <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#384a3c', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Umbau-Puffer:
                    </label>
                    <div style={{ 
                      display: 'flex', 
                      background: 'rgba(120, 120, 128, 0.06)', 
                      padding: '3px', 
                      borderRadius: '8px', 
                      gap: '2px'
                    }}>
                      {[0, 1, 2, 5].map(min => (
                        <button
                          key={min}
                          type="button"
                          onClick={() => {
                            setTransitionTime(min);
                            const activeEv = secretaryPlanningEvent || selectedEvent;
                            if (activeEv) {
                              localStorage.setItem(\`groovelab_event_transition_time_\${activeEv.id}\`, String(min));
                            }
                          }}
                          style={{
                            padding: '4px 10px',
                            borderRadius: '6px',
                            border: 'none',
                            background: transitionTime === min ? '#ffffff' : 'transparent',
                            color: transitionTime === min ? '#1f1f1f' : '#6e6e73',
                            fontWeight: 'bold',
                            fontSize: '0.74rem',
                            cursor: 'pointer',
                            boxShadow: transitionTime === min ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          {min} Min
                        </button>
                      ))}
                    </div>
                  </div>`;

// 4. Fullscreen wrapper container
const oldFullscreenWrapper = `<div style={{ display: 'flex', gap: '24px', height: 'calc(100vh - 280px)', minHeight: '500px' }}>`;
const newFullscreenWrapper = `<div style={{
                  display: 'flex',
                  gap: '24px',
                  height: isTimelineFullscreen ? '100vh' : 'calc(100vh - 280px)',
                  minHeight: isTimelineFullscreen ? 'none' : '500px',
                  position: isTimelineFullscreen ? 'fixed' : 'relative',
                  top: isTimelineFullscreen ? 0 : 'auto',
                  left: isTimelineFullscreen ? 0 : 'auto',
                  right: isTimelineFullscreen ? 0 : 'auto',
                  bottom: isTimelineFullscreen ? 0 : 'auto',
                  width: isTimelineFullscreen ? '100vw' : 'auto',
                  zIndex: isTimelineFullscreen ? 99999 : 'auto',
                  background: isTimelineFullscreen ? '#f8fafc' : 'transparent',
                  padding: isTimelineFullscreen ? '24px 32px' : '0',
                  boxSizing: 'border-box'
                }}>`;

// 5. Right column (Stage Timeline) styling in Fullscreen
const oldTimelineColumnStyle = `                    style={{
                      flex: 1.6,
                      background: '#ffffff',
                      borderRadius: isTimelineFullscreen ? '0' : '16px',
                      border: isTimelineFullscreen ? 'none' : '1px solid #cbd5e1',
                      boxShadow: isTimelineFullscreen ? 'none' : '0 1px 3px rgba(0,0,0,0.05)',
                      padding: isTimelineFullscreen ? '32px' : '20px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '16px',
                      boxSizing: 'border-box',
                      position: isTimelineFullscreen ? 'fixed' : 'relative',
                      top: isTimelineFullscreen ? 0 : 'auto',
                      left: isTimelineFullscreen ? 0 : 'auto',
                      right: isTimelineFullscreen ? 0 : 'auto',
                      bottom: isTimelineFullscreen ? 0 : 'auto',
                      width: isTimelineFullscreen ? '100vw' : 'auto',
                      height: isTimelineFullscreen ? '100vh' : 'auto',
                      zIndex: isTimelineFullscreen ? 99999 : 'auto'
                    }}`;

const newTimelineColumnStyle = `                    style={{
                      flex: 1.6,
                      background: '#ffffff',
                      borderRadius: '16px',
                      border: isTimelineFullscreen ? '1px solid #cbd5e1' : '1px solid #cbd5e1',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                      padding: '20px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '16px',
                      boxSizing: 'border-box'
                    }}`;

// 6. Header title layout: Move Startzeit and Bühnenanzahl adjacent to "Bühne X - Ablaufplan"
const oldHeaderTitle = `                      <h4 style={{ margin: 0, fontSize: '0.92rem', fontWeight: 700, color: '#1f1f1f' }}>
                        Bühne {activeStage} - Ablaufplan
                      </h4>`;

const newHeaderTitle = `                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                        <h4 style={{ margin: 0, fontSize: '0.92rem', fontWeight: 700, color: '#1f1f1f' }}>
                          Bühne {activeStage} - Ablaufplan
                        </h4>
                        
                        {/* Compact Startzeit Input */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', borderLeft: '1px solid #cbd5e1', paddingLeft: '12px' }}>
                          <label style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>Start:</label>
                          <input
                            type="time"
                            value={eventStartTime || '14:00'}
                            onChange={async (e) => {
                              const val = e.target.value;
                              setEventStartTime(val);
                              const activeEv = secretaryPlanningEvent || selectedEvent;
                              if (activeEv) {
                                await supabase.from('campus_events').update({ event_start_time: val }).eq('id', activeEv.id);
                              }
                            }}
                            className="google-input google-input-noicon"
                            style={{ 
                              width: '75px', 
                              height: '24px', 
                              padding: '0 4px', 
                              fontSize: '0.76rem', 
                              fontWeight: 'bold', 
                              border: '1px solid #cbd5e1', 
                              borderRadius: '6px',
                              background: '#f8fafc',
                              boxSizing: 'border-box'
                            }}
                          />
                        </div>

                        {/* Compact Bühnenanzahl Select */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', borderLeft: '1px solid #cbd5e1', paddingLeft: '12px' }}>
                          <label style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>Bühnen:</label>
                          <select
                            value={stageCount}
                            onChange={async (e) => {
                              const val = parseInt(e.target.value, 10);
                              setStageCount(val);
                              const activeEv = secretaryPlanningEvent || selectedEvent;
                              if (activeEv) {
                                await supabase.from('campus_events').update({ stage_count: val }).eq('id', activeEv.id);
                                if (activeStage > val) setActiveStage(val);
                              }
                            }}
                            style={{
                              background: '#f8fafc',
                              border: '1px solid #cbd5e1',
                              borderRadius: '6px',
                              fontSize: '0.74rem',
                              fontWeight: 600,
                              padding: '2px 6px',
                              cursor: 'pointer',
                              outline: 'none',
                              height: '24px',
                              boxSizing: 'border-box'
                            }}
                          >
                            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => <option key={n} value={n}>{n}</option>)}
                          </select>
                        </div>
                      </div>`;

// 7. Simplify Pause Form to single button
const oldPauseForm = `                        {/* Add Pause Form */}
                        <form onSubmit={handleAddPause} style={{ display: 'flex', gap: '8px' }}>
                        <input
                          type="number"
                          placeholder="Pause (Min.)"
                          value={pauseDuration}
                          onChange={e => setPauseDuration(e.target.value)}
                          className="google-input google-input-noicon"
                          style={{ 
                            width: '95px', 
                            height: '32px',
                            fontSize: '0.78rem',
                            fontWeight: 600
                          }}
                        />
                        <button
                          type="submit"
                          style={{ 
                            background: brandColor, 
                            color: '#ffffff', 
                            border: 'none', 
                            padding: '0 12px', 
                            borderRadius: '100px', 
                            fontWeight: 'bold', 
                            fontSize: '0.76rem', 
                            cursor: 'pointer',
                            height: '32px',
                            display: 'inline-flex',
                            alignItems: 'center'
                          }}
                        >
                          + Pause
                        </button>
                      </form>`;

const newPauseForm = `                        {/* Add Pause Button */}
                        <button
                          type="button"
                          onClick={() => handleAddPause(15)}
                          style={{ 
                            background: brandColor, 
                            color: '#ffffff', 
                            border: 'none', 
                            padding: '0 16px', 
                            borderRadius: '100px', 
                            fontWeight: 'bold', 
                            fontSize: '0.76rem', 
                            cursor: 'pointer',
                            height: '32px',
                            display: 'inline-flex',
                            alignItems: 'center'
                          }}
                        >
                          + Pause
                        </button>`;

// Normalize all strings and content to perform programmatical replace
let normalized = content.replace(/\r\n/g, '\n');

const applyReplace = (target, replacement, name) => {
  const normTarget = target.replace(/\r?\n/g, '\n');
  const normRepl = replacement.replace(/\r?\n/g, '\n');
  if (normalized.includes(normTarget)) {
    normalized = normalized.replace(normTarget, normRepl);
    console.log(`✅ ${name} replaced successfully!`);
  } else {
    console.error(`❌ ${name} target block not found!`);
  }
};

applyReplace(oldHandleAddPause, newHandleAddPause, "handleAddPause function");
applyReplace(oldTransitionTimeMap, newTransitionTimeMap, "Transition time presets map");
applyReplace(oldEditorsContainer, newEditorsContainer, "Stage and Starttime editors toolbar removal");
applyReplace(oldFullscreenWrapper, newFullscreenWrapper, "Fullscreen layout parent wrapper");
applyReplace(oldTimelineColumnStyle, newTimelineColumnStyle, "Timeline stage column fixed dimensions reset");
applyReplace(oldHeaderTitle, newHeaderTitle, "Timeline header metadata injection");
applyReplace(oldPauseForm, newPauseForm, "Simplified pause button");

// 8. Custom card height adjustments and drag opacity + drop indications
const oldTimelineCardOpen = `                              return (
                                <div
                                  key={pp.id}
                                  draggable={role === 'admin' || role === 'secretary'}
                                  onDragOver={e => {
                                    e.preventDefault();
                                    const rect = e.currentTarget.getBoundingClientRect();
                                    const relativeY = e.clientY - rect.top;
                                    const isAbove = relativeY < rect.height / 2;
                                    setDragOverId(pp.id);
                                    setDragOverPosition(isAbove ? 'above' : 'below');
                                  }}
                                  onDragLeave={() => {
                                    setDragOverId(null);
                                    setDragOverPosition(null);
                                  }}
                                  onDrop={e => {
                                    e.stopPropagation();
                                    setDragOverId(null);
                                    setDragOverPosition(null);
                                    const rect = e.currentTarget.getBoundingClientRect();
                                    const relativeY = e.clientY - rect.top;
                                    const isAbove = relativeY < rect.height / 2;
                                    handleDropOnTimeline(e, pp.id, isAbove);
                                  }}
                                  onDragStart={e => {
                                    e.dataTransfer.setData('ppId', pp.id);
                                    e.dataTransfer.effectAllowed = 'move';
                                  }}`;

const newTimelineCardOpen = `                              return (
                                <div
                                  key={pp.id}
                                  draggable={role === 'admin' || role === 'secretary'}
                                  onDragOver={e => {
                                    e.preventDefault();
                                    const rect = e.currentTarget.getBoundingClientRect();
                                    const relativeY = e.clientY - rect.top;
                                    const isAbove = relativeY < rect.height / 2;
                                    setDragOverId(pp.id);
                                    setDragOverPosition(isAbove ? 'above' : 'below');
                                  }}
                                  onDragLeave={() => {
                                    setDragOverId(null);
                                    setDragOverPosition(null);
                                  }}
                                  onDrop={e => {
                                    e.stopPropagation();
                                    setDragOverId(null);
                                    setDragOverPosition(null);
                                    const rect = e.currentTarget.getBoundingClientRect();
                                    const relativeY = e.clientY - rect.top;
                                    const isAbove = relativeY < rect.height / 2;
                                    handleDropOnTimeline(e, pp.id, isAbove);
                                  }}
                                  onDragStart={e => {
                                    e.dataTransfer.setData('ppId', pp.id);
                                    e.dataTransfer.effectAllowed = 'move';
                                    setDraggedId(pp.id);
                                  }}
                                  onDragEnd={() => {
                                    setDraggedId(null);
                                  }}`;

applyReplace(oldTimelineCardOpen, newTimelineCardOpen, "Timeline card draggable handlers with draggedId tracking");

// 9. Thick dashed drop-indicators insert
const oldDropIndicators = `                                  {/* Drop indicator lines */}
                                  {dragOverId === pp.id && dragOverPosition === 'above' && (
                                    <div style={{
                                      position: 'absolute',
                                      top: '-8px',
                                      left: '0',
                                      right: '0',
                                      height: '4px',
                                      backgroundColor: brandColor,
                                      borderRadius: '2px',
                                      zIndex: 10
                                    }} />
                                  )}
                                  {dragOverId === pp.id && dragOverPosition === 'below' && (
                                    <div style={{
                                      position: 'absolute',
                                      bottom: '-8px',
                                      left: '0',
                                      right: '0',
                                      height: '4px',
                                      backgroundColor: brandColor,
                                      borderRadius: '2px',
                                      zIndex: 10
                                    }} />
                                  )}`;

const newDropIndicators = `                                  {/* Drop indicator lines */}
                                  {dragOverId === pp.id && dragOverPosition === 'above' && (
                                    <div style={{
                                      position: 'absolute',
                                      top: '-8px',
                                      left: '0',
                                      right: '0',
                                      height: '4px',
                                      borderTop: \`4px dashed \${brandColor}\`,
                                      zIndex: 10
                                    }} />
                                  )}
                                  {dragOverId === pp.id && dragOverPosition === 'below' && (
                                    <div style={{
                                      position: 'absolute',
                                      bottom: '-8px',
                                      left: '0',
                                      right: '0',
                                      height: '4px',
                                      borderBottom: \`4px dashed \${brandColor}\`,
                                      zIndex: 10
                                    }} />
                                  )}`;

applyReplace(oldDropIndicators, newDropIndicators, "Dashed drop indicators styling");

// 10. Card heights, dots positioning, padding, and dragged card opacity
const oldTimelineCardStyles = `                                  style={{
                                    padding: '14px 18px',
                                    background: hasConflict 
                                      ? 'rgba(255, 59, 48, 0.02)' 
                                      : (pp.is_pause ? '#fffbeb' : '#ffffff'),
                                    border: hasConflict 
                                      ? '1.5px solid rgba(255, 59, 48, 0.15)' 
                                      : (pp.is_pause ? '1px solid rgba(245, 158, 11, 0.15)' : '1px solid rgba(0, 0, 0, 0.06)'),
                                    borderRadius: '14px',
                                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.02), 0 1px 3px rgba(0, 0, 0, 0.01)',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    cursor: 'grab',
                                    gap: '16px',
                                    position: 'relative',
                                    transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)'
                                  }}`;

const newTimelineCardStyles = `                                  style={{
                                    padding: '6px 12px',
                                    background: hasConflict 
                                      ? 'rgba(255, 59, 48, 0.02)' 
                                      : (pp.is_pause ? '#fffbeb' : '#ffffff'),
                                    border: hasConflict 
                                      ? '1.5px solid rgba(255, 59, 48, 0.15)' 
                                      : (pp.is_pause ? '1px solid rgba(245, 158, 11, 0.15)' : '1px solid rgba(0, 0, 0, 0.06)'),
                                    borderRadius: '10px',
                                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.02), 0 1px 3px rgba(0, 0, 0, 0.01)',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    cursor: 'grab',
                                    gap: '8px',
                                    position: 'relative',
                                    opacity: draggedId === pp.id ? 0.4 : 1,
                                    transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)'
                                  }}`;

applyReplace(oldTimelineCardStyles, newTimelineCardStyles, "Timeline card styles padding height and opacity");

// 11. Timeline Dot Indicator positioning (vertically centered)
const oldDotIndicator = `                                  <div style={{
                                    position: 'absolute',
                                    left: '-29px',
                                    top: '20px',
                                    width: '8px',
                                    height: '8px',`;

const newDotIndicator = `                                  <div style={{
                                    position: 'absolute',
                                    left: '-29px',
                                    top: 'calc(50% - 4px)',
                                    width: '8px',
                                    height: '8px',`;

applyReplace(oldDotIndicator, newDotIndicator, "Timeline dot indicator vertical centering");

// 12. Timeline Time Text positioning
const oldTimeText = `                                  <div style={{
                                    position: 'absolute',
                                    left: '-88px',
                                    width: '50px',
                                    textAlign: 'right',
                                    top: '16px',`;

const newTimeText = `                                  <div style={{
                                    position: 'absolute',
                                    left: '-88px',
                                    width: '50px',
                                    textAlign: 'right',
                                    top: '8px',`;

applyReplace(oldTimeText, newTimeText, "Timeline time text positioning");

// 13. Left accent indicator bar height
const oldAccentBar = `                                  <div style={{
                                    width: '4px',
                                    alignSelf: 'stretch',
                                    minHeight: '28px',
                                    borderRadius: '100px',`;

const newAccentBar = `                                  <div style={{
                                    width: '4px',
                                    alignSelf: 'stretch',
                                    minHeight: '20px',
                                    borderRadius: '100px',`;

applyReplace(oldAccentBar, newAccentBar, "Left accent indicator bar height");

// 14. Pause card dropdown edit select element
const oldPauseCardContent = `                                      {pp.is_pause && (
                                        <span style={{ 
                                          fontSize: '0.72rem', 
                                          background: 'rgba(245, 158, 11, 0.1)', color: '#d97706',
                                          padding: '2px 6px', 
                                          borderRadius: '4px', 
                                          fontWeight: 700,
                                          letterSpacing: '0.02em',
                                          textTransform: 'uppercase'
                                        }}>
                                          ☕ Pause
                                        </span>
                                      )}
                                      <strong style={{ fontSize: '0.86rem', color: hasConflict ? '#ff3b30' : (pp.is_pause ? '#6e6e73' : '#1d1d1f'), fontWeight: 600 }}>
                                        {pp.name}
                                      </strong>
                                      {!pp.is_pause && (
                                        <span style={{ fontSize: '0.72rem', color: '#86868b', fontWeight: 500, marginLeft: '4px' }}>
                                          ({pp.duration} Min.)
                                        </span>
                                      )}`;

const newPauseCardContent = `                                      {pp.is_pause ? (
                                        <select
                                          value={pp.duration}
                                          onChange={e => handleEditDuration(pp.id, parseInt(e.target.value, 10))}
                                          style={{
                                            background: 'rgba(245, 158, 11, 0.15)',
                                            color: '#d97706',
                                            border: 'none',
                                            borderRadius: '6px',
                                            fontSize: '0.74rem',
                                            fontWeight: 700,
                                            padding: '2px 6px',
                                            cursor: 'pointer',
                                            outline: 'none'
                                          }}
                                        >
                                          <option value="5">☕ 5 Min. Pause</option>
                                          <option value="10">☕ 10 Min. Pause</option>
                                          <option value="15">☕ 15 Min. Pause</option>
                                          <option value="20">☕ 20 Min. Pause</option>
                                          <option value="30">☕ 30 Min. Pause</option>
                                          <option value="45">☕ 45 Min. Pause</option>
                                          <option value="60">☕ 60 Min. Pause</option>
                                        </select>
                                      ) : (
                                        <>
                                          <strong style={{ fontSize: '0.86rem', color: hasConflict ? '#ff3b30' : '#1d1d1f', fontWeight: 600 }}>
                                            {pp.name}
                                          </strong>
                                          <span style={{ fontSize: '0.72rem', color: '#86868b', fontWeight: 500, marginLeft: '4px' }}>
                                            ({pp.duration} Min.)
                                          </span>
                                        </>
                                      )}`;

applyReplace(oldPauseCardContent, newPauseCardContent, "Pause card select dropdown editor");

// 15. Hide stepper pill if pause
const oldStepperContainer = `                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '3px' }}>
                                      <label style={{ 
                                        fontSize: '0.58rem', 
                                        color: '#86868b', 
                                        fontWeight: 700, 
                                        textTransform: 'uppercase', 
                                        letterSpacing: '0.05em' 
                                      }}>
                                        Dauer
                                      </label>
                                      
                                      {/* Custom Stepper Pill */}
                                      <div style={{ 
                                        display: 'flex', 
                                        alignItems: 'center', 
                                        background: '#f5f5f7', 
                                        borderRadius: '8px', 
                                        padding: '2px',
                                        border: '1px solid rgba(0, 0, 0, 0.04)',
                                        boxSizing: 'border-box',
                                        height: '28px'
                                      }}>
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleEditDuration(pp.id, Math.max(1, pp.duration - 1));
                                          }}
                                          style={{
                                            border: 'none',
                                            background: 'transparent',
                                            cursor: 'pointer',
                                            width: '24px',
                                            height: '24px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            borderRadius: '6px',
                                            color: '#1d1d1f',
                                            transition: 'background 0.2s'
                                          }}
                                          onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,0,0,0.05)'}
                                          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                        >
                                          <Minus size={12} strokeWidth={2.5} />
                                        </button>
                                        
                                        <input
                                          type="number"
                                          min="1"
                                          value={pp.duration}
                                          onChange={e => handleEditDuration(pp.id, Math.max(1, parseInt(e.target.value, 10) || 1))}
                                          className="mini-time-input"
                                          style={{
                                            width: '30px',
                                            border: 'none',
                                            background: 'transparent',
                                            fontSize: '0.78rem',
                                            textAlign: 'center',
                                            fontWeight: 600,
                                            outline: 'none',
                                            padding: 0,
                                            margin: 0,
                                            color: '#1d1d1f',
                                            fontVariantNumeric: 'tabular-nums',
                                            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
                                          }}
                                        />
                                        
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleEditDuration(pp.id, pp.duration + 1);
                                          }}
                                          style={{
                                            border: 'none',
                                            background: 'transparent',
                                            cursor: 'pointer',
                                            width: '24px',
                                            height: '24px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            borderRadius: '6px',
                                            color: '#1d1d1f',
                                            transition: 'background 0.2s'
                                          }}
                                          onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,0,0,0.05)'}
                                          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                        >
                                          <Plus size={12} strokeWidth={2.5} />
                                        </button>
                                      </div>
                                    </div>`;

const newStepperContainer = `                                    {!pp.is_pause && (
                                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '3px' }}>
                                        <label style={{ 
                                          fontSize: '0.58rem', 
                                          color: '#86868b', 
                                          fontWeight: 700, 
                                          textTransform: 'uppercase', 
                                          letterSpacing: '0.05em' 
                                        }}>
                                          Dauer
                                        </label>
                                        
                                        {/* Custom Stepper Pill */}
                                        <div style={{ 
                                          display: 'flex', 
                                          alignItems: 'center', 
                                          background: '#f5f5f7', 
                                          borderRadius: '8px', 
                                          padding: '2px',
                                          border: '1px solid rgba(0, 0, 0, 0.04)',
                                          boxSizing: 'border-box',
                                          height: '28px'
                                        }}>
                                          <button
                                            type="button"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleEditDuration(pp.id, Math.max(1, pp.duration - 1));
                                            }}
                                            style={{
                                              border: 'none',
                                              background: 'transparent',
                                              cursor: 'pointer',
                                              width: '24px',
                                              height: '24px',
                                              display: 'flex',
                                              alignItems: 'center',
                                              justifyContent: 'center',
                                              borderRadius: '6px',
                                              color: '#1d1d1f',
                                              transition: 'background 0.2s'
                                            }}
                                            onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,0,0,0.05)'}
                                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                          >
                                            <Minus size={12} strokeWidth={2.5} />
                                          </button>
                                          
                                          <input
                                            type="number"
                                            min="1"
                                            value={pp.duration}
                                            onChange={e => handleEditDuration(pp.id, Math.max(1, parseInt(e.target.value, 10) || 1))}
                                            className="mini-time-input"
                                            style={{
                                              width: '30px',
                                              border: 'none',
                                              background: 'transparent',
                                              fontSize: '0.78rem',
                                              textAlign: 'center',
                                              fontWeight: 600,
                                              outline: 'none',
                                              padding: 0,
                                              margin: 0,
                                              color: '#1d1d1f',
                                              fontVariantNumeric: 'tabular-nums',
                                              fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
                                            }}
                                          />
                                          
                                          <button
                                            type="button"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleEditDuration(pp.id, pp.duration + 1);
                                            }}
                                            style={{
                                              border: 'none',
                                              background: 'transparent',
                                              cursor: 'pointer',
                                              width: '24px',
                                              height: '24px',
                                              display: 'flex',
                                              alignItems: 'center',
                                              justifyContent: 'center',
                                              borderRadius: '6px',
                                              color: '#1d1d1f',
                                              transition: 'background 0.2s'
                                            }}
                                            onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,0,0,0.05)'}
                                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                          >
                                            <Plus size={12} strokeWidth={2.5} />
                                          </button>
                                        </div>
                                      </div>
                                    )}`;

applyReplace(oldStepperContainer, newStepperContainer, "Stepper duration pill visibility conditional wrapper");

const finalContent = content.includes('\r\n') ? normalized.replace(/\n/g, '\r\n') : normalized;
fs.writeFileSync(filePath, finalContent, 'utf8');
console.log("🏁 All layout patches processed.");
