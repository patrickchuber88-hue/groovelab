const fs = require('fs');
const readline = require('readline');

async function restore() {
  const filePath = '/Users/patrickhuber/Documents/Antigravity Projects/Groovelab app/apps/groovelab/src/components/AdminDashboard.tsx';
  
  const { execSync } = require('child_process');
  let currentContent = execSync('git show HEAD:apps/groovelab/src/components/AdminDashboard.tsx', {
    cwd: '/Users/patrickhuber/Documents/Antigravity Projects/Groovelab app',
    encoding: 'utf8'
  });

  // Normalize line endings to LF
  currentContent = currentContent.replace(/\r\n/g, '\n');

  const transcriptPath = '/Users/patrickhuber/.gemini/antigravity/brain/5ca7972a-16fb-4a7f-9d8d-52fce61bcbe2/.system_generated/logs/transcript.jsonl';
  const fileStream = fs.createReadStream(transcriptPath);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  const steps = [];
  for await (const line of rl) {
    if (!line.trim()) continue;
    steps.push(JSON.parse(line));
  }

  const edits = [];
  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    if (step.step_index > 679) continue;

    if (step.source === 'MODEL' && step.type === 'PLANNER_RESPONSE' && step.tool_calls) {
      let outcomeStep = null;
      for (let j = i + 1; j < steps.length; j++) {
        if (steps[j].step_index === step.step_index + 1) {
          outcomeStep = steps[j];
          break;
        }
      }

      const isSuccess = outcomeStep && 
        outcomeStep.content && 
        (outcomeStep.content.startsWith('Created At:') || 
         outcomeStep.content.startsWith('The following changes were made') ||
         outcomeStep.content.includes('successfully'));

      if (isSuccess) {
        for (const tc of step.tool_calls) {
          if ((tc.name === 'replace_file_content' || tc.name === 'multi_replace_file_content') && 
              tc.args.TargetFile && tc.args.TargetFile.includes('AdminDashboard.tsx')) {
            edits.push({
              step_index: step.step_index,
              name: tc.name,
              args: tc.args
            });
          }
        }
      }
    }
  }

  console.log(`Found ${edits.length} successful edits to apply sequentially...`);

  // Helper to normalize newlines for searching and strip outer quotes
  const cleanTarget = (str) => {
    if (!str) return '';
    // Strip outer escaped quotes
    if (str.startsWith('"') && str.endsWith('"')) {
      str = str.substring(1, str.length - 1);
    }
    // Handle escaped inner quotes
    str = str.replace(/\\"/g, '"');
    return str.replace(/\\n/g, '\n').replace(/\r\n/g, '\n');
  };

  for (const edit of edits) {
    console.log(`Applying step ${edit.step_index} (${edit.name}): ${edit.args.Instruction}`);
    if (edit.name === 'replace_file_content') {
      const targetVal = edit.args.TargetContent || edit.args.targetContent;
      const replacementVal = edit.args.ReplacementContent || edit.args.replacementContent;
      
      const target = cleanTarget(targetVal);
      const replacement = cleanTarget(replacementVal);
      if (!currentContent.includes(target)) {
        console.error(`ERROR: TargetContent not found in step ${edit.step_index}!`);
        console.error(`TargetContent sample: [${target.substring(0, 150)}]`);
        process.exit(1);
      }
      currentContent = currentContent.replace(target, replacement);
    } else if (edit.name === 'multi_replace_file_content') {
      let chunks = edit.args.ReplacementChunks || edit.args.replacementChunks;
      if (typeof chunks === 'string') {
        try {
          chunks = eval("(" + chunks + ")");
        } catch (e) {
          console.error(`Failed to eval chunks in step ${edit.step_index}:`, e);
          process.exit(1);
        }
      }
      for (const chunk of chunks) {
        const targetVal = chunk.TargetContent || chunk.targetContent;
        const replacementVal = chunk.ReplacementContent || chunk.replacementContent;
        
        const target = cleanTarget(targetVal);
        const replacement = cleanTarget(replacementVal);
        if (!currentContent.includes(target)) {
          console.error(`ERROR: TargetContent not found in step ${edit.step_index} multi-chunk!`);
          console.error(`TargetContent sample: [${target.substring(0, 150)}]`);
          process.exit(1);
        }
        currentContent = currentContent.replace(target, replacement);
      }
    }
  }

  fs.writeFileSync(filePath, currentContent, 'utf8');
  console.log('Successfully restored AdminDashboard.tsx to step 679!');
}

restore().catch(console.error);
