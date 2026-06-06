const url = "https://outlook.office365.com/owa/calendar/45e6a16199ae444e974cf3734124f5ca%40musaek.de/3c834c12f39d4812acfa86e46117472e6747636308118952542/calendar.ics";

const proxies = [
  { name: "AllOrigins Raw", url: `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}` },
  { name: "AllOrigins JSON", url: `https://api.allorigins.win/get?url=${encodeURIComponent(url)}` },
  { name: "Codetabs", url: `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}` },
  { name: "CORSProxy.io", url: `https://corsproxy.io/?${encodeURIComponent(url)}` },
  { name: "HTMLDriven", url: `https://cors-proxy.htmldriven.com/?url=${encodeURIComponent(url)}` },
  { name: "ThingProxy", url: `https://thingproxy.freeboard.io/fetch/${url}` },
  { name: "Bridge", url: `https://cors.bridged.cc/${url}` }
];

async function testAll() {
  for (const proxy of proxies) {
    console.log(`\nTesting ${proxy.name}...`);
    try {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), 6000); // 6s timeout
      
      const res = await fetch(proxy.url, { signal: controller.signal });
      clearTimeout(id);
      
      console.log(`Status: ${res.status}`);
      const text = await res.text();
      console.log(`Length: ${text.length}`);
      if (res.status === 200 && text.length > 500 && text.includes("BEGIN:VCALENDAR")) {
        console.log(`🎉 SUCCESS! First 100 chars: ${text.substring(0, 100).replace(/\r?\n/g, ' ')}`);
      } else {
        console.log(`FAIL: Not a valid calendar response. Preview: ${text.substring(0, 150).replace(/\r?\n/g, ' ')}`);
      }
    } catch (err) {
      console.log(`Error: ${err.message}`);
    }
  }
}

testAll();
