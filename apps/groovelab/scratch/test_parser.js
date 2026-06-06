import fs from 'fs';

const icsText = fs.readFileSync('/Users/patrickhuber/.gemini/antigravity/brain/70957cbc-0704-42cd-bf8c-0ca1a89895bb/.system_generated/steps/317/content.md', 'utf-8');

// Strip the first few lines of download metadata
const icsClean = icsText.substring(icsText.indexOf("BEGIN:VCALENDAR"));

const parseICSDate = (icsDateStr) => {
  try {
    const cleanStr = icsDateStr.includes(':') ? icsDateStr.split(':')[1] : icsDateStr;
    const year = parseInt(cleanStr.substring(0, 4));
    const month = parseInt(cleanStr.substring(4, 6)) - 1;
    const day = parseInt(cleanStr.substring(6, 8));

    if (cleanStr.includes('T')) {
      const hour = parseInt(cleanStr.substring(9, 11));
      const min = parseInt(cleanStr.substring(11, 13));
      const sec = parseInt(cleanStr.substring(13, 15));
      return new Date(Date.UTC(year, month, day, hour, min, sec));
    }
    return new Date(year, month, day);
  } catch (err) {
    console.error("Error parsing date string:", icsDateStr, err.message);
    throw err;
  }
};

const parseICS = (icsText) => {
  const events = [];
  const lines = icsText.split(/\r?\n/);
  let currentEvent = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line === 'BEGIN:VEVENT') {
      currentEvent = {};
    } else if (line === 'END:VEVENT' && currentEvent) {
      if (currentEvent.summary && currentEvent.dtstart) {
        events.push(currentEvent);
      }
      currentEvent = null;
    } else if (currentEvent) {
      const colonIdx = line.indexOf(':');
      if (colonIdx !== -1) {
        const key = line.substring(0, colonIdx);
        const value = line.substring(colonIdx + 1);

        if (key.startsWith('SUMMARY')) {
          currentEvent.summary = value;
        } else if (key.startsWith('DESCRIPTION')) {
          currentEvent.description = value.replace(/\\n/g, '\n');
        } else if (key.startsWith('DTSTART')) {
          currentEvent.dtstart = parseICSDate(value);
        } else if (key.startsWith('DTEND')) {
          currentEvent.dtend = parseICSDate(value);
        } else if (key.startsWith('LOCATION')) {
          currentEvent.location = value;
        }
      }
    }
  }
  return events;
};

try {
  const events = parseICS(icsClean);
  console.log("Parsed events count:", events.length);
  if (events.length > 0) {
    console.log("First parsed event:", events[0]);
    console.log("Sample formats parsed:");
    events.slice(0, 5).forEach((ev, idx) => {
      console.log(`${idx + 1}. ${ev.summary} | Date: ${ev.dtstart.toISOString()} | Location: ${ev.location}`);
    });
  }
} catch (err) {
  console.error("Parser threw error:", err);
}
