import json
import os
import glob

# Paths
dashboard_path = "/Users/patrickhuber/Documents/Antigravity Projects/Groovelab app/apps/groovelab/src/components/StudentAvatarDashboard.tsx"
scratch_dir = "/Users/patrickhuber/Documents/Antigravity Projects/Groovelab app/scratch"

# Read original file at HEAD (commit e34fb94)
with open(dashboard_path, "r", encoding="utf-8") as f:
    current_content = f.read()

print(f"Original content length: {len(current_content)} characters")

# Find all ordered edit JSONs
edit_files = glob.glob(os.path.join(scratch_dir, "ordered_edit_*.json"))

# Parse and filter edits that occurred after commit e34fb94 (2026-05-26T21:25:45Z)
edits = []
for file_path in edit_files:
    with open(file_path, "r", encoding="utf-8") as f:
        try:
            data = json.load(f)
            created_at = data.get("created_at") or ""
            # Filter for edits made on May 27 (e.g. timestamp starting with 2026-05-27)
            if created_at.startswith("2026-05-27"):
                edits.append((created_at, file_path, data))
        except Exception as e:
            print(f"Error reading {file_path}: {e}")

# Sort by timestamp
edits.sort(key=lambda x: x[0])

print(f"Found {len(edits)} edits to apply chronologically:")
for idx, (ts, path, data) in enumerate(edits):
    print(f"{idx+1}. {ts} | Conv: {data['conv_id']} | Step: {data['step_index']} | Type: {data['type']}")
    print(f"   Desc: {data['args'].get('Description') or data['args'].get('Instruction')}")

# Now apply them one by one
for idx, (ts, path, data) in enumerate(edits):
    print(f"\n--- Applying Edit {idx+1}/{len(edits)} ({ts}) ---")
    op_type = data["type"]
    args = data["args"]
    
    if op_type == "write_to_file":
        new_code = args.get("CodeContent")
        if new_code:
            current_content = new_code
            print("Successfully overwrote entire file content.")
        else:
            print("Warning: CodeContent missing in write_to_file!")
            
    elif op_type in ["replace_file_content", "multi_replace_file_content"]:
        # Handle replacement
        chunks = []
        if op_type == "replace_file_content":
            chunks = [{
                "TargetContent": args.get("TargetContent"),
                "ReplacementContent": args.get("ReplacementContent")
            }]
        else:
            chunks = args.get("ReplacementChunks", [])
            
        for chunk_idx, chunk in enumerate(chunks):
            target = chunk.get("TargetContent")
            replacement = chunk.get("ReplacementContent")
            
            if not target:
                print(f"Error: TargetContent empty for chunk {chunk_idx}")
                continue
                
            if target in current_content:
                # Count occurrences
                count = current_content.count(target)
                if count > 1:
                    print(f"Warning: TargetContent matches {count} times in the file. Replacing all occurrences.")
                current_content = current_content.replace(target, replacement)
                print(f"Successfully replaced chunk {chunk_idx+1}/{len(chunks)}")
            else:
                print(f"ERROR: TargetContent not found in current content! Chunk {chunk_idx+1}/{len(chunks)}")
                # Print a small snippet of target to help debug
                target_snippet = target[:100].replace('\n', '\\n')
                print(f"Target snippet: {target_snippet}...")

# Write the final rebuilt content back
with open(dashboard_path, "w", encoding="utf-8") as f:
    f.write(current_content)

print(f"\nFinished! Rebuilt StudentAvatarDashboard.tsx length: {len(current_content)} characters")
