import { createClient } from '@supabase/supabase-js';

const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient('https://supabase.campus-groovelab.de', SERVICE_KEY);

async function run() {
  console.log("Fetching existing dummy program points...");
  const { data: points, error } = await supabase
    .from('campus_event_program_points')
    .select('id, name, instrument, performer_count');

  if (error) {
    console.error("Error fetching program points:", error);
    return;
  }

  console.log(`Found ${points.length} program points. Enriching dummies with rich tech & stage requirements...`);

  let updatedCount = 0;
  for (const pp of points) {
    if (pp.name.includes('(') && pp.name.includes(')') && !pp.is_pause) {
      const chairs = Math.floor(Math.random() * 3);
      const stands = Math.floor(Math.random() * 3);
      
      let techItems = [];
      let remarks = "";
      
      const instr = (pp.instrument || '').toLowerCase();
      if (instr.includes('gitarre') || instr.includes('bass')) {
        techItems = [
          { id: '1', type: 'D.I. Box', count: 1, connection: 'Line-In', source: 'venue', notes: 'Für E-Gitarre/Bass Amp' },
          { id: '2', type: 'Mikrofon', count: 1, connection: 'XLR', source: 'venue', notes: 'Gesang' }
        ];
        remarks = "Benötigen Stromanschluss in Bühnennähe für Effektgeräte.";
      } else if (instr.includes('schlagzeug')) {
        techItems = [
          { id: '1', type: 'Schlagzeug-Set', count: 1, connection: 'Mikrofonierung', source: 'venue', notes: 'Komplett abgenommen' }
        ];
        remarks = "Eigenes Beckenset wird mitgebracht.";
      } else if (instr.includes('klavier')) {
        techItems = [
          { id: '1', type: 'Mikrofon', count: 2, connection: 'XLR', source: 'venue', notes: 'Klavierabnahme Stereo' }
        ];
        remarks = "Flügel bitte vorab stimmen.";
      } else if (instr.includes('saxophon') || instr.includes('trompete') || instr.includes('blasinstrument')) {
        techItems = [
          { id: '1', type: 'Mikrofon', count: 1, connection: 'XLR', source: 'venue', notes: 'Clip-Mikro oder Stativ' }
        ];
        remarks = "Kein Monitorweg notwendig.";
      } else {
        techItems = [
          { id: '1', type: 'Mikrofon', count: pp.performer_count || 1, connection: 'XLR', source: 'venue', notes: 'Gesangsmikrofone' }
        ];
        remarks = "Etwas Hall/Reverb auf den Gesangsstimmen erwünscht.";
      }

      const { error: updateErr } = await supabase
        .from('campus_event_program_points')
        .update({
          chairs_needed: chairs,
          music_stands_needed: stands,
          remarks: remarks || null,
          tech_requirements: techItems.length > 0 ? JSON.stringify(techItems) : null
        })
        .eq('id', pp.id);

      if (updateErr) {
        console.error(`Error updating dummy ${pp.name}:`, updateErr.message);
      } else {
        updatedCount++;
      }
    }
  }

  console.log(`🎉 Finished! Successfully updated ${updatedCount} dummy program points with rich details.`);
}

run();
