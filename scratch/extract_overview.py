import re

log_path = '/Users/patrickhuber/.gemini/antigravity/brain/45ad3e21-10ee-476a-8279-e4b971be13a0/.system_generated/logs/overview.txt'

with open(log_path, 'r', encoding='utf-8') as f:
    for line in f:
        if not line.strip():
            continue
        if '"step_index":387' in line or '"step_index":291' in line:
            step_match = re.search(r'"step_index":(\d+)', line)
            step_num = step_match.group(1) if step_match else "unknown"
            print(f"Dumping step {step_num}...")
            
            # Write the raw line containing the step to a scratch file
            with open(f"scratch/raw_step_{step_num}.txt", 'w', encoding='utf-8') as out:
                out.write(line)
            print(f"Saved raw log line to scratch/raw_step_{step_num}.txt")
