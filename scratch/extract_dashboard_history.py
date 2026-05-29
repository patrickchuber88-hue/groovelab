import json

log_file = "/Users/patrickhuber/.gemini/antigravity/brain/cfb0e211-4775-43da-aab2-3c4762ae6d28/.system_generated/logs/transcript.jsonl"
latest_content = None
latest_timestamp = None

with open(log_file, "r") as f:
    for line in f:
        try:
            entry = json.loads(line)
            
            # Check for view_file response
            if entry.get("source") == "SYSTEM" and entry.get("type") == "TOOL_RESPONSE":
                content = entry.get("content", "")
                if "export function StudentAvatarDashboard" in content and "import" in content:
                    # It looks like the file content!
                    # Wait, TOOL_RESPONSE content is a string. Let's save it.
                    latest_content = content
                    latest_timestamp = entry.get("timestamp", "unknown")
                    
        except Exception as e:
            pass

if latest_content:
    with open("scratch/Recovered_StudentAvatarDashboard.tsx", "w") as f:
        f.write(latest_content)
    print(f"Recovered content from {latest_timestamp}")
else:
    print("No content found")
