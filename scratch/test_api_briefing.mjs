const userId = "02b976e8-0893-443b-a41a-5e7010fd05f3";
const url = `http://localhost:5173/api/briefing/student?userId=${userId}`;

console.log("Fetching briefing API...");
try {
  const resp = await fetch(url);
  console.log("Status:", resp.status);
  const text = await resp.text();
  console.log("Response text:", text.substring(0, 500));
} catch (e) {
  console.error("Fetch error:", e);
}
