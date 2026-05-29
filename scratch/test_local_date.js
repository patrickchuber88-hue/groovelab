const today = new Date();
const currentDay = today.getDay() || 7;

for (let day_of_week = 1; day_of_week <= 5; day_of_week++) {
  const targetDate = new Date();
  const diff = day_of_week - currentDay + (1 * 7);
  targetDate.setDate(today.getDate() + diff);
  
  // Format using local getters
  const yyyy = targetDate.getFullYear();
  const mm = String(targetDate.getMonth() + 1).padStart(2, '0');
  const dd = String(targetDate.getDate()).padStart(2, '0');
  const localDateStr = `${yyyy}-${mm}-${dd}`;
  
  console.log(`day_of_week: ${day_of_week} -> localDateStr: ${localDateStr} (${targetDate.toLocaleDateString('de-DE', { weekday: 'long' })})`);
}
