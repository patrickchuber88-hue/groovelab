import json

transcript_path = "/Users/patrickhuber/.gemini/antigravity/brain/9c9659ae-5078-4246-a021-c1cad5812f8a/.system_generated/logs/transcript.jsonl"

candidates = []
with open(transcript_path, 'r', encoding='utf-8') as f:
    for line in f:
        try:
            obj = json.loads(line)
            step = obj.get("step_index", 0)
            if step >= 1124: # ignore current session's steps
                continue
            
            # Check content of VIEW_FILE, WRITE_TO_FILE or similar
            content = obj.get("content", "")
            if "export const MeisterwerkDocumentationModal" in content:
                candidates.append((step, len(content), content))
                
            # Check tool_calls outputs or args
            for tc in obj.get("tool_calls", []):
                args = tc.get("args", {})
                if isinstance(args, dict):
                    code = args.get("CodeContent", "")
                    if "export const MeisterwerkDocumentationModal" in code:
                        candidates.append((step, len(code), code))
        except Exception as e:
            pass

candidates.sort(key=lambda x: x[1], reverse=True)
print(f"Found {len(candidates)} candidate full-file records in previous session.")
for step, length, _ in candidates[:10]:
    print(f"Step: {step}, Length: {length}")

if candidates:
    best_step, best_len, best_content = candidates[0]
    print(f"\nWriting best recovery candidate (Step: {best_step}, Length: {best_len}) to scratch/recovered_MeisterwerkDocumentationModal.tsx")
    # Clean up JSON-escaped sequences if necessary
    with open("/Users/patrickhuber/Documents/Antigravity Projects/Groovelab app/scratch/recovered_MeisterwerkDocumentationModal.tsx", "w", encoding="utf-8") as out:
        out.write(best_content)
