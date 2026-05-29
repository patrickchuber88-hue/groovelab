import json

log_path = "/Users/patrickhuber/.gemini/antigravity/brain/6a7a129c-3baf-40e6-b951-0051be0596c1/.system_generated/logs/transcript.jsonl"

with open(log_path, 'r', encoding='utf-8') as f:
    for idx, line in enumerate(f):
        try:
            step = json.loads(line)
            # check the whole step structure
            step_str = json.dumps(step)
            if 'Tagesplan (Unterrichte Heute)' in step_str:
                print(f"Step {step.get('step_index')}: type={step.get('type')}, length={len(step_str)}")
        except Exception as e:
            pass
