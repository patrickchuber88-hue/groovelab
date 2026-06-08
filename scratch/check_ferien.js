const https = require('https');

const url = 'https://outlook.office365.com/owa/calendar/45e6a16199ae444e974cf3734124f5ca%40musaek.de/3c834c12f39d4812acfa86e46117472e6747636308118952542/calendar.ics';

const parseICSDate = (icsDateStr) => {
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
          currentEvent.rawStart = value;
          currentEvent.dtstart = parseICSDate(value);
        } else if (key.startsWith('DTEND')) {
          currentEvent.rawEnd = value;
          currentEvent.dtend = parseICSDate(value);
        } else if (key.startsWith('LOCATION')) {
          currentEvent.location = value;
        }
      }
    }
  }
  return events;
};

https.get(url, (res) => {
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  res.on('end', () => {
    const events = parseICS(data);
    const ferienEvents = events.filter(ev => {
      const title = (ev.summary || '').toLowerCase();
      return title.includes('ferien') || title.includes('feiertag') || title.includes('schulfrei');
    });

    console.log(`Found ${ferienEvents.length} holiday/vacation/free day events:\n`);

    ferienEvents.forEach((ev, idx) => {
      const isAllDay = ev.rawEnd && !ev.rawEnd.includes('T');
      let adjustedEnd = ev.dtend ? new Date(ev.dtend) : new Date(ev.dtstart);
      if (ev.dtend && isAllDay) {
        adjustedEnd.setDate(adjustedEnd.getDate() - 1);
      }

      const toYYYYMMDD = (d) => {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
      };

      const originalStartStr = toYYYYMMDD(ev.dtstart);
      const adjustedEndStr = toYYYYMMDD(adjustedEnd);
      const rawEndStr = ev.dtend ? toYYYYMMDD(ev.dtend) : 'N/A';

      // Calculate duration in days (including both start and end dates)
      // Since it's all day, e.g. Start 2026-06-20 to End 2026-06-20 is 1 day.
      const diffTime = Math.abs(adjustedEnd - ev.dtstart);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

      console.log(`${idx + 1}. Title: "${ev.summary}"`);
      console.log(`   Raw Start:   ${ev.rawStart} -> Parsed Start Date: ${originalStartStr}`);
      console.log(`   Raw End:     ${ev.rawEnd} -> Parsed Raw End Date: ${rawEndStr}`);
      console.log(`   Adjusted End Date (for All-Day): ${adjustedEndStr}`);
      console.log(`   Calculated Duration: ${diffDays} day(s)`);
      console.log('--------------------------------------------------');
    });
  });
});
