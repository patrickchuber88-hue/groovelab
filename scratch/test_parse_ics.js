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
    const parsed = parseICS(data).map((ev, index) => {
      const title = ev.summary || 'Abonnierter Termin';
      const isHoliday = title.toLowerCase().includes('ferien') || title.toLowerCase().includes('feiertag') || title.toLowerCase().includes('schulfrei');
      
      let end = ev.dtend ? new Date(ev.dtend) : new Date(ev.dtstart);
      
      // Let's print the actual values before subtracting to see what they are!
      if (title.includes('Musikschulfest')) {
        console.log("Before adjustment for Musikschulfest:");
        console.log("ev.rawStart:", ev.rawStart);
        console.log("ev.rawEnd:", ev.rawEnd);
        console.log("ev.dtstart:", ev.dtstart);
        console.log("ev.dtend:", ev.dtend);
        console.log("ev.dtend.toISOString():", ev.dtend ? ev.dtend.toISOString() : 'none');
      }

      const isAllDay = ev.rawEnd && !ev.rawEnd.includes('T');
      if (title.includes('Musikschulfest')) {
        console.log("isAllDay:", isAllDay);
      }

      if (ev.dtend && isAllDay) {
        end.setDate(end.getDate() - 1);
      }
      
      const toYYYYMMDD = (d) => {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
      };

      return {
        id: `sub-${index}-${ev.dtstart.getTime()}`,
        title,
        description: ev.description || '',
        event_date: toYYYYMMDD(ev.dtstart),
        event_end_date: toYYYYMMDD(end),
        start_time: ev.dtstart ? ev.dtstart.toTimeString().substring(0, 5) : '00:00',
        category: isHoliday ? 'Ferien' : 'Schultermin',
        is_subscribed: true
      };
    });

    const fest = parsed.find(ev => ev.title.includes('Musikschulfest'));
    console.log("\nParsed Musikschulfest object:");
    console.log(fest);
  });
});
