const https = require('https');

const url = 'https://outlook.office365.com/owa/calendar/45e6a16199ae444e974cf3734124f5ca%40musaek.de/3c834c12f39d4812acfa86e46117472e6747636308118952542/calendar.ics';

https.get(url, (res) => {
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  res.on('end', () => {
    const lines = data.split(/\r?\n/);
    let insideVEvent = false;
    let currentEventLines = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.trim() === 'BEGIN:VEVENT') {
        insideVEvent = true;
        currentEventLines = [line];
      } else if (line.trim() === 'END:VEVENT') {
        currentEventLines.push(line);
        const eventText = currentEventLines.join('\n');
        if (eventText.includes('20260619') || eventText.includes('20260620') || eventText.includes('20260621')) {
          console.log("=== Found Event near June 20, 2026 ===");
          console.log(eventText);
          console.log("===================\n");
        }
        insideVEvent = false;
      } else if (insideVEvent) {
        currentEventLines.push(line);
      }
    }
  });
}).on('error', (err) => {
  console.error("HTTP Error:", err);
});
