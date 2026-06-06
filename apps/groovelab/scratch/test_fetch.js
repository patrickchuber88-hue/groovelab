
const url = "https://outlook.office365.com/owa/calendar/45e6a16199ae444e974cf3734124f5ca%40musaek.de/3c834c12f39d4812acfa86e46117472e6747636308118952542/calendar.ics";

async function testFetch() {
  console.log("Direct Fetch:");
  try {
    const res = await fetch(url);
    console.log("Direct Status:", res.status);
    const text = await res.text();
    console.log("Direct Length:", text.length);
  } catch (err) {
    console.log("Direct Error:", err.message);
  }

  console.log("\nCodetabs Proxy Fetch:");
  try {
    const proxyUrl = `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`;
    const res = await fetch(proxyUrl);
    console.log("Proxy Status:", res.status);
    const text = await res.text();
    console.log("Proxy contents length:", text.length);
    console.log("First 200 chars of contents:", text.substring(0, 200));
  } catch (err) {
    console.log("Proxy Error:", err.message);
  }
}

testFetch();
