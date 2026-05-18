import json

with open("scratch/raw_step_387.txt", "r", encoding="utf-8") as f:
    line = f.read().strip()

print("File read successfully, length:", len(line))

try:
    data = json.loads(line)
    print("JSON loaded successfully!")
    print("Keys in log data:", list(data.keys()))
    
    # Process tool_calls
    tool_calls = data.get("tool_calls", [])
    print("Number of tool calls:", len(tool_calls))
    for call in tool_calls:
        print("  Tool call name:", call.get("name"))
        args = call.get("args", {})
        print("  Args type:", type(args))
        if isinstance(args, str):
            try:
                args = json.loads(args)
                print("  Successfully parsed args string into dict!")
            except Exception as e:
                print("  Failed to parse args string:", e)
        
        if isinstance(args, dict):
            print("  Keys in args:", list(args.keys()))
            chunks = args.get("ReplacementChunks")
            print("  Chunks type:", type(chunks))
            if isinstance(chunks, str):
                try:
                    chunks = json.loads(chunks)
                    print("  Successfully parsed chunks string into list!")
                except Exception as e:
                    print("  Failed to parse chunks string:", e)
            
            if isinstance(chunks, list):
                print("  Number of chunks:", len(chunks))
                for idx, chunk in enumerate(chunks):
                    print(f"    Chunk {idx}: StartLine={chunk.get('StartLine')} EndLine={chunk.get('EndLine')}")
                    # Save each chunk
                    out_name = f"scratch/recovered_387_chunk_{idx}.txt"
                    with open(out_name, "w", encoding="utf-8") as out:
                        out.write(chunk.get("ReplacementContent", ""))
                    print("    Saved to", out_name)
except Exception as e:
    print("JSON load failed:", e)
