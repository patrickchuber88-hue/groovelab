const today = new Date('2026-05-29T21:00:00Z'); // Friday
const currentDay = today.getDay() || 7; // Friday is 5
const day_of_week = 3; // Wednesday

console.log("today:", today.toISOString());
console.log("currentDay:", currentDay);

for (let i = 0; i < 4; i++) {
  const targetDate = new Date(today);
  const diff = day_of_week - currentDay + (i * 7);
  targetDate.setDate(today.getDate() + diff);
  console.log(`i=${i}, diff=${diff}, targetDate=${targetDate.toISOString().split('T')[0]}`);
}
