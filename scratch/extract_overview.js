import fs from 'fs';

const logPath = '/Users/patrickhuber/.gemini/antigravity/brain/45ad3e21-10ee-476a-8279-e4b971be13a0/.system_generated/logs/overview.txt';

if (!fs.existsSync(logPath)) {
  console.error("Log file not found at:", logPath);
  process.exit(1);
}

const fileContent = fs.readFileSync(logPath, 'utf-8');
const lines = fileContent.split('\n');

for (let i = 0; i < lines.length; i++) {
  const line = lines[i].trim();
  if (!line) continue;
  try {
    // Parse using eval to bypass JSON strict control character requirements
    let data;
    try {
      data = eval(`(${line})`);
    } catch (e1) {
      // If it still fails, let's try reading the content as a string and parsing it
      continue;
    }
    
    if (data && data.type === 'PLANNER_RESPONSE' && data.tool_calls) {
      for (const call of data.tool_calls) {
        if (call.name === 'multi_replace_file_content') {
          console.log(`\n=== Found multi_replace in STEP ${data.step_index} ===`);
          let args = call.args;
          if (typeof args === 'string') {
            try {
              args = eval(`(${args})`);
            } catch (e3) {
              console.log("args eval failed:", e3.message);
            }
          }
          
          let chunks = args.ReplacementChunks;
          if (typeof chunks === 'string') {
            try {
              chunks = eval(`(${chunks})`);
            } catch (e4) {
              console.log("chunks eval failed:", e4.message);
            }
          }
          
          if (Array.isArray(chunks)) {
            chunks.forEach((chunk, index) => {
              console.log(`Chunk ${index}: StartLine=${chunk.StartLine}, EndLine=${chunk.EndLine}`);
              fs.writeFileSync(`scratch/chunk_${data.step_index}_${index}.txt`, chunk.ReplacementContent);
              console.log(`Saved to scratch/chunk_${data.step_index}_${index}.txt`);
            });
          } else {
            console.log("Chunks is not an array:", typeof chunks);
          }
        }
      }
    }
  } catch (e) {
    console.error(`Error processing line ${i}:`, e.message);
  }
}
