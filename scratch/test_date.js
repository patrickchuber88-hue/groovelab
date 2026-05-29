const today = new Date();
console.log('today.toString():', today.toString());
console.log('today.toISOString():', today.toISOString());
console.log('today.getDay():', today.getDay());
console.log('today.getDate():', today.getDate());
const currentDay = today.getDay() || 7;
console.log('currentDay (fallback to 7):', currentDay);

for (let day_of_week = 1; day_of_week <= 5; day_of_week++) {
  const targetDate = new Date();
  const diff = day_of_week - currentDay + (1 * 7);
  targetDate.setDate(today.getDate() + diff);
  console.log(`day_of_week: ${day_of_week} -> diff: ${diff} -> dateStr: ${targetDate.toISOString().split('T')[0]} (${targetDate.toLocaleDateString('de-DE', { weekday: 'long' })})`);
}
