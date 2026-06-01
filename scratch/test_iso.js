const getISOWeek = (dateInput) => {
  const date = dateInput ? new Date(dateInput) : new Date();
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
};

console.log("Current time week:", getISOWeek("2026-05-31T21:22:25+03:00"));
console.log("Record [0] updated_at week:", getISOWeek("2026-05-31T18:21:42.01+00:00"));
console.log("Record [1] updated_at week:", getISOWeek("2026-05-31T18:14:12.804+00:00"));
console.log("Without args week:", getISOWeek());
