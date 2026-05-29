const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, '../apps/groovelab/src/components/ScheduleCalendarView.tsx');
let content = fs.readFileSync(file, 'utf8');

// 1. Add savePendingChanges
const saveFunction = `
  const savePendingChanges = async () => {
    setLoading(true);
    try {
      const changes = Object.values(pendingChanges);
      for (const change of changes) {
        if (change.id.startsWith('mock-')) {
          const { id, student, ...insertData } = change;
          insertData.original_date = insertData.original_date || change.date;
          insertData.original_start_time = insertData.original_start_time || change.start_time;
          // extract schedule_id from mock id if possible, mock-boardId-studentId
          const parts = id.split('-');
          if (parts.length >= 3) {
             insertData.schedule_id = parts[2]; // we can guess it's the student id or schedule id
          }
          await supabase.from('schedule_occurrences').insert(insertData);
        } else {
          await supabase.from('schedule_occurrences')
            .update({
              date: change.date,
              start_time: change.start_time,
              status: change.status
            })
            .eq('id', change.id);
        }
      }
      setPendingChanges({});
      // We don't have a reload function, but we can refetch by tricking the weekStart trigger
      const current = new Date(currentDate);
      setCurrentDate(new Date(current.getTime() + 1));
      setTimeout(() => setCurrentDate(current), 10);
    } catch (err) {
      console.error(err);
      alert('Fehler beim Speichern');
    } finally {
      setLoading(false);
    }
  };
`;

content = content.replace(
  "  const handleCancel = (e: React.MouseEvent, id: string) => {",
  saveFunction + "\n  const handleCancel = (e: React.MouseEvent, id: string) => {"
);

// 2. Add Save Button
const saveButton = `
          {Object.keys(pendingChanges).length > 0 && (
            <button 
              onClick={savePendingChanges}
              style={{ background: '#0071e3', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 2px 4px rgba(0,113,227,0.3)' }}
              onMouseOver={e => e.currentTarget.style.background = '#0077ED'}
              onMouseOut={e => e.currentTarget.style.background = '#0071e3'}
            >
              Änderungen speichern ({Object.keys(pendingChanges).length})
            </button>
          )}
`;

content = content.replace(
  "          <button \n            onClick={jumpToToday}",
  saveButton + "          <button \n            onClick={jumpToToday}"
);

fs.writeFileSync(file, content);
