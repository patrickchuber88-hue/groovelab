import fs from 'fs';

const filePath = '/Users/patrickhuber/Documents/Antigravity Projects/Groovelab app/src/App.tsx';
let content = fs.readFileSync(filePath, 'utf-8');

// The block to extract
const startMarker = "            // 2.5 Add existing Band Proposals (Guest Search)";
const endMarker = "            // 3. Fallback: Only show if there is actually at least one unmatched mastered musician!";

const startIndex = content.indexOf(startMarker);
const endIndex = content.indexOf(endMarker);

if (startIndex === -1 || endIndex === -1) {
  console.log("MARKERS NOT FOUND");
  process.exit(1);
}

let blockToMove = content.substring(startIndex, endIndex);

// Remove the block from its original position
content = content.substring(0, startIndex) + content.substring(endIndex);

// Define the insertion point (after formationsList declaration)
const insertMarker = "            const formationsList: any[] = [];\n";
const insertIndex = content.indexOf(insertMarker) + insertMarker.length;

if (insertIndex === -1 + insertMarker.length) {
  console.log("INSERT MARKER NOT FOUND");
  process.exit(1);
}

// Modify the block to build allBandFormations
blockToMove = "            const allBandFormations: any[] = [];\n" + blockToMove.replace(
  "            projectsForThisSong.forEach((bs: any) => {",
  "            projectsForThisSong.forEach((bs: any) => {"
).replace(
  /              if \(instrumentalists >= totalRequired\) \{\s+if \(!\(bs\.status === 'proposal' && isUserBandMember\)\) \{\s+return;\s+\}\s+\}/g,
  "              const formationObj = {\n" +
  "                id: `band_${bs.id}`,\n" +
  "                originBand: band,\n" +
  "                bandSongId: bs.id,\n" +
  "                band_song_slots: bs.band_song_slots || [],\n" +
  "                song_id: song.id,\n" +
  "                status: bs.status,\n" +
  "                members,\n" +
  "                memberMap: members.reduce((acc: any, m: any) => ({ ...acc, [`${m.instrument}_${m.part_number}`]: m }), {}),\n" +
  "                level\n" +
  "              };\n\n" +
  "              allBandFormations.push(formationObj);\n\n" +
  "              if (instrumentalists >= totalRequired) {\n" +
  "                if (!(bs.status === 'proposal' && isUserBandMember)) {\n" +
  "                  return;\n" +
  "                }\n" +
  "              }"
).replace(
  /              formationsList\.push\(\{[\s\S]*?level\n              \}\);/g,
  "              formationsList.push(formationObj);"
);

// Modify availableMusicians filter
const oldFilterStr = `            // Filter out musicians who are already in a band project for this song
            const availableMusicians = levelSkills.filter((skill: any) => {
              // 1. Check if they are in ANY band project for this song (proposals or active)
              const inBandProject = (song.band_songs || []).some((bs: any) => {
                const slots = bs.band_song_slots || [];
                const inSlot = slots.some((sl: any) => sl.user_id === skill.user_id);
                if (inSlot) return true;
                
                // Check core members of that band
                const band = formingBands.find((b: any) => b.id === bs.band_id);
                return (band?.band_members || []).some((bm: any) => bm.user_id === skill.user_id);
              });
              
              if (inBandProject) return false;

              // 2. Check existing "solo" formations (already in list)
              const isTaken = formationsList.some(f => f.members.some((m: any) => m.user_id === skill.user_id));
              return !isTaken;
            }).sort((a: any, b: any) => new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime());`;

const newFilterStr = `            // Filter out musicians who are already in a band project for THIS EXACT INSTRUMENT
            const availableMusicians = levelSkills.filter((skill: any) => {
              const normInst = normalizeInstrument(skill.instrument);
              
              // 1. Check if they are in ANY band project for this song ON THIS INSTRUMENT
              const inBandOnThisInst = allBandFormations.some(f => 
                f.members.some((m: any) => m.user_id === skill.user_id && m.instrument === normInst)
              );
              if (inBandOnThisInst) return false;

              // 2. Check existing "solo" formations (already in list)
              const isTaken = formationsList.some(f => 
                f.members.some((m: any) => m.user_id === skill.user_id && m.instrument === normInst)
              );
              return !isTaken;
            }).sort((a: any, b: any) => new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime());`;

content = content.replace(oldFilterStr, newFilterStr);
content = content.substring(0, insertIndex) + blockToMove + content.substring(insertIndex);

fs.writeFileSync(filePath, content);
console.log("DONE");
